'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const policy=()=>import('../infrastructure/scripts/e2e-db-policy.mjs');
const clean={database_name:'thiendo_test',users_count:0,sessions_count:0,charts_count:0,studies_count:0,billing_orders_count:0,billing_events_count:0,entitlements_count:0,admin_memberships_count:0,admin_audit_count:0,content_posts_count:0,consultations_count:0,migration_count:36,birth_date_type:'character varying',study_snapshot_type:'jsonb',study_receipts_table:'study_import_receipts'};
test('V10.2 permits only a migrated empty named test database',async()=>{
 const {assertDisposableDatabaseState:verify}=await policy();
 assert.deepEqual(verify('thiendo_test',clean),{databaseName:'thiendo_test',checked:true});
});
test('V10.2 rejects unexpected database identity even if the data is empty',async()=>{
 const {assertDisposableDatabaseState:verify}=await policy();
 assert.throws(()=>verify('thiendo_test',{...clean,database_name:'thiendo'}),/identity mismatch/);
 assert.throws(()=>verify('thiendo',clean),/dedicated/);
 assert.throws(()=>verify('thiendo_test',null),/identity mismatch/);
});
test('V10.2 rejects ANY existing user, session or chart data',async()=>{
 const {assertDisposableDatabaseState:verify}=await policy();
 for(const name of ['users_count','sessions_count','charts_count','studies_count'])for(const count of [1,2,30])
  assert.throws(()=>verify('thiendo_test',{...clean,[name]:count}),/not empty/,name);
});
test('V10.2 rejects malformed E2E row counts',async()=>{
 const {assertDisposableDatabaseState:verify}=await policy();
 for(const name of ['users_count','sessions_count','charts_count','studies_count'])for(const count of [-1,'0',null,1.1,Number.MAX_SAFE_INTEGER+2])
  assert.throws(()=>verify('thiendo_test',{...clean,[name]:count}),/Invalid E2E/,`${name}=${count}`);
});
test('V10.2 rejects an unmigrated or old birth_date schema',async()=>{
 const {assertDisposableDatabaseState:verify}=await policy();
 for(const value of [0,1,2,3,4,'5',undefined])assert.throws(()=>verify('thiendo_test',{...clean,migration_count:value}),/migrations/);
 assert.throws(()=>verify('thiendo_test',{...clean,birth_date_type:'date'}),/outdated/);
 assert.throws(()=>verify('thiendo_test',{...clean,study_snapshot_type:undefined}),/study schema/);
});
test('V10.2 E2E runner verifies the live database before starting servers',()=>{
 const script=readFileSync(join(root,'infrastructure/scripts/verify-release.mjs'),'utf8');
 assert.match(script,/Verify live disposable E2E database is empty/);
 assert.ok(script.indexOf("'Verify live disposable E2E database is empty'")<script.indexOf('const api = spawn('));
 const http=readFileSync(join(root,'tests/api-postgres-e2e.test.mjs'),'utf8');
 assert.match(http,/check-e2e-database\.mjs/);
 const check=readFileSync(join(root,'infrastructure/scripts/check-e2e-database.mjs'),'utf8');
 assert.match(check,/throw error/,'must abort when imported by direct tests');
});
test('V10.2 build uses root environment and keeps separate service build scripts',()=>{
 const config=require(join(root,'package.json'));
 assert.match(config.scripts.build,/with-env\.mjs npm run build:services/);
 assert.match(config.scripts['build:services'],/build -w @thiendo\/api/);
 assert.match(config.scripts['build:services'],/build -w @thiendo\/web/);
 assert.match(config.scripts['check:release:full:testdb'],/--env-file=\.env\.e2e/);
});
test('V10.2 test compose isolates port and volume, CI verifies non-empty DB',()=>{
 const compose=readFileSync(join(root,'infrastructure/compose.test.yaml'),'utf8');
 assert.match(compose,/127\.0\.0\.1:5433:5432/);
 assert.match(compose,/thiendo_pg_test/);
 assert.match(compose,/POSTGRES_DB: thiendo_test/);
 const ci=readFileSync(join(root,'.github/workflows/ci.yml'),'utf8');
 assert.match(ci,/npm run check:e2e-db/);
});
test('E2E refuses retained payment/admin records and pre-billing schema',async()=>{
 const {assertDisposableDatabaseState}=await import('../infrastructure/scripts/e2e-db-policy.mjs');
 for(const name of ['billing_orders_count','billing_events_count','entitlements_count','admin_memberships_count','admin_audit_count','content_posts_count'])assert.throws(()=>assertDisposableDatabaseState('thiendo_test',{...clean,[name]:1}));
 assert.throws(()=>assertDisposableDatabaseState('thiendo_test',{...clean,migration_count:14}));
});
