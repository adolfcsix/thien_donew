-- Additive only. No identity, IP, referrer, URL, query string or birth data collected.
CREATE TABLE web_page_views (
 event_id UUID PRIMARY KEY,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX web_page_views_created ON web_page_views(created_at);
CREATE TABLE web_analytics_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX forum_threads_created_insights ON forum_threads(created_at);
CREATE INDEX forum_comments_created_insights ON forum_comments(created_at);
-- users_recent_idx from migration018 already covers registration time ranges.
CREATE INDEX admin_audit_insights_rate ON admin_audit(actor_id,created_at) WHERE action='insights.read';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,DELETE ON web_page_views TO thiendo_app;
  GRANT SELECT,INSERT ON web_analytics_state TO thiendo_app;
 END IF;
END $$;
