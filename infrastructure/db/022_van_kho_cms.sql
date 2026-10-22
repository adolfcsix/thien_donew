-- V11.156: Văn Khố CMS, additive migration; keep content_posts untouched.
CREATE TABLE van_kho_authors (
 id UUID PRIMARY KEY, name VARCHAR(140) NOT NULL, bio TEXT NOT NULL DEFAULT '' CHECK(length(bio)<=4000), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE van_kho_documents (
 id UUID PRIMARY KEY, slug VARCHAR(120) NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title VARCHAR(220) NOT NULL, excerpt TEXT NOT NULL DEFAULT '' CHECK(length(excerpt)<=1000),
 author_id UUID REFERENCES van_kho_authors(id) ON DELETE RESTRICT, subject VARCHAR(60) NOT NULL,
 tags TEXT[] NOT NULL DEFAULT '{}',
 status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','scheduled','published','hidden')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 scheduled_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 created_by UUID NOT NULL REFERENCES users(id), approved_by UUID REFERENCES users(id),
 CHECK(status<>'scheduled' OR scheduled_at IS NOT NULL));
CREATE TABLE van_kho_revisions (
 doc_id UUID NOT NULL REFERENCES van_kho_documents(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0), title VARCHAR(220) NOT NULL,
 body TEXT NOT NULL CHECK(length(body)<=100000), excerpt TEXT NOT NULL DEFAULT '',
 author_id UUID REFERENCES van_kho_authors(id), subject VARCHAR(60) NOT NULL, tags TEXT[] NOT NULL DEFAULT '{}',
 editor_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(doc_id,version));
CREATE TABLE van_kho_review_events (
 id BIGSERIAL PRIMARY KEY, doc_id UUID NOT NULL REFERENCES van_kho_documents(id),
 actor_id UUID NOT NULL REFERENCES users(id), action VARCHAR(40) NOT NULL,
 version INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX van_kho_public ON van_kho_documents(status,subject,published_at DESC);
CREATE INDEX van_kho_tag_filter ON van_kho_documents USING GIN(tags);
CREATE INDEX van_kho_by_author ON van_kho_documents(author_id,status);
CREATE INDEX van_kho_review_events_doc ON van_kho_review_events(doc_id,created_at DESC);
-- Immutable audit history and versions: no DELETE endpoint is exposed.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE ON van_kho_authors,van_kho_documents TO thiendo_app;
  GRANT SELECT,INSERT ON van_kho_revisions,van_kho_review_events TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE van_kho_review_events_id_seq TO thiendo_app;
 END IF;
END $$;
