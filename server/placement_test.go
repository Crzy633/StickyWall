package main

import (
	"strings"
	"testing"
)

func testPaper(x, y float64) *placement {
	return &placement{X: x, Y: y, Width: 320, Height: 320, Color: "yellow", Kind: "note"}
}
func TestPlacementRules(t *testing.T) {
	root := note{ID: "1", Owner: "alice", Layout: testPaper(-160, -160)}
	tests := []struct {
		name  string
		p     *placement
		notes []note
		owner string
		ok    bool
	}{
		{"first at origin", testPaper(-160, -160), nil, "alice", true},
		{"first inside circle", testPaper(-100, -100), nil, "alice", true},
		{"first at circle boundary", testPaper(-60, -160), nil, "alice", true},
		{"first outside circle", testPaper(-59, -160), nil, "alice", false},
		{"normal gap", testPaper(192, -160), []note{root}, "bob", true},
		{"minimum gap", testPaper(176, -160), []note{root}, "bob", true},
		{"too close", testPaper(175, -160), []note{root}, "bob", false},
		{"touching", testPaper(160, -160), []note{root}, "bob", false},
		{"overlap", testPaper(159, -160), []note{root}, "bob", false},
		{"half paper gap", testPaper(320, -160), []note{root}, "bob", true},
		{"too far", testPaper(321, -160), []note{root}, "bob", false},
		{"diagonal within distance", testPaper(260, 260), []note{root}, "bob", true},
		{"diagonal outside distance", testPaper(280, 280), []note{root}, "bob", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := checkPlacement(tt.p, tt.notes, tt.owner)
			if (err == nil) != tt.ok {
				t.Fatalf("error=%v, want valid=%v", err, tt.ok)
			}
		})
	}
}
func TestOwnedStacksAndPhotos(t *testing.T) {
	root := note{ID: "1", Owner: "alice", Layout: testPaper(-160, -160)}
	p := testPaper(-120, 0)
	p.ParentID = "1"
	if err := checkPlacement(p, []note{root}, "alice"); err != nil {
		t.Fatal(err)
	}
	if err := checkPlacement(p, []note{root}, "bob"); err == nil {
		t.Fatal("allowed another visitor's stack")
	}
	p.Y = -1
	if err := checkPlacement(p, []note{root}, "alice"); err == nil {
		t.Fatal("allowed upper-half stack")
	}
	p.Y = 160
	if err := checkPlacement(p, []note{root}, "alice"); err == nil {
		t.Fatal("allowed unattached stack")
	}
	p.Y = 0
	other := note{ID: "2", Owner: "bob", Layout: testPaper(200, 0)}
	if err := checkPlacement(p, []note{root, other}, "alice"); err == nil {
		t.Fatal("stack touched another user's paper")
	}
	p.Kind = "photo"
	p.Y = -120
	if err := checkPlacement(p, []note{root}, "alice"); err != nil {
		t.Fatal(err)
	}
	p.X = -160
	p.Y = -160
	if err := checkPlacement(p, []note{root}, "alice"); err == nil {
		t.Fatal("photo fully covered parent")
	}
	p.ParentID = ""
	p.X = 192
	if err := checkPlacement(p, []note{root}, "alice"); err == nil {
		t.Fatal("photo attached to bare wall")
	}
	child := note{ID: "2", Owner: "alice", Layout: testPaper(-120, 0)}
	child.Layout.ParentID = "1"
	p = testPaper(-100, 160)
	p.ParentID = "2"
	if err := checkPlacement(p, []note{root, child}, "alice"); err != nil {
		t.Fatal("ancestor overlap:", err)
	}
}
func TestFreeformValidation(t *testing.T) {
	p := testPaper(0, 0)
	p.Texts = []textBlock{{X: 20, Y: 20, Width: 250, Size: 20, Color: "#474b3e", Text: strings.Repeat("字\n", 100)}}
	n := newNote{Layout: p}
	if err := n.validate(); err != nil {
		t.Fatal("freeform text or omitted category rejected:", err)
	}
	p.Width = 159
	if err := n.validate(); err == nil {
		t.Fatal("tiny paper accepted")
	}
	p.Width = 320
	p.Texts[0].Width = 400
	if err := n.validate(); err == nil {
		t.Fatal("text outside paper accepted")
	}
	p.Texts = nil
	p.Strokes = []stroke{{Color: "#474b3e", Width: 3, Points: [][2]float64{{10, 10}, {320, 320}}}}
	if err := n.validate(); err != nil {
		t.Fatal("drawing-only note rejected:", err)
	}
	p.Strokes[0].Points[1][0] = 321
	if err := n.validate(); err == nil {
		t.Fatal("out-of-bounds point accepted")
	}
	p.Kind = "photo"
	p.Image = "data:image/svg+xml;base64,PHN2Zz4="
	p.ParentID = "1"
	p.Strokes = nil
	if err := n.validate(); err == nil {
		t.Fatal("active SVG upload accepted")
	}
}
