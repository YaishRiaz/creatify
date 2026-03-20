// Package youtube wraps the YouTube Data API v3 for fetching video statistics.
// Only videos.list is used (costs 1 quota unit per call; free tier = 10,000/day).
package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

const apiBase = "https://www.googleapis.com/youtube/v3"

// ViewData holds the normalised view statistics for a single video.
type ViewData struct {
	Views    int64
	Likes    int64
	Comments int64
}

// Client holds credentials and the HTTP client.
type Client struct {
	apiKey string
	http   *http.Client
}

// New creates a YouTube client with a 30-second timeout.
func New(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{Timeout: 30 * time.Second},
	}
}

// FetchVideo returns statistics for a single YouTube video ID.
// videoID is the 11-character ID (e.g. "dQw4w9WgXcQ"), not the full URL.
func (c *Client) FetchVideo(ctx context.Context, videoID string) (*ViewData, error) {
	url := fmt.Sprintf("%s/videos?part=statistics&id=%s&key=%s", apiBase, videoID, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("youtube API status %d: %s", resp.StatusCode, truncate(string(raw), 200))
	}

	var result struct {
		Items []struct {
			Statistics struct {
				ViewCount    string `json:"viewCount"`
				LikeCount    string `json:"likeCount"`
				CommentCount string `json:"commentCount"`
			} `json:"statistics"`
		} `json:"items"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if len(result.Items) == 0 {
		return nil, fmt.Errorf("video %s not found or is private", videoID)
	}

	stats := result.Items[0].Statistics
	return &ViewData{
		Views:    parseCount(stats.ViewCount),
		Likes:    parseCount(stats.LikeCount),
		Comments: parseCount(stats.CommentCount),
	}, nil
}

func parseCount(s string) int64 {
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
