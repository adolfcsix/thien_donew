-- Bounded administration lists must not sort the entire growing history.
CREATE INDEX billing_orders_recent_idx ON billing_orders(created_at DESC,id);
CREATE INDEX users_recent_idx ON users(created_at DESC,id);
CREATE INDEX pro_entitlements_recent_idx ON pro_entitlements(expires_at DESC,id);
CREATE INDEX pro_entitlements_active_user_idx ON pro_entitlements(user_id,expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX content_posts_recent_idx ON content_posts(updated_at DESC,id);
CREATE INDEX content_posts_published_recent_idx ON content_posts(updated_at DESC,id) WHERE published=true;
CREATE INDEX consultation_requests_chart_idx ON consultation_requests(chart_id) WHERE chart_id IS NOT NULL;
