/**
 * One-time opt-in transfer of V7 users and charts to PostgreSQL.
 * Safe defaults: --dry-run (read-only); --apply required for mutation.
 * Does NOT import sessions or modify the legacy database.
 * Intended for offline/operator-led migration, never an untrusted upload.
 * Before applying, stop the V7 server and back up BOTH databases.
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const getArg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const file = getArg('--source');
const apply = args.includes('--apply');
const help = args.includes('--help');
if (help || !file || !existsSync(resolve(file))) {
  console.log('Usage: node infrastructure/scripts/import-v7-sqlite.mjs --source <V7/data/thiendo.sqlite> [--apply]');
  console.log('Default is read-only preview. --apply inserts users and charts in one transaction; login sessions are never imported.');
  process.exit(help ? 0 : 1);
}
if (args.includes('--apply') && !process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL explicitly before applying an import');
}
// SQLite open read-only and not create, so a mistyped path cannot create an empty source DB.
const sqlite = new DatabaseSync(resolve(file), { readOnly: true });
const users = sqlite.prepare('SELECT id,email,password_hash,salt,created_at FROM users ORDER BY id').all();
const charts = sqlite.prepare('SELECT id,user_id,label,date,hour,minute,calendar,leap,gender,rule_set,created_at FROM charts ORDER BY id').all();
console.log(`Source preview: ${users.length} accounts; ${charts.length} charts; no sessions will be migrated.`);
function validateSource() {
  const ids=new Set(users.map(u=>u.id));
  if (ids.size!==users.length) throw new Error('Duplicate users in source');
  for (const user of users) if (!/^[0-9a-f-]{36}$/i.test(user.id) || !user.email || !user.password_hash || !user.salt) throw new Error('Invalid source user record');
  for (const c of charts) {
    if (!ids.has(c.user_id) || !/^[0-9a-f-]{36}$/i.test(c.id) || !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || ![0,1].includes(c.leap) || !['Nam','Nữ'].includes(c.gender)) throw new Error('Invalid source chart record');
  }
}
try {
  validateSource();
  if (!apply) {
    console.log('DRY RUN: no destination connection and no database changes. Re-run with --apply after backing up.');
  } else {
    const { default: pg } = await import('pg');
    const pgClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();
    try {
      await pgClient.query('BEGIN');
      const current = await pgClient.query('SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name=$1) AS ok', ['001_core.sql']);
      if (!current.rows[0]?.ok) throw new Error('V8 migrations must run first');
      // Conflicts with a previously created account cause an explicit rollback; we do not silently merge identities.
      for (const user of users) {
        await pgClient.query(`INSERT INTO users(id,email,password_hash,salt,created_at)
          VALUES($1,$2,$3,$4,$5::timestamp AT TIME ZONE 'UTC') ON CONFLICT DO NOTHING`,
          [user.id,user.email,user.password_hash,user.salt,user.created_at]);
        const row = await pgClient.query('SELECT id,password_hash,salt FROM users WHERE email=$1', [user.email]);
        if (row.rows[0]?.id !== user.id || row.rows[0]?.password_hash !== user.password_hash || row.rows[0]?.salt !== user.salt) throw new Error('Account conflict. Import aborted, no partial changes.');
      }
      for (const chart of charts) {
        await pgClient.query(`INSERT INTO charts(id,user_id,label,birth_date,hour,minute,calendar,leap,gender,rule_set,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamp AT TIME ZONE 'UTC') ON CONFLICT DO NOTHING`,
           [chart.id,chart.user_id,chart.label,chart.date,chart.hour,chart.minute,chart.calendar,Boolean(chart.leap),chart.gender,chart.rule_set,chart.created_at]);
        const verify = await pgClient.query("SELECT user_id,label,to_char(birth_date,'YYYY-MM-DD') AS date,hour,minute,calendar,leap,gender,rule_set FROM charts WHERE id=$1", [chart.id]);
        const v=verify.rows[0];
        if (!v || v.user_id!==chart.user_id || v.label!==chart.label || v.date!==chart.date || v.hour!==chart.hour || v.minute!==chart.minute || v.calendar!==chart.calendar || v.leap!==Boolean(chart.leap) || v.gender!==chart.gender || v.rule_set!==chart.rule_set) throw new Error('Chart conflict. Import aborted.');
      }
      await pgClient.query('COMMIT');
      console.log(`COMMITTED: ${users.length} user records and ${charts.length} chart records checked/imported. All sessions revoked by design.`);
    } catch (error) { await pgClient.query('ROLLBACK'); throw error; }
    finally { await pgClient.end(); }
  }
} finally { sqlite.close(); }
