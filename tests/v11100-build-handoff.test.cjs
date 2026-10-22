'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const load=filename=>import(pathToFileURL(path.join(root,'infrastructure/scripts',filename)).href);

// Test fixtures are synthetic temporary files. They are NEVER shipped as the
// repository's lockfile and DO NOT imply that npm ci or the build passed.
function makeWorkspace(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-v11100-'));
 fs.mkdirSync(path.join(base,'packages/engine'),{recursive:true});
 const pkg={name:'fixture-thiendo',version:'11.100.0',private:true,workspaces:['packages/engine'],
  devDependencies:{concurrently:'^9.1.2'}};
 const engine={name:'@fixture/engine',version:'1.0.0',private:true};
 fs.writeFileSync(path.join(base,'package.json'),JSON.stringify(pkg));
 fs.writeFileSync(path.join(base,'packages/engine/package.json'),JSON.stringify(engine));
 const lock={name:pkg.name,version:pkg.version,lockfileVersion:3,packages:{
  '':{name:pkg.name,version:pkg.version,workspaces:pkg.workspaces,devDependencies:pkg.devDependencies},
  'packages/engine':{name:engine.name,version:engine.version},
  'node_modules/@fixture/engine':{resolved:'packages/engine',link:true},
  'node_modules/concurrently':{version:'9.1.2',resolved:'https://registry.npmjs.org/concurrently/-/concurrently-9.1.2.tgz',integrity:'sha512-FAKE_TEST_ONLY'},
 }};
 const staging=path.join(base,'staging');fs.mkdirSync(staging);
 const candidate=path.join(staging,'package-lock.json');
 const save=()=>fs.writeFileSync(candidate,JSON.stringify(lock));save();
 return {base,lock,candidate,save,clean:()=>fs.rmSync(base,{recursive:true,force:true})};
}

