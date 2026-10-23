-- Additive change: existing finite grants and payment records remain unchanged.
-- NULL expiry means a manual lifetime grant, effective until explicitly revoked.
ALTER TABLE pro_entitlements ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE pro_entitlements ADD CONSTRAINT pro_entitlements_duration_kind
 CHECK ((expires_at IS NULL AND order_id IS NULL) OR (expires_at IS NOT NULL AND expires_at > starts_at));
