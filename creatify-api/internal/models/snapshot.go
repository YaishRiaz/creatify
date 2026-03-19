package models

import "time"

type ViewSnapshot struct {
	ID          string    `json:"id" db:"id"`
	TaskID      string    `json:"task_id" db:"task_id"`
	ViewCount   int64     `json:"view_count" db:"view_count"`
	LikeCount   int64     `json:"like_count" db:"like_count"`
	CommentCount int64    `json:"comment_count" db:"comment_count"`
	CapturedAt  time.Time `json:"captured_at" db:"captured_at"`
}