test('V11.100 preview validates candidate but does not write the destination', async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  const response=importLockCandidate(f.candidate,f.base);
  assert.equal(response.status,'READY');assert.equal(response.applied,false);
  assert.match(response.sha256,/^[0-9a-f]{64}$/);
  assert.equal(fs.existsSync(path.join(f.base,'package-lock.json')),false);
 }finally{f.clean();}
});
test('V11.100 atomic import succeeds once then matching import is idempotent',async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  const applied=importLockCandidate(f.candidate,f.base,{apply:true});
  assert.equal(applied.status,'IMPORTED');assert.equal(applied.applied,true);
  assert.equal(fs.readFileSync(path.join(f.base,'package-lock.json'),'utf8'),fs.readFileSync(f.candidate,'utf8'));
  assert.equal(importLockCandidate(f.candidate,f.base,{apply:true}).status,'UNCHANGED');
 }finally{f.clean();}
});
test('V11.100 refuses to overwrite a nonmatching existing lockfile',async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  const target=path.join(f.base,'package-lock.json');fs.writeFileSync(target,'different lockfile');
  assert.throws(()=>importLockCandidate(f.candidate,f.base,{apply:true}),/REFUSING to overwrite/);
  assert.equal(fs.readFileSync(target,'utf8'),'different lockfile');
 }finally{f.clean();}
});
test('V11.100 rejects root-version mismatch without copying',async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  f.lock.packages[''].version='11.99.0';f.save();
  assert.throws(()=>importLockCandidate(f.candidate,f.base,{apply:true}),/Invalid candidate/);
  assert.equal(fs.existsSync(path.join(f.base,'package-lock.json')),false);
 }finally{f.clean();}
});
test('V11.100 rejects missing package integrity without copying',async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  delete f.lock.packages['node_modules/concurrently'].integrity;f.save();
  assert.throws(()=>importLockCandidate(f.candidate,f.base,{apply:true}),/integrity/);
  assert.equal(fs.existsSync(path.join(f.base,'package-lock.json')),false);
 }finally{f.clean();}
});
test('V11.100 rejects a missing workspace link without copying',async()=>{
 const f=makeWorkspace();try{
  const {importLockCandidate}=await load('import-lockfile.mjs');
  delete f.lock.packages['node_modules/@fixture/engine'];f.save();
  assert.throws(()=>importLockCandidate(f.candidate,f.base,{apply:true}),/[Ww]orkspace link/);
 }finally{f.clean();}
});
test('V11.100 rejects symlink candidates and wrong file names',async()=>{
 const f=makeWorkspace();try{
  const {assessLockCandidate}=await load('import-lockfile.mjs');
  const link=path.join(f.base,'package-lock.json');
  try {
    fs.symlinkSync(f.candidate,link);
    assert.throws(()=>assessLockCandidate(link,f.base),/non-symlink/);
  } catch (error) {
    if (!['EPERM','EACCES'].includes(error.code)) throw error; // Windows without Developer Mode
  }
  assert.throws(()=>assessLockCandidate(path.join(f.base,'package.json'),f.base),/filename/);
 }finally{f.clean();}
});
test('V11.100 proof generator requires GitHub execution metadata',async()=>{
 const {createCiBuildProof}=await load('build-proof.mjs');
 assert.throws(()=>createCiBuildProof({},'11.100.0'),/GitHub Actions/);
 assert.throws(()=>createCiBuildProof({GITHUB_ACTIONS:'true',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_WORKFLOW_REF:'org/repo/.github/workflows/ci.yml@main'},'11.100.0'),/Unexpected workflow/);
});
test('V11.100 CI proof is run+commit+version scoped and does not claim production readiness',async()=>{
 const {createCiBuildProof,verifyBuildProof}=await load('build-proof.mjs');
 const env={GITHUB_ACTIONS:'true',GITHUB_SHA:'A'.repeat(40),GITHUB_RUN_ID:'12345',GITHUB_WORKFLOW_REF:'org/repo/.github/workflows/bootstrap-lockfile.yml@refs/heads/main'};
 const proof=createCiBuildProof(env,'11.100.0');
 assert.equal(proof.productionReady,false);
 assert.deepEqual(verifyBuildProof(proof,{sha:'a'.repeat(40),runId:'12345',version:'11.100.0'}),[]);
 assert.ok(verifyBuildProof(proof,{sha:'b'.repeat(40),runId:'12345',version:'11.100.0'}).length>0);
 assert.ok(verifyBuildProof(proof,{sha:'a'.repeat(40),runId:'54321',version:'11.100.0'}).length>0);
 assert.ok(verifyBuildProof(proof,{sha:'a'.repeat(40),runId:'12345',version:'11.99.0'}).length>0);
});
test('V11.100 incomplete, falsified or production-claiming build proof is rejected',async()=>{
 const {createCiBuildProof,verifyBuildProof}=await load('build-proof.mjs');
 const env={GITHUB_ACTIONS:'true',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'99'};
 const good=createCiBuildProof(env,'11.100.0');
 const verify=x=>verifyBuildProof(x,{sha:'a'.repeat(40),runId:'99',version:'11.100.0'});
 assert.ok(verify({...good,productionReady:true}).length);
 assert.ok(verify({...good,checks:{...good.checks,'http-e2e':'SKIPPED'}}).length);
 assert.ok(verify({...good,status:'SOURCE_PASS'}).length);
 assert.ok(verify({...good,checks:{...good.checks,unrelated:'PASS'}}).length);
});
test('V11.100 CI workflow emits receipt only after live E2E',()=>{
 const flow=fs.readFileSync(path.join(root,'.github/workflows/bootstrap-lockfile.yml'),'utf8');
 assert.ok(flow.indexOf('run-ci-http.sh')<flow.indexOf('build-proof.mjs --write'));
 assert.ok(flow.indexOf('build-proof.mjs --write')<flow.indexOf('name: thien-do-fullstack-proof'));
});
test('V11.100 Windows retrieval uses safe import and separately verifies CI receipt',()=>{
 const ps=fs.readFileSync(path.join(root,'infrastructure/scripts/get-github-build-results.ps1'),'utf8');
 assert.match(ps,/import-lockfile\.mjs --candidate \$candidate --apply/);
 assert.match(ps,/build-proof\.mjs --verify \$proofFile --sha \$localSha --run-id \$runId/);
 assert.match(ps,/No successful fullstack receipt/);
});

test('V11.100 private GitHub launcher commits the actual package version, not stale V10.8',()=>{
 const ps=fs.readFileSync(path.join(root,'infrastructure/scripts/launch-github-build.ps1'),'utf8');
 assert.match(ps,/git commit -m \"THIEN DO V\$releaseVersion audited build candidate/);
 assert.match(ps,/require\('\.\/package\.json'\)\.version/);
 assert.doesNotMatch(ps,/THIEN DO V10\.8 audited build candidate/);
});
