import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {verifyMigrationChain,defaultBaselinePath} from './lib/migration-chain-integrity.mjs';
import {expectedMigrationLedger,assertMigrationLedger} from './lib/migration-ledger-integrity.mjs';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../db');
const connectionString = process.env.DATABASE_URL ?? 'postgresql://thiendo:thiendo_dev@localhost:5432/thiendo';
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('Production requires explicit DATABASE_URL');
// Production migrations must fail within a bounded time when PostgreSQL is unreachable.
// Do not rely on OS TCP timeouts, which can leave Windows startup waiting.
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 10_000 });
// Refuse silent migration omissions and any drift in the frozen SQL baseline.
// This check runs locally, before a network connection or database change.
const {files}=verifyMigrationChain(dir,defaultBaselinePath);
const expectedLedger=expectedMigrationLedger(dir,files);

let connected = false;
try {
  await db.connect();
  connected = true;
  // Lock BEFORE creating the ledger: first-time concurrent deployments must serialize too.
  // Bound the advisory lock wait to 30 seconds, so concurrent/broken deploys
  // cannot silently stall migration indefinitely. Reset for slower CREATE INDEX.
  await db.query("SET statement_timeout = '30s'");
  try { await db.query('SELECT pg_advisory_lock(20261010, 81)'); }
  finally { await db.query('RESET statement_timeout'); }
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    // Before applying anything, fail closed on rogue rows, gaps, or checksum drift.
    // Keep this check under the advisory lock to serialize concurrent deploys.
    const ledger = await db.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
    assertMigrationLedger(expectedLedger,ledger.rows);
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (checksum !== expectedLedger.find(item => item.name === file).checksum)
        throw new Error(`SQL changed after migration preflight: ${file}`);
      const prior = await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [file]);
      if (prior.rows[0]) {
        if (prior.rows[0].checksum !== checksum) throw new Error(`Migration was modified after application: ${file}`);
        console.log(`SKIP ${file}`);
        continue;
      }
      await db.query('BEGIN');
      try {
        await db.query(sql);
        await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [file, checksum]);
        await db.query('COMMIT');
        console.log(`APPLIED ${file}`);
      } catch(error) { await db.query('ROLLBACK'); throw error; }
    }
  } finally { await db.query('SELECT pg_advisory_unlock(20261010, 81)'); }
} catch(error) { console.error('Migration error:', error.message); process.exitCode = 1; }
finally {
  // pg.Client.end() is also safe after a failed connect; preserve the original
  // connection/migration error if closing the socket itself fails.
  try { await db.end(); }
  catch (error) { if (connected && !process.exitCode) { console.error('Database connection cleanup error'); process.exitCode = 1; } }
}
