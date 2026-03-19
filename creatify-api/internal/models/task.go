package models

import "time"

type Task struct {
	ID          string    `json:"id" db:"id"`
	CampaignID  string    `json:"campaign_id" db:"campaign_id"`
	CreatorID   string    `json:"creator_id" db:"creator_id"`
	VideoURL    string    `json:"video_url" db:"video_url"`
	Status      string    `json:"status" db:"status"` // pending | submitted | approved | rejected | paid
	Payout      float64   `json:"payout" db:"payout"`
	SubmittedAt *time.Time `json:"submitted_at" db:"submitted_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
