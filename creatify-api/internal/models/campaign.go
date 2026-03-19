package models

import "time"

type Campaign struct {
	ID          string    `json:"id" db:"id"`
	BrandID     string    `json:"brand_id" db:"brand_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	Budget      float64   `json:"budget" db:"budget"`
	Status      string    `json:"status" db:"status"` // draft | active | paused | completed
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
