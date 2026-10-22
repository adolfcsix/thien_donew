/** Verify the ACTUAL PostgreSQL connection before destructive account/chart E2E.
 * Fail closed for pre-existing data. Needs installed `pg` and migrated schema.
 */
import pg from 'pg';
import {assertSafeE2ETarget} from './e2e-guard.mjs';
import {assertDisposableDatabaseState} from './e2e-db-policy.mjs';
import {verifyMigrationChain,defaultDbDir,defaultBaselinePath} from './lib/migration-chain-integrity.mjs';
import {expectedMigrationLedger,assertMigrationLedger} from './lib/migration-ledger-integrity.mjs';
const target = assertSafeE2ETarget(process.env);
const {files}=verifyMigrationChain(defaultDbDir,defaultBaselinePath);
const expectedLedger=expectedMigrationLedger(defaultDbDir,files);
const client = new pg.Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});
let verifiedDatabaseIdentity = null;
try {
  await client.connect();
  // No E2E writes until the *actual connected database* proves it has all migrations.
  const ledger=await client.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
  assertMigrationLedger(expectedLedger,ledger.rows,{requireComplete:true});
  const {rows} = await client.query(`
    SELECT current_database() AS database_name,
           md5(current_database() || ':' ||
               (SELECT oid::text FROM pg_database WHERE datname = current_database()) || ':' ||
               coalesce(inet_server_port()::text, 'local') || ':' ||
               extract(epoch from pg_postmaster_start_time())::text) AS instance_fingerprint,
           (SELECT count(*)::int FROM users) AS users_count,
           (SELECT count(*)::int FROM sessions) AS sessions_count,
           (SELECT count(*)::int FROM charts) AS charts_count,
           (SELECT count(*)::int FROM study_entries) AS studies_count,
           (SELECT count(*)::int FROM billing_orders) AS billing_orders_count,
           (SELECT count(*)::int FROM consultation_requests) AS consultations_count,
           (SELECT count(*)::int FROM billing_events) AS billing_events_count,
           (SELECT count(*)::int FROM pro_entitlements) AS entitlements_count,
           (SELECT count(*)::int FROM admin_memberships) AS admin_memberships_count,
           (SELECT count(*)::int FROM admin_audit) AS admin_audit_count,
           (SELECT count(*)::int FROM content_posts) AS content_posts_count,
           (SELECT to_regclass('public.study_import_receipts')::text) AS study_receipts_table,
           (SELECT count(*)::int FROM schema_migrations) AS migration_count,
           (SELECT data_type FROM information_schema.columns
            WHERE table_schema='public' AND table_name='charts' AND column_name='birth_date') AS birth_date_type,
           (SELECT data_type FROM information_schema.columns
            WHERE table_schema='public' AND table_name='study_entries' AND column_name='snapshot') AS study_snapshot_type`);
  assertDisposableDatabaseState(target.databaseName, rows[0],files.length);
  if (!/^[a-f0-9]{32}$/.test(rows[0]?.instance_fingerprint || '')) {
    throw Error('Could not obtain PostgreSQL instance fingerprint from disposable DB');
  }
  verifiedDatabaseIdentity = { database: rows[0].database_name, fingerprint: rows[0].instance_fingerprint };
  console.log(`PASS: verified empty migrated disposable database ${target.databaseName} on localhost; no E2E data created`);
} catch (error) {
  console.error('BLOCKED E2E PostgreSQL verification:', error.message);
  // Throw rather than only setting exitCode: when imported by E2E tests,
  // execution must stop BEFORE any account or chart is created.
  throw error;
} finally {
  await client.end().catch(()=>{});
}

export { verifiedDatabaseIdentity };
