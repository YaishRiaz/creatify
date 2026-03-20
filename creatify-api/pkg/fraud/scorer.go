// Package fraud provides heuristic fraud scoring for view count deltas.
// A score of 0 means clean; 100 means certainly fraudulent.
// Tasks scoring >= 70 are flagged for manual review; earnings are withheld.
package fraud

import "time"

// Input contains all signals needed to score a single poll delta.
type Input struct {
	DeltaViews         int64         // views gained since last snapshot
	PreviousDelta      int64         // delta from the snapshot before that (0 if none)
	TotalViewsBefore   int64         // task.total_views before this poll
	TimeSinceLast      time.Duration // elapsed since last snapshot
	Platform           string
}

// Score returns a fraud score in [0, 100].
//
// Scoring rules (additive, capped at 100):
//   - Negative delta          → impossible, instant 100
//   - Zero delta for 24h+     → suspicious but not fraud (0 — just stale)
//   - >500K new views in 6h   → +40
//   - >100K new views in 6h   → +20
//   - Spike: delta > 10× prev → +35 (bot burst pattern)
//   - Velocity >150K/hr       → +30
//   - First snapshot ever with >1M views → +25 (artificially inflated account)
func Score(in Input) int {
	if in.DeltaViews < 0 {
		return 100
	}

	score := 0

	// ── Absolute volume check ───────────────────────────────────────────
	if in.DeltaViews > 500_000 {
		score += 40
	} else if in.DeltaViews > 100_000 {
		score += 20
	}

	// ── Spike check (relative to previous delta) ────────────────────────
	if in.PreviousDelta > 0 && in.DeltaViews > in.PreviousDelta*10 {
		score += 35
	}

	// ── Velocity check ──────────────────────────────────────────────────
	if in.TimeSinceLast > 0 {
		hours := in.TimeSinceLast.Hours()
		if hours > 0 {
			perHour := float64(in.DeltaViews) / hours
			if perHour > 150_000 {
				score += 30
			}
		}
	}

	// ── Suspicious first-snapshot: 0 → >1M in one go ───────────────────
	if in.TotalViewsBefore == 0 && in.DeltaViews > 1_000_000 {
		score += 25
	}

	if score > 100 {
		return 100
	}
	return score
}

// IsFraud returns true when the score crosses the flag threshold.
func IsFraud(score int) bool {
	return score >= 70
}
