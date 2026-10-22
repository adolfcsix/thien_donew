'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {join}=require('node:path');
const root=join(__dirname,'..');
const loader=()=>import('../infrastructure/scripts/staging-acceptance-lib.mjs');
const NOW=Date.parse('2026-10-14T09:00:00Z');
const SHA='a'.repeat(40);
const all=async()=>{const {REQUIRED}=await loader();return {schema:1,version:'11.149.0',commit:SHA,completedAt:new Date(NOW-5000).toISOString(),environment:'staging',origin:'https://staging.example.com',checks:REQUIRED.map(id=>({id,status:'PASS',runUrl:'https://github.com/example/repo/actions/runs/123456789',evidenceSha256:'b'.repeat(64)}))};};
test('staging evidence accepts structure but never certifies actual CI runs',async()=>{
 const {evaluateStagingEvidence}=await loader();const r=evaluateStagingEvidence(await all(),{version:'11.149.0',sha:SHA,now:NOW});assert.equal(r.status,'EVIDENCE_STRUCTURALLY_COMPLETE_UNVERIFIED');assert.equal(r.missing.length,0);
});
test('rejects stale, wrong version, wrong commit and non-staging',async()=>{
 const {evaluateStagingEvidence}=await loader();for(const [field,value] of [['completedAt',new Date(NOW-36*3600*1000).toISOString()],['version','11.148.0'],['commit','c'.repeat(40)],['environment','production']]){
  const r=evaluateStagingEvidence({...await all(),[field]:value},{version:'11.149.0',sha:SHA,now:NOW});assert.equal(r.status,'NO_GO',field);
 }
});
test('missing checks and duplicate PASS cannot satisfy all staging requirements',async()=>{
 const {evaluateStagingEvidence}=await loader();const record=await all();record.checks=record.checks.slice(0,2);record.checks.push(record.checks[0]);const r=evaluateStagingEvidence(record,{version:'11.149.0',sha:SHA,now:NOW});assert.equal(r.status,'NO_GO');assert.ok(r.missing.length>0);assert.match(r.problems.join(' '),/duplicate/);
});
test('PASS without evidence URL+digest and fake localhost origin are denied',async()=>{
 const {evaluateStagingEvidence}=await loader();const record=await all();record.origin='http://localhost:3000';record.checks[0].runUrl='';const r=evaluateStagingEvidence(record,{version:'11.149.0',sha:SHA,now:NOW});assert.equal(r.status,'NO_GO');assert.match(r.problems.join(' '),/missing-proof/);
});
test('restic restore proof requires migration 014 and scrub of all 19 migrations',()=>{
 const drill=readFileSync(join(root,'infrastructure/production/restore-drill.sh'),'utf8');
 const probe=readFileSync(join(root,'infrastructure/production/ops-check.mjs'),'utf8');
 assert.match(drill,/014_bazi_study_snapshot\.sql/);assert.match(drill,/minMigration:19/);assert.match(drill,/clearedAuthState:true/);assert.match(probe,/v\.clearedAuthState===true/);
});
test('staging HTTP probe only accepts HTTPS staging subdomain and read-only GETs',async()=>{
 const {stagingOrigin,checkStagingHttp}=await import('../infrastructure/scripts/staging-http-probe-lib.mjs');
 for(const value of ['http://staging.example.com','https://localhost','https://example.com','https://staging.example.invalid','https://staging.example.com/?token=x'])assert.equal(stagingOrigin(value),null);
 assert.equal(stagingOrigin('https://staging.example.com'),'https://staging.example.com');
 const requested=[];
 const fake=async(url,options)=>{requested.push([url.pathname,options.method,options.redirect,options.credentials]);return {status:url.pathname==='/api/study'?401:200,redirected:false,url:url.toString(),headers:{get:k=>['strict-transport-security','x-content-type-options','x-frame-options','cache-control'].includes(k)?'yes':null},body:null};};
 const r=await checkStagingHttp('https://staging.example.com',fake);assert.equal(r.status,'READ_ONLY_HTTP_PASS');assert.equal(requested.length,3);assert.ok(requested.every(x=>x[1]==='GET'&&x[2]==='manual'&&x[3]==='omit'));
});
test('staging HTTP probe blocks missing security headers or anonymous data leaks',async()=>{
 const {checkStagingHttp}=await import('../infrastructure/scripts/staging-http-probe-lib.mjs');
 const fake=async(url)=>({status:200,url:url.toString(),headers:{get:()=>null},body:null});
 const r=await checkStagingHttp('https://preview.example.com',fake);assert.equal(r.status,'NO_GO');assert.ok(r.checks.some(x=>x.status==='FAIL'));
});
