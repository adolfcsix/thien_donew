-- V11.159: append-only earned-points ledger. Historical forum_tinh_van_ledger remains intact.
-- Only reviewed evidence can enter this ledger; user input never supplies points.
CREATE TABLE tinh_van_awards (
 id BIGSERIAL PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 kind VARCHAR(40) NOT NULL CHECK(kind IN ('learning-reviewed','article-published','research-reviewed','exploration-reviewed','guide-verified','discussion-verified')),
 direction VARCHAR(24) NOT NULL CHECK(direction IN ('hoc-gia','luan-gia','kham-pha-gia','nguoi-dan-loi')),
 subject VARCHAR(60) NOT NULL DEFAULT 'nghien-cuu' CHECK(length(subject) BETWEEN 2 AND 60),
 source_id UUID NOT NULL,
 points SMALLINT NOT NULL CHECK(points BETWEEN 1 AND 50),
 ruleset VARCHAR(50) NOT NULL DEFAULT 'tinh-canh-v11.159.0',
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE (source_id),
 CONSTRAINT award_policy_check CHECK (
   (kind='learning-reviewed' AND direction='hoc-gia' AND points=8) OR
   (kind='article-published' AND direction='hoc-gia' AND points=18) OR
   (kind='research-reviewed' AND direction='hoc-gia' AND points=22) OR
   (kind='exploration-reviewed' AND direction='kham-pha-gia' AND points=10) OR
   (kind='guide-verified' AND direction='nguoi-dan-loi' AND points=12) OR
   (kind='discussion-verified' AND direction='luan-gia' AND points=6)
 )
);
CREATE INDEX tinh_van_awards_member ON tinh_van_awards(user_id,created_at DESC);
CREATE INDEX tinh_van_awards_subject ON tinh_van_awards(subject,direction,user_id);
CREATE TABLE tinh_van_reversals (
 id BIGSERIAL PRIMARY KEY,
 award_id BIGINT NOT NULL UNIQUE REFERENCES tinh_van_awards(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 reason VARCHAR(600) NOT NULL CHECK(length(reason)>=12),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX tinh_van_reversals_time ON tinh_van_reversals(created_at DESC);
-- Additional privacy: no scores are leaked for users who have opted out of public rankings.
CREATE TABLE tinh_canh_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 public_rank BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE tinh_van_rate_limits (
 actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 window_start TIMESTAMPTZ NOT NULL,
 count INTEGER NOT NULL CHECK(count>0),
 PRIMARY KEY(actor_id,window_start)
);
-- Service role has no UPDATE or DELETE grants on the ledger. Reject UPDATE even for elevated clients;
-- DELETE may occur only through DBA permissions/account deletion cascade for privacy compliance.
CREATE FUNCTION tinh_van_ledger_immutable() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'tinh_van_ledger_is_append_only'; END
$$ LANGUAGE plpgsql;
-- The service role has NO DELETE grant; keep cascading account deletion possible.
CREATE TRIGGER tinh_van_awards_lock BEFORE UPDATE ON tinh_van_awards FOR EACH ROW EXECUTE FUNCTION tinh_van_ledger_immutable();
CREATE TRIGGER tinh_van_reversals_lock BEFORE UPDATE ON tinh_van_reversals FOR EACH ROW EXECUTE FUNCTION tinh_van_ledger_immutable();
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT ON tinh_van_awards,tinh_van_reversals TO thiendo_app;
  GRANT SELECT,INSERT,UPDATE ON tinh_canh_preferences,tinh_van_rate_limits TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE tinh_van_awards_id_seq,tinh_van_reversals_id_seq TO thiendo_app;
 END IF;
END $$;
