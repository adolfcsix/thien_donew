'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { createServer } = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const { Module } = require('node:module');
const ROOT = join(__dirname, '..');

// Compile the ACTUAL TypeScript source with an installed/global TypeScript parser;
// mock no business logic. The helper has no runtime NestJS dependencies.
function loadIdentityModule() {
  let ts;
  try { ts = require('typescript'); }
  catch {
    const globalRoot = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], {encoding:'utf8'}).trim();
    ts = require(resolve(globalRoot, 'typescript'));
  }
  const path = join(ROOT, 'apps/api/src/common/e2e-identity.ts');
  const js = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: path,
  }).outputText;
  const mod = new Module(path, module);
  mod.filename = path;
  mod.paths = Module._nodeModulePaths(join(ROOT,'apps/api'));
  mod._compile(js, path);
  return mod.exports;
}

// The real smoke now fetches every Academy lesson and the glossary. Keep the
// mock server faithful to those routes without weakening identity assertions.
const academyLessons = JSON.parse(readFileSync(join(ROOT,'apps/web/src/features/academy/lessons.json'),'utf8'));
const expectedHtmlMarkers = new Map([
  ['/', 'Một thư phòng.'], ['/chart', 'THIÊN ĐỒ'], ['/calendar', 'Lịch'],
  ['/good-days', 'ngày'], ['/bazi', 'Đang kiểm tra tài khoản…'], ['/academy', 'Từ đọc địa bàn'],
  ['/library', 'Từ điển huyền học'], ['/star-atlas', 'chính tinh'],
  ...academyLessons.map(x=>['/academy/'+x.slug, x.title])
]);

const VALID_FINGERPRINT = '0123456789abcdef0123456789abcdef';
const baseEnvironment = () => ({
  NODE_ENV: 'test', E2E_LOCAL_DB_CONFIRM: 'YES',
  DATABASE_URL: 'postgresql://user:password@127.0.0.1:5433/thiendo_test'
});

test('V10.5 backend E2E identity permits only explicit local disposable test DB', () => {
  const { expectedDisposableDatabase } = loadIdentityModule();
  const env=baseEnvironment();
  assert.equal(expectedDisposableDatabase(env),'thiendo_test');
  assert.equal(expectedDisposableDatabase({...env,DATABASE_URL:'postgresql://u:p@localhost:5432/thiendo_test'}),'thiendo_test');
  for(const override of [
    { NODE_ENV: 'production' },
    { E2E_LOCAL_DB_CONFIRM: 'NO' },
    { E2E_LOCAL_DB_CONFIRM: undefined },
    { DATABASE_URL: 'postgresql://u:p@localhost:5432/thiendo' },
    { DATABASE_URL: 'postgresql://u:p@db.example.com:5432/thiendo_test' },
    { DATABASE_URL: 'mysql://u:p@localhost:3306/thiendo_test' },
    { DATABASE_URL: 'postgresql://u:p@localhost:5432/test;DROP' },
    { DATABASE_URL: 'invalid' },
    { DATABASE_URL: undefined },
  ]) {
    assert.equal(expectedDisposableDatabase({...env,...override}), null, JSON.stringify(override));
  }
});

