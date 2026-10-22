-- Additive administration workspace; keep 001-031 immutable.
CREATE TABLE admin_permission_sets (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 capabilities JSONB CHECK(capabilities IS NULL OR jsonb_typeof(capabilities)='array'),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE admin_profile_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 badge_style VARCHAR(12) NOT NULL DEFAULT 'gate' CHECK(badge_style IN ('gate','orbit','seal')),
 badge_tone VARCHAR(12) NOT NULL DEFAULT 'gold' CHECK(badge_tone IN ('gold','jade','azure')),
 motto VARCHAR(120) NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE content_posts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE content_posts ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE TABLE content_post_versions (
 id BIGSERIAL PRIMARY KEY,
 post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 snapshot JSONB NOT NULL,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(24) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(post_id,revision)
);
INSERT INTO content_post_versions(post_id,revision,snapshot,action)
 SELECT id,revision,jsonb_build_object('slug',slug,'title',title,'body',body,'published',published),'baseline' FROM content_posts;
CREATE INDEX content_posts_lifecycle_idx ON content_posts(deleted_at,updated_at DESC);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON admin_permission_sets,admin_profile_preferences,content_post_versions TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE content_post_versions_id_seq TO thiendo_app;
 END IF;
END $$;
