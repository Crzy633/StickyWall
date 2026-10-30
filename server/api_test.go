package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type fakeStore struct {
	created []newNote
	fail    bool
}

func (s *fakeStore) List(context.Context, []string, *cursor, int) (page, error) {
	result := page{Notes: []note{}}
	for _, input := range s.created {
		result.Notes = append(result.Notes, note{ID: "1", Layout: input.Layout, Owner: input.Owner, Content: input.Content})
	}
	return result, nil
}
func (s *fakeStore) Create(_ context.Context, input newNote) (note, error) {
	if s.fail {
		return note{}, errors.New("database unavailable")
	}
	s.created = append(s.created, input)
	return note{ID: "1", Content: input.Content, Category: input.Category, Author: input.Author, PaperSize: input.PaperSize, CreatedAt: time.Now(), Layout: input.Layout, Owner: input.Owner}, nil
}

func TestVisitorOwnershipIsPrivateAndPersistent(t *testing.T) {
	store := &fakeStore{}
	app := &application{store: store}
	body := `{"layout":{"x":-160,"y":-160,"width":320,"height":320,"color":"yellow","kind":"note","texts":[],"strokes":[{"color":"#474b3e","width":3,"points":[[10,10],[20,20]]}]}}`
	r := httptest.NewRequest("POST", "/api/notes", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	app.ServeHTTP(w, r)
	if w.Code != 201 {
		t.Fatal(w.Body.String())
	}
	cookies := w.Result().Cookies()
	if len(cookies) != 1 || !cookies[0].HttpOnly || cookies[0].SameSite != http.SameSiteStrictMode || cookies[0].MaxAge <= 0 {
		t.Fatal("missing secure persistent identity cookie")
	}
	if strings.Contains(w.Body.String(), store.created[0].Owner) || strings.Contains(w.Body.String(), cookies[0].Value) {
		t.Fatal("ownership secret leaked")
	}
	for _, mine := range []bool{true, false} {
		r = httptest.NewRequest("GET", "/api/notes", nil)
		if mine {
			r.AddCookie(cookies[0])
		}
		w = httptest.NewRecorder()
		app.ServeHTTP(w, r)
		var result page
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil || len(result.Notes) != 1 || result.Notes[0].Mine != mine {
			t.Fatalf("mine=%v, response=%s", mine, w.Body.String())
		}
	}
}
func (s *fakeStore) Updates(context.Context, []string, *cursor) (int64, error) { return 0, nil }
func (s *fakeStore) Ping(context.Context) error {
	if s.fail {
		return errors.New("database unavailable")
	}
	return nil
}

func TestCreateNoteValidation(t *testing.T) {
	tests := []struct {
		name, body string
		status     int
	}{
		{"valid Unicode", `{"content":"  今天的阳光真好 ☀️  ","category":"daily","author":" 小叶 "}`, 201},
		{"blank", `{"content":" \n ","category":"daily"}`, 400},
		{"invalid category", `{"content":"hello","category":"unknown"}`, 400},
		{"long Unicode", `{"content":"` + strings.Repeat("好", 501) + `","category":"joy"}`, 400},
		{"nickname too long", `{"content":"hello","category":"joy","author":"` + strings.Repeat("叶", 25) + `"}`, 400},
		{"control character", `{"content":"hello\u0000","category":"joy"}`, 400},
		{"unknown property", `{"content":"hello","category":"daily","id":"99"}`, 400},
		{"two objects", `{"content":"hello","category":"daily"}{}`, 400},
		{"invalid JSON", `{"content":`, 400},
		{"oversized", `{"content":"` + strings.Repeat("x", 6*1024*1024) + `","category":"daily"}`, 413},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeStore{}
			app := &application{store: store}
			r := httptest.NewRequest(http.MethodPost, "/api/notes", strings.NewReader(tt.body))
			r.Header.Set("Content-Type", "application/json; charset=utf-8")
			w := httptest.NewRecorder()
			app.ServeHTTP(w, r)
			if w.Code != tt.status {
				t.Fatalf("status %d, want %d: %s", w.Code, tt.status, w.Body.String())
			}
			if tt.status == 201 {
				if len(store.created) != 1 || store.created[0].Author != "小叶" || store.created[0].Content != "今天的阳光真好 ☀️" || store.created[0].PaperSize != "auto" {
					t.Fatalf("incorrect saved note: %#v", store.created)
				}
			} else if len(store.created) != 0 {
				t.Fatal("invalid input reached database")
			}
		})
	}
}

