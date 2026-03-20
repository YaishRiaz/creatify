// CURRENCY NOTE:
// All monetary values in this service are stored as
// integer cents (LKR * 100) to avoid float precision issues.
// Example: LKR 10.50 is stored as 1050
// The frontend divides by 100 when displaying.
//
// Database columns use DECIMAL(12,2) which Postgres
// handles correctly. We multiply by 100 on read and
// divide by 100 on write to/from the database.
package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"creatify-api/internal/db"
	"creatify-api/internal/models"
	"creatify-api/pkg/apify"
	"creatify-api/pkg/fraud"
	"creatify-api/pkg/youtube"
)

// PollingService ties together view fetching, fraud scoring, and DB writes.
type PollingService struct {
	apify   *apify.Client
	youtube *youtube.Client
}

// NewPollingService creates a PollingService with clients reading credentials from env.
func NewPollingService() *PollingService {
	return &PollingService{
		apify:   apify.NewClient(),
		youtube: youtube.NewClient(),
	}
}

// RunPollCycle executes one full poll of all active tasks.
func (s *PollingService) RunPollCycle(ctx context.Context) {
	log.Println("━━━ Starting poll cycle", time.Now().Format(time.RFC3339))

	tasks, err := s.fetchActiveTasks(ctx)
	if err != nil {
		log.Printf("ERROR: Failed to fetch active tasks: %v", err)
		return
	}

	log.Printf("Found %d tasks to poll", len(tasks))

	successCount := 0
	flaggedCount := 0
	errorCount := 0

	for _, task := range tasks {
		result := s.pollTask(ctx, task)

		switch {
		case result.Error != nil:
			log.Printf("ERROR polling task %s: %v", task.ID, result.Error)
			errorCount++
		case result.Flagged:
			log.Printf("FLAGGED task %s: fraud score %d", task.ID, result.FraudScore)
			flaggedCount++
		default:
			if result.DeltaViews > 0 {
				log.Printf("OK task %s: +%d views, +%d cents earned",
					task.ID, result.DeltaViews, result.EarningsAdded)
				successCount++
			}
		}
	}

	log.Printf("━━━ Poll cycle complete: %d ok, %d flagged, %d errors",
		successCount, flaggedCount, errorCount)
}

// pollTask polls a single task and processes the result.
func (s *PollingService) pollTask(ctx context.Context, task models.TaskForPolling) models.PollResult {
	result := models.PollResult{
		TaskID:   task.ID,
		Platform: task.Platform,
	}

	// Get current view count from the right API.
	currentViews, likes, comments, err := s.getViewCount(ctx, task.Platform, task.PostURL, task.PostID)
	if err != nil {
		result.Error = fmt.Errorf("view fetch failed: %w", err)
		return result
	}

	result.CurrentViews = currentViews

	// Calculate delta — clamp to 0 (view counts should never drop).
	deltaViews := currentViews - task.TotalViews
	if deltaViews <= 0 {
		s.saveSnapshot(ctx, task.ID, currentViews, 0, 0)
		return result
	}

	result.DeltaViews = deltaViews

	// Fetch previous deltas for fraud scoring.
	previousDeltas, err := s.fetchPreviousDeltas(ctx, task.ID, 5)
	if err != nil {
		log.Printf("WARN: Could not fetch previous deltas for %s: %v", task.ID, err)
	}

	// Run fraud scoring.
	fraudResult := fraud.Score(fraud.ScoreInput{
		DeltaViews:    deltaViews,
		DeltaLikes:    likes,
		DeltaComments: comments,
		PreviousDeltas: previousDeltas,
		TotalViewsSoFar:  task.TotalViews,
		TotalEarnedCents: task.TotalEarned,
		Platform:         task.Platform,
	})

	result.FraudScore = fraudResult.Score

	if fraudResult.Flagged {
		result.Flagged = true
		s.flagTask(ctx, task.ID, fraudResult.Score)
		return result
	}

	// Calculate earnings in cents: earnings = (deltaViews / 1000) * payout_rate_cents
	earningsCents := (deltaViews * task.PayoutRate) / 1000

	// Apply per-creator cap if set.
	if task.PerCreatorCap.Valid {
		remainingCap := task.PerCreatorCap.Int64 - task.TotalEarned
		if earningsCents > remainingCap {
			earningsCents = remainingCap
		}
	}

	// Cap at remaining budget.
	if earningsCents > task.BudgetRemaining {
		earningsCents = task.BudgetRemaining
	}

	if earningsCents <= 0 {
		s.saveSnapshot(ctx, task.ID, currentViews, deltaViews, 0)
		return result
	}

	result.EarningsAdded = earningsCents

	// Apply earnings in a database transaction.
	if err := s.applyEarnings(ctx, task, currentViews, deltaViews, earningsCents); err != nil {
		result.Error = fmt.Errorf("failed to apply earnings: %w", err)
		return result
	}

	return result
}

