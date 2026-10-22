'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {mkdtempSync,rmSync,readFileSync,existsSync}=require('node:fs');
const {tmpdir}=require('node:os');const {join,resolve}=require('node:path');
const {spawnSync}=require('node:child_process');
const root=resolve(__dirname,'..');
const load=()=>import('../infrastructure/scripts/lib/offline-workspace-tests.mjs');
const fakeTap=['TAP version 13','# Subtest: example','not ok 1 - example',"  error: |-","    Cannot find module 'astronomy-engine'","  code: 'MODULE_NOT_FOUND'",'# Subtest: next','ok 2 - next','# tests 2','# pass 1','# fail 1'].join('\n');

test('A22 evidence parser reports missing-module failure as BLOCKED, not PASS',async()=>{
 const {summarizeNodeTap}=await load();
 const r=summarizeNodeTap(fakeTap,1);
 assert.equal(r.status,'BLOCKED');assert.equal(r.tests,2);assert.equal(r.passed,1);assert.equal(r.failed,1);
 assert.deepEqual(r.modules,{'astronomy-engine':1});assert.equal(r.unclassifiedFailures,0);
});
test('A22 parser never marks incomplete/malformed TAP or mixed failures as PASS',async()=>{
 const {summarizeNodeTap}=await load();
 assert.equal(summarizeNodeTap('',0).status,'INCOMPLETE');
 assert.equal(summarizeNodeTap('# tests 2\n# pass 2\n# fail 0',1).status,'BLOCKED');
 assert.equal(summarizeNodeTap('# tests 2\n# pass 1\n# fail 0',0).status,'INCOMPLETE');
 assert.equal(summarizeNodeTap('# tests 2\n# pass 2\n# fail 0',0).status,'PASS');
 assert.equal(summarizeNodeTap(fakeTap+'\n# tests 2\n# pass 0\n# fail 2',1).unclassifiedFailures,1);
});
test('A22 local links resolve workspace modules without touching root node_modules',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'a22-test-'));
 try{
  const {createWorkspaceOverlay,testEnvironment}=await load();
  const before=existsSync(join(root,'node_modules','@thiendo','astrology-engine'));
  const packages=createWorkspaceOverlay(root,dir);
  assert.equal(packages.length,9);
  const x=spawnSync(process.execPath,['-e',"console.log(require.resolve('@thiendo/astrology-engine/src/taiyi-depth.cjs'))"],{cwd:root,encoding:'utf8',env:testEnvironment(process.env,dir)});
  assert.equal(x.status,0,x.stderr);assert.match(x.stdout,/taiyi-depth\.cjs/);
  assert.equal(existsSync(join(root,'node_modules','@thiendo','astrology-engine')),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('A22 offline CLI is explicitly non-installing and fail-closed',()=>{
 const src=readFileSync(join(root,'infrastructure/scripts/offline-workspace-tests.mjs'),'utf8');
 assert.match(src,/summarizeNodeTap/);assert.match(src,/rmSync\(temp/);
 assert.match(src,/summary\.status==='PASS'\?0:2/);
 assert.doesNotMatch(src,/spawnSync\(['\"]npm|spawnSync\(['\"]npm\.cmd|\['run','db:migrate'\]/);
});
