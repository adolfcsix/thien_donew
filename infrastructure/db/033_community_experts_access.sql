-- Additive community identities, participant-only messaging and editorial access.
CREATE TABLE expert_credentials (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 specialty VARCHAR(120) NOT NULL,
 granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
 granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 revoked_at TIMESTAMPTZ,
 reason VARCHAR(500) NOT NULL
);
ALTER TABLE library_books ADD COLUMN submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE library_books ADD COLUMN submission_status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK(submission_status IN ('draft','pending','reviewed'));
CREATE INDEX library_books_submitter_idx ON library_books(submitted_by,updated_at DESC);
CREATE TABLE direct_conversations (
 id UUID PRIMARY KEY,
 initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 first_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 second_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK(first_user<second_user), UNIQUE(first_user,second_user)
);
CREATE TABLE direct_messages (
 id BIGSERIAL PRIMARY KEY,
 conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_id UUID NOT NULL,
 body VARCHAR(2000) NOT NULL CHECK(length(trim(body))>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(sender_id,client_id)
);
CREATE INDEX direct_messages_page_idx ON direct_messages(conversation_id,id DESC);
CREATE INDEX direct_messages_rate_idx ON direct_messages(sender_id,created_at DESC);
CREATE INDEX direct_conversations_first_idx ON direct_conversations(first_user,updated_at DESC);
CREATE INDEX direct_conversations_second_idx ON direct_conversations(second_user,updated_at DESC);
CREATE TABLE direct_read_receipts (
 conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 last_message_id BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE direct_blocks (
 blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE TABLE direct_message_reports (
 id BIGSERIAL PRIMARY KEY,
 message_id BIGINT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
 reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason VARCHAR(500) NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(message_id,reporter_id)
);
CREATE TABLE premium_sections (
 path VARCHAR(160) PRIMARY KEY,
 title VARCHAR(160) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT true,
 updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK(path IN ('/pro/research','/research/advanced'))
);
INSERT INTO premium_sections(path,title) VALUES('/pro/research','Báo cáo nghiên cứu chuyên sâu'),('/research/advanced','Xưởng phương pháp chuyên sâu');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
 GRANT SELECT,INSERT,UPDATE,DELETE ON expert_credentials,direct_conversations,direct_messages,direct_read_receipts,direct_blocks,direct_message_reports,premium_sections TO thiendo_app;
 GRANT USAGE,SELECT ON SEQUENCE direct_messages_id_seq,direct_message_reports_id_seq TO thiendo_app;
 END IF;
END $$;
