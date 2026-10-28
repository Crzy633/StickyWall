package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return errors.New("DATABASE_URL is required; see server/README.md")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		return errors.New("PORT must be between 1 and 65535")
	}
	rate := 6
	if value := os.Getenv("POSTS_PER_MINUTE"); value != "" {
		rate, err = strconv.Atoi(value)
		if err != nil || rate < 1 {
			return errors.New("POSTS_PER_MINUTE must be a positive integer")
		}
	}
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../web/dist"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	store, err := openStore(ctx, databaseURL)
	cancel()
	if err != nil {
		return fmt.Errorf("initialize PostgreSQL: %w", err)
	}
	defer store.pool.Close()
	app := &application{
		store:     store,
		limiter:   &postLimiter{entries: map[string]rateEntry{}, limit: rate},
		staticDir: staticDir,
	}
	server := &http.Server{
		Addr:              net.JoinHostPort(os.Getenv("BIND_HOST"), port),
		Handler:           app,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 * 1024,
	}
	stop, stopSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignals()
	done := make(chan error, 1)
	go func() {
		slog.Info("stickywall listening", "address", server.Addr, "staticDir", staticDir)
		done <- server.ListenAndServe()
	}()
	select {
	case err := <-done:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-stop.Done():
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			return err
		}
	}
	return nil
}
