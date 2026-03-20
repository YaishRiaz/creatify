// Package apify wraps the Apify platform API for scraping social media view counts.
// TikTok, Instagram, and Facebook views are fetched through Apify actors because
// those platforms have no public official API for view counts.
package apify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	baseURL = "https://api.apify.com/v2"

	// Actor IDs — these are well-maintained public actors on Apify.
	actorTikTok    = "clockworks~free-tiktok-scraper"
	actorInstagram = "apify~instagram-scraper"
	actorFacebook  = "apify~facebook-video-scraper"

	// run-sync-get-dataset-items blocks until the run finishes and returns items.
	// Apify enforces a 5-min hard limit; we set our own 30s via context.
	runSyncPath = "/acts/%s/run-sync-get-dataset-items"
)

// ViewData is the normalised result returned by all platform scrapers.
type ViewData struct {
	Views    int64
	Likes    int64
	Comments int64
}

// Client holds the HTTP client and credentials.
type Client struct {
	token  string
	http   *http.Client
}

// New creates an Apify client with a 30-second timeout on all calls.
func New(apiToken string) *Client {
	return &Client{
		token: apiToken,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FetchTikTok returns view stats for a public TikTok video URL.
func (c *Client) FetchTikTok(ctx context.Context, postURL string) (*ViewData, error) {
	input := map[string]interface{}{
		"postURLs": []string{postURL},
		"maxItems": 1,
	}
	items, err := c.runSync(ctx, actorTikTok, input)
	if err != nil {
		return nil, fmt.Errorf("tiktok scrape: %w", err)
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("tiktok scrape: no items returned for %s", postURL)
	}
	item := items[0]
	return &ViewData{
		Views:    int64Field(item, "playCount", "videoPlayCount"),
		Likes:    int64Field(item, "diggCount", "likesCount"),
		Comments: int64Field(item, "commentCount"),
	}, nil
}

// FetchInstagram returns view stats for a public Instagram reel or post URL.
func (c *Client) FetchInstagram(ctx context.Context, postURL string) (*ViewData, error) {
	input := map[string]interface{}{
		"directUrls":   []string{postURL},
		"resultsType":  "posts",
		"resultsLimit": 1,
	}
	items, err := c.runSync(ctx, actorInstagram, input)
	if err != nil {
		return nil, fmt.Errorf("instagram scrape: %w", err)
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("instagram scrape: no items returned for %s", postURL)
	}
	item := items[0]
	return &ViewData{
		Views:    int64Field(item, "videoViewCount", "videoPlayCount"),
		Likes:    int64Field(item, "likesCount", "likesCount"),
		Comments: int64Field(item, "commentsCount"),
	}, nil
}

// FetchFacebook returns view stats for a public Facebook video URL.
func (c *Client) FetchFacebook(ctx context.Context, postURL string) (*ViewData, error) {
	input := map[string]interface{}{
		"startUrls": []map[string]string{{"url": postURL}},
		"maxItems":  1,
	}
	items, err := c.runSync(ctx, actorFacebook, input)
	if err != nil {
		return nil, fmt.Errorf("facebook scrape: %w", err)
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("facebook scrape: no items returned for %s", postURL)
	}
	item := items[0]
	return &ViewData{
		Views:    int64Field(item, "videoViewCount", "viewCount"),
		Likes:    int64Field(item, "likesCount", "reactionsCount"),
		Comments: int64Field(item, "commentsCount"),
	}, nil
}

// runSync calls the Apify run-sync-get-dataset-items endpoint.
// It posts the actor input, waits for the run to finish, and returns the dataset items.
func (c *Client) runSync(ctx context.Context, actorID string, input interface{}) ([]map[string]interface{}, error) {
	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("marshal input: %w", err)
	}

	url := fmt.Sprintf("%s%s?token=%s&timeout=30&format=json&clean=true",
		baseURL, fmt.Sprintf(runSyncPath, actorID), c.token)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("apify status %d: %s", resp.StatusCode, truncate(string(raw), 200))
	}

	var items []map[string]interface{}
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return items, nil
}

// int64Field reads the first matching key from a map as int64.
// Apify actors use different field names across versions; this handles both.
func int64Field(m map[string]interface{}, keys ...string) int64 {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch n := v.(type) {
			case float64:
				return int64(n)
			case int64:
				return n
			case int:
				return int64(n)
			}
		}
	}
	return 0
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
