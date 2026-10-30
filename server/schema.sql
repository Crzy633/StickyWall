CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    category TEXT NOT NULL CHECK (category IN ('daily', 'joy', 'thoughts', 'wishes')),
    author TEXT NOT NULL DEFAULT '' CHECK (char_length(author) <= 24),
    paper_size TEXT NOT NULL DEFAULT 'auto' CHECK (paper_size IN ('auto', 'small', 'medium', 'large')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS paper_size TEXT NOT NULL DEFAULT 'auto'
    CHECK (paper_size IN ('auto', 'small', 'medium', 'large'));

CREATE INDEX IF NOT EXISTS notes_newest_idx ON notes (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS notes_category_newest_idx ON notes (category, created_at DESC, id DESC);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS layout JSONB;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS owner_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_content_check;
ALTER TABLE notes ADD CONSTRAINT notes_content_check CHECK (char_length(content) <= 10000);

-- Assign existing messages permanent, connected coordinates once, without changing their contents.
WITH legacy AS (
 SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS i,
 greatest(280, least(640, 90 + 32 * (char_length(content) / 16 + char_length(content) - char_length(replace(content, E'\n', '')) + 1))) AS h
 FROM notes WHERE layout IS NULL
), row_heights AS (
 SELECT i / 2 AS r, max(h) AS h FROM legacy GROUP BY i / 2
), row_positions AS (
 SELECT r, coalesce(sum(h + 40) OVER (ORDER BY r ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS y FROM row_heights
) UPDATE notes SET layout = jsonb_build_object(
 'x', (legacy.i % 2) * 400 - 180, 'y', row_positions.y - 140,
 'width', 360, 'height', legacy.h, 'kind', 'note',
 'color', CASE category WHEN 'joy' THEN 'green' WHEN 'thoughts' THEN 'pink' WHEN 'wishes' THEN 'blue' ELSE 'yellow' END,
 'texts', '[]'::jsonb, 'strokes', '[]'::jsonb
) FROM legacy JOIN row_positions ON row_positions.r = legacy.i / 2 WHERE notes.id = legacy.id;
