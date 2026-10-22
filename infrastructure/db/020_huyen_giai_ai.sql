-- V11.154.5: no credentials, identifiers from Gemini, or source birth details stored in AI telemetry.
-- Access to this schema is exclusively through the authenticated backend.
CREATE TABLE ai_runtime_config (
  id INTEGER PRIMARY KEY CHECK (id=1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  model VARCHAR(80) NOT NULL DEFAULT 'gemini-3.8-flash',
  daily_user_calls INTEGER NOT NULL DEFAULT 5 CHECK(daily_user_calls BETWEEN 0 AND 200),
  daily_global_calls INTEGER NOT NULL DEFAULT 500 CHECK(daily_global_calls BETWEEN 0 AND 100000),
  max_output_tokens INTEGER NOT NULL DEFAULT 1200 CHECK(max_output_tokens BETWEEN 256 AND 4096),
  daily_budget_microusd BIGINT NOT NULL DEFAULT 200000 CHECK(daily_budget_microusd BETWEEN 0 AND 10000000000),
  input_price_microusd_per_million BIGINT NOT NULL DEFAULT 750000 CHECK(input_price_microusd_per_million BETWEEN 1 AND 100000000),
  output_price_microusd_per_million BIGINT NOT NULL DEFAULT 3750000 CHECK(output_price_microusd_per_million BETWEEN 1 AND 100000000),
  prompt_version VARCHAR(40) NOT NULL DEFAULT 'huyen-giai-v1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO ai_runtime_config(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  mode VARCHAR(12) NOT NULL CHECK(mode IN ('basic','expert')),
  topic VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ai_conversations_user_recent ON ai_conversations(user_id,updated_at DESC);
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  model VARCHAR(80) NOT NULL,
  status VARCHAR(12) NOT NULL CHECK(status IN ('reserved','completed','failed')),
  reserved_microusd BIGINT NOT NULL CHECK(reserved_microusd>=0),
  billed_microusd BIGINT NOT NULL DEFAULT 0 CHECK(billed_microusd>=0),
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK(prompt_tokens>=0),
  response_tokens INTEGER NOT NULL DEFAULT 0 CHECK(response_tokens>=0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK(duration_ms>=0),
  error_code VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX ai_usage_user_day ON ai_usage(user_id,created_at DESC);
CREATE INDEX ai_usage_global_day ON ai_usage(created_at DESC);
CREATE UNIQUE INDEX ai_one_inflight_per_user ON ai_usage(user_id) WHERE status='reserved';
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_id UUID NOT NULL UNIQUE REFERENCES ai_usage(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK(length(question) BETWEEN 1 AND 1000),
  response JSONB NOT NULL,
  engine_revision VARCHAR(160) NOT NULL,
  facts_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ai_messages_conversation ON ai_messages(conversation_id,created_at,id);
CREATE TABLE ai_feedback (
  message_id UUID PRIMARY KEY REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ai_feedback_user_recent ON ai_feedback(user_id,created_at DESC);
