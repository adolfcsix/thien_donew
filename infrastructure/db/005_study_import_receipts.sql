-- V11.114.2: durable idempotency of private Study Room restores. Append-only.
-- The receipt and every imported study entry MUST commit in one transaction.
CREATE TABLE IF NOT EXISTS study_import_receipts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL,
  payload_sha256 CHAR(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  imported_count SMALLINT NOT NULL CHECK (imported_count BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, import_id)
);
