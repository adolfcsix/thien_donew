'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,existsSync,rmSync,writeFileSync,mkdirSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const root=join(__dirname,'..'),gate='infrastructure/scripts/v11164-acceptance.mjs';
const workflow=readFileSync(join(root,'.github/workflows/v11164-v12-rc-audit.yml'),'utf8');
function invoke(args,dir,override={}){
 return spawnSync(process.execPath,[gate,...args],{cwd:root,encoding:'utf8',timeout:12000,
  env:{...process.env,CI:'true',GITHUB_SHA:'deadbeef1234567890',GITHUB_RUN_ID:'164001',V11164_EVIDENCE_DIR:dir,...override}});
}
function tmp(){return mkdtempSync(join(tmpdir(),'thiendo-release-test-'));}
test('V11.164 requires eight independent gates and retains evidence after failed runs',()=>{
 for(const name of ['source','install','build','regression','security','database','restore','live'])assert.ok(workflow.includes(' run '+name+' --'),name);
 assert.match(workflow,/if: always\(\)/);assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
 assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/postgres:16-alpine/);
});
test('V11.164 does not accept an unsigned local run as RC evidence',()=>{
 const dir=tmp();try{
  const r=invoke(['finalize'],dir,{CI:'false'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/CI SHA and run identity/);
  assert.equal(existsSync(join(dir,'technical-release-candidate.json')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('V11.164 cannot finalize when any required integration gate is missing',()=>{
 const dir=tmp();try{const r=invoke(['finalize'],dir);assert.notEqual(r.status,0);assert.match(r.stderr,/Missing gate: source/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('V11.164 refuses invented gate names',()=>{
 const dir=tmp();try{const r=invoke(['run','fake-pass','--',process.execPath,'-e','process.exit(0)'],dir);assert.notEqual(r.status,0);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('Failed commands create no success receipt',()=>{
 const dir=tmp();try{
  const r=invoke(['run','security','--',process.execPath,'-e','process.exit(12)'],dir);
  assert.notEqual(r.status,0);assert.equal(existsSync(join(dir,'security.json')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('A real successful subprocess produces one receipt, but no final approval',()=>{
 const dir=tmp();try{
  const r=invoke(['run','source','--',process.execPath,'-e','process.exit(0)'],dir);
  assert.equal(r.status,0,r.stderr);const item=JSON.parse(readFileSync(join(dir,'source.json')));
  assert.equal(item.gate,'source');assert.equal(item.status,'PASS');
  assert.equal(existsSync(join(dir,'technical-release-candidate.json')),false);
  assert.notEqual(invoke(['finalize'],dir).status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Evidence cannot be silently overwritten on rerun',()=>{
 const dir=tmp();try{
  const arg=['run','source','--',process.execPath,'-e','process.exit(0)'];
  assert.equal(invoke(arg,dir).status,0);assert.notEqual(invoke(arg,dir).status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Evidence from a different commit is rejected',()=>{
 const dir=tmp();try{
  assert.equal(invoke(['run','source','--',process.execPath,'-e','process.exit(0)'],dir).status,0);
  let x=JSON.parse(readFileSync(join(dir,'source.json')));x.commit='wrong-revision';
  writeFileSync(join(dir,'source.json'),JSON.stringify(x));
  const r=invoke(['finalize'],dir);assert.notEqual(r.status,0);assert.match(r.stderr,/Stale source receipt/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Restore workflow tests only localhost disposable DB and guarantees target cleanup',()=>{
 const src=readFileSync(join(root,'infrastructure/scripts/v11164-restore-ci.mjs'),'utf8');
 assert.match(src,/assertSafeE2ETarget/);assert.match(src,/thiendo_test/);
 assert.match(src,/pg_dump/);assert.match(src,/pg_restore/);assert.match(src,/DROP DATABASE/);
 assert.match(src,/sessions,admin_session_assurance/);
});
test('Live security/load gate is loopback only and tests privacy, CSRF, and response latency',()=>{
 const src=readFileSync(join(root,'infrastructure/scripts/v11164-live-smoke.mjs'),'utf8');
 for(const check of ['127.0.0.1','localhost','api/books/admin/catalog','api/portal/admin/documents','api/forum/moderation/queue','api/admin/finance','sec-fetch-site','p95'])assert.ok(src.includes(check),check);
});
