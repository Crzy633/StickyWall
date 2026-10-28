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
