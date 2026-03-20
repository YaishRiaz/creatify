package models

import "time"

// ViewSnapshot matches the view_snapshots table schema.
// Fields align with what the frontend queries via Supabase.
type ViewSnapshot struct {
	ID              string    `json:"id" db:"id"`
	TaskID          string    `json:"task_id" db:"task_id"`
	ViewsAtSnapshot int64     `json:"views_at_snapshot" db:"views_at_snapshot"`
	DeltaViews      int64     `json:"delta_views" db:"delta_views"`
	EarningsAdded   float64   `json:"earnings_added" db:"earnings_added"`
	FraudScore      int       `json:"fraud_score" db:"fraud_score"`
	SnapshottedAt   time.Time `json:"snapshotted_at" db:"snapshotted_at"`
}
