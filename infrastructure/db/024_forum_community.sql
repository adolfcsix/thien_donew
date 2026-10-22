-- V11.157 Luận Đàn: append-only moderation history lives in 025.
-- Do not expose tables directly to browser; every read/write uses the Nest API.
CREATE TABLE forum_categories (
 id VARCHAR(36) PRIMARY KEY CHECK(id ~ '^[a-z0-9-]+$'),
 name VARCHAR(90) NOT NULL, summary VARCHAR(240) NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO forum_categories(id,name,summary,sort_order) VALUES
('tu-vi','Tử Vi Đẩu Số','An sao, luận cung và đối chiếu lá số',1),
('bat-tu','Bát Tự / Tử Bình','Tứ trụ, tiết khí và vận hạn',2),
('mai-hoa','Mai Hoa Dịch Số','Khởi quẻ và Thể – Dụng',3),
('luc-hao','Lục Hào','Dụng thần và hào động',4),
('ky-mon','Kỳ Môn Độn Giáp','Bố cục, Môn Bách và Nhập Mộ',5),
('phong-thuy','Phong thủy','Lý thuyết và thực hành',6),
('chiem-tinh','Chiêm tinh phương Tây','Natal, Transit, Synastry',7),
('tarot','Tarot','Lá bài và kiểu trải',8),
('nghien-cuu','Nghiên cứu & đối chiếu','Nguồn và phương pháp',9),
('hoi-dap','Hỏi đáp chung','Trao đổi dành cho thành viên mới',10);
CREATE TABLE forum_threads (
 id UUID PRIMARY KEY, category_id VARCHAR(36) NOT NULL REFERENCES forum_categories(id),
 author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title VARCHAR(180) NOT NULL, body TEXT NOT NULL CHECK(length(body)<=12000),
 visibility VARCHAR(12) NOT NULL CHECK(visibility IN ('public','members','private')) DEFAULT 'public',
 state VARCHAR(12) NOT NULL CHECK(state IN ('visible','hidden','deleted')) DEFAULT 'visible',
 locked BOOLEAN NOT NULL DEFAULT FALSE, pinned BOOLEAN NOT NULL DEFAULT FALSE,
 chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
 -- Only the owner's explicit alias is shared. Birth data and chart calculation remain private.
 chart_alias VARCHAR(80), chart_shared BOOLEAN NOT NULL DEFAULT FALSE,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(NOT chart_shared OR chart_id IS NOT NULL)
);
CREATE INDEX forum_threads_feed ON forum_threads(category_id,state,pinned DESC,updated_at DESC);
CREATE INDEX forum_threads_author ON forum_threads(author_id,created_at DESC);
-- A chart owner may delete the underlying personal chart at any time.
-- The forum thread survives, but all opt-in chart metadata is atomically revoked.
CREATE FUNCTION forum_unshare_deleted_chart() RETURNS TRIGGER AS $$
BEGIN
 UPDATE forum_threads SET chart_id=NULL,chart_alias=NULL,chart_shared=FALSE,updated_at=clock_timestamp()
 WHERE chart_id=OLD.id;
 RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER forum_chart_private_delete BEFORE DELETE ON charts
 FOR EACH ROW EXECUTE FUNCTION forum_unshare_deleted_chart();

CREATE TABLE forum_comments (
 id UUID PRIMARY KEY, thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
 parent_id UUID REFERENCES forum_comments(id) ON DELETE SET NULL,
 author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body TEXT NOT NULL CHECK(length(body)<=4000),
 state VARCHAR(12) NOT NULL DEFAULT 'visible' CHECK(state IN ('visible','hidden','deleted')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX forum_comments_thread ON forum_comments(thread_id,created_at,id);
CREATE TABLE forum_reactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
 comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
 kind VARCHAR(9) NOT NULL CHECK(kind IN ('like','helpful')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((thread_id IS NULL) <> (comment_id IS NULL))
);
CREATE UNIQUE INDEX forum_reaction_thread_unique ON forum_reactions(user_id,thread_id,kind) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_reaction_comment_unique ON forum_reactions(user_id,comment_id,kind) WHERE comment_id IS NOT NULL;
CREATE TABLE forum_bookmarks (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,thread_id));
CREATE TABLE forum_follows (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,thread_id));
CREATE TABLE forum_notifications (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
 kind VARCHAR(25) NOT NULL CHECK(kind IN ('reply','comment','helpful','moderation','followup')),
 message VARCHAR(200) NOT NULL,seen_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX forum_notifications_inbox ON forum_notifications(user_id,created_at DESC);
CREATE TABLE forum_action_limits (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 action VARCHAR(16) NOT NULL,window_start TIMESTAMPTZ NOT NULL,counter INTEGER NOT NULL CHECK(counter>0),
 PRIMARY KEY(user_id,action,window_start)
);
-- No public upload endpoint in V11.157: attachments are blocked until scanning and rights approval exist.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT ON forum_categories TO thiendo_app;
  GRANT SELECT,INSERT,UPDATE ON forum_threads,forum_comments,forum_notifications,forum_action_limits TO thiendo_app;
  GRANT SELECT,INSERT,DELETE ON forum_reactions,forum_follows,forum_bookmarks TO thiendo_app;
 END IF;
END $$;
