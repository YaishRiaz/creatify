package models

import (
	"database/sql"
	"time"
)

// TaskForPolling carries everything the polling worker needs for one task,
// loaded in a single JOIN query to minimise round-trips.
// All monetary values are stored as integer cents (1 LKR = 100 cents).
type TaskForPolling struct {
	ID              string
	CampaignID      string
	CreatorID       string // creator_profiles.id (NOT users.id)
	Platform        string
	PostURL         string
	PostID          string
	Status          string
	TotalViews      int64
	TotalEarned     int64        // cents
	FraudScore      int
	PayoutRate      int64        // cents per 1,000 views
	BudgetRemaining int64        // cents
	PerCreatorCap   sql.NullInt64 // cents; invalid = no cap
	CreatorUserID   string       // users.id, for notifications
}

// ViewSnapshotRecord is what gets written to view_snapshots after each poll.
type ViewSnapshotRecord struct {
	TaskID          string
	ViewsAtSnapshot int64
	DeltaViews      int64
	EarningsAdded   int64 // cents
	FraudScore      int
	SnapshotTakenAt time.Time
}

// PollResult is the computed output for one task after fetching live view counts.
type PollResult struct {
	TaskID        string
	Platform      string
	CurrentViews  int64
	DeltaViews    int64
	EarningsAdded int64 // cents
	FraudScore    int
	Flagged       bool
	BudgetDepleted bool
}
