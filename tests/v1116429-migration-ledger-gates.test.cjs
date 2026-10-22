'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const integrity=()=>import('../infrastructure/scripts/lib/migration-ledger-integrity.mjs');
const chain=()=>import('../infrastructure/scripts/lib/migration-chain-integrity.mjs');

async function fixture(){
  const {verifyMigrationChain,defaultDbDir,defaultBaselinePath}=await chain();
  const {expectedMigrationLedger,assertMigrationLedger}=await integrity();
  const {files}=verifyMigrationChain(defaultDbDir,defaultBaselinePath);
  return {expected:expectedMigrationLedger(defaultDbDir,files),assertMigrationLedger};
}
test('A02 immutable 32-file manifest including additive 032 and complete valid ledger',async()=>{
  const {expected,assertMigrationLedger:check}=await fixture();
  assert.equal(expected.length,36);
  assert.deepEqual(check(expected,expected,{requireComplete:true}),{checked:36,expected:36,complete:true});
});
test('A02 clean database or contiguous prior versions are allowed to migrate, but not E2E',async()=>{
  const {expected,assertMigrationLedger:check}=await fixture();
  assert.equal(check(expected,[]).checked,0);
  assert.equal(check(expected,expected.slice(0,24)).checked,24);
  assert.throws(()=>check(expected,expected.slice(0,24),{requireComplete:true}),/incomplete/);
});
test('A02 refuse unknown, gapped, reordered or modified applied migrations before DDL',async()=>{
  const {expected,assertMigrationLedger:check}=await fixture();
  const cases=[
    [...expected.slice(0,5),expected[6]],
    [expected[1]],
    [expected[1],expected[0]],
    [...expected,{name:'031_unreviewed.sql',checksum:'b'.repeat(64)}],
    [...expected.slice(0,4),{...expected[4],checksum:'a'.repeat(64)}],
  ];
  for(const ledger of cases)assert.throws(()=>check(expected,ledger),/prefix|checksum|unknown/);
});
test('A02 migration runner locks and checks ledger before applying SQL',()=>{
  const run=fs.readFileSync(path.join(root,'infrastructure/scripts/migrate.mjs'),'utf8');
  const lock=run.indexOf('pg_advisory_lock');
  const check=run.indexOf('assertMigrationLedger(expectedLedger,ledger.rows)');
  const apply=run.indexOf('await db.query(sql)');
  assert.ok(lock>=0&&check>lock&&apply>check);
});
test('A02 E2E tests reject incomplete schema and check name and digest before accounts',async()=>{
  const code=fs.readFileSync(path.join(root,'infrastructure/scripts/check-e2e-database.mjs'),'utf8');
  assert.match(code,/assertMigrationLedger\(expectedLedger,ledger.rows,\{requireComplete:true\}\)/);
  const {assertDisposableDatabaseState}=await import('../infrastructure/scripts/e2e-db-policy.mjs');
  const row={database_name:'thiendo_test',users_count:0,sessions_count:0,charts_count:0,studies_count:0,billing_orders_count:0,billing_events_count:0,entitlements_count:0,admin_memberships_count:0,admin_audit_count:0,content_posts_count:0,consultations_count:0,migration_count:36,birth_date_type:'character varying',study_snapshot_type:'jsonb',study_receipts_table:'study_import_receipts'};
  assert.equal(assertDisposableDatabaseState('thiendo_test',row).checked,true);
  assert.throws(()=>assertDisposableDatabaseState('thiendo_test',{...row,migration_count:29}),/migrations/);
  assert.throws(()=>assertDisposableDatabaseState('thiendo_test',{...row,migration_count:35}),/migrations/);
});
