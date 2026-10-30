package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

var categories = []string{"daily", "joy", "thoughts", "wishes"}

type note struct {
	ID        string     `json:"id"`
	Content   string     `json:"content"`
	Category  string     `json:"category"`
	Author    string     `json:"author"`
	PaperSize string     `json:"paperSize"`
	CreatedAt time.Time  `json:"createdAt"`
	Layout    *placement `json:"layout"`
	Owner     string     `json:"-"`
	Mine      bool       `json:"mine"`
}

type newNote struct {
	Content   string     `json:"content"`
	Category  string     `json:"category"`
	Author    string     `json:"author"`
	PaperSize string     `json:"paperSize"`
	Layout    *placement `json:"layout"`
	Owner     string     `json:"-"`
}

func (n *newNote) validate() error {
	n.Content = strings.TrimSpace(n.Content)
	n.Author = strings.TrimSpace(n.Author)
	if invalidText(n.Content + n.Author) {
		return errors.New("留言里含有无法显示的字符，请修改后重试")
	}
	if n.Layout != nil {
		if n.Category == "" {
			n.Category = "daily"
		}
		if utf8.RuneCountInString(n.Content) > 10000 {
			return errors.New("文字最多 10000 字")
		}
		if utf8.RuneCountInString(n.Author) > 24 {
			return errors.New("昵称请控制在 24 个字以内")
		}
		if !validCategory(n.Category) {
			return errors.New("纸张颜色无效")
		}
		n.PaperSize = "auto"
		return n.Layout.validate(n.Content)
	}
	if utf8.RuneCountInString(n.Content) == 0 || utf8.RuneCountInString(n.Content) > 500 {
		return errors.New("写下 1 至 500 个字，再把它贴到墙上吧")
	}
	if utf8.RuneCountInString(n.Author) > 24 {
		return errors.New("昵称请控制在 24 个字以内")
	}
	if !validCategory(n.Category) {
		return errors.New("请选择一个有效的分类")
	}
	if n.PaperSize == "" {
		n.PaperSize = "auto"
	}
	maxLines := 0
	switch n.PaperSize {
	case "auto":
	case "small":
		maxLines = 6
	case "medium":
		maxLines = 9
	case "large":
		maxLines = 12
	default:
		return errors.New("请选择一个有效的纸张尺寸")
	}
	lineCount := 1 + strings.Count(n.Content, "\n") + strings.Count(n.Content, "\r") - strings.Count(n.Content, "\r\n")
	if maxLines > 0 && lineCount > maxLines {
		return errors.New("这张纸写满了，请换大一号或减少换行")
	}
	return nil
}

func invalidText(value string) bool {
	for _, r := range value {
		if unicode.IsControl(r) && r != '\n' && r != '\r' && r != '\t' {
			return true
		}
	}
	return false
}

func validCategory(value string) bool {
	for _, category := range categories {
		if category == value {
			return true
		}
	}
	return false
}

func parseCategories(value string, present bool) ([]string, error) {
	if !present {
		return categories, nil
	}
	selected := make([]string, 0, len(categories))
	seen := map[string]bool{}
	for _, category := range strings.Split(value, ",") {
		if !validCategory(category) {
			return nil, errors.New("筛选分类无效，请重新选择")
		}
		if !seen[category] {
			selected = append(selected, category)
			seen[category] = true
		}
	}
	return selected, nil
}

type cursor struct {
	Time time.Time `json:"t"`
	ID   string    `json:"i"`
}

func encodeCursor(n note) string {
	data, _ := json.Marshal(cursor{Time: n.CreatedAt.UTC(), ID: n.ID})
	return base64.RawURLEncoding.EncodeToString(data)
}

func decodeCursor(value string) (*cursor, error) {
	if value == "" {
		return nil, nil
	}
	if len(value) > 256 {
		return nil, errors.New("分页位置无效，请刷新后重试")
	}
	data, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, errors.New("分页位置无效，请刷新后重试")
	}
	var c cursor
	if err := json.Unmarshal(data, &c); err != nil || c.Time.IsZero() {
		return nil, errors.New("分页位置无效，请刷新后重试")
	}
	id, err := strconv.ParseInt(c.ID, 10, 64)
	if err != nil || id < 1 {
		return nil, errors.New("分页位置无效，请刷新后重试")
	}
	return &c, nil
}

type page struct {
	Notes      []note  `json:"notes"`
	NextCursor *string `json:"nextCursor"`
	HeadCursor *string `json:"headCursor"`
	Total      int64   `json:"total"`
}
