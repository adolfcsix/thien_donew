'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const text=file=>readFileSync(join(root,file),'utf8');
test('local diagnostic recognizes only the current verified API schema, not V8 legacy',async()=>{
 const {isReadyResponse}=await import('../infrastructure/scripts/local-runtime-doctor-lib.mjs');
 assert.equal(isReadyResponse({ok:true,database:'postgresql',schema:'v11.142.0'}),true);
 for(const value of [null,{}, {ok:true,database:'postgresql',schema:'v8.5'},
  {ok:true,database:'postgresql',schema:'v11.141.0'},
  {ok:false,database:'postgresql',schema:'v11.142.0'},
  {ok:true,database:'other',schema:'v11.142.0'}])assert.equal(isReadyResponse(value),false);
 const doctor=text('infrastructure/scripts/local-runtime-doctor.mjs');
 assert.match(doctor,/return isReadyResponse\(data\)/);
 assert.doesNotMatch(doctor,/data\.schema\s*===\s*['"]v8\.5/);
});
test('API contract and diagnostics share schema label required by migration 014',()=>{
 const health=text('apps/api/src/modules/health/health.controller.ts');
 const policy=text('infrastructure/scripts/local-runtime-doctor-lib.mjs');
 const migration=text('infrastructure/db/014_bazi_study_snapshot.sql');
 const healthSchema=health.match(/schema:\s*'([^']+)'/);
 const policySchema=policy.match(/data\.schema\s*===\s*'([^']+)'/);
 assert.ok(healthSchema&&policySchema);
 assert.equal(healthSchema[1],policySchema[1]);
 assert.match(health,/pg_get_constraintdef\(oid\) LIKE '%bazi%'/);
 assert.match(health,/schema_migrations WHERE name='014_bazi_study_snapshot\.sql'/);
 assert.match(migration,/CHECK\s*\(discipline IN[^;]*'bazi'/s);
});
test('readiness errors are fail-closed, not source-only success',()=>{
 const health=text('apps/api/src/modules/health/health.controller.ts');
 assert.match(health,/if \(!rows\[0\]\?\.ready\) throw new ServiceUnavailableException/);
 assert.match(health,/catch \{ throw new ServiceUnavailableException\('PostgreSQL chưa sẵn sàng'\)/);
});
