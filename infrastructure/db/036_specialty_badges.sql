-- A63: Fach-specific honorary badges, independent from 18 progression ranks, Expert and roles.
-- One user may hold several DIFFERENT badges; an active badge cannot be duplicated.
CREATE TABLE specialty_badge_grants (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 badge_id VARCHAR(60) NOT NULL CHECK (badge_id ~ '^[a-z][a-z0-9-]{1,59}$'),
 reason VARCHAR(600) NOT NULL CHECK (char_length(reason) BETWEEN 12 AND 600),
 granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE specialty_badge_revocations (
 grant_id BIGINT PRIMARY KEY REFERENCES specialty_badge_grants(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 reason VARCHAR(600) NOT NULL CHECK (char_length(reason) BETWEEN 12 AND 600),
 revoked_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX specialty_badge_grants_user_recent_idx ON specialty_badge_grants(user_id, id DESC);
CREATE INDEX specialty_badge_grants_kind_idx ON specialty_badge_grants(badge_id, granted_at DESC);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON specialty_badge_grants,specialty_badge_revocations TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE specialty_badge_grants_id_seq TO thiendo_app;
 END IF;
END $$;