async function simulateProxy(identity) {
  let mutationCount=0;
  const server=createServer((req,res)=>{
    if(req.method!=='GET')mutationCount++;
    if(req.url==='/api/health/e2e') {
      res.setHeader('content-type','application/json');
      res.statusCode=identity ? 200 : 404;
      return res.end(JSON.stringify(identity || {error:'disabled'}));
    }
    if(req.url?.startsWith('/api/')) {
      res.setHeader('content-type','application/json');
      res.statusCode=req.method==='POST'?403:200;
      return res.end(JSON.stringify(req.method==='POST'?{error:'Untrusted origin'}:{user:null,ok:true}));
    }
    const marker = expectedHtmlMarkers.get(req.url);
    if (!marker) {res.statusCode=404;return res.end('Not Found');}
    res.setHeader('content-type','text/html');
    res.end(`<!doctype html><html><head><title>THIÊN ĐỒ</title></head><body>THIÊN ĐỒ ${marker}</body></html>`);
  });
  await new Promise((yes,no)=>server.once('error',no).listen(0,'127.0.0.1',yes));
  const port=server.address().port;
  // Test the actual smoke script against a disposable *mock verifier module* in
  // a temporary tree. The production script always imports the real pg-backed
  // check-e2e-database.mjs and has no bypass flags.
  const fixtureRoot=mkdtempSync(join(tmpdir(),'thiendo-v108-proxy-'));
  mkdirSync(join(fixtureRoot,'tests'),{recursive:true});
  mkdirSync(join(fixtureRoot,'infrastructure','scripts'),{recursive:true});
  copyFileSync(join(ROOT,'tests/next-proxy-smoke.mjs'),join(fixtureRoot,'tests/next-proxy-smoke.mjs'));
  for (const name of ['e2e-http.mjs','e2e-guard.mjs','e2e-db-policy.mjs','read-only-route-manifest.mjs']) {
    copyFileSync(join(ROOT,'infrastructure','scripts',name),join(fixtureRoot,'infrastructure','scripts',name));
  }
  mkdirSync(join(fixtureRoot,'apps/web/src/features/academy'),{recursive:true});
  copyFileSync(join(ROOT,'apps/web/src/features/academy/lessons.json'),
    join(fixtureRoot,'apps/web/src/features/academy/lessons.json'));
  writeFileSync(join(fixtureRoot,'infrastructure','scripts','check-e2e-database.mjs'),
    `export const verifiedDatabaseIdentity = { database:'thiendo_test', fingerprint:'${VALID_FINGERPRINT}' };\n`);
  const env={...process.env,...baseEnvironment(), NEXT_BASE_URL:`http://127.0.0.1:${port}`,
    API_BASE_URL:`http://127.0.0.1:${port}`, API_PORT:'8080', API_INTERNAL_URL:''};
  try {
    const child=spawn(process.execPath, ['tests/next-proxy-smoke.mjs'],{
      cwd:fixtureRoot,env,stdio:['ignore','pipe','pipe']
    });
    let stderr='',stdout='';
    child.stdout.on('data',x=>stdout+=x);
    child.stderr.on('data',x=>stderr+=x);
    const exit=await Promise.race([
      new Promise(r=>child.on('close',(code,signal)=>r({code,signal}))),
      new Promise((_,reject)=>setTimeout(()=>{child.kill('SIGKILL');reject(Error('child timeout'));},10000).unref()),
    ]);
    return {exit, stderr,stdout,mutationCount};
  } finally {
    server.closeAllConnections();
    await new Promise(r=>server.close(r));
    rmSync(fixtureRoot,{recursive:true,force:true});
  }
}

test('V10.5 Next proxy smoke refuses incorrect API database before any mutation', async () => {
  const result=await simulateProxy({ok:true,profile:'disposable-e2e',database:'different_test',fingerprint:VALID_FINGERPRINT});
  assert.notEqual(result.exit.code,0);
  assert.match(result.stderr,/instance mismatch|disposable database|different server/i);
  assert.equal(result.mutationCount,0, 'No POST/DELETE is allowed before identity proof');
});

test('V10.5 Next proxy smoke refuses API without explicit E2E opt-in before any mutation', async () => {
  const result=await simulateProxy(null);
  assert.notEqual(result.exit.code,0);
  assert.match(result.stderr,/not opted into disposable E2E mode/i);
  assert.equal(result.mutationCount,0);
});

test('V10.7 Next proxy smoke remains read-only even with apparently matching database', async () => {
  const result=await simulateProxy({ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:VALID_FINGERPRINT});
  assert.equal(result.exit.code,0,result.stderr);
  assert.match(result.stdout,/PASS Next -> Nest -> PostgreSQL instance verified: thiendo_test/);
  assert.equal(result.mutationCount,0,'Read-only smoke must never send an unverified mutation');
});

test('V10.8 Next smoke blocks same DB name when API points to another PostgreSQL instance', async () => {
  const result=await simulateProxy({ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:'fedcba9876543210fedcba9876543210'});
  assert.notEqual(result.exit.code,0);
  assert.match(result.stderr,/instance mismatch/i);
  assert.equal(result.mutationCount,0);
});

