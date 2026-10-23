'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const drill=readFileSync(join(root,'infrastructure/production/restore-drill.sh'),'utf8');
const ops=readFileSync(join(root,'infrastructure/production/ops-check.mjs'),'utf8');
test('isolated restore checks every current migration rather than a misleading row count',()=>{
 const files=readdirSync(join(root,'infrastructure/db')).filter(x=>/^\d{3}_[a-z0-9_-]+\.sql$/.test(x)).sort();
 assert.equal(files.length,37,'The restore gate must be reviewed when adding migrations');
 const expected=[...drill.matchAll(/\('([0-9]{3}_[a-z0-9_-]+\.sql)'\)/g)].map(x=>x[1]);
 assert.deepEqual(expected,files,'Every migration file must appear exactly once in the restore gate');
 assert.match(drill,/EXCEPT SELECT name FROM schema_migrations/);
 assert.match(drill,/verifiedMigrationNames:37/);
 assert.match(ops,/v\.verifiedMigrationNames>=37/);
});
test('restore never touches production and removes all restored session / OTP credentials',()=>{
 assert.match(drill,/createdb[^\n]*"\$target"/);
 assert.doesNotMatch(drill.split('\n').filter(line=>!line.trim().startsWith('#')).join('\n'),/\bdropdb\b/);
 for(const table of ['sessions','admin_session_assurance','admin_trusted_devices','admin_mfa_credentials','account_email_verifications','account_security_events','auth_email_challenges','password_reset_challenges','auth_google_nonces']) {
  assert.match(drill,new RegExp(`TRUNCATE[^;]*\\b${table}\\b`));
  assert.match(drill,new RegExp(`SELECT count\\(\\*\\) FROM ${table}`));
 }
 assert.match(drill,/productionChanged:false/);
});
