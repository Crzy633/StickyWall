package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresPaginationFilteringAndPersistence(t *testing.T) {
	dsn := os.Getenv("DATABASE_TEST_URL")
	if dsn == "" {
		t.Skip("set DATABASE_TEST_URL to run isolated PostgreSQL integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schemaName := fmt.Sprintf("stickywall_test_%d", time.Now().UnixNano())
	quoted := pgx.Identifier{schemaName}.Sanitize()
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(context.Background(), "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schemaName
	pool, err := pgxpool.NewWithConfig(ctx, config.Copy())
	if err != nil {
		t.Fatal(err)
	}
	defer func() { pool.Close() }()
	if _, err := pool.Exec(ctx, `CREATE TABLE notes (
		id BIGSERIAL PRIMARY KEY,
		content TEXT NOT NULL,
		category TEXT NOT NULL,
		author TEXT NOT NULL DEFAULT '',
		created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
	)`); err != nil {
		t.Fatal(err)
	}
	s := &postgresStore{pool: pool}
	fixed := time.Now().Add(-time.Hour).Truncate(time.Microsecond)
	for _, category := range []string{"daily", "joy", "daily"} {
		if _, err := pool.Exec(ctx, "INSERT INTO notes(content,category,created_at) VALUES('测试留言',$1,$2)", category, fixed); err != nil {
			t.Fatal(err)
		}
	}
	for range 2 {
		if _, err := pool.Exec(ctx, schema); err != nil {
			t.Fatal(err)
		}
	}
	first, err := s.List(ctx, categories, nil, 1)
	if err != nil {
		t.Fatal(err)
	}
	if first.Total != 3 || len(first.Notes) != 1 || first.Notes[0].ID != "3" || first.Notes[0].PaperSize != "auto" || first.NextCursor == nil || first.HeadCursor == nil {
		t.Fatalf("first page: %#v", first)
	}
	if first.Notes[0].Layout == nil || first.Notes[0].Layout.Width != 360 {
		t.Fatal("legacy positions were not migrated")
	}
	before, err := decodeCursor(*first.NextCursor)
	if err != nil {
		t.Fatal(err)
	}
	head, err := decodeCursor(*first.HeadCursor)
	if err != nil {
		t.Fatal(err)
	}
	created, err := s.Create(ctx, newNote{Content: "新留言", Category: "wishes", Author: "路人", PaperSize: "large"})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID != "4" || created.Content != "新留言" || created.PaperSize != "large" {
		t.Fatalf("created: %#v", created)
	}
	second, err := s.List(ctx, categories, before, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(second.Notes) != 2 || second.Notes[0].ID != "2" || second.Notes[1].ID != "1" || second.NextCursor != nil {
		t.Fatalf("insertion broke cursor page: %#v", second)
	}
	filtered, err := s.List(ctx, []string{"daily"}, nil, 12)
	if err != nil || filtered.Total != 2 || len(filtered.Notes) != 2 {
		t.Fatalf("filter: %#v, %v", filtered, err)
	}
	count, err := s.Updates(ctx, categories, head)
	if err != nil || count != 1 {
		t.Fatalf("updates: %d, %v", count, err)
	}
	count, err = s.Updates(ctx, []string{"daily"}, head)
	if err != nil || count != 0 {
		t.Fatalf("filtered updates: %d, %v", count, err)
	}
	pool.Close()
	pool, err = pgxpool.NewWithConfig(ctx, config.Copy())
	if err != nil {
		t.Fatal(err)
	}
	s.pool = pool
	continued, err := s.List(ctx, categories, nil, 12)
	if err != nil || continued.Total != 4 || continued.Notes[0].ID != "4" || continued.Notes[0].PaperSize != "large" {
		t.Fatalf("reconnected persistence: %#v, %v", continued, err)
	}
}

func TestConcurrentPlacementAndOwnershipPersistence(t *testing.T) {
	dsn := os.Getenv("DATABASE_TEST_URL")
	if dsn == "" {
		t.Skip("set DATABASE_TEST_URL")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	name := fmt.Sprintf("stickywall_space_%d", time.Now().UnixNano())
	quoted := pgx.Identifier{name}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE")
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = name
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err = pool.Exec(ctx, schema); err != nil {
		t.Fatal(err)
	}
	s := &postgresStore{pool: pool}
	input := newNote{Content: "并发位置测试", Category: "daily", Owner: "alice", Layout: testPaper(-160, -160)}
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() { defer wg.Done(); _, err := s.Create(ctx, input); results <- err }()
	}
	wg.Wait()
	close(results)
	success, conflicts := 0, 0
	for err := range results {
		if err == nil {
			success++
		} else {
			var e *placementError
			if errors.As(err, &e) {
				conflicts++
			} else {
				t.Fatal(err)
			}
		}
	}
	if success != 1 || conflicts != 1 {
		t.Fatalf("success=%d conflicts=%d", success, conflicts)
	}
	page, err := s.List(ctx, categories, nil, 50)
	if err != nil || len(page.Notes) != 1 {
		t.Fatalf("list: %#v %v", page, err)
	}
	root := page.Notes[0]
	if root.Owner != "alice" || root.Layout.X != -160 {
		t.Fatal("ownership or chosen position not persisted")
	}
	child := newNote{Content: "叠贴", Category: "daily", Owner: "bob", Layout: testPaper(-120, 0)}
	child.Layout.ParentID = root.ID
	if _, err = s.Create(ctx, child); err == nil {
		t.Fatal("server accepted another owner's parent")
	}
	child.Owner = "alice"
	saved, err := s.Create(ctx, child)
	if err != nil {
		t.Fatal(err)
	}
	page, err = s.List(ctx, categories, nil, 50)
	if err != nil || len(page.Notes) != 2 || page.Notes[0].Layout.ParentID != root.ID || page.Notes[0].ID != saved.ID {
		t.Fatalf("stack was not persisted: %#v %v", page, err)
	}
	if _, err = pool.Exec(ctx, schema); err != nil {
		t.Fatal(err)
	}
	page, err = s.List(ctx, categories, nil, 50)
	if err != nil || page.Notes[0].Layout.X != -120 || page.Notes[0].Layout.Y != 0 {
		t.Fatal("migration moved an existing placement")
	}
}
