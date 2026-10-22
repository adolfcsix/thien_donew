'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const importGate=()=>import('../infrastructure/scripts/acceptance-v11148.mjs');
test('V11.148 accepts source PASS but never infers production acceptance',async()=>{
 const {assessReadiness,runtimePlaceholder,PRODUCTION_GATES}=await importGate();
 const verdict=assessReadiness([{id:'source',status:'PASS'}],runtimePlaceholder());
 assert.equal(verdict.source,'SOURCE_PASS');assert.equal(verdict.production,'NO_GO');
 assert.equal(verdict.missing.length,PRODUCTION_GATES.length);
});
test('V11.148 fails production on one missing/failed gate',async()=>{
 const {assessReadiness,runtimePlaceholder}=await importGate();
 const good=runtimePlaceholder().map(x=>({...x,status:'PASS'}));
 assert.equal(assessReadiness([{id:'source',status:'PASS'}],good).production,'EVIDENCE_COMPLETE');
 good[2].status='BLOCKED';assert.equal(assessReadiness([{id:'source',status:'PASS'}],good).production,'NO_GO');
 assert.equal(assessReadiness([{id:'x',status:'FAIL'}],good).source,'SOURCE_BLOCKED');
});
test('V11.148 E2E target rejects PostgreSQL connection overrides',async()=>{
 const {assertSafeE2ETarget}=await import('../infrastructure/scripts/e2e-guard.mjs');
 const env={NODE_ENV:'test',E2E_LOCAL_DB_CONFIRM:'YES',DATABASE_URL:'postgresql://tester:pw@localhost:5432/thiendo_test'};
 assert.equal(assertSafeE2ETarget(env).databaseName,'thiendo_test');
 for(const suffix of ['?host=prod.example.net','?sslmode=verify-full','#any','?hostaddr=1.2.3.4']){
  assert.throws(()=>assertSafeE2ETarget({...env,DATABASE_URL:env.DATABASE_URL+suffix}),/query parameters or fragments/);
 }
});
test('V11.148 production acceptance CI includes Chromium test while same servers run',()=>{
 const wf=readFileSync(join(root,'.github/workflows/production-acceptance.yml'),'utf8');
 const runner=readFileSync(join(root,'infrastructure/scripts/run-ci-http.sh'),'utf8');
 assert.match(wf,/playwright@1\.62\.1/);
 assert.match(wf,/THIENDO_BROWSER_ACCEPTANCE: '1'/);
 assert.match(runner,/THIENDO_BROWSER_ACCEPTANCE/);
 assert.match(runner,/node infrastructure\/scripts\/verify-browser-acceptance\.mjs/);
 assert.ok(runner.indexOf('verify-browser-acceptance.mjs')<runner.indexOf("printf 'PASS: live Next"));
 assert.match(runner,/tests\/next-proxy-smoke\.mjs/);
 assert.match(runner,/tests\/api-postgres-e2e\.test\.mjs/);
});
test('V11.148 automated browser result is explicitly NOT OAuth or native DB proof',()=>{
 const runner=readFileSync(join(root,'infrastructure/scripts/verify-browser-acceptance.mjs'),'utf8');
 assert.match(runner,/account\/storage HTTP mocked/);
 assert.match(runner,/Does not certify native PostgreSQL/);
});
