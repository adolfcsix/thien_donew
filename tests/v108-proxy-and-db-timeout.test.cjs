'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { Module } = require('node:module');
const root=join(__dirname,'..');
const source=(p)=>readFileSync(join(root,p),'utf8');
let ts;
try {ts=require('typescript');} catch {ts=require(resolve(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}

test('V10.8 real DatabaseService configures finite connect/query/idle timeouts',()=>{
  const file=join(root,'apps/api/src/common/database.service.ts');
  const js=ts.transpileModule(source('apps/api/src/common/database.service.ts'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
  let config;
  class FakePool {constructor(opts){config=opts;}on() {} async end() {}}
  const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(join(root,'apps/api'));
  const originalRequire=mod.require.bind(mod);
  mod.require=(id)=>id==='pg'?{Pool:FakePool}:id==='@nestjs/common'?{Injectable:()=>target=>target}:originalRequire(id);
  mod._compile(js,file);
  const instance=new mod.exports.DatabaseService();
  assert.ok(instance);
  assert.equal(config.max,10);
  assert.equal(config.connectionTimeoutMillis,5000);
  assert.equal(config.statement_timeout,10000);
  assert.equal(config.lock_timeout,5000);
  assert.equal(config.idle_in_transaction_session_timeout,15000);
  assert.equal(config.idleTimeoutMillis,30000);
});

test('V10.8 Next proxy smoke compares independent live PostgreSQL fingerprints, no self-comparison',()=>{
  const script=source('tests/next-proxy-smoke.mjs');
  assert.match(script,/import \{ verifiedDatabaseIdentity \} from '\.\.\/infrastructure\/scripts\/check-e2e-database\.mjs'/);
  assert.match(script,/assertMatchedApiInstance\(verifiedDatabaseIdentity, identity\)/);
  assert.doesNotMatch(script,/fingerprint:\s*identity\.fingerprint/);
  assert.doesNotMatch(script,/method:\s*['"](?:POST|DELETE)['"]/);
});

test('V10.8 indexing remains opt-in for public production only',()=>{
  const layout=source('apps/web/src/app/layout.tsx');
  assert.match(layout,/process\.env\.NODE_ENV === 'production'/);
  assert.match(layout,/process\.env\.ENABLE_SEARCH_INDEXING === 'true'/);
  assert.match(layout,/robots: \{ index: allowIndexing, follow: allowIndexing \}/);
});
