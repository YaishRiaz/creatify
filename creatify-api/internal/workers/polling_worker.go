// Package workers contains the background polling engine.
//
// Every 6 hours the Worker fetches view counts for all active tasks,
// calculates earnings deltas, runs fraud scoring, and — for clean results —
// credits the creator wallet, debits campaign budget, and stores a snapshot.
// All money operations run inside a single PostgreSQL transaction.
package workers

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/robfig/cron/v3"

	"creatify-api/pkg/apify"
	"creatify-api/pkg/fraud"
	"creatify-api/pkg/youtube"
)

// ─── Money helpers ───────────────────────────────────────────────────────────
// All internal calculations use integer cents (1 LKR = 100 cents) to avoid
// floating-point drift. We only convert to/from float64 at DB boundaries.

func toCents(lkr float64) int64    { return int64(math.Round(lkr * 100)) }
func fromCents(c int64) float64    { return float64(c) / 100.0 }
func roundLKR(lkr float64) float64 { return math.Round(lkr*100) / 100 }

// ─── Types ───────────────────────────────────────────────────────────────────

// activeTask carries everything the worker needs for one poll cycle,
// fetched in a single query to minimise round-trips.
type activeTask struct {
	id               string
	campaignID       string
	creatorProfileID string // creator_profiles.id (NOT users.id)
	platform         string
	postURL          string
	postID           string
	totalViews       int64
	totalEarnedCents int64 // task.total_earned in cents

	payoutRateCents   int64 // campaign.payout_rate in cents
	budgetRemaining   int64 // campaign.budget_remaining in cents
	perCreatorCap     int64 // campaign.per_creator_cap in cents (0 = unlimited)

	lastSnapshotViews int64         // 0 if no previous snapshot
	lastDeltaViews    int64         // previous snapshot delta (for spike detection)
	lastSnapshotAt    time.Time
}

// pollResult is what we write to the DB after computing the delta.
type pollResult struct {
	currentViews  int64
	deltaViews    int64
	earningsCents int64
	fraudScore    int
	newStatus     string // "" = unchanged
}

// ─── Worker ──────────────────────────────────────────────────────────────────

// Worker runs the polling engine on a cron schedule.
type Worker struct {
	db      *sql.DB
	apify   *apify.Client
	youtube *youtube.Client
	log     *log.Logger
}

// New creates a Worker. Call Start() to begin the cron schedule.
func New(db *sql.DB) *Worker {
	return &Worker{
		db:      db,
		apify:   apify.New(os.Getenv("APIFY_API_TOKEN")),
		youtube: youtube.New(os.Getenv("YOUTUBE_API_KEY")),
		log:     log.New(os.Stdout, "[polling] ", log.LstdFlags|log.Lmsgprefix),
	}
}

// Start schedules the worker to run every 6 hours and blocks until the process
// receives SIGTERM or SIGINT, at which point it waits for the current cycle to
// finish before returning.
func (w *Worker) Start() {
	c := cron.New()

	// Run immediately on startup, then every 6 hours.
	if err := w.runCycle(context.Background()); err != nil {
		w.log.Printf("ERROR initial cycle: %v", err)
	}

	_, err := c.AddFunc("0 */6 * * *", func() {
		ctx := context.Background()
		if err := w.runCycle(ctx); err != nil {
			w.log.Printf("ERROR cycle: %v", err)
		}
	})
	if err != nil {
		w.log.Fatalf("failed to schedule cron: %v", err)
	}

	c.Start()
	w.log.Println("polling worker started — schedule: every 6 hours")

	// Block until signal.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	w.log.Println("shutdown signal received — waiting for current cycle to finish")
	ctx := c.Stop()
	<-ctx.Done()
	w.log.Println("polling worker stopped cleanly")
}

// ─── Cycle ───────────────────────────────────────────────────────────────────

