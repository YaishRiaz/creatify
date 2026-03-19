package models

import "time"

type Payout struct {
	ID          string    `json:"id" db:"id"`
	CreatorID   string    `json:"creator_id" db:"creator_id"`
	Amount      float64   `json:"amount" db:"amount"`
	Status      string    `json:"status" db:"status"` // pending | processing | completed | failed
	Reference   string    `json:"reference" db:"reference"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
