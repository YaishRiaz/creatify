package models

import "time"

type Task struct {
	ID          string    `json:"id" db:"id"`
	CampaignID  string    `json:"campaign_id" db:"campaign_id"`
	CreatorID   string    `json:"creator_id" db:"creator_id"`
	Status      string    `json:"status" db:"status"`
	Platform    string    `json:"platform" db:"platform"`
	PostURL     string    `json:"post_url" db:"post_url"`
	PostID      string    `json:"post_id" db:"post_id"`
	TotalViews  int64     `json:"total_views" db:"total_views"`
	TotalEarned float64   `json:"total_earned" db:"total_earned"`
	FraudScore  int       `json:"fraud_score" db:"fraud_score"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
