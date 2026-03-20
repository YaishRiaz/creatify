// Package workers contains the background polling engine scheduler.
// The PollingWorker wraps PollingService with a cron schedule and
// graceful shutdown. All business logic lives in services.PollingService.
package workers

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"creatify-api/internal/services"
	"github.com/robfig/cron/v3"
)

// PollingWorker schedules and manages the polling service.
type PollingWorker struct {
	service *services.PollingService
	cron    *cron.Cron
}

// NewPollingWorker creates a PollingWorker ready to start.
func NewPollingWorker() *PollingWorker {
	return &PollingWorker{
		service: services.NewPollingService(),
		cron:    cron.New(cron.WithSeconds()),
	}
}

// Start begins the polling schedule and blocks until SIGTERM/SIGINT.
func (w *PollingWorker) Start() {
	log.Println("Starting Creatify polling worker...")

	// Optional: run a poll immediately on startup (useful for testing).
	if os.Getenv("POLL_ON_STARTUP") == "true" {
		log.Println("Running initial poll on startup...")
		ctx := context.Background()
		w.service.CheckExpiredCampaigns(ctx)
		w.service.RunPollCycle(ctx)
	}

	// Schedule: every 6 hours at second 0, minute 0.
	// "0 0 */6 * * *" = at 00:00, 06:00, 12:00, 18:00 every day.
	_, err := w.cron.AddFunc("0 0 */6 * * *", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Hour)
		defer cancel()

		w.service.CheckExpiredCampaigns(ctx)
		w.service.RunPollCycle(ctx)
	})
	if err != nil {
		log.Fatalf("Failed to schedule polling job: %v", err)
	}

	// Dev mode: poll every 5 minutes when DEV_FAST_POLL=true.
	if os.Getenv("DEV_FAST_POLL") == "true" {
		log.Println("DEV MODE: Fast polling every 5 minutes")
		_, _ = w.cron.AddFunc("0 */5 * * * *", func() {
			ctx := context.Background()
			w.service.RunPollCycle(ctx)
		})
	}

	w.cron.Start()
	log.Println("Polling worker started. Next run in up to 6 hours.")
	log.Println("Set POLL_ON_STARTUP=true to run immediately on start.")
	log.Println("Set DEV_FAST_POLL=true for 5-minute polling in dev.")

	// Graceful shutdown: wait for current cycle to finish.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down polling worker...")
	stopCtx := w.cron.Stop()
	<-stopCtx.Done()
	log.Println("Polling worker stopped cleanly.")
}