func (w *Worker) runCycle(ctx context.Context) error {
	start := time.Now()
	w.log.Println("cycle start")

	tasks, err := w.fetchActiveTasks(ctx)
	if err != nil {
		return fmt.Errorf("fetch tasks: %w", err)
	}
	w.log.Printf("found %d active tasks", len(tasks))

	var errs int
	for _, task := range tasks {
		if err := w.pollTask(ctx, task); err != nil {
			w.log.Printf("ERROR task %s (%s/%s): %v", task.id, task.platform, task.postID, err)
			errs++
		}
	}

	w.log.Printf("cycle done in %s — %d ok, %d errors", time.Since(start).Round(time.Second), len(tasks)-errs, errs)
	return nil
}

// ─── Fetch active tasks ───────────────────────────────────────────────────────

func (w *Worker) fetchActiveTasks(ctx context.Context) ([]activeTask, error) {
	const q = `
		SELECT
			t.id,
			t.campaign_id,
			t.creator_id                              AS creator_profile_id,
			t.platform,
			t.post_url,
			COALESCE(t.post_id, '')                   AS post_id,
			COALESCE(t.total_views, 0)                AS total_views,
			COALESCE(t.total_earned, 0.0)             AS total_earned,
			COALESCE(c.payout_rate, 0.0)              AS payout_rate,
			COALESCE(c.budget_remaining, 0.0)         AS budget_remaining,
			COALESCE(c.per_creator_cap, 0.0)          AS per_creator_cap,
			COALESCE(last_snap.views_at_snapshot, 0)  AS last_snapshot_views,
			COALESCE(last_snap.delta_views, 0)        AS last_delta_views,
			COALESCE(last_snap.snapshotted_at, t.created_at) AS last_snapshot_at
		FROM tasks t
		JOIN campaigns c ON c.id = t.campaign_id
		LEFT JOIN LATERAL (
			SELECT views_at_snapshot, delta_views, snapshotted_at
			FROM   view_snapshots
			WHERE  task_id = t.id
			ORDER  BY snapshotted_at DESC
			LIMIT  1
		) last_snap ON true
		WHERE t.status IN ('submitted', 'tracking')
		  AND c.status = 'active'
		  AND t.post_url IS NOT NULL
		  AND t.post_url <> ''
	`

	rows, err := w.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []activeTask
	for rows.Next() {
		var t activeTask
		var totalEarned, payoutRate, budgetRemaining, perCreatorCap float64

		if err := rows.Scan(
			&t.id, &t.campaignID, &t.creatorProfileID,
			&t.platform, &t.postURL, &t.postID,
			&t.totalViews, &totalEarned,
			&payoutRate, &budgetRemaining, &perCreatorCap,
			&t.lastSnapshotViews, &t.lastDeltaViews, &t.lastSnapshotAt,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}

		t.totalEarnedCents = toCents(totalEarned)
		t.payoutRateCents = toCents(payoutRate)
		t.budgetRemaining = toCents(budgetRemaining)
		t.perCreatorCap = toCents(perCreatorCap)
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// ─── Poll one task ────────────────────────────────────────────────────────────

func (w *Worker) pollTask(ctx context.Context, task activeTask) error {
	// 1. Fetch current view count (with retry).
	viewData, err := w.fetchViewsWithRetry(ctx, task)
	if err != nil {
		return fmt.Errorf("fetch views: %w", err)
	}

	// 2. Delta since last snapshot. Clamp to 0 — view counts should never drop.
	delta := viewData.Views - task.lastSnapshotViews
	if delta < 0 {
		delta = 0
	}

	// 3. Fraud scoring.
	elapsed := time.Since(task.lastSnapshotAt)
	score := fraud.Score(fraud.Input{
		DeltaViews:       delta,
		PreviousDelta:    task.lastDeltaViews,
		TotalViewsBefore: task.totalViews,
		TimeSinceLast:    elapsed,
		Platform:         task.platform,
	})

	// 4. Calculate raw earnings in cents.
	var earningsCents int64
	if !fraud.IsFraud(score) && delta > 0 {
		// earnings = (delta / 1000) * payout_rate
		earningsCents = (delta * task.payoutRateCents) / 1000

		// Cap 1: per-creator cap (0 = no cap).
		if task.perCreatorCap > 0 {
			remaining := task.perCreatorCap - task.totalEarnedCents
			if remaining <= 0 {
				earningsCents = 0
			} else if earningsCents > remaining {
				earningsCents = remaining
			}
		}

		// Cap 2: campaign budget.
		if earningsCents > task.budgetRemaining {
			earningsCents = task.budgetRemaining
		}
		if earningsCents < 0 {
			earningsCents = 0
		}
	}

	result := pollResult{
		currentViews:  viewData.Views,
		deltaViews:    delta,
		earningsCents: earningsCents,
		fraudScore:    score,
	}
	if fraud.IsFraud(score) {
		result.newStatus = "flagged"
	} else if task.lastSnapshotViews == 0 && viewData.Views > 0 {
		// First confirmed view — move to tracking.
		result.newStatus = "tracking"
	}

	// 5. Write everything in a single transaction.
	if err := w.applyEarnings(ctx, task, result); err != nil {
		return fmt.Errorf("apply earnings: %w", err)
	}

	w.log.Printf("task %s | platform=%s | delta=%d | earnings=LKR%.2f | fraud=%d",
		task.id, task.platform, delta, fromCents(earningsCents), score)
	return nil
}

// ─── Fetch views with retry ───────────────────────────────────────────────────

func (w *Worker) fetchViewsWithRetry(ctx context.Context, task activeTask) (*viewData, error) {
	type result struct {
		data *viewData
		err  error
	}
	var last error

	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(1<<(attempt-1)) * time.Second // 1s, 2s
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		data, err := w.fetchViews(ctx, task)
		if err == nil {
			return data, nil
		}
		last = err
		w.log.Printf("WARN fetch views attempt %d/%d for task %s: %v", attempt+1, 3, task.id, err)
	}
	return nil, fmt.Errorf("all 3 attempts failed: %w", last)
}

// viewData is the internal normalised result from any platform.
type viewData struct {
	Views    int64
	Likes    int64
	Comments int64
}

func (w *Worker) fetchViews(ctx context.Context, task activeTask) (*viewData, error) {
	switch task.platform {
	case "youtube":
		videoID := task.postID
		if videoID == "" {
			return nil, fmt.Errorf("missing post_id for youtube task %s", task.id)
		}
		d, err := w.youtube.FetchVideo(ctx, videoID)
		if err != nil {
			return nil, err
		}
		return &viewData{Views: d.Views, Likes: d.Likes, Comments: d.Comments}, nil

	case "tiktok":
		d, err := w.apify.FetchTikTok(ctx, task.postURL)
		if err != nil {
			return nil, err
		}
		return &viewData{Views: d.Views, Likes: d.Likes, Comments: d.Comments}, nil

	case "instagram":
		d, err := w.apify.FetchInstagram(ctx, task.postURL)
		if err != nil {
			return nil, err
		}
		return &viewData{Views: d.Views, Likes: d.Likes, Comments: d.Comments}, nil

	case "facebook":
		d, err := w.apify.FetchFacebook(ctx, task.postURL)
		if err != nil {
			return nil, err
		}
		return &viewData{Views: d.Views, Likes: d.Likes, Comments: d.Comments}, nil

	default:
		return nil, fmt.Errorf("unsupported platform: %s", task.platform)
	}
}

// ─── Apply earnings (single transaction) ─────────────────────────────────────

func (w *Worker) applyEarnings(ctx context.Context, task activeTask, r pollResult) error {
	tx, err := w.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// Lock task row to prevent concurrent poll from double-crediting.
	var lockedEarned float64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(total_earned, 0) FROM tasks WHERE id = $1 FOR UPDATE`,
		task.id,
	).Scan(&lockedEarned); err != nil {
		return fmt.Errorf("lock task: %w", err)
	}

	// Lock campaign budget.
	var lockedBudget float64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(budget_remaining, 0) FROM campaigns WHERE id = $1 FOR UPDATE`,
		task.campaignID,
	).Scan(&lockedBudget); err != nil {
		return fmt.Errorf("lock campaign: %w", err)
	}

	// Re-check caps with locked values (another worker may have run concurrently).
	lockedBudgetCents := toCents(lockedBudget)
	if r.earningsCents > lockedBudgetCents {
		r.earningsCents = lockedBudgetCents
	}
	if task.perCreatorCap > 0 {
		lockedEarnedCents := toCents(lockedEarned)
		capRemaining := task.perCreatorCap - lockedEarnedCents
		if capRemaining <= 0 {
			r.earningsCents = 0
		} else if r.earningsCents > capRemaining {
			r.earningsCents = capRemaining
		}
	}

	earningsLKR := roundLKR(fromCents(r.earningsCents))

	// ── 1. Insert view_snapshot ──────────────────────────────────────────────
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO view_snapshots
			(id, task_id, views_at_snapshot, delta_views, earnings_added, fraud_score, snapshotted_at)
		VALUES
			(gen_random_uuid(), $1, $2, $3, $4, $5, now())`,
		task.id, r.currentViews, r.deltaViews, earningsLKR, r.fraudScore,
	); err != nil {
		return fmt.Errorf("insert snapshot: %w", err)
	}

	// ── 2. Update task ───────────────────────────────────────────────────────
	newStatus := r.newStatus
	if newStatus == "" {
		// Keep existing status — use a no-op value that matches itself.
		newStatus = "tracking" // tasks in 'submitted'/'tracking' stay as-is unless flagged
		if r.fraudScore >= 70 {
			newStatus = "flagged"
		}
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE tasks SET
			total_views  = $1,
			total_earned = total_earned + $2,
			fraud_score  = $3,
			status       = CASE
				WHEN $3 >= 70 THEN 'flagged'
				WHEN status = 'submitted' AND $1 > 0 THEN 'tracking'
				ELSE status
			END
		WHERE id = $4`,
		r.currentViews, earningsLKR, r.fraudScore, task.id,
	); err != nil {
		return fmt.Errorf("update task: %w", err)
	}

	// ── 3. Update campaign budget and maybe complete it ──────────────────────
	if earningsLKR > 0 {
		if _, err = tx.ExecContext(ctx, `
			UPDATE campaigns SET
				budget_remaining = GREATEST(budget_remaining - $1, 0),
				status = CASE
					WHEN budget_remaining - $1 <= 0 THEN 'completed'
					ELSE status
				END
			WHERE id = $2`,
			earningsLKR, task.campaignID,
		); err != nil {
			return fmt.Errorf("update campaign budget: %w", err)
		}

		// If campaign just became completed, mark all its tasks completed too.
		var campaignStatus string
		if err = tx.QueryRowContext(ctx,
			`SELECT status FROM campaigns WHERE id = $1`, task.campaignID,
		).Scan(&campaignStatus); err != nil {
			return fmt.Errorf("read campaign status: %w", err)
		}
		if campaignStatus == "completed" {
			if _, err = tx.ExecContext(ctx, `
				UPDATE tasks SET status = 'completed'
				WHERE campaign_id = $1 AND status IN ('submitted', 'tracking')`,
				task.campaignID,
			); err != nil {
				return fmt.Errorf("complete tasks: %w", err)
			}
		}

		// ── 4. Credit creator wallet ─────────────────────────────────────────
		if _, err = tx.ExecContext(ctx, `
			UPDATE creator_profiles SET
				wallet_balance = COALESCE(wallet_balance, 0) + $1,
				total_earned   = COALESCE(total_earned, 0)   + $1
			WHERE id = $2`,
			earningsLKR, task.creatorProfileID,
		); err != nil {
			return fmt.Errorf("credit wallet: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
