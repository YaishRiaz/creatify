package models

import "time"

type Campaign struct {
	ID              string    `json:"id" db:"id"`
	BrandID         string    `json:"brand_id" db:"brand_id"`
	Title           string    `json:"title" db:"title"`
	Description     string    `json:"description" db:"description"`
	Brief           string    `json:"brief" db:"brief"`
	BudgetTotal     float64   `json:"budget_total" db:"budget_total"`
	BudgetRemaining float64   `json:"budget_remaining" db:"budget_remaining"`
	PayoutRate      float64   `json:"payout_rate" db:"payout_rate"`
	PerCreatorCap   float64   `json:"per_creator_cap" db:"per_creator_cap"`
	TargetPlatforms []string  `json:"target_platforms" db:"target_platforms"`
	Status          string    `json:"status" db:"status"`
	StartDate       time.Time `json:"start_date" db:"start_date"`
	EndDate         time.Time `json:"end_date" db:"end_date"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}
