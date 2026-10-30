package main

import (
	"context"
	_ "embed"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schema string

type noteStore interface {
	List(context.Context, []string, *cursor, int) (page, error)
	Create(context.Context, newNote) (note, error)
	Updates(context.Context, []string, *cursor) (int64, error)
	Ping(context.Context) error
}

type postgresStore struct{ pool *pgxpool.Pool }

func openStore(ctx context.Context, databaseURL string) (*postgresStore, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	config.MaxConns = 10
	config.MinConns = 1
	config.ConnConfig.ConnectTimeout = 5 * time.Second
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, err
	}
	return &postgresStore{pool: pool}, nil
}

func (s *postgresStore) Ping(ctx context.Context) error { return s.pool.Ping(ctx) }

func (s *postgresStore) List(ctx context.Context, selected []string, before *cursor, limit int) (page, error) {
	result := page{Notes: []note{}}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, "SELECT count(*) FROM notes WHERE category = ANY($1::text[])", selected).Scan(&result.Total); err != nil {
		return result, err
	}
	var head note
	err = tx.QueryRow(ctx, "SELECT id::text, created_at FROM notes WHERE category = ANY($1::text[]) ORDER BY created_at DESC, id DESC LIMIT 1", selected).Scan(&head.ID, &head.CreatedAt)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	if err == nil {
		value := encodeCursor(head)
		result.HeadCursor = &value
	}
	query := "SELECT id::text, content, category, author, paper_size, created_at, layout, owner_hash FROM notes WHERE category = ANY($1::text[])"
	args := []any{selected}
	if before != nil {
		query += " AND (created_at, id) < ($2, $3::bigint)"
		args = append(args, before.Time, before.ID)
		query += " ORDER BY created_at DESC, id DESC LIMIT $4"
	} else {
		query += " ORDER BY created_at DESC, id DESC LIMIT $2"
	}
	args = append(args, limit+1)
	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return result, err
	}
	for rows.Next() {
		var item note
		if err := rows.Scan(&item.ID, &item.Content, &item.Category, &item.Author, &item.PaperSize, &item.CreatedAt, &item.Layout, &item.Owner); err != nil {
			rows.Close()
			return result, err
		}
		result.Notes = append(result.Notes, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	if len(result.Notes) > limit {
		result.Notes = result.Notes[:limit]
		value := encodeCursor(result.Notes[limit-1])
		result.NextCursor = &value
	}
	return result, tx.Commit(ctx)
}

func (s *postgresStore) Create(ctx context.Context, input newNote) (note, error) {
	var result note
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	// Serialize placement checks with inserts so simultaneous visitors cannot claim the same space.
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(73190421)"); err != nil {
		return result, err
	}
	rows, err := tx.Query(ctx, "SELECT id::text, layout, owner_hash FROM notes ORDER BY id")
	if err != nil {
		return result, err
	}
	existing := []note{}
	for rows.Next() {
		var n note
		if err = rows.Scan(&n.ID, &n.Layout, &n.Owner); err != nil {
			rows.Close()
			return result, err
		}
		existing = append(existing, n)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	if input.Layout == nil {
		// Compatibility for older clients; current clients always choose coordinates themselves.
		input.Layout = &placement{X: -160, Y: -160, Width: 320, Height: 320, Color: "yellow", Kind: "note"}
		if len(existing) > 0 {
			right := existing[0].Layout
			for _, n := range existing {
				if n.Layout.X+n.Layout.Width > right.X+right.Width {
					right = n.Layout
				}
			}
			input.Layout.X = right.X + right.Width + 40
			input.Layout.Y = right.Y
		}
	}
	if err = checkPlacement(input.Layout, existing, input.Owner); err != nil {
		return result, &placementError{err}
	}
	if input.PaperSize == "" {
		input.PaperSize = "auto"
	}
	err = tx.QueryRow(ctx, "INSERT INTO notes (content, category, author, paper_size, layout, owner_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text, content, category, author, paper_size, created_at, layout, owner_hash", input.Content, input.Category, input.Author, input.PaperSize, input.Layout, input.Owner).Scan(&result.ID, &result.Content, &result.Category, &result.Author, &result.PaperSize, &result.CreatedAt, &result.Layout, &result.Owner)
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

type placementError struct{ error }

func (s *postgresStore) Updates(ctx context.Context, selected []string, after *cursor) (int64, error) {
	query := "SELECT count(*) FROM notes WHERE category = ANY($1::text[])"
	args := []any{selected}
	if after != nil {
		query += " AND (created_at, id) > ($2, $3::bigint)"
		args = append(args, after.Time, after.ID)
	}
	var count int64
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}
