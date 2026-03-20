package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"creatify-api/internal/db"
	"creatify-api/internal/handlers"
	"creatify-api/internal/middleware"
	"creatify-api/internal/services"
	"creatify-api/internal/workers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// ── Database ─────────────────────────────────────────────────────────────
	db.Connect()
	defer db.Close()

	// ── Gin mode ──────────────────────────────────────────────────────────────
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	var wg sync.WaitGroup

	// ── HTTP server ───────────────────────────────────────────────────────────
	srv := buildHTTPServer()
	wg.Add(1)
	go func() {
		defer wg.Done()
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("HTTP server starting on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// ── Polling worker ────────────────────────────────────────────────────────
	wg.Add(1)
	go func() {
		defer wg.Done()
		worker := workers.NewPollingWorker()
		worker.Start()
	}()

	log.Println("Creatify API running — HTTP + Polling Worker")

	// Graceful shutdown on SIGTERM/SIGINT.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	log.Println("Shutdown signal received — draining HTTP server (30s timeout)")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("HTTP server forced shutdown: %v", err)
	}

	wg.Wait()
	log.Println("Server exited cleanly")
}

func buildHTTPServer() *http.Server {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "creatify-api"})
	})

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		campaigns := v1.Group("/campaigns")
		{
			campaigns.GET("", handlers.ListCampaigns)
			campaigns.POST("", handlers.CreateCampaign)
			campaigns.GET("/:id", handlers.GetCampaign)
		}

		tasks := v1.Group("/tasks")
		{
			tasks.POST("", handlers.CreateTask)
			tasks.GET("/:id", handlers.GetTask)
			tasks.POST("/:id/submit", handlers.SubmitTask)
		}

		wallet := v1.Group("/wallet")
		{
			wallet.GET("", handlers.GetWallet)
			wallet.POST("/withdraw", handlers.RequestWithdrawal)
		}

		// Admin: manually trigger a poll cycle.
		// Protected by X-Poll-Secret header.
		v1.POST("/admin/poll/trigger", func(c *gin.Context) {
			secret := c.GetHeader("X-Poll-Secret")
			if secret == "" || secret != os.Getenv("POLL_SECRET") {
				c.JSON(401, gin.H{"error": "unauthorized"})
				return
			}
			go func() {
				ctx := context.Background()
				svc := services.NewPollingService()
				svc.RunPollCycle(ctx)
			}()
			c.JSON(200, gin.H{
				"message": "Poll cycle triggered in background",
				"time":    time.Now(),
			})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}
}
