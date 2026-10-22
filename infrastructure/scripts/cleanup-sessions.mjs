/** One-off maintenance job. Dry-run by default; --apply deletes expired sessions.
 * Run from project root after npm install.
 */
import pg from 'pg';
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL explicitly before running session maintenance.');
  process.exit(2);
}
const apply = process.argv.includes('--apply');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis:5000, statement_timeout:10000 });
try {
  await client.connect();
  if (apply) {
    const { rowCount } = await client.query('DELETE FROM sessions WHERE expires_at < NOW()');
    console.log(`APPLIED: ${rowCount} expired sessions deleted.`);
  } else {
    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM sessions WHERE expires_at < NOW()');
    console.log(`DRY RUN: ${rows[0].total} expired sessions. Use --apply to delete.`);
  }
} catch (error) { console.error('Session cleanup failed; inspect restricted database monitoring'); process.exitCode = 1; }
finally { await client.end().catch(() => {}); }
