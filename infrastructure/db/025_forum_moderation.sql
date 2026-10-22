-- V11.158 audit, report, appeals, moderation, participation points.
CREATE TABLE forum_reports (
 id UUID PRIMARY KEY, reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
 comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
 reason VARCHAR(24) NOT NULL CHECK(reason IN ('spam','abuse','privacy','misinformation','copyright','other')),
 explanation VARCHAR(800) NOT NULL DEFAULT '',
 status VARCHAR(14) NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
 handled_by UUID REFERENCES users(id) ON DELETE SET NULL,handled_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((thread_id IS NOT NULL) <> (comment_id IS NOT NULL))
);
CREATE INDEX forum_reports_queue ON forum_reports(status,created_at);
CREATE UNIQUE INDEX forum_reports_unique_thread ON forum_reports(reporter_id,thread_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_reports_unique_comment ON forum_reports(reporter_id,comment_id) WHERE comment_id IS NOT NULL;
CREATE TABLE forum_moderation_events (
 id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 thread_id UUID REFERENCES forum_threads(id) ON DELETE SET NULL,
 comment_id UUID REFERENCES forum_comments(id) ON DELETE SET NULL,
 affected_user UUID REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(32) NOT NULL,reason VARCHAR(800) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX forum_moderation_events_time ON forum_moderation_events(created_at DESC);
CREATE TABLE forum_appeals (
 id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
 comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
 reason VARCHAR(800) NOT NULL,status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','approved','denied')),
 reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,reviewed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((thread_id IS NOT NULL) <> (comment_id IS NOT NULL))
);
CREATE TABLE forum_warnings (
 id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
 reason VARCHAR(800) NOT NULL,expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Forum suspension, distinct from global login account blocks.
CREATE TABLE forum_suspensions (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,reason VARCHAR(800) NOT NULL,
 moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tinh Văn: only system-confirmed helpful answers; no points for likes/self-actions.
CREATE TABLE forum_tinh_van_ledger (
 id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
 event VARCHAR(20) NOT NULL CHECK(event IN ('helpful','reversal','restoration')),
 points SMALLINT NOT NULL CHECK(points IN (-2,2)),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX forum_tinh_van_award_once ON forum_tinh_van_ledger(comment_id) WHERE event='helpful';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE ON forum_reports,forum_appeals,forum_warnings,forum_suspensions TO thiendo_app;
  GRANT DELETE ON forum_suspensions TO thiendo_app;
  GRANT SELECT,INSERT ON forum_moderation_events,forum_tinh_van_ledger TO thiendo_app;
  GRANT USAGE,SELECT ON SEQUENCE forum_moderation_events_id_seq,forum_tinh_van_ledger_id_seq TO thiendo_app;
 END IF;
END $$;
