// Package youtube wraps the YouTube Data API v3 for fetching video statistics.
// Only videos.list is used (costs 1 quota unit per call; free tier = 10,000/day).
package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
)

const youtubeAPIBase = "https://www.googleapis.com/youtube/v3"

// Client holds credentials and the HTTP client.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a YouTube client reading YOUTUBE_API_KEY from the environment.
func NewClient() *Client {
	return &Client{
		apiKey: os.Getenv("YOUTUBE_API_KEY"),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// YouTubeResponse is the parsed response from the YouTube Data API v3.
type YouTubeResponse struct {
	Items []struct {
		Statistics struct {
			ViewCount    string `json:"viewCount"`
			LikeCount    string `json:"likeCount"`
			CommentCount string `json:"commentCount"`
		} `json:"statistics"`
	} `json:"items"`
}

// GetVideoViews returns views, likes, and comments for a YouTube video ID.
// videoID is the 11-character ID (e.g. "dQw4w9WgXcQ"), not the full URL.
func (c *Client) GetVideoViews(ctx context.Context, videoID string) (int64, int64, int64, error) {
	if c.apiKey == "" {
		return 0, 0, 0, fmt.Errorf("YOUTUBE_API_KEY not set")
	}

	url := fmt.Sprintf("%s/videos?part=statistics&id=%s&key=%s", youtubeAPIBase, videoID, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, 0, 0, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("youtube API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, 0, fmt.Errorf("youtube API returned status %d", resp.StatusCode)
	}

	var ytResp YouTubeResponse
	if err := json.NewDecoder(resp.Body).Decode(&ytResp); err != nil {
		return 0, 0, 0, fmt.Errorf("failed to decode youtube response: %w", err)
	}

	if len(ytResp.Items) == 0 {
		return 0, 0, 0, fmt.Errorf("video %s not found or is private", videoID)
	}

	stats := ytResp.Items[0].Statistics
	views, _ := strconv.ParseInt(stats.ViewCount, 10, 64)
	likes, _ := strconv.ParseInt(stats.LikeCount, 10, 64)
	comments, _ := strconv.ParseInt(stats.CommentCount, 10, 64)

	return views, likes, comments, nil
}
