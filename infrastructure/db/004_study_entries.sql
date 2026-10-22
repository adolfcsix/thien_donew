-- V11.87: owner-scoped journal. Migration is append-only and non-destructive.
CREATE TABLE IF NOT EXISTS study_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discipline VARCHAR(24) NOT NULL CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','phong-thuy')),
  title VARCHAR(100) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  summary VARCHAR(240) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 3000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS study_entries_owner_recent_idx ON study_entries(user_id, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS study_entries_owner_pinned_idx ON study_entries(user_id, pinned DESC, updated_at DESC);
