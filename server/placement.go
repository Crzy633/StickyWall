package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"strings"
	"unicode/utf8"
)

type textBlock struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Width float64 `json:"width"`
	Size  float64 `json:"size"`
	Color string  `json:"color"`
	Text  string  `json:"text"`
}
type stroke struct {
	Color  string       `json:"color"`
	Width  float64      `json:"width"`
	Points [][2]float64 `json:"points"`
}
type placement struct {
	X        float64     `json:"x"`
	Y        float64     `json:"y"`
	Width    float64     `json:"width"`
	Height   float64     `json:"height"`
	Color    string      `json:"color"`
	ParentID string      `json:"parentId,omitempty"`
	Kind     string      `json:"kind"`
	Image    string      `json:"image,omitempty"`
	Texts    []textBlock `json:"texts"`
	Strokes  []stroke    `json:"strokes"`
}

func finite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func inkColor(v string) bool {
	return len(v) == 7 && v[0] == '#' && strings.Trim(v[1:], "0123456789abcdefABCDEF") == ""
}
func (p *placement) validate(content string) error {
	if !finite(p.X) || !finite(p.Y) || !finite(p.Width) || !finite(p.Height) || p.Width < 160 || p.Width > 560 || p.Height < 160 || p.Height > 640 {
		return errors.New("纸张宽度需在 160–560，高度需在 160–640 之间")
	}
	if p.Color != "yellow" && p.Color != "green" && p.Color != "pink" && p.Color != "blue" {
		return errors.New("请选择有效纸色")
	}
	if len(p.Texts) > 100 || len(p.Strokes) > 300 {
		return errors.New("内容太多，请减少文字块或笔画")
	}
	total := utf8.RuneCountInString(content)
	for _, t := range p.Texts {
		if invalidText(t.Text) {
			return errors.New("文字含有无法显示的字符，请修改后重试")
		}
		total += utf8.RuneCountInString(t.Text)
		if !finite(t.X) || !finite(t.Y) || !finite(t.Width) || !finite(t.Size) || t.X < 0 || t.Y < 0 || t.X > p.Width-20 || t.Y > p.Height-20 || t.Width < 20 || t.Width > p.Width-t.X || t.Size < 12 || t.Size > 48 || !inkColor(t.Color) {
			return errors.New("文字位置或样式无效")
		}
	}
	points := 0
	for _, s := range p.Strokes {
		if !inkColor(s.Color) || !finite(s.Width) || s.Width < 1 || s.Width > 20 || len(s.Points) == 0 {
			return errors.New("笔画样式无效")
		}
		points += len(s.Points)
		for _, v := range s.Points {
			if !finite(v[0]) || !finite(v[1]) || v[0] < 0 || v[1] < 0 || v[0] > p.Width || v[1] > p.Height {
				return errors.New("笔画超出纸张")
			}
		}
	}
	if total > 10000 || points > 30000 {
		return errors.New("内容太多，请减少文字或笔画")
	}
	if p.Kind == "photo" {
		if p.ParentID == "" {
			return errors.New("照片只能贴在自己的便签上")
		}
		prefix := ""
		for _, mime := range []string{"image/png", "image/jpeg"} {
			if strings.HasPrefix(p.Image, "data:"+mime+";base64,") {
				prefix = "data:" + mime + ";base64,"
			}
		}
		if prefix == "" || len(p.Image) > 4*1024*1024+len(prefix) {
			return errors.New("请选择不超过 3MB 的 PNG 或 JPEG 照片")
		}
		data, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(p.Image, prefix))
		if err != nil {
			return errors.New("照片格式无效")
		}
		config, format, err := image.DecodeConfig(bytes.NewReader(data))
		if err != nil || config.Width < 1 || config.Height < 1 || config.Width > 12000 || config.Height > 12000 || config.Width*config.Height > 40000000 || (format == "png" && prefix != "data:image/png;base64,") || (format == "jpeg" && prefix != "data:image/jpeg;base64,") {
			return errors.New("照片尺寸或格式无效")
		}
	} else if p.Kind != "note" || p.Image != "" {
		return errors.New("纸张类型无效")
	} else if strings.TrimSpace(content) == "" && len(p.Strokes) == 0 {
		hasText := false
		for _, t := range p.Texts {
			if strings.TrimSpace(t.Text) != "" {
				hasText = true
			}
		}
		if !hasText {
			return errors.New("写点文字或画一笔再贴上墙吧")
		}
	}
	return nil
}

func rectGap(a, b *placement) float64 {
	dx := math.Max(0, math.Max(a.X-b.X-b.Width, b.X-a.X-a.Width))
	dy := math.Max(0, math.Max(a.Y-b.Y-b.Height, b.Y-a.Y-a.Height))
	return math.Hypot(dx, dy)
}
func overlap(a, b *placement) bool {
	return a.X < b.X+b.Width && a.X+a.Width > b.X && a.Y < b.Y+b.Height && a.Y+a.Height > b.Y
}

// Both previews and transactions use axis-aligned paper edges, so decoration never changes collision geometry.
func checkPlacement(p *placement, existing []note, owner string) error {
	if p.Kind == "photo" && p.ParentID == "" {
		return errors.New("照片只能贴在自己的便签上")
	}
	if len(existing) == 0 {
		if p.ParentID != "" || p.Kind == "photo" || math.Hypot(p.X+p.Width/2, p.Y+p.Height/2) > 100 {
			return errors.New("请把第一张便签的中心放进圆形区域")
		}
		return nil
	}
	byID := map[string]note{}
	for _, n := range existing {
		byID[n.ID] = n
	}
	ancestors := map[string]bool{}
	if p.ParentID != "" {
		parent, ok := byID[p.ParentID]
		if !ok || parent.Layout == nil || parent.Layout.Kind == "photo" || owner == "" || parent.Owner != owner {
			return errors.New("只能叠贴在自己的便签上")
		}
		q := parent.Layout
		if !overlap(p, q) || (p.Kind != "photo" && (p.Y < q.Y+q.Height/2 || p.Y >= q.Y+q.Height)) || (p.X <= q.X && p.Y <= q.Y && p.X+p.Width >= q.X+q.Width && p.Y+p.Height >= q.Y+q.Height) {
			return errors.New("新便签需从原便签下半部贴起，并留出原便签内容")
		}
		for id := p.ParentID; id != ""; {
			if ancestors[id] {
				return errors.New("叠贴关系无效")
			}
			ancestors[id] = true
			n, ok := byID[id]
			if !ok || n.Layout == nil {
				break
			}
			id = n.Layout.ParentID
		}
	}
	connected := p.ParentID != ""
	for _, n := range existing {
		if n.Layout == nil || ancestors[n.ID] {
			continue
		}
		gap := rectGap(p, n.Layout)
		if overlap(p, n.Layout) || gap < 16 {
			return errors.New("离其它便签太近了，请留一点空隙")
		}
		if gap <= math.Min(math.Min(p.Width, p.Height), math.Min(n.Layout.Width, n.Layout.Height))/2 {
			connected = true
		}
	}
	if !connected {
		return errors.New("离大家太远了，最多隔半张便签")
	}
	return nil
}
