 'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT=path.join(__dirname,'..');
const TEST_FINGERPRINT='123456789abcdef0123456789abcdef0';
async function verifier() {
  return (await import(pathToFileURL(path.join(ROOT,'infrastructure/scripts/e2e-db-policy.mjs')).href)).assertMatchedApiInstance;
}
test('V10.6 accepts API and runner on the same disposable PostgreSQL instance',async()=>{
 const check=await verifier();
 assert.equal(check({database:'thiendo_test',fingerprint:TEST_FINGERPRINT},
  {ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:TEST_FINGERPRINT}),true);
});
test('V10.6 blocks two different PostgreSQL instances with the SAME database name',async()=>{
 const check=await verifier();
 assert.throws(()=>check({database:'thiendo_test',fingerprint:TEST_FINGERPRINT},
 {ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:'abcdef0123456789abcdef0123456789'}),/instance mismatch/);
});
test('V10.6 identity check fails closed on missing proof, wrong profile, and other DB',async()=>{
 const check=await verifier();
 const expected={database:'thiendo_test',fingerprint:TEST_FINGERPRINT};
 for(const actual of [null,{}, {ok:true,profile:'disposable-e2e',database:'other_test',fingerprint:TEST_FINGERPRINT},
 {ok:true,profile:'disposable-e2e',database:'thiendo_test'},
 {ok:true,profile:'production',database:'thiendo_test',fingerprint:TEST_FINGERPRINT},
 {ok:false,profile:'disposable-e2e',database:'thiendo_test',fingerprint:TEST_FINGERPRINT},
 {ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:'not-a-fingerprint'}]) {
  assert.throws(()=>check(expected,actual),/instance mismatch/);
 }
});
test('V10.6 runner checks fingerprint from live DB before first HTTP write',()=>{
 const direct=readFileSync(path.join(ROOT,'infrastructure/scripts/check-e2e-database.mjs'),'utf8');
 const api=readFileSync(path.join(ROOT,'apps/api/src/modules/health/health.controller.ts'),'utf8');
 const e2e=readFileSync(path.join(ROOT,'tests/api-postgres-e2e.test.mjs'),'utf8');
 assert.match(direct,/pg_postmaster_start_time\(\)/);
 assert.match(api,/pg_postmaster_start_time\(\)/);
 assert.match(direct,/inet_server_port\(\)/);
 assert.match(api,/inet_server_port\(\)/);
 assert.ok(e2e.indexOf('assertMatchedApiInstance(verifiedDatabaseIdentity, proof.json)') <
           e2e.indexOf('const calculation=await request'));
});
