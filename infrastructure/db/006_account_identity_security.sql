-- V11.115.0: private profile, linked Google identity and one-time email verification.
-- Google-only accounts do not have a local password; legacy columns retain NOT NULL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data BYTEA;
ALTER TABLE users ADD CONSTRAINT user_avatar_mime_check CHECK (avatar_mime IS NULL OR avatar_mime IN ('image/jpeg','image/png','image/webp'));
ALTER TABLE users ADD CONSTRAINT user_avatar_size_check CHECK (avatar_data IS NULL OR octet_length(avatar_data) <= 307200);
CREATE TABLE IF NOT EXISTS auth_email_challenges (
 id UUID PRIMARY KEY,
 email VARCHAR(150) NOT NULL,
 google_sub VARCHAR(255) NOT NULL,
 display_name VARCHAR(60),
 link_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 purpose VARCHAR(8) NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','delete')),
 code_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 used_at TIMESTAMPTZ,
 CONSTRAINT auth_email_challenge_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_email_challenges_recent_idx ON auth_email_challenges(google_sub,created_at DESC);
CREATE INDEX IF NOT EXISTS auth_email_challenges_expiration_idx ON auth_email_challenges(expires_at);

-- Password recovery is separate from Google sign-in OTP so that credentials and rate limits cannot be confused.
CREATE TABLE IF NOT EXISTS password_reset_challenges (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 used_at TIMESTAMPTZ,
 CONSTRAINT password_reset_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS password_reset_recent_idx ON password_reset_challenges(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON password_reset_challenges(expires_at);