func TestJSONContentTypeAndRequestFailures(t *testing.T) {
	app := &application{store: &fakeStore{fail: true}}
	for _, tt := range []struct {
		method, path string
		status       int
	}{
		{http.MethodPost, "/api/notes", 415},
		{http.MethodDelete, "/api/notes", 405},
		{http.MethodGet, "/api/health", 503},
		{http.MethodGet, "/api/unknown", 404},
		{http.MethodGet, "/api/notes?limit=0", 400},
		{http.MethodGet, "/api/notes?limit=51", 400},
		{http.MethodGet, "/api/notes?categories=invalid", 400},
		{http.MethodGet, "/api/notes?categories=", 400},
		{http.MethodGet, "/api/notes?cursor=invalid", 400},
		{http.MethodGet, "/api/notes/updates?after=invalid", 400},
	} {
		w := httptest.NewRecorder()
		app.ServeHTTP(w, httptest.NewRequest(tt.method, tt.path, nil))
		if w.Code != tt.status {
			t.Errorf("%s %s: status %d, want %d", tt.method, tt.path, w.Code, tt.status)
		}
		var result map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil || result["error"] == nil {
			t.Errorf("expected JSON error: %s", w.Body.String())
		}
	}
}

func TestCreateNotePaperSize(t *testing.T) {
	for _, tt := range []struct {
		name, size string
		lines      int
		status     int
	}{
		{"omitted", "", 1, http.StatusCreated},
		{"small", "small", 6, http.StatusCreated},
		{"medium", "medium", 9, http.StatusCreated},
		{"large", "large", 12, http.StatusCreated},
		{"invalid size", "poster", 1, http.StatusBadRequest},
		{"small overflow", "small", 7, http.StatusBadRequest},
		{"medium overflow", "medium", 10, http.StatusBadRequest},
		{"large overflow", "large", 13, http.StatusBadRequest},
	} {
		t.Run(tt.name, func(t *testing.T) {
			input := map[string]string{"content": strings.Repeat("字\n", tt.lines-1) + "字", "category": "joy"}
			if tt.size != "" {
				input["paperSize"] = tt.size
			}
			body, err := json.Marshal(input)
			if err != nil {
				t.Fatal(err)
			}
			store := &fakeStore{}
			app := &application{store: store}
			r := httptest.NewRequest(http.MethodPost, "/api/notes", strings.NewReader(string(body)))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			app.ServeHTTP(w, r)
			if w.Code != tt.status {
				t.Fatalf("status %d, want %d: %s", w.Code, tt.status, w.Body.String())
			}
			if tt.status != http.StatusCreated {
				if len(store.created) != 0 {
					t.Fatal("invalid paper size reached database")
				}
				return
			}
			want := tt.size
			if want == "" {
				want = "auto"
			}
			var result note
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil || result.PaperSize != want || store.created[0].PaperSize != want {
				t.Fatalf("paper size not returned and saved: %#v, %v", result, err)
			}
		})
	}
}

func TestCursorRoundtripAndValidation(t *testing.T) {
	n := note{ID: "9007199254740993", CreatedAt: time.Date(2026, 10, 28, 14, 12, 11, 123456000, time.FixedZone("CST", 8*60*60))}
	c, err := decodeCursor(encodeCursor(n))
	if err != nil || c.ID != n.ID || !c.Time.Equal(n.CreatedAt) {
		t.Fatalf("roundtrip: %#v, %v", c, err)
	}
	for _, value := range []string{"!invalid", strings.Repeat("x", 257), "e30", "eyJ0IjoiMjAyNi0xMC0yOFQwMDowMDowMFoiLCJpIjoiMCJ9"} {
		if _, err := decodeCursor(value); err == nil {
			t.Errorf("accepted invalid cursor %q", value)
		}
	}
}

func TestPostRateLimit(t *testing.T) {
	now := time.Now()
	l := &postLimiter{entries: map[string]rateEntry{}, limit: 2}
	if !l.allow("one", now) || !l.allow("one", now) || l.allow("one", now) {
		t.Fatal("limit not enforced")
	}
	if !l.allow("two", now) {
		t.Fatal("IP limits should be independent")
	}
	if !l.allow("one", now.Add(time.Minute)) {
		t.Fatal("window did not reset")
	}
	app := &application{store: &fakeStore{}, limiter: &postLimiter{entries: map[string]rateEntry{}, limit: 1}}
	for i := range 2 {
		r := httptest.NewRequest(http.MethodPost, "/api/notes", strings.NewReader(`{"content":"hi","category":"joy"}`))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		app.ServeHTTP(w, r)
		if i == 1 && (w.Code != 429 || w.Header().Get("Retry-After") != "60") {
			t.Fatal("missing rate limit response")
		}
	}
}

func TestStaticServingAndAPINotFound(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>wall</h1>"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte("secret"), 0600); err != nil {
		t.Fatal(err)
	}
	app := &application{store: &fakeStore{}, staticDir: dir}
	for _, tt := range []struct {
		path   string
		status int
	}{{"/", 200}, {"/wall", 200}, {"/.env", 404}, {"/missing.js", 404}, {"/api/unknown", 404}} {
		w := httptest.NewRecorder()
		app.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tt.path, nil))
		if w.Code != tt.status {
			t.Errorf("%s returned %d", tt.path, w.Code)
		}
		if strings.Contains(w.Body.String(), "secret") {
			t.Fatal("served dotfile")
		}
	}
}
