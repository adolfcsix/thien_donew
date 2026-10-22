-- V11.151: additive authentication changes; prior migrations remain immutable.
-- Existing email/password users stay unverified until they complete a challenge.
ALTER TABLE users ADD COLUMN username VARCHAR(32);
ALTER TABLE users ADD CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[a-z][a-z0-9_]{3,31}$');
CREATE UNIQUE INDEX users_username_unique_idx ON users (LOWER(username)) WHERE username IS NOT NULL;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN public_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE sessions ADD CONSTRAINT sessions_public_id_key UNIQUE(public_id);
ALTER TABLE sessions ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN device_label VARCHAR(120) NOT NULL DEFAULT 'Thiết bị không xác định';
CREATE INDEX sessions_user_created_idx ON sessions(user_id,created_at DESC);
CREATE TABLE account_email_verifications (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code_hash CHAR(64) NOT NULL,
 attempts SMALLINT NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 CHECK(expires_at>created_at)
);
CREATE INDEX account_email_verifications_user_recent_idx ON account_email_verifications(user_id,created_at DESC);
CREATE TABLE admin_mfa_credentials (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 secret_encrypted TEXT NOT NULL,
 enabled_at TIMESTAMPTZ,
 last_accepted_step BIGINT NOT NULL DEFAULT -1,
 failed_attempts SMALLINT NOT NULL DEFAULT 0,
 locked_until TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE admin_session_assurance (
 token_hash CHAR(64) PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX admin_session_assurance_user_idx ON admin_session_assurance(user_id);
CREATE TABLE account_security_events (
 id BIGSERIAL PRIMARY KEY,
 user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 event VARCHAR(65) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX account_security_events_user_time_idx ON account_security_events(user_id,created_at DESC);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON account_email_verifications,admin_mfa_credentials,admin_session_assurance,account_security_events TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE account_security_events_id_seq TO thiendo_app;
 END IF;
END $$;
