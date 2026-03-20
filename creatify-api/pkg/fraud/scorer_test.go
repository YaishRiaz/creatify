package fraud

import (
	"testing"
)

func TestFraudScorer(t *testing.T) {
	// Test 1: Clean post — low score
	result := Score(ScoreInput{
		DeltaViews:    5000,
		DeltaLikes:    150,
		DeltaComments: 45,
		Platform:      "tiktok",
	})
	if result.Score >= 70 {
		t.Errorf("Expected clean post, got score %d", result.Score)
	}

	// Test 2: Zero engagement — high score
	result2 := Score(ScoreInput{
		DeltaViews:    50000,
		DeltaLikes:    0,
		DeltaComments: 0,
		Platform:      "tiktok",
	})
	if result2.Score < 40 {
		t.Errorf("Expected high fraud score for zero engagement, got %d", result2.Score)
	}

	// Test 3: Velocity spike — should be flagged
	result3 := Score(ScoreInput{
		DeltaViews:     100000,
		DeltaLikes:     10,
		DeltaComments:  2,
		PreviousDeltas: []int64{1000, 1200, 900, 1100},
		Platform:       "instagram",
	})
	if !result3.Flagged {
		t.Errorf("Expected velocity spike to be flagged, score was %d", result3.Score)
	}
}
