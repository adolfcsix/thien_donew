-- V11.141: server-issued one-use nonces shared across API instances.
-- Additive migration; never edits earlier applied migrations.
CREATE TABLE auth_google_nonces (
  nonce_hash CHAR(64) PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX auth_google_nonces_expiry_idx ON auth_google_nonces(expires_at);
