-- A30: Optional single raster image per discussion; unclaimed uploads are private and short lived.
-- Additive migration: never rewrite the 29 earlier migrations or existing forum posts.
CREATE TABLE forum_media (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id UUID UNIQUE REFERENCES forum_threads(id) ON DELETE CASCADE,
 mime VARCHAR(12) NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
 data BYTEA NOT NULL CHECK(octet_length(data) BETWEEN 45 AND 1048576),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp() + INTERVAL '30 minutes'
);
CREATE INDEX forum_media_cleanup ON forum_media(expires_at) WHERE thread_id IS NULL;
CREATE INDEX forum_media_owner ON forum_media(user_id);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON forum_media TO thiendo_app;
 END IF;
END $$;
