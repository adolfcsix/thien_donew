-- V11.160.1: Admin may assign one of 18 ranks WITHOUT fabricating Tinh Van points.
-- Grants/revocations are append-only and independent from evidence-based scoring.
CREATE TABLE tinh_canh_rank_grants (
 id BIGSERIAL PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 18),
 reason VARCHAR(600) NOT NULL CHECK (length(btrim(reason)) BETWEEN 12 AND 600),
 ruleset VARCHAR(50) NOT NULL DEFAULT 'tinh-canh-v11.159.0',
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT rank_grant_no_self_award CHECK (actor_id IS NULL OR actor_id <> user_id)
);
CREATE INDEX rank_grants_member ON tinh_canh_rank_grants (user_id,id DESC);
CREATE TABLE tinh_canh_rank_revocations (
 id BIGSERIAL PRIMARY KEY,
 grant_id BIGINT NOT NULL UNIQUE REFERENCES tinh_canh_rank_grants(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 reason VARCHAR(600) NOT NULL CHECK (length(btrim(reason)) BETWEEN 12 AND 600),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX rank_revocations_time ON tinh_canh_rank_revocations(created_at DESC);
-- Existing immutable ledger trigger, introduced in migration 026, rejects UPDATE.
CREATE TRIGGER tinh_canh_grants_lock BEFORE UPDATE ON tinh_canh_rank_grants
 FOR EACH ROW EXECUTE FUNCTION tinh_van_ledger_immutable();
CREATE TRIGGER tinh_canh_revocations_lock BEFORE UPDATE ON tinh_canh_rank_revocations
 FOR EACH ROW EXECUTE FUNCTION tinh_van_ledger_immutable();
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT ON tinh_canh_rank_grants,tinh_canh_rank_revocations TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE tinh_canh_rank_grants_id_seq,tinh_canh_rank_revocations_id_seq TO thiendo_app;
 END IF;
END $$;
