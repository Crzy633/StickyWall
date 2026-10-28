package main

import (
	"strings"
	"testing"
)

func TestPaperSizeValidation(t *testing.T) {
	for _, tt := range []struct {
		name, size, content string
		valid               bool
	}{
		{"legacy default", "", strings.Repeat("字\n", 15) + "字", true},
		{"explicit auto", "auto", "旧客户端留言", true},
		{"small boundary", "small", strings.Repeat("字\n", 5) + "字", true},
		{"small overflow", "small", strings.Repeat("字\n", 6) + "字", false},
		{"medium boundary", "medium", strings.Repeat("字\n", 8) + "字", true},
		{"medium overflow", "medium", strings.Repeat("字\n", 9) + "字", false},
		{"large boundary", "large", strings.Repeat("字\n", 11) + "字", true},
		{"large overflow", "large", strings.Repeat("字\n", 12) + "字", false},
		{"trim before counting", "small", "\n " + strings.Repeat("字\n", 5) + "字 \n", true},
		{"CRLF counts once", "small", strings.Repeat("字\r\n", 5) + "字", true},
		{"carriage return overflow", "small", strings.Repeat("字\r", 6) + "字", false},
		{"unknown size", "poster", "字", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			input := newNote{Content: tt.content, Category: "daily", PaperSize: tt.size}
			if err := input.validate(); (err == nil) != tt.valid {
				t.Fatalf("valid=%v, want %v: %v", err == nil, tt.valid, err)
			}
			if tt.size == "" && input.PaperSize != "auto" {
				t.Fatalf("omitted size became %q, want auto", input.PaperSize)
			}
		})
	}
}
