-- V11.161 additive finance policies. Existing immutable migrations remain untouched.
-- All purchases and automatic entitlements still REQUIRE payOS confirmation.
INSERT INTO billing_plans(id,name,price_vnd,days,features,enabled)
VALUES ('pro90','Thiên Đồ Pro · 90 ngày',0,90,'["premium-report","multi-chart-report"]',FALSE),
       ('pro365','Thiên Đồ Pro · 365 ngày',0,365,'["premium-report","multi-chart-report"]',FALSE)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE ai_plan_quotas (
 id SMALLINT PRIMARY KEY CHECK(id=1),
 free_daily INTEGER NOT NULL DEFAULT 5 CHECK(free_daily BETWEEN 0 AND 200),
 pro_daily INTEGER NOT NULL DEFAULT 20 CHECK(pro_daily BETWEEN 0 AND 200),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO ai_plan_quotas(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

-- Manual transfer info only: NEVER treated as payment evidence or entitlement.
CREATE TABLE billing_bank_config (
 id SMALLINT PRIMARY KEY CHECK(id=1),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 bank_bin VARCHAR(8) NOT NULL DEFAULT '' CHECK(bank_bin='' OR bank_bin ~ '^[0-9]{6,8}$'),
 account_number VARCHAR(30) NOT NULL DEFAULT '' CHECK(account_number='' OR account_number ~ '^[0-9]{6,30}$'),
 account_name VARCHAR(100) NOT NULL DEFAULT '',
 instructions VARCHAR(600) NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
 CHECK(NOT enabled OR (length(bank_bin)>0 AND length(account_number)>0 AND length(account_name)>0))
);
INSERT INTO billing_bank_config(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

-- Refunds use maker-checker (two independent owner accounts), then a manually
-- recorded bank/provider refund reference. No payment gateway refund is issued.
CREATE TABLE billing_refund_requests (
 order_id UUID PRIMARY KEY REFERENCES billing_orders(id) ON DELETE CASCADE,
 status VARCHAR(16) NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','rejected','completed')),
 reason VARCHAR(500) NOT NULL CHECK(length(btrim(reason))>=10),
 requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
 approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
 completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
 refund_reference VARCHAR(200) UNIQUE,
 requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 approved_at TIMESTAMPTZ,
 completed_at TIMESTAMPTZ,
 CHECK(approver_id IS NULL OR requester_id IS DISTINCT FROM approver_id),
 CHECK(status IN ('requested','rejected') OR (approver_id IS NOT NULL AND approved_at IS NOT NULL)),
 CHECK(status<>'completed' OR (refund_reference IS NOT NULL AND approved_at IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX billing_refunds_status_time ON billing_refund_requests(status,requested_at DESC);
CREATE INDEX billing_orders_status_created ON billing_orders(status,created_at DESC);
CREATE INDEX billing_orders_paid_time ON billing_orders(paid_at DESC) WHERE status='paid';

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON billing_refund_requests, billing_bank_config, ai_plan_quotas TO thiendo_app;
 END IF;
END $$;
