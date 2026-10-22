CREATE TABLE account_blocks (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, reason VARCHAR(500) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE admin_memberships (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, role VARCHAR(10) NOT NULL CHECK(role IN ('owner','admin')));
CREATE TABLE billing_plans (id VARCHAR(32) PRIMARY KEY, name VARCHAR(80) NOT NULL, price_vnd INTEGER NOT NULL CHECK(price_vnd BETWEEN 0 AND 10000000), days INTEGER NOT NULL CHECK(days BETWEEN 1 AND 366), features JSONB NOT NULL CHECK(jsonb_typeof(features)='array'), enabled BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO billing_plans(id,name,price_vnd,days,features) VALUES('pro30','Thiên Đồ Pro · 30 ngày',0,30,'["premium-report","multi-chart-report"]');
CREATE SEQUENCE billing_order_code_seq START WITH 100000000;
-- Start from the current millisecond epoch to avoid reusing a merchant's old order codes.
SELECT setval('billing_order_code_seq',GREATEST(100000000,(EXTRACT(EPOCH FROM clock_timestamp())*1000)::BIGINT));
CREATE TABLE billing_orders (id UUID PRIMARY KEY, order_code BIGINT NOT NULL UNIQUE DEFAULT nextval('billing_order_code_seq'), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan_id VARCHAR(32) NOT NULL REFERENCES billing_plans(id), plan_name VARCHAR(80) NOT NULL, amount_vnd INTEGER NOT NULL CHECK(amount_vnd>0), days INTEGER NOT NULL CHECK(days BETWEEN 1 AND 366), features JSONB NOT NULL, status VARCHAR(12) NOT NULL CHECK(status IN ('creating','pending','paid','failed','cancelled','refunded')), request_key UUID NOT NULL, payment_link_id VARCHAR(128), checkout_url TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ, refund_reference VARCHAR(200), refunded_at TIMESTAMPTZ, UNIQUE(user_id,request_key));
CREATE INDEX billing_orders_user_time ON billing_orders(user_id,created_at DESC);
CREATE TABLE pro_entitlements (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, order_id UUID UNIQUE REFERENCES billing_orders(id), features JSONB NOT NULL, starts_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, CHECK(expires_at>starts_at));
CREATE INDEX pro_entitlements_user ON pro_entitlements(user_id,expires_at);
CREATE TABLE billing_events (reference VARCHAR(200) PRIMARY KEY, order_id UUID NOT NULL REFERENCES billing_orders(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE admin_audit (id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(80) NOT NULL, target VARCHAR(128) NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE content_posts (id UUID PRIMARY KEY, slug VARCHAR(100) UNIQUE NOT NULL, title VARCHAR(150) NOT NULL, body TEXT NOT NULL CHECK(length(body)<=20000), published BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
-- Existing production volumes do not rerun init-db.sh. Grant access to the two
-- new sequences explicitly when the restricted API role exists.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT USAGE,SELECT ON SEQUENCE public.billing_order_code_seq,public.admin_audit_id_seq TO thiendo_app;
 END IF;
END $$;
