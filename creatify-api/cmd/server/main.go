package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"creatify-api/internal/db"
	"creatify-api/internal/handlers"
	"creatify-api/internal/middleware"
	"creatify-api/internal/workers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// ── Database ─────────────────────────────────────────────────────────────
	db.Connect()
	defer db.Close()

	// ── Polling worker ────────────────────────────────────────────────────────
	worker := workers.New(db.DB)
	go worker.Start()

	// ── HTTP server ───────────────────────────────────────────────────────────
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

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
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Start HTTP server in background.
	go func() {
		log.Printf("HTTP server starting on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

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
	log.Println("Server exited cleanly")
}
