-- V8.1: support expiry pruning and ordered ownership lookups.
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS charts_user_id_created_id_idx ON charts(user_id,created_at DESC,id);