test('V10.5 E2E test checks backend identity BEFORE any account registration', () => {
  const e2e=readFileSync(join(ROOT,'tests/api-postgres-e2e.test.mjs'),'utf8');
  const ready=e2e.indexOf("const proof=await request('/api/health/e2e')");
  const firstWrite=e2e.indexOf("const calculation=await request('/api/charts/calculate'");
  const firstRegister=e2e.indexOf("const a=await request('/api/auth/register'");
  assert.ok(ready>=0 && firstWrite>ready && firstRegister>ready);
  const controller=readFileSync(join(ROOT,'apps/api/src/modules/health/health.controller.ts'),'utf8');
  assert.match(controller,/expectedDisposableDatabase\(process\.env\)/);
  assert.match(controller,/SELECT current_database\(\) AS database_name/);
  assert.match(controller,/actualName !== expectedName/);
});

function loadControllerWithNoNestInstall() {
  let ts;
  try { ts = require('typescript'); }
  catch { ts = require(resolve(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript')); }
  const path=join(ROOT,'apps/api/src/modules/health/health.controller.ts');
  const compiled=ts.transpileModule(readFileSync(path,'utf8'), {
    fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}
  }).outputText;
  class NotFoundException extends Error { status=404; }
  class ServiceUnavailableException extends Error { status=503; }
  const common={
    Controller:()=>target=>target, Get:()=>()=>{}, NotFoundException, ServiceUnavailableException
  };
  const mod=new Module(path,module);
  mod.filename=path;
  mod.paths=Module._nodeModulePaths(join(ROOT,'apps/api'));
  const originalRequire=mod.require.bind(mod);
  mod.require=name=>{
    if(name==='@nestjs/common')return common;
    if(name==='@thiendo/astrology-engine')return {RULESET:'fixture'};
    if(name==='../../common/e2e-identity')return loadIdentityModule();
    return originalRequire(name);
  };
  mod._compile(compiled,path);
  return {...mod.exports,NotFoundException,ServiceUnavailableException};
}

async function withTestEnv(changes,run) {
  const keys=['NODE_ENV','DATABASE_URL','E2E_LOCAL_DB_CONFIRM'];
  const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try {
    for(const [key,value] of Object.entries(changes)) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
    return await run();
  } finally {
    for(const [key,value] of Object.entries(original)) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
}

test('V10.5 actual health controller refuses identity proof unless opted into local test DB', async () => {
  const {HealthController,NotFoundException}=loadControllerWithNoNestInstall();
  let queries=0;
  await withTestEnv({...baseEnvironment(),E2E_LOCAL_DB_CONFIRM:undefined},async()=>{
    await assert.rejects(()=>new HealthController({query:async()=>{queries++;return {rows:[]};}}).disposableE2EIdentity(),NotFoundException);
  });
  assert.equal(queries,0,'Disabled identity endpoint must not query DB');
});

test('V10.5 actual health controller proves live DB and refuses a mismatched connection', async () => {
  const {HealthController,ServiceUnavailableException}=loadControllerWithNoNestInstall();
  await withTestEnv(baseEnvironment(),async()=>{
    const good=new HealthController({query:async sql=>{
      assert.match(sql,/current_database\(\)/);
      return {rows:[{database_name:'thiendo_test',instance_fingerprint:VALID_FINGERPRINT}]};
    }});
    assert.deepEqual(await good.disposableE2EIdentity(),{
      ok:true,profile:'disposable-e2e',database:'thiendo_test',fingerprint:VALID_FINGERPRINT
    });
    const bad=new HealthController({query:async()=>({rows:[{database_name:'production',instance_fingerprint:VALID_FINGERPRINT}]})});
    await assert.rejects(()=>bad.disposableE2EIdentity(),ServiceUnavailableException);
    const disconnected=new HealthController({query:async()=>{throw new Error('database unavailable');}});
    await assert.rejects(()=>disconnected.disposableE2EIdentity(),ServiceUnavailableException);
  });
});
