-- V11.155: all files stored in private filesystem; identifiers never encode paths.
CREATE TABLE library_books (
  id UUID PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title VARCHAR(200) NOT NULL,
  author VARCHAR(160) NOT NULL,
  publisher VARCHAR(160) NOT NULL DEFAULT '',
  published_year INTEGER CHECK (published_year BETWEEN 1450 AND 2150),
  synopsis TEXT NOT NULL DEFAULT '' CHECK (length(synopsis) <= 4000),
  subject VARCHAR(40) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  access_level VARCHAR(12) NOT NULL DEFAULT 'free' CHECK (access_level IN ('free','member','pro')),
  license_name VARCHAR(200) NOT NULL DEFAULT '',
  license_proof TEXT NOT NULL DEFAULT '' CHECK (length(license_proof) <= 1000),
  license_reviewed_at TIMESTAMPTZ,
  status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX library_books_catalog ON library_books(status,subject,featured,updated_at DESC);
CREATE TABLE library_assets (
  id UUID PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  kind VARCHAR(8) NOT NULL CHECK(kind IN ('book','cover')),
  format VARCHAR(8) NOT NULL CHECK(format IN ('pdf','epub','jpeg','png','webp')),
  size_bytes BIGINT NOT NULL CHECK(size_bytes BETWEEN 1 AND 25165824),
  sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(book_id,kind)
);
CREATE TABLE library_reading_progress (
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 1000000),
  bookmarks INTEGER[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(book_id,user_id)
);
CREATE INDEX library_progress_user_recent ON library_reading_progress(user_id,updated_at DESC);
CREATE TABLE library_read_events (
  id BIGSERIAL PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX library_read_events_book_date ON library_read_events(book_id,created_at DESC);
-- Privilege provisioning is additive: never grant the API role superuser/table ownership.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.library_books,public.library_assets,public.library_reading_progress,public.library_read_events TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE public.library_read_events_id_seq TO thiendo_app;
 END IF;
END $$;
