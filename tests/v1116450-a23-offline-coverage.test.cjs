'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync,mkdirSync,readFileSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const root=resolve(__dirname,'..');
const load=()=>import('../infrastructure/scripts/lib/offline-workspace-tests.mjs');

test('A23 includes all primary CJS tests and six legacy compatibility test files',async()=>{
 const {listOfflineTestFiles}=await load();
 const tests=listOfflineTestFiles(root);
 assert.ok(tests.length>=320,`Unexpected test coverage: ${tests.length}`);
 assert.equal(tests.filter(path=>path.startsWith('tests/compat/tests/')).length,6);
 assert.equal(new Set(tests).size,tests.length);
 assert.ok(tests.includes('tests/v1116450-a23-offline-coverage.test.cjs'));
 assert.ok(tests.every(path=>path.endsWith('.test.cjs')));
});

test('A23 missing or empty compatibility directory must BLOCK rather than silently shrink coverage',async()=>{
 const {listOfflineTestFiles}=await load();
 const dir=mkdtempSync(join(tmpdir(),'a23-coverage-'));
 try{
   mkdirSync(join(dir,'tests'));
   writeFileSync(join(dir,'tests','one.test.cjs'),'');
   assert.throws(()=>listOfflineTestFiles(dir),/Missing required test directory/);
   mkdirSync(join(dir,'tests','compat','tests'),{recursive:true});
   assert.throws(()=>listOfflineTestFiles(dir),/Empty required test suite/);
   writeFileSync(join(dir,'tests','compat','tests','legacy.test.cjs'),'');
   assert.deepEqual(listOfflineTestFiles(dir),['tests/one.test.cjs','tests/compat/tests/legacy.test.cjs']);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('A23 temporary workspace paths are isolated from inherited NODE_PATH and NODE_OPTIONS',async()=>{
 const {testEnvironment}=await load();
 const base={PATH:'/usr/bin',NODE_PATH:'/tmp/injected-modules',NODE_OPTIONS:'--require /tmp/injected-preload.cjs',SECRET_TEST_SENTINEL:'present'};
 const actual=testEnvironment(base,'/tmp/a23-overlay');
 assert.equal(actual.NODE_PATH,resolve('/tmp/a23-overlay'));
 assert.equal('NODE_OPTIONS' in actual,false);
 assert.equal(actual.SECRET_TEST_SENTINEL,'present');
 assert.equal(base.NODE_PATH,'/tmp/injected-modules');
 assert.equal(base.NODE_OPTIONS,'--require /tmp/injected-preload.cjs');
});

test('A23 live runner uses strict test inventory and always cleans temporary links',()=>{
 const body=readFileSync(join(root,'infrastructure/scripts/offline-workspace-tests.mjs'),'utf8');
 assert.match(body,/listOfflineTestFiles\(root\)/);
 assert.match(body,/rmSync\(temp,\{recursive:true,force:true\}\)/);
 assert.match(body,/summary\.status==='PASS'\?0:2/);
 assert.match(body,/tests\/compat\/tests/);
});

test('A23 Windows entry validates minimum Node.js version before running tests',()=>{
 const body=readFileSync(join(root,'TEST_THIEN_DO_OFFLINE_WINDOWS.bat'),'utf8');
 assert.match(body,/major===22&&minor>=13/);
 assert.match(body,/if errorlevel 1/);
 assert.match(body,/offline-workspace-tests\.mjs/);
});
