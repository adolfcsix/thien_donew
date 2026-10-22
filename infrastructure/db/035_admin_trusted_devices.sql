-- A62: opt-in remember-browser token, never an admin role or substitute for fresh MFA on writes.
ALTER TABLE admin_session_assurance
 ADD COLUMN method TEXT NOT NULL DEFAULT 'totp' CHECK (method IN ('totp','trusted_device'));
CREATE TABLE admin_trusted_devices (
 token_hash CHAR(64) PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 expires_at TIMESTAMPTZ NOT NULL,
 last_used_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 device_label VARCHAR(120) NOT NULL DEFAULT 'Thiết bị tin cậy'
);
CREATE INDEX admin_trusted_devices_user_expires_idx ON admin_trusted_devices(user_id,expires_at);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON admin_trusted_devices TO thiendo_app;
 END IF;
END $$;
