// Package apify wraps the Apify platform API for scraping social media view counts.
// Uses the async actor run pattern: start run → poll status → fetch dataset.
package apify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const (
	baseURL = "https://api.apify.com/v2"

	tiktokActorID = "clockworks/free-tiktok-scraper"
	igActorID     = "apify/instagram-scraper"
	fbActorID     = "apify/facebook-scraper"

	pollInterval = 3 * time.Second
	maxWaitTime  = 60 * time.Second
)

// Client holds the HTTP client and credentials.
type Client struct {
	apiToken   string
	httpClient *http.Client
}

// NewClient creates an Apify client reading APIFY_API_TOKEN from the environment.
func NewClient() *Client {
	return &Client{
		apiToken: os.Getenv("APIFY_API_TOKEN"),
		httpClient: &http.Client{
			Timeout: 90 * time.Second,
		},
	}
}

// ActorRunResponse is the response from starting an actor run.
type ActorRunResponse struct {
	Data struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	} `json:"data"`
}

// RunStatusResponse is the response when polling run status.
type RunStatusResponse struct {
	Data struct {
		Status           string `json:"status"`
		DefaultDatasetID string `json:"defaultDatasetId"`
	} `json:"data"`
}

// GetTikTokViews fetches view count for a public TikTok video URL.
// Returns views, likes, comments.
func (c *Client) GetTikTokViews(ctx context.Context, videoURL string) (int64, int64, int64, error) {
	input := map[string]interface{}{
		"postURLs":             []string{videoURL},
		"resultsPerPage":       1,
		"shouldDownloadVideos": false,
		"shouldDownloadCovers": false,
	}

	datasetID, err := c.runActor(ctx, tiktokActorID, input)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("tiktok actor failed: %w", err)
	}

	items, err := c.getDatasetItems(ctx, datasetID)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to get tiktok results: %w", err)
	}
	if len(items) == 0 {
		return 0, 0, 0, fmt.Errorf("no data returned for tiktok video")
	}

	item := items[0]
	views := int64(getFloat(item, "playCount"))
	likes := int64(getFloat(item, "diggCount"))
	comments := int64(getFloat(item, "commentCount"))

	return views, likes, comments, nil
}

// GetInstagramViews fetches view count for a public Instagram reel or post URL.
// Returns views, likes, comments.
func (c *Client) GetInstagramViews(ctx context.Context, postURL string) (int64, int64, int64, error) {
	input := map[string]interface{}{
		"directUrls":    []string{postURL},
		"resultsType":   "posts",
		"resultsLimit":  1,
		"addParentData": false,
	}

	datasetID, err := c.runActor(ctx, igActorID, input)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("instagram actor failed: %w", err)
	}

	items, err := c.getDatasetItems(ctx, datasetID)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to get instagram results: %w", err)
	}
	if len(items) == 0 {
		return 0, 0, 0, fmt.Errorf("no data returned for instagram post")
	}

	item := items[0]
	// Instagram uses videoViewCount for reels; fall back to likesCount for image posts.
	views := int64(getFloat(item, "videoViewCount"))
	if views == 0 {
		views = int64(getFloat(item, "likesCount"))
	}
	likes := int64(getFloat(item, "likesCount"))
	comments := int64(getFloat(item, "commentsCount"))

	return views, likes, comments, nil
}

// GetFacebookViews fetches view count for a public Facebook video URL.
// Returns views, likes, comments.
func (c *Client) GetFacebookViews(ctx context.Context, postURL string) (int64, int64, int64, error) {
	input := map[string]interface{}{
		"startUrls":    []map[string]string{{"url": postURL}},
		"resultsLimit": 1,
	}

	datasetID, err := c.runActor(ctx, fbActorID, input)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("facebook actor failed: %w", err)
	}

	items, err := c.getDatasetItems(ctx, datasetID)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to get facebook results: %w", err)
	}
	if len(items) == 0 {
		return 0, 0, 0, fmt.Errorf("no data returned for facebook post")
	}

	item := items[0]
	views := int64(getFloat(item, "videoViewCount"))
	likes := int64(getFloat(item, "likesCount"))
	comments := int64(getFloat(item, "commentsCount"))

	return views, likes, comments, nil
}

// runActor POSTs to /acts/{id}/runs, then polls /actor-runs/{runId} until
// the run reaches a terminal state. Returns the defaultDatasetId on success.
func (c *Client) runActor(ctx context.Context, actorID string, input interface{}) (string, error) {
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return "", fmt.Errorf("failed to marshal input: %w", err)
	}

	url := fmt.Sprintf("%s/acts/%s/runs?token=%s", baseURL, actorID, c.apiToken)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(inputJSON))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to start actor: %w", err)
	}
	defer resp.Body.Close()

	var runResp ActorRunResponse
	if err := json.NewDecoder(resp.Body).Decode(&runResp); err != nil {
		return "", fmt.Errorf("failed to decode run response: %w", err)
	}

	runID := runResp.Data.ID
	if runID == "" {
		return "", fmt.Errorf("no run ID returned from Apify")
	}

	// Poll for completion.
	deadline := time.Now().Add(maxWaitTime)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(pollInterval):
		}

		statusURL := fmt.Sprintf("%s/actor-runs/%s?token=%s", baseURL, runID, c.apiToken)

		statusResp, err := c.httpClient.Get(statusURL)
		if err != nil {
			continue // retry on transient network error
		}

		var status RunStatusResponse
		body, _ := io.ReadAll(statusResp.Body)
		statusResp.Body.Close()
		json.Unmarshal(body, &status) //nolint:errcheck

		switch status.Data.Status {
		case "SUCCEEDED":
			return status.Data.DefaultDatasetID, nil
		case "FAILED", "ABORTED", "TIMED-OUT":
			return "", fmt.Errorf("actor run %s ended with status: %s", runID, status.Data.Status)
		}
		// RUNNING or READY — keep polling.
	}

	return "", fmt.Errorf("actor run timed out after %v", maxWaitTime)
}

// getDatasetItems retrieves results from a completed actor run dataset.
func (c *Client) getDatasetItems(ctx context.Context, datasetID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/datasets/%s/items?token=%s&format=json&limit=10", baseURL, datasetID, c.apiToken)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch dataset: %w", err)
	}
	defer resp.Body.Close()

	var items []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		return nil, fmt.Errorf("failed to decode items: %w", err)
	}

	return items, nil
}

// getFloat safely extracts a float64 from a map.
func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		}
	}
	return 0
}
