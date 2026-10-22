'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT=resolve(__dirname,'..');
const file=x=>resolve(ROOT,x);
const load=x=>import(pathToFileURL(file('infrastructure/scripts/'+x)).href);
const baseline={ NODE_ENV:'development', WEB_ORIGIN:'http://localhost:3000', API_INTERNAL_URL:'http://127.0.0.1:8080',
  DATABASE_URL:'postgresql://dev:test@127.0.0.1:5432/thiendo', COOKIE_SECURE:'false', API_HOST:'127.0.0.1', API_PORT:'8080' };
function preflight(add={}) {
  return spawnSync(process.execPath,['infrastructure/scripts/preflight.mjs'],{
    cwd:ROOT, encoding:'utf8', timeout:6500, env:{...process.env,...baseline,...add}
  });
}
test('V11.101 preflight accepts dev config and rejects unsupported PostgreSQL protocols without printing password',()=>{
  assert.equal(preflight().status,0);
  const bad=preflight({DATABASE_URL:'https://admin:super_secret_password@example.org/data'});
  assert.equal(bad.status,1);assert.match(bad.stderr,/DATABASE_URL/);
  assert.doesNotMatch(bad.stdout+bad.stderr,/super_secret_password|admin@example/);
});
test('V11.101 preflight detects invalid local database URL even outside production',()=>{
  for(const url of ['nonsense', 'mysql://user:pass@localhost/db', 'postgresql://']) {
    const r=preflight({DATABASE_URL:url});assert.equal(r.status,1,url);assert.match(r.stderr,/DATABASE_URL/);
  }
});
test('V11.101 preflight and Nest runtime reject identical invalid API_PORT and API_HOST',()=>{
  for(const bad of ['0','65536','-1','3.14','abcd']) {
    const r=preflight({API_PORT:bad});assert.equal(r.status,1,bad);assert.match(r.stderr,/API_PORT/);
  }
  for(const bad of ['0.0.0.1','api.example.net','::2']) {
    const r=preflight({API_HOST:bad});assert.equal(r.status,1,bad);assert.match(r.stderr,/API_HOST/);
  }
});
test('V11.101 preflight rejects unsafe origins and enforces production TLS/cookies',()=>{
  for(const bad of ['http://admin:pw@localhost:8080','http://localhost:8080/api','https://example.net?q=1']){
    const r=preflight({API_INTERNAL_URL:bad});assert.equal(r.status,1,bad);assert.match(r.stderr,/API_INTERNAL_URL/);
  }
  assert.equal(preflight({NODE_ENV:'production', WEB_ORIGIN:'https://example.org', COOKIE_SECURE:'true'}).status,0);
  assert.equal(preflight({NODE_ENV:'production', WEB_ORIGIN:'http://example.org',COOKIE_SECURE:'true'}).status,1);
  assert.equal(preflight({NODE_ENV:'production', WEB_ORIGIN:'https://example.org',COOKIE_SECURE:'false'}).status,1);
});
test('V11.101 local GET policy only accepts loopback origins',async()=>{
  const {localOrigin,localPostgresTarget,classifyHttpHealth}=await load('local-runtime-doctor-lib.mjs');
  assert.equal(localOrigin('http://127.0.0.1:3000'),'http://127.0.0.1:3000');
  assert.equal(localOrigin('http://[::1]:3000'),'http://[::1]:3000');
  assert.equal(localOrigin('https://localhost:3000/'),'https://localhost:3000');
  for(const url of ['http://example.com','http://10.0.0.2:3000','https://user:pass@localhost','http://localhost/secret','file:///etc/passwd','http://127.0.0.2:8080'])
    assert.equal(localOrigin(url),null,url);
  assert.deepEqual(localPostgresTarget('postgresql://user:password@localhost:5433/test'),{host:'localhost',port:5433});
  assert.equal(localPostgresTarget('postgresql://user:password@external.example.org:5432/test'),null);
  assert.equal(classifyHttpHealth(true,true,true,true),'LOCAL_SMOKE_PASS');
  assert.equal(classifyHttpHealth(true,true,true,false),'WEB_OR_PROXY_NOT_READY');
});
test('V11.101 offline doctor emits redacted JSON and never claims a real build',()=>{
  const r=spawnSync(process.execPath,['infrastructure/scripts/local-runtime-doctor.mjs','--json'],{
    cwd:ROOT,encoding:'utf8',timeout:9000,env:{...process.env,DATABASE_URL:'postgresql://admin:veryprivatepassword@127.0.0.1:1/test'}
  });
  assert.equal(r.status,2,r.stderr);
  const data=JSON.parse(r.stdout);
  assert.equal(data.status,'BLOCKED');assert.match(data.warning,/No npm ci/);
  assert.ok(data.checks.some(check=>check.id==='config-preflight'));
  assert.doesNotMatch(r.stdout+r.stderr,/veryprivatepassword/);
});
test('V11.101 Windows startup and doctor scripts are present and safe',()=>{
  const startup=readFileSync(file('START_THIEN_DO_WINDOWS.bat'),'utf8');
  const doctor=readFileSync(file('CHECK_THIEN_DO_RUNTIME_WINDOWS.bat'),'utf8');
  assert.doesNotMatch(startup,/V11\.82 - START/);
  assert.match(startup,/Node\.js phai la ban 22\.13\+/);
  assert.match(doctor,/local-runtime-doctor\.mjs/);
  assert.match(doctor,/--smoke/);
  assert.doesNotMatch(doctor,/(?:db:migrate|npm\.cmd ci|test:e2e)/);
});

test('V11.101 smoke refuses external origins and does not contact them',()=>{
 const r=spawnSync(process.execPath,['infrastructure/scripts/local-runtime-doctor.mjs','--smoke','--json'],{
  cwd:ROOT,encoding:'utf8',timeout:9000,
  env:{...process.env,WEB_ORIGIN:'https://example.org',API_INTERNAL_URL:'https://evil.invalid',DATABASE_URL:'postgresql://admin:private123@127.0.0.1:1/db'},
 });
 assert.equal(r.status,2);const report=JSON.parse(r.stdout);
 assert.equal(report.checks.find(x=>x.id==='http-smoke')?.status,'BLOCKED');
 assert.doesNotMatch(r.stdout+r.stderr,/private123/);
});
test('V11.101 Windows lockfile bootstrap preserves already validated lockfiles',()=>{
 const bat=readFileSync(file('PREPARE_LOCKFILE_WINDOWS.bat'),'utf8');
 assert.match(bat,/if exist "package-lock\.json" \(/);
 assert.ok(bat.indexOf('if exist "package-lock.json" (')<bat.indexOf('npm.cmd install --package-lock-only'));
 assert.match(bat,/Da co package-lock\.json: kiem tra, KHONG tao lai/);
 assert.match(bat,/npm.cmd run check:lockfile/);
});
