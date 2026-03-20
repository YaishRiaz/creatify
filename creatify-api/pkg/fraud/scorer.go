// Package fraud provides heuristic fraud scoring for view count deltas.
// Score 0-100. Tasks scoring >= 70 are flagged for manual review.
package fraud

import (
	"math"
)

// ScoreInput contains all signals needed to score a single poll delta.
type ScoreInput struct {
	// Current poll data
	DeltaViews    int64
	DeltaLikes    int64
	DeltaComments int64

	// Historical data
	PreviousDeltas   []int64 // last N delta_views values
	TotalViewsSoFar  int64
	TotalEarnedCents int64

	// Account signals
	AccountAgeDays    int // 0 if unknown
	PreviousFlagCount int

	// Platform
	Platform string
}

// ScoreResult holds the fraud score and reasons.
type ScoreResult struct {
	Score   int
	Reasons []string
	Flagged bool
}

// Score calculates a fraud risk score 0-100.
// Above 70 = flagged; earnings are withheld for manual review.
func Score(input ScoreInput) ScoreResult {
	score := 0
	var reasons []string

	// --- CHECK 1: Engagement ratio ---
	// Real views have proportional engagement.
	// Bot views have near-zero likes and comments.
	if input.DeltaViews > 1000 {
		engagementRate := float64(input.DeltaLikes+input.DeltaComments) /
			float64(input.DeltaViews)

		if engagementRate < 0.001 {
			score += 40
			reasons = append(reasons, "near-zero engagement on high view count")
		} else if engagementRate < 0.005 {
			score += 20
			reasons = append(reasons, "below-average engagement ratio")
		}
	}

	// --- CHECK 2: Velocity spike ---
	// Sudden massive spike compared to average previous deltas
	// indicates purchased views.
	if len(input.PreviousDeltas) >= 2 {
		var sum int64
		for _, d := range input.PreviousDeltas {
			sum += d
		}
		avgDelta := sum / int64(len(input.PreviousDeltas))

		if avgDelta > 0 {
			spikeFactor := float64(input.DeltaViews) / float64(avgDelta)
			if spikeFactor > 20 {
				score += 35
				reasons = append(reasons, "extreme velocity spike (20x normal)")
			} else if spikeFactor > 10 {
				score += 20
				reasons = append(reasons, "high velocity spike (10x normal)")
			} else if spikeFactor > 5 {
				score += 10
				reasons = append(reasons, "moderate velocity spike (5x normal)")
			}
		}
	}

	// --- CHECK 3: New account ---
	// Accounts created < 30 days ago are higher risk.
	if input.AccountAgeDays > 0 && input.AccountAgeDays < 30 {
		score += 15
		reasons = append(reasons, "account created less than 30 days ago")
	}

	// --- CHECK 4: Repeat offender ---
	// Previous fraud flags increase suspicion.
	if input.PreviousFlagCount > 0 {
		score += input.PreviousFlagCount * 15
		if score > 100 {
			score = 100
		}
		reasons = append(reasons, "account has previous fraud flags")
	}

	// --- CHECK 5: Round number anomaly ---
	// Purchased views often come in exact round numbers.
	if input.DeltaViews > 5000 {
		mod10k := input.DeltaViews % 10000
		mod1k := input.DeltaViews % 1000
		if mod10k == 0 {
			score += 10
			reasons = append(reasons, "suspiciously round view count (multiple of 10,000)")
		} else if mod1k == 0 {
			score += 5
		}
	}

	// Cap at 100.
	if score > 100 {
		score = 100
	}

	_ = math.Round(float64(score)) // keep math import used

	return ScoreResult{
		Score:   score,
		Reasons: reasons,
		Flagged: score >= 70,
	}
}
