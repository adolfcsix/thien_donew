#!/usr/bin/env bash
# Restores ONLY to a newly created isolated DB. Never drops/cleans production.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
check_config >/dev/null
snapshot="${1:-}"
target="${2:-}"
assets_target="${3:-}"
[[ "$snapshot" =~ ^[a-f0-9]{8,64}$ ]] || { echo 'Pass a specific restic snapshot id, not latest' >&2; exit 2; }
[[ "$target" =~ ^thiendo_restore_[a-z0-9_]{1,32}$ ]] || { echo 'Target must start thiendo_restore_' >&2; exit 2; }
[[ "$assets_target" = /* && ! -e "$assets_target" && ! -L "$assets_target" ]] || { echo 'Pass an absolute NEW isolated assets directory as the third argument' >&2; exit 2; }
: "${RESTIC_REPOSITORY:?}"
: "${RESTIC_PASSWORD_FILE:?}"
exec 9>"$config_dir/restore.lock"
flock -n 9 || exit 2
tmp_dir=$(mktemp -d)
trap 'rm -rf -- "$tmp_dir"' EXIT
restic dump "$snapshot" /thien-do.bundle > "$tmp_dir/restore.bundle"
node "$config_dir/file-bundle.mjs" unpack "$tmp_dir/restore.bundle" "$tmp_dir/verified" > "$tmp_dir/bundle-receipt.json"
cp "$tmp_dir/verified/thien-do.dump" "$tmp_dir/db.dump"
"${compose[@]}" exec -T -u postgres db pg_restore --list < "$tmp_dir/db.dump" >/dev/null
# createdb fails if a DB already exists; intentionally no dropdb or --clean.
"${compose[@]}" exec -T -u postgres db createdb -U thiendo_owner "$target"
"${compose[@]}" exec -T -u postgres db pg_restore -U thiendo_owner -d "$target" --no-owner --no-acl --exit-on-error --single-transaction < "$tmp_dir/db.dump"
"${compose[@]}" exec -T -u postgres db psql -X -v ON_ERROR_STOP=1 -U thiendo_owner -d "$target" <<'SQL'
BEGIN;
-- A disaster recovery must not revive old browser sessions or outstanding OTPs.
TRUNCATE sessions,admin_trusted_devices,admin_session_assurance,admin_mfa_credentials,account_email_verifications,account_security_events,auth_email_challenges,password_reset_challenges,auth_google_nonces;
DO $$ BEGIN
  -- Verify every migration expected by the V11.149 schema, not merely a count:
  -- a corrupt ledger with a missing migration and an unrelated entry must fail.
  IF EXISTS (
    WITH expected(name) AS (VALUES
    ('001_core.sql'),
    ('002_indexes.sql'),
    ('003_lunar_date_storage.sql'),
    ('004_study_entries.sql'),
    ('005_study_import_receipts.sql'),
    ('006_account_identity_security.sql'),
    ('007_numerology_study.sql'),
    ('008_western_study.sql'),
    ('009_tarot_rws_study.sql'),
    ('010_da_liu_ren_study.sql'),
    ('011_taiyi_study.sql'),
    ('012_unified_birth_profiles.sql'),
    ('013_google_nonce_replay.sql'),
    ('014_bazi_study_snapshot.sql'),
    ('015_admin_billing.sql'),
    ('016_private_consultations.sql'),
    ('017_consultation_display_name.sql'),
    ('018_operational_query_indexes.sql'),
    ('019_account_admin_mfa.sql'),
    ('020_huyen_giai_ai.sql'),
    ('021_library_books.sql'),
    ('022_van_kho_cms.sql'),
    ('023_van_kho_media.sql'),
    ('024_forum_community.sql'),
    ('025_forum_moderation.sql'),
    ('026_tinh_canh_points.sql'),
    ('027_tinh_canh_manual_grants.sql'),
    ('028_billing_reconciliation_policy.sql'),
    ('029_guides_policies_cms.sql'),
    ('030_admin_insights.sql'),
    ('031_forum_single_image.sql'),
    ('032_admin_console.sql'),
    ('033_community_experts_access.sql'),
    ('034_admin_badge_showcase.sql'),
    ('035_admin_trusted_devices.sql'),
    ('036_specialty_badges.sql'))
    SELECT name FROM expected
    EXCEPT SELECT name FROM schema_migrations
  ) THEN RAISE EXCEPTION 'Restored schema is missing required migration(s)'; END IF;
  IF (SELECT count(*) FROM schema_migrations) < 36 THEN
    RAISE EXCEPTION 'Restored schema migration ledger is incomplete';
  END IF;
END $$;
SELECT count(*) AS applied_migrations FROM schema_migrations;
SELECT count(*) AS users FROM users;
SELECT count(*) AS retained_page_view_events FROM web_page_views;
SELECT count(*) AS analytics_state FROM web_analytics_state;
SELECT count(*) AS charts FROM charts;
SELECT count(*) AS study_entries FROM study_entries;
SELECT count(*) AS birth_profiles FROM birth_profiles;
SELECT count(*) AS billing_orders FROM billing_orders;
SELECT count(*) AS billing_events FROM billing_events;
SELECT count(*) AS pro_entitlements FROM pro_entitlements;
SELECT count(*) AS admin_memberships FROM admin_memberships;
SELECT count(*) AS admin_audit FROM admin_audit;
SELECT count(*) AS forum_threads FROM forum_threads;
SELECT count(*) AS forum_comments FROM forum_comments;
SELECT count(*) AS forum_reports FROM forum_reports;
SELECT count(*) AS forum_moderation_events FROM forum_moderation_events;
SELECT count(*) AS forum_tinh_van_ledger FROM forum_tinh_van_ledger;
SELECT count(*) AS tinh_van_awards FROM tinh_van_awards;
SELECT count(*) AS tinh_van_reversals FROM tinh_van_reversals;
SELECT count(*) AS tinh_canh_rank_grants FROM tinh_canh_rank_grants;
SELECT count(*) AS tinh_canh_rank_revocations FROM tinh_canh_rank_revocations;
SELECT count(*) AS consultation_requests FROM consultation_requests;
SELECT count(*) AS consultation_config FROM consultation_config;
SELECT count(*) AS billing_refund_requests FROM billing_refund_requests;
SELECT count(*) AS ai_plan_quotas FROM ai_plan_quotas;
SELECT count(*) AS billing_bank_config FROM billing_bank_config;
-- Restore authentication must NOT revive any old login/OTP credentials.
DO $$ BEGIN
 IF (SELECT count(*) FROM sessions) != 0 OR (SELECT count(*) FROM auth_email_challenges) != 0
 OR (SELECT count(*) FROM password_reset_challenges) != 0 OR (SELECT count(*) FROM auth_google_nonces) != 0
 OR (SELECT count(*) FROM admin_trusted_devices) != 0 OR (SELECT count(*) FROM admin_session_assurance) != 0 OR (SELECT count(*) FROM admin_mfa_credentials) != 0
 OR (SELECT count(*) FROM account_email_verifications) != 0 OR (SELECT count(*) FROM account_security_events) != 0
 THEN RAISE EXCEPTION 'Restored volatile credentials were not purged'; END IF;
END $$;
COMMIT;
SQL
"${compose[@]}" exec -T -u postgres db psql -X -v ON_ERROR_STOP=1 -U thiendo_owner -d "$target" -At < "$config_dir/private-assets-index.sql" > "$tmp_dir/restored-asset-index.json"
node "$config_dir/file-bundle.mjs" verify-index "$tmp_dir/verified/private-assets.tda" "$tmp_dir/restored-asset-index.json" > "$tmp_dir/references-receipt.json"
node "$config_dir/file-bundle.mjs" unpack "$tmp_dir/verified/private-assets.tda" "$assets_target" > "$tmp_dir/assets-receipt.json"
printf '{"event":"restore_drill_complete","target":"%s","snapshot":"%s","productionChanged":false}\n' "$target" "$snapshot"
# The isolated DB is retained for inspection; delete it manually after review.
node - "$config_dir/restore-status.json" "$snapshot" "$target" "$assets_target" "$tmp_dir/assets-receipt.json" "$tmp_dir/references-receipt.json" <<'NODE'
const fs=require('node:fs');
const [file,snapshot,target,assetsTarget,receipt,referencesReceipt]=process.argv.slice(2);
const assets=JSON.parse(fs.readFileSync(receipt,'utf8'));
const references=JSON.parse(fs.readFileSync(referencesReceipt,'utf8'));
if(assets.checksumsVerified!==true||!Number.isSafeInteger(assets.files))throw Error('Private assets restore was not verified');
if(references.referencesVerified!==true||references.archivedFiles!==assets.files)throw Error('Restored database asset references were not verified');
// Keep the legacy receipt schema floor; the exact current chain is verified above.
fs.writeFileSync(file,JSON.stringify({ok:true,time:new Date().toISOString(),snapshot,target,minMigration:19,
  clearedAuthState:true,verifiedMigrationNames:36,productionChanged:false,verifiedPrivateAssets:true,verifiedAssetReferences:true,assetReferences:references.references,assetFiles:assets.files,assetsTarget})+'\n',{mode:0o600});
NODE
# This receipt has no credentials and is read by the unprivileged monitor.
chmod 644 "$config_dir/restore-status.json"
