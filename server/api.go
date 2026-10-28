package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type application struct {
	store     noteStore
	limiter   *postLimiter
	staticDir string
}

func (a *application) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("X-Frame-Options", "DENY")
	if !strings.HasPrefix(r.URL.Path, "/api/") && r.URL.Path != "/api" {
		a.serveStatic(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	switch r.URL.Path {
	case "/api/health":
		if !requireMethod(w, r, http.MethodGet) {
			return
		}
		if err := a.store.Ping(ctx); err != nil {
			writeError(w, http.StatusServiceUnavailable, "暂时连接不上留言墙，请稍后重试")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	case "/api/notes":
		switch r.Method {
		case http.MethodGet:
			a.listNotes(w, r)
		case http.MethodPost:
			a.createNote(w, r)
		default:
			w.Header().Set("Allow", "GET, POST")
			writeError(w, http.StatusMethodNotAllowed, "这个操作暂不支持")
		}
	case "/api/notes/updates":
		if requireMethod(w, r, http.MethodGet) {
			a.updates(w, r)
		}
	default:
		writeError(w, http.StatusNotFound, "没有找到这个页面")
	}
}

func requireMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method == method {
		return true
	}
	w.Header().Set("Allow", method)
	writeError(w, http.StatusMethodNotAllowed, "这个操作暂不支持")
	return false
}

func (a *application) listNotes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	selected, err := parseCategories(query.Get("categories"), query.Has("categories"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	before, err := decodeCursor(query.Get("cursor"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	limit := 12
	if query.Has("limit") {
		limit, err = strconv.Atoi(query.Get("limit"))
		if err != nil || limit < 1 || limit > 50 {
			writeError(w, http.StatusBadRequest, "每次可读取 1 至 50 张便利贴")
			return
		}
	}
	result, err := a.store.List(r.Context(), selected, before, limit)
	if err != nil {
		storageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *application) createNote(w http.ResponseWriter, r *http.Request) {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "请使用 JSON 格式提交留言")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var input newNote
	if err := decoder.Decode(&input); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "留言太长了，请精简后重试")
		} else {
			writeError(w, http.StatusBadRequest, "留言格式有误，请重新填写")
		}
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "留言格式有误，请重新填写")
		return
	}
	if err := input.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if a.limiter != nil && !a.limiter.allow(ip, time.Now()) {
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "让心情慢一点，稍等一分钟再贴吧")
		return
	}
	result, err := a.store.Create(r.Context(), input)
	if err != nil {
		storageError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (a *application) updates(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	selected, err := parseCategories(query.Get("categories"), query.Has("categories"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	after, err := decodeCursor(query.Get("after"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	count, err := a.store.Updates(r.Context(), selected, after)
	if err != nil {
		storageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{"count": count})
}

func storageError(w http.ResponseWriter, err error) {
	slog.Error("database request failed", "error", err)
	writeError(w, http.StatusServiceUnavailable, "留言墙暂时走神了，请稍后再试")
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("write response failed", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func (a *application) serveStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		writeError(w, http.StatusMethodNotAllowed, "这个操作暂不支持")
		return
	}
	clean := path.Clean("/" + r.URL.Path)
	for _, part := range strings.Split(clean, "/") {
		if strings.HasPrefix(part, ".") {
			http.NotFound(w, r)
			return
		}
	}
	relative := filepath.FromSlash(strings.TrimPrefix(clean, "/"))
	if relative != "" && !filepath.IsLocal(relative) {
		http.NotFound(w, r)
		return
	}
	file := filepath.Join(a.staticDir, relative)
	info, err := os.Stat(file)
	if err == nil && !info.IsDir() {
		if strings.HasPrefix(clean, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		http.ServeFile(w, r, file)
		return
	}
	if path.Ext(clean) != "" {
		http.NotFound(w, r)
		return
	}
	index := filepath.Join(a.staticDir, "index.html")
	if _, err := os.Stat(index); err != nil {
		writeError(w, http.StatusNotFound, "前端尚未构建，请先在 web 目录运行 npm run build")
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, index)
}

type rateEntry struct {
	start time.Time
	count int
}
type postLimiter struct {
	mu      sync.Mutex
	entries map[string]rateEntry
	limit   int
}

func (l *postLimiter) allow(ip string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	entry, exists := l.entries[ip]
	if !exists || now.Sub(entry.start) >= time.Minute {
		for key, old := range l.entries {
			if now.Sub(old.start) >= time.Minute {
				delete(l.entries, key)
			}
		}
		if len(l.entries) >= 4096 {
			return false
		}
		entry = rateEntry{start: now}
	}
	if entry.count >= l.limit {
		return false
	}
	entry.count++
	l.entries[ip] = entry
	return true
}
