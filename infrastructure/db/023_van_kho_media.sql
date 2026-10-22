-- V11.156.1: private inline image media, only after independent rights review.
-- Additive migration; do not modify migration 022 or historical revisions.
CREATE TABLE van_kho_media (
 id UUID PRIMARY KEY,
 doc_id UUID NOT NULL REFERENCES van_kho_documents(id) ON DELETE RESTRICT,
 file_key UUID NOT NULL UNIQUE,
 format VARCHAR(8) NOT NULL CHECK(format IN ('png','jpeg','webp')),
 content_bytes INTEGER NOT NULL CHECK(content_bytes BETWEEN 32 AND 5242880),
 sha256 CHAR(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 alt_text VARCHAR(200) NOT NULL,
 rights_note VARCHAR(800) NOT NULL,
 uploaded_by UUID NOT NULL REFERENCES users(id),
 reviewed_by UUID REFERENCES users(id),
 reviewed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((reviewed_by IS NULL)=(reviewed_at IS NULL)),
 CHECK(reviewed_by IS NULL OR reviewed_by<>uploaded_by)
);
CREATE INDEX van_kho_media_doc ON van_kho_media(doc_id, created_at DESC);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE ON van_kho_media TO thiendo_app;
 END IF;
END $$;
