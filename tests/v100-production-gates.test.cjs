'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname,'..');
const src = filename => fs.readFileSync(path.join(root,filename),'utf8');
function compileConfig() {
  let ts;
  try { ts = require('typescript'); }
  catch { ts = require(path.join(execFileSync('npm', ['root','-g'], { encoding:'utf8' }).trim(), 'typescript')); }
  const code = ts.transpileModule(src('apps/api/src/common/runtime-config.ts'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const obj={exports:{}};
  new Function('module','exports',code)(obj,obj.exports);
  return obj.exports.runtimeConfig;
}
const runtimeConfig=compileConfig();
test('V10 dev runtime normalizes origin and preserves config boundaries',()=>{
  assert.deepEqual(runtimeConfig({ WEB_ORIGIN:'http://localhost:3000/',API_PORT:'8088'}),
    {production:false, webOrigin:'http://localhost:3000',port:8088,host:'127.0.0.1'});
});
test('V10 production rejects missing database URL before NestFactory',()=>{
  assert.throws(()=>runtimeConfig({NODE_ENV:'production',COOKIE_SECURE:'true',WEB_ORIGIN:'https://example.org'}),/DATABASE_URL/);
  const main=src('apps/api/src/main.ts');
  assert.ok(main.indexOf('runtimeConfig(process.env)')<main.indexOf('NestFactory.create('));
});
test('V10 production refuses HTTP origin or insecure cookie',()=>{
  const env={NODE_ENV:'production',DATABASE_URL:'postgresql://usr:secret@localhost:5432/testdb', WEB_ORIGIN:'https://example.org', COOKIE_SECURE:'true'};
  assert.equal(runtimeConfig(env).webOrigin,'https://example.org');
  assert.throws(()=>runtimeConfig({...env,WEB_ORIGIN:'http://example.org'}),/HTTPS/);
  assert.throws(()=>runtimeConfig({...env,COOKIE_SECURE:'false'}),/COOKIE_SECURE/);
});
test('V10 validates origins, db scheme, port, and host fail-closed',()=>{
  assert.throws(()=>runtimeConfig({WEB_ORIGIN:'https://example.org/path'}),/plain/);
  assert.throws(()=>runtimeConfig({WEB_ORIGIN:'https://example.org/?x=1'}),/plain/);
  assert.throws(()=>runtimeConfig({DATABASE_URL:'https://example.org/db'}),/PostgreSQL/);
  for(const badPort of ['0','65536','oops','-1','3.14'])
    assert.throws(()=>runtimeConfig({API_PORT:badPort}),/API_PORT/);
  assert.throws(()=>runtimeConfig({API_HOST:'remote.example.org'}),/API_HOST/);
});
test('V10 migration obtains advisory lock before creating ledger',()=>{
  const sql=src('infrastructure/scripts/migrate.mjs');
  const lock=sql.indexOf('await db.query(\'SELECT pg_advisory_lock(');
  const ledger=sql.indexOf('await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations');
  assert.ok(lock>0 && ledger>lock,'lock must cover first-time migration ledger creation');
  assert.match(sql,/pg_advisory_unlock/);
});
test('V10 backup request bound uses actual UTF-8 bytes',()=>{
  assert.match(src('apps/api/src/modules/charts/charts.service.ts'),/Buffer\.byteLength\(JSON\.stringify\(payload\), 'utf8'\)/);
  assert.ok(Buffer.byteLength('á'.repeat(32769),'utf8')>65536);
});
test('V10 release gates are fail-closed on missing reproducible lockfile',()=>{
  const ci=src('.github/workflows/ci.yml');
  assert.match(ci,/npm ci --no-audit --no-fund/);
  assert.doesNotMatch(ci,/else npm install/);
  const runner=src('infrastructure/scripts/verify-release.mjs');
  assert.match(runner,/package-lock\.json/);
  assert.match(runner,/assertSafeE2ETarget/);
  assert.match(src('infrastructure/scripts/e2e-guard.mjs'),/E2E_LOCAL_DB_CONFIRM/);
});
test('V10 E2E cannot target production or arbitrary remote API',()=>{
  const e2e=src('tests/api-postgres-e2e.test.mjs');
  const guard=src('infrastructure/scripts/e2e-guard.mjs');
  assert.match(e2e,/assertSafeE2ETarget/);
  assert.match(guard,/NODE_ENV === 'production'/);
  assert.match(guard,/E2E_LOCAL_DB_CONFIRM/);
  assert.match(guard,/database name must end with _test/);
  assert.match(e2e,/Destructive E2E API must be local only/);
});
test('V10 release runner blocks real-stack verification when prerequisites are absent',()=>{
  const env={...process.env,NODE_ENV:'production',E2E_LOCAL_DB_CONFIRM:'NO',THIENDO_RELEASE_REPORT_DIR:require('node:path').join(require('node:os').tmpdir(),'thiendo-release-test-'+process.pid)};
  delete env.DATABASE_URL;
  const cmd=spawnSync(process.execPath,['infrastructure/scripts/verify-release.mjs','--full'],{cwd:root,env,encoding:'utf8',timeout:10000});
  assert.equal(cmd.status,1, cmd.stdout+' '+cmd.stderr);
  assert.match(cmd.stdout,/\[BLOCKED\]/);
});
