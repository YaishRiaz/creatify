// Package db manages the global PostgreSQL connection pool.
// Call Connect() once at startup; use DB everywhere else.
package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// DB is the shared connection pool. It is safe for concurrent use.
var DB *sql.DB

// Connect opens and verifies the database connection.
// It reads DATABASE_URL from the environment and fatals if missing or unreachable.
func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Connection pool tuning.
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(10)
	DB.SetConnMaxLifetime(5 * time.Minute)
	DB.SetConnMaxIdleTime(2 * time.Minute)

	if err = DB.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("✓ Database connected")
}

// Close releases the connection pool. Call via defer in main().
func Close() {
	if DB != nil {
		DB.Close()
	}
}
