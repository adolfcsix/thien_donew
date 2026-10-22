import { Controller, Get, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { expectedDisposableDatabase } from '../../common/e2e-identity';
import Engine = require('@thiendo/astrology-engine');
import { DatabaseService } from '../../common/database.service';
/** Required by this application build; regression checks keep these inventories aligned with immutable SQL. */
const REQUIRED_MIGRATIONS = [
  '001_core.sql','002_indexes.sql','003_lunar_date_storage.sql',
  '004_study_entries.sql','005_study_import_receipts.sql','006_account_identity_security.sql',
  '007_numerology_study.sql','008_western_study.sql','009_tarot_rws_study.sql',
  '010_da_liu_ren_study.sql','011_taiyi_study.sql','012_unified_birth_profiles.sql',
  '013_google_nonce_replay.sql','014_bazi_study_snapshot.sql','015_admin_billing.sql',
  '016_private_consultations.sql','017_consultation_display_name.sql','018_operational_query_indexes.sql',
  '019_account_admin_mfa.sql','020_huyen_giai_ai.sql','021_library_books.sql',
  '022_van_kho_cms.sql','023_van_kho_media.sql','024_forum_community.sql',
  '025_forum_moderation.sql','026_tinh_canh_points.sql','027_tinh_canh_manual_grants.sql',
  '028_billing_reconciliation_policy.sql','029_guides_policies_cms.sql','030_admin_insights.sql',
  '031_forum_single_image.sql','032_admin_console.sql','033_community_experts_access.sql','034_admin_badge_showcase.sql',
  '035_admin_trusted_devices.sql','036_specialty_badges.sql',
];
const REQUIRED_TABLES = [
  'expert_credentials','direct_conversations','direct_messages','direct_read_receipts','direct_blocks','direct_message_reports','premium_sections','admin_badge_showcase',
  'account_blocks','account_email_verifications','account_security_events',
  'admin_audit','admin_memberships','admin_mfa_credentials','admin_permission_sets','admin_profile_preferences',
  'admin_session_assurance','admin_trusted_devices','specialty_badge_grants','specialty_badge_revocations','ai_conversations','ai_feedback',
  'ai_messages','ai_plan_quotas','ai_runtime_config',
  'ai_usage','auth_email_challenges','auth_google_nonces',
  'billing_bank_config','billing_events','billing_orders',
  'billing_plans','billing_refund_requests','birth_profiles',
  'charts','consultation_config','consultation_requests',
  'content_post_versions','content_posts','forum_action_limits','forum_appeals',
  'forum_bookmarks','forum_categories','forum_comments',
  'forum_follows','forum_media','forum_moderation_events','forum_notifications',
  'forum_reactions','forum_reports','forum_suspensions',
  'forum_threads','forum_tinh_van_ledger','forum_warnings',
  'library_assets','library_books','library_read_events',
  'library_reading_progress','password_reset_challenges','portal_documents',
  'portal_review_events','portal_revisions','pro_entitlements',
  'sessions','study_entries','study_import_receipts',
  'tinh_canh_preferences','tinh_canh_rank_grants','tinh_canh_rank_revocations',
  'tinh_van_awards','tinh_van_rate_limits','tinh_van_reversals',
  'users','van_kho_authors','van_kho_documents',
  'van_kho_media','van_kho_review_events','van_kho_revisions','web_analytics_state','web_page_views',
].sort();
@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get() health() { return { ok: true, app: 'THIEN DO', engine: Engine.RULESET }; }
  /**
   * Non-production, opt-in, read-only E2E identity check. The test runner must
   * confirm the API process is using the SAME disposable database that it
   * inspected locally, before running destructive account/chart HTTP tests.
   */
  @Get('e2e') async disposableE2EIdentity() {
    const expectedName = expectedDisposableDatabase(process.env);
    if (!expectedName) throw new NotFoundException();
    let actualName: string | undefined;
    let instanceFingerprint: string | undefined;
    try {
      const result = await this.db.query<{ database_name: string; instance_fingerprint: string }>(`
        SELECT current_database() AS database_name,
               md5(current_database() || ':' ||
                   (SELECT oid::text FROM pg_database WHERE datname = current_database()) || ':' ||
                   coalesce(inet_server_port()::text, 'local') || ':' ||
                   extract(epoch from pg_postmaster_start_time())::text) AS instance_fingerprint`);
      actualName = result.rows[0]?.database_name;
      instanceFingerprint = result.rows[0]?.instance_fingerprint;
    } catch {
      throw new ServiceUnavailableException('Không xác minh được cơ sở dữ liệu E2E');
    }
    if (actualName !== expectedName || !/^[a-f0-9]{32}$/.test(instanceFingerprint || '')) {
      throw new ServiceUnavailableException('API không sử dụng đúng database thử nghiệm');
    }
    return { ok: true, profile: 'disposable-e2e', database: actualName, fingerprint: instanceFingerprint };
  }
  @Get('ready') async ready() {
    let rows: { ready: boolean }[];
    try {
      const result = await this.db.query<{ ready: boolean }>(`
        SELECT (to_regclass('public.users') IS NOT NULL)
           AND (to_regclass('public.sessions') IS NOT NULL)
           AND (to_regclass('public.charts') IS NOT NULL)
           AND (to_regclass('public.study_entries') IS NOT NULL)
           AND (to_regclass('public.study_import_receipts') IS NOT NULL)
           AND (to_regclass('public.birth_profiles') IS NOT NULL)
           AND (to_regclass('public.auth_google_nonces') IS NOT NULL)
           AND (to_regclass('public.auth_email_challenges') IS NOT NULL)
           AND (to_regclass('public.password_reset_challenges') IS NOT NULL)
           AND (to_regclass('public.schema_migrations') IS NOT NULL)
           AND EXISTS (SELECT 1 FROM schema_migrations WHERE name='014_bazi_study_snapshot.sql')
           AND EXISTS (SELECT 1 FROM schema_migrations WHERE name='015_admin_billing.sql')
           AND EXISTS (SELECT 1 FROM schema_migrations WHERE name='016_private_consultations.sql')
           AND EXISTS (SELECT 1 FROM schema_migrations WHERE name='017_consultation_display_name.sql')
           AND EXISTS (SELECT 1 FROM schema_migrations WHERE name='018_operational_query_indexes.sql')
           AND NOT EXISTS (SELECT expected.name FROM unnest($1::text[]) AS expected(name) EXCEPT SELECT name FROM schema_migrations)
           AND NOT EXISTS (SELECT 1 FROM unnest($2::text[]) AS expected(name) WHERE to_regclass('public.' || expected.name) IS NULL)
           AND (to_regclass('public.consultation_requests') IS NOT NULL)
           AND (to_regclass('public.billing_orders') IS NOT NULL)
           AND (to_regclass('public.pro_entitlements') IS NOT NULL)
           AND (to_regclass('public.account_blocks') IS NOT NULL)
           AND (to_regclass('public.admin_memberships') IS NOT NULL)
           -- The registration transaction requires columns introduced in migration 019.
           -- A complete migration ledger alone must not falsely report READY after schema drift.
           AND NOT EXISTS (
             SELECT 1 FROM (VALUES
               ('users','id'), ('users','email'), ('users','password_hash'), ('users','salt'),
               ('sessions','token_hash'), ('sessions','user_id'), ('sessions','expires_at'), ('sessions','device_label'),
               ('account_security_events','user_id'), ('account_security_events','event')
             ) AS needed(table_name,column_name)
             WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns AS col
               WHERE col.table_schema='public' AND col.table_name=needed.table_name
                 AND col.column_name=needed.column_name
             )
           )
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_sub')
           AND EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='charts'
               AND column_name='birth_date' AND data_type='character varying'
           )
           AND EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='study_entries'
               AND column_name='snapshot' AND data_type='jsonb'
           )
           AND EXISTS (
             SELECT 1 FROM pg_constraint
             WHERE conrelid=to_regclass('public.study_entries')
               AND conname='study_entries_discipline_check'
               AND pg_get_constraintdef(oid) LIKE '%numerology%'
               AND pg_get_constraintdef(oid) LIKE '%western-astrology%'
               AND pg_get_constraintdef(oid) LIKE '%tarot%'
               AND pg_get_constraintdef(oid) LIKE '%ha-lac%'
               AND pg_get_constraintdef(oid) LIKE '%thiet-ban%'
               AND pg_get_constraintdef(oid) LIKE '%lich-phap%'
               AND pg_get_constraintdef(oid) LIKE '%bazi%'
           )
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='study_entries' AND column_name='birth_profile_id')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='charts' AND column_name='birth_profile_id') AS ready`,[REQUIRED_MIGRATIONS,REQUIRED_TABLES]);
      rows = result.rows;
    } catch { throw new ServiceUnavailableException('PostgreSQL chưa sẵn sàng'); }
    if (!rows[0]?.ready) throw new ServiceUnavailableException('Cần chạy đầy đủ migration, gồm Thư phòng cá nhân, trước khi phục vụ người dùng');
    return { ok: true, database: 'postgresql', schema: 'v11.142.0' };
  }
}
