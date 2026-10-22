/** V10.2: purely validates results returned by the SAME PostgreSQL connection used for E2E.
 * URL and localhost checks are handled independently in e2e-guard.mjs.
 * A test DB must be disposable AND empty before tests create accounts.
 */
export function assertDisposableDatabaseState(expectedName, row, expectedMigrationCount=36) {
  if (!/^[A-Za-z0-9_]+_test$/.test(expectedName)) throw Error('Expected dedicated *_test database');
  if (!row || typeof row !== 'object' || row.database_name !== expectedName) {
    throw Error('E2E database identity mismatch: connected to an unexpected database');
  }
  for (const name of ['users_count', 'sessions_count', 'charts_count', 'studies_count','billing_orders_count','billing_events_count','entitlements_count','admin_memberships_count','admin_audit_count','content_posts_count','consultations_count']) {
    const value = row[name];
    if (!Number.isSafeInteger(value) || value < 0) throw Error(`Invalid E2E database count: ${name}`);
    if (value !== 0) throw Error(`E2E database is not empty (${name}=${value}); create a fresh disposable *_test database instead`);
  }
  if (!Number.isSafeInteger(expectedMigrationCount) || expectedMigrationCount<1 || !Number.isSafeInteger(row.migration_count) || row.migration_count !== expectedMigrationCount) {
    throw Error('E2E database schema migrations are missing; run db:migrate on the test database first');
  }
  if (row.birth_date_type !== 'character varying') {
    throw Error('E2E chart birth_date schema is outdated; apply latest migrations first');
  }
  if (row.study_snapshot_type !== 'jsonb') throw Error('E2E study schema is outdated; apply study migrations first');
  if (row.study_receipts_table !== 'study_import_receipts') throw Error('E2E study import receipts migration is missing');
  return {databaseName: expectedName, checked: true};
}


/** PostgreSQL server-instance fingerprint. NOT a cryptographic authentication token.
 * It differentiates two otherwise identically named local test databases.
 * Both the runner and the API query these attributes independently from
 * their own database connections and compare BEFORE any account mutation.
 */
export function assertMatchedApiInstance(expected, actual) {
  if (!expected || !actual || expected.database !== actual.database ||
      expected.fingerprint !== actual.fingerprint ||
      !/^[a-f0-9]{32}$/.test(expected.fingerprint || '') ||
      actual.ok !== true || actual.profile !== 'disposable-e2e') {
    throw Error('E2E API PostgreSQL instance mismatch: possible same-named different server');
  }
  return true;
}

/** Pre-migration fail-closed check. Called before db:migrate so an existing
 * *_test database with application records is never modified by automation.
 * This policy validates a read-only snapshot; the runner queries the live DB.
 */
export function assertPreMigrationDatabaseState(expectedName, snapshot) {
  if (!/^[A-Za-z0-9_]+_test$/.test(expectedName)) throw Error('Expected dedicated *_test database');
  if (!snapshot || snapshot.databaseName !== expectedName || !Array.isArray(snapshot.tables)) {
    throw Error('Pre-migration database identity or table inventory mismatch');
  }
  const seen = new Set();
  for (const table of snapshot.tables) {
    if (!table || typeof table.name !== 'string' || !/^[\w-]+$/.test(table.name) ||
        typeof table.schema !== 'string' || !/^[\w-]+$/.test(table.schema) ||
        typeof table.hasRows !== 'boolean' || seen.has(`${table.schema}.${table.name}`)) {
      throw Error('Invalid or duplicated pre-migration table inventory');
    }
    seen.add(`${table.schema}.${table.name}`);
    // Migration history is allowed. All other public tables must be empty.
    if (!(table.schema === 'public' && table.name === 'schema_migrations') && table.hasRows) {
      throw Error(`Pre-migration E2E database contains data in ${table.schema}.${table.name}; use a fresh disposable *_test database`);
    }
  }
  return { databaseName: expectedName, checkedTables: snapshot.tables.length, checked: true };
}