// applyEarnings updates task, wallet, campaign, and snapshot in one atomic transaction.
func (s *PollingService) applyEarnings(
	ctx context.Context,
	task models.TaskForPolling,
	currentViews int64,
	deltaViews int64,
	earningsCents int64,
) error {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	earningsLKR := roundLKR(float64(earningsCents) / 100.0)

	// Lock task and campaign rows to prevent concurrent double-crediting.
	var lockedTaskEarned float64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(total_earned, 0) FROM tasks WHERE id = $1 FOR UPDATE`,
		task.ID,
	).Scan(&lockedTaskEarned); err != nil {
		return fmt.Errorf("lock task: %w", err)
	}

	var lockedBudget float64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(budget_remaining, 0) FROM campaigns WHERE id = $1 FOR UPDATE`,
		task.CampaignID,
	).Scan(&lockedBudget); err != nil {
		return fmt.Errorf("lock campaign: %w", err)
	}

	// Re-check caps against locked values (handles concurrent workers).
	lockedBudgetCents := toCents(lockedBudget)
	if earningsCents > lockedBudgetCents {
		earningsCents = lockedBudgetCents
		earningsLKR = roundLKR(float64(earningsCents) / 100.0)
	}
	if task.PerCreatorCap.Valid {
		lockedEarnedCents := toCents(lockedTaskEarned)
		capRemaining := task.PerCreatorCap.Int64 - lockedEarnedCents
		if capRemaining <= 0 {
			earningsCents = 0
			earningsLKR = 0
		} else if earningsCents > capRemaining {
			earningsCents = capRemaining
			earningsLKR = roundLKR(float64(earningsCents) / 100.0)
		}
	}

	// 1. Insert view snapshot.
	_, err = tx.ExecContext(ctx, `
		INSERT INTO view_snapshots (
			id, task_id, views_at_snapshot, delta_views,
			earnings_added, fraud_score, snapshotted_at
		) VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
	`, task.ID, currentViews, deltaViews, earningsLKR)
	if err != nil {
		return fmt.Errorf("insert snapshot: %w", err)
	}

	// 2. Update task total_views, total_earned, status.
	_, err = tx.ExecContext(ctx, `
		UPDATE tasks SET
			total_views  = $1,
			total_earned = total_earned + $2,
			status = CASE
				WHEN $3::numeric >= 70 THEN 'flagged'
				WHEN status = 'submitted' AND $1 > 0 THEN 'tracking'
				ELSE status
			END
		WHERE id = $4
	`, currentViews, earningsLKR, 0, task.ID)
	if err != nil {
		return fmt.Errorf("update task: %w", err)
	}

	if earningsLKR > 0 {
		// 3. Update campaign budget_remaining.
		_, err = tx.ExecContext(ctx, `
			UPDATE campaigns SET
				budget_remaining = GREATEST(budget_remaining - $1, 0),
				status = CASE
					WHEN budget_remaining - $1 <= 0 THEN 'completed'
					ELSE status
				END
			WHERE id = $2
		`, earningsLKR, task.CampaignID)
		if err != nil {
			return fmt.Errorf("update campaign budget: %w", err)
		}

		// If campaign just completed, mark all its active tasks completed.
		var campaignStatus string
		if err = tx.QueryRowContext(ctx,
			`SELECT status FROM campaigns WHERE id = $1`, task.CampaignID,
		).Scan(&campaignStatus); err != nil {
			return fmt.Errorf("read campaign status: %w", err)
		}
		if campaignStatus == "completed" {
			_, err = tx.ExecContext(ctx, `
				UPDATE tasks SET status = 'completed'
				WHERE campaign_id = $1 AND status IN ('submitted', 'tracking')
			`, task.CampaignID)
			if err != nil {
				return fmt.Errorf("complete tasks: %w", err)
			}
			log.Printf("Campaign %s completed — budget exhausted", task.CampaignID)
		}

		// 4. Credit creator wallet.
		_, err = tx.ExecContext(ctx, `
			UPDATE creator_profiles SET
				wallet_balance = COALESCE(wallet_balance, 0) + $1,
				total_earned   = COALESCE(total_earned, 0)   + $1
			WHERE id = $2
		`, earningsLKR, task.CreatorID)
		if err != nil {
			return fmt.Errorf("credit wallet: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

// fetchActiveTasks gets all tasks that need to be polled.
func (s *PollingService) fetchActiveTasks(ctx context.Context) ([]models.TaskForPolling, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT
			t.id,
			t.campaign_id,
			t.creator_id,
			t.platform,
			t.post_url,
			COALESCE(t.post_id, ''),
			t.status,
			COALESCE(t.total_views, 0),
			COALESCE(t.total_earned, 0.0),
			0,
			COALESCE(c.payout_rate, 0.0),
			COALESCE(c.budget_remaining, 0.0),
			c.per_creator_cap,
			u.id AS creator_user_id
		FROM tasks t
		JOIN campaigns c ON t.campaign_id = c.id
		JOIN creator_profiles cp ON t.creator_id = cp.id
		JOIN users u ON cp.user_id = u.id
		WHERE
			t.status IN ('submitted', 'tracking')
			AND c.status = 'active'
			AND t.post_url IS NOT NULL
			AND t.post_url != ''
			AND c.budget_remaining > 0
			AND c.end_date > NOW()
	`)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var tasks []models.TaskForPolling
	for rows.Next() {
		var task models.TaskForPolling
		var totalEarned, payoutRate, budgetRemaining float64
		var fraudScore int

		if err := rows.Scan(
			&task.ID,
			&task.CampaignID,
			&task.CreatorID,
			&task.Platform,
			&task.PostURL,
			&task.PostID,
			&task.Status,
			&task.TotalViews,
			&totalEarned,
			&fraudScore,
			&payoutRate,
			&budgetRemaining,
			&task.PerCreatorCap,
			&task.CreatorUserID,
		); err != nil {
			log.Printf("WARN: Failed to scan task row: %v", err)
			continue
		}

		task.FraudScore = fraudScore
		task.TotalEarned = toCents(totalEarned)
		task.PayoutRate = toCents(payoutRate)
		task.BudgetRemaining = toCents(budgetRemaining)
		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

// getViewCount calls the correct API based on platform.
func (s *PollingService) getViewCount(
	ctx context.Context,
	platform string,
	postURL string,
	postID string,
) (int64, int64, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	switch platform {
	case "youtube":
		videoID := postID
		if videoID == "" {
			videoID = extractYouTubeID(postURL)
		}
		if videoID == "" {
			return 0, 0, 0, fmt.Errorf("could not extract YouTube video ID from: %s", postURL)
		}
		return s.youtube.GetVideoViews(ctx, videoID)
	case "tiktok":
		return s.apify.GetTikTokViews(ctx, postURL)
	case "instagram":
		return s.apify.GetInstagramViews(ctx, postURL)
	case "facebook":
		return s.apify.GetFacebookViews(ctx, postURL)
	default:
		return 0, 0, 0, fmt.Errorf("unsupported platform: %s", platform)
	}
}

// fetchPreviousDeltas gets the last N delta_views for a task (for spike detection).
func (s *PollingService) fetchPreviousDeltas(ctx context.Context, taskID string, limit int) ([]int64, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT delta_views
		FROM view_snapshots
		WHERE task_id = $1
		ORDER BY snapshotted_at DESC
		LIMIT $2
	`, taskID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deltas []int64
	for rows.Next() {
		var d int64
		if err := rows.Scan(&d); err == nil {
			deltas = append(deltas, d)
		}
	}
	return deltas, nil
}

// saveSnapshot writes a snapshot record outside of a full earnings transaction.
func (s *PollingService) saveSnapshot(ctx context.Context, taskID string, currentViews, deltaViews, earnings int64) {
	earningsLKR := roundLKR(float64(earnings) / 100.0)
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO view_snapshots (
			id, task_id, views_at_snapshot, delta_views,
			earnings_added, fraud_score, snapshotted_at
		) VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
	`, taskID, currentViews, deltaViews, earningsLKR)
	if err != nil {
		log.Printf("WARN: Failed to save snapshot for task %s: %v", taskID, err)
	}
}

// flagTask marks a task as flagged for fraud review.
func (s *PollingService) flagTask(ctx context.Context, taskID string, fraudScore int) {
	_, err := db.DB.ExecContext(ctx, `
		UPDATE tasks SET status = 'flagged', fraud_score = $1 WHERE id = $2
	`, fraudScore, taskID)
	if err != nil {
		log.Printf("ERROR: Failed to flag task %s: %v", taskID, err)
	}
}

// CheckExpiredCampaigns marks campaigns past their end date as completed.
func (s *PollingService) CheckExpiredCampaigns(ctx context.Context) {
	_, err := db.DB.ExecContext(ctx, `
		UPDATE campaigns SET status = 'completed'
		WHERE status = 'active' AND end_date < NOW()
	`)
	if err != nil {
		log.Printf("ERROR: Failed to expire campaigns: %v", err)
		return
	}

	_, err = db.DB.ExecContext(ctx, `
		UPDATE tasks SET status = 'completed'
		WHERE status IN ('submitted', 'tracking', 'accepted')
		AND campaign_id IN (
			SELECT id FROM campaigns WHERE status = 'completed'
		)
	`)
	if err != nil {
		log.Printf("ERROR: Failed to complete tasks for expired campaigns: %v", err)
	}

	log.Println("Expired campaign check complete")
}

// extractYouTubeID extracts the video ID from various YouTube URL formats.
func extractYouTubeID(url string) string {
	patterns := []struct{ prefix, suffix string }{
		{"/shorts/", ""},
		{"watch?v=", "&"},
		{"youtu.be/", ""},
		{"youtu.be/", "?"},
	}
	for _, p := range patterns {
		idx := strings.Index(url, p.prefix)
		if idx == -1 {
			continue
		}
		start := idx + len(p.prefix)
		end := len(url)
		if p.suffix != "" {
			if si := strings.Index(url[start:], p.suffix); si != -1 {
				end = start + si
			}
		}
		id := url[start:end]
		if len(id) > 0 && len(id) <= 20 {
			return id
		}
	}
	return ""
}

// ── Money helpers ─────────────────────────────────────────────────────────────

func toCents(lkr float64) int64    { return int64(math.Round(lkr * 100)) }
func roundLKR(v float64) float64   { return math.Round(v*100) / 100 }

// ensure sql import is used for NullInt64
var _ = sql.NullInt64{}
