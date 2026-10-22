/**
 * Read-only PostgreSQL verification BEFORE applying any E2E migrations.
 * A database ending in _test is not sufficient proof of disposability.
 * A fresh database without tables is allowed; migration history alone is allowed.
 * No writes, schema migrations, or row contents are performed/read.
 */
import pg from 'pg';
import { assertSafeE2ETarget } from './e2e-guard.mjs';
import { assertPreMigrationDatabaseState } from './e2e-db-policy.mjs';

const { databaseName } = assertSafeE2ETarget(process.env);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity = await client.query('SELECT current_database() AS database_name');
  const inventory = await client.query(`
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND n.nspname NOT LIKE 'pg_toast%'
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND c.relkind IN ('r', 'p', 'm')
    ORDER BY n.nspname, c.relname
  `);
  const tables = [];
  for (const { schema_name: schema, table_name: name } of inventory.rows) {
    // Quoting a catalog-derived identifier; never concatenate user-supplied SQL.
    const quote = value => '"' + value.replaceAll('"', '""') + '"';
    const response = await client.query(`SELECT EXISTS(SELECT 1 FROM ${quote(schema)}.${quote(name)} LIMIT 1) AS has_rows`);
    tables.push({ schema, name, hasRows: response.rows[0].has_rows });
  }
  const result = assertPreMigrationDatabaseState(databaseName, {
    databaseName: identity.rows[0]?.database_name,
    tables,
  });
  await client.query('COMMIT');
  console.log(`PASS: read-only pre-migration check of ${result.checkedTables} application tables in disposable local ${databaseName}; application tables empty`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('BLOCKED before E2E migrations:', error.message);
  process.exitCode = 2;
} finally {
  await client.end().catch(() => {});
}
