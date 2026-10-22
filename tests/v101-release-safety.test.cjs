'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = join(__dirname, '..');
let guardPromise;
function guard() {return guardPromise ||= import('../infrastructure/scripts/e2e-guard.mjs');}
const safe = {
  NODE_ENV: 'test',
  E2E_LOCAL_DB_CONFIRM: 'YES',
  DATABASE_URL: 'postgresql://thiendo:pass@localhost:5432/thiendo_test',
  API_BASE_URL:'http://127.0.0.1:3000',
  NEXT_BASE_URL:'http://localhost:3000',
};
test('V10.1 E2E accepts only explicitly approved disposable localhost *_test DB', async () => {
  const {assertSafeE2ETarget} = await guard();
  assert.deepEqual(assertSafeE2ETarget(safe), { databaseName: 'thiendo_test', databaseHost:'localhost' });
  assert.equal(assertSafeE2ETarget({...safe,DATABASE_URL:'postgresql://x:p@[::1]:5432/demo_test'}).databaseName,'demo_test');
});
test('V10.1 E2E rejects real/non-test databases even with opt-in', async () => {
  const {assertSafeE2ETarget} = await guard();
  for (const DATABASE_URL of [
    'postgresql://u:p@localhost:5432/thiendo',
    'postgresql://u:p@localhost:5432/production',
    'postgresql://u:p@localhost:5432/test',
    'postgresql://u:p@prod.example.com:5432/thiendo_test',
    'postgresql://u:p@192.168.1.3:5432/thiendo_test',
    'https://localhost/thiendo_test',
    'not-a-url',
    'postgresql://u:p@localhost:5432/thiendo_test/extra',
  ]) assert.throws(() => assertSafeE2ETarget({...safe,DATABASE_URL}), /E2E|database/, DATABASE_URL);
});
test('V10.1 E2E rejects production, missing opt-in, missing DB', async () => {
  const {assertSafeE2ETarget} = await guard();
  assert.throws(() => assertSafeE2ETarget({...safe,NODE_ENV:'production'}), /production/);
  assert.throws(() => assertSafeE2ETarget({...safe,E2E_LOCAL_DB_CONFIRM:undefined}), /CONFIRM/);
  assert.throws(() => assertSafeE2ETarget({...safe,DATABASE_URL:undefined}), /DATABASE_URL/);
});
test('V10.1 E2E refuses remote or non-HTTP Next/API URLs', async () => {
  const {assertSafeE2ETarget} = await guard();
  for (const target of ['https://localhost:3000','http://external.example.com:3000','http://localhost:3000/route','http://127.0.0.1:3000?x=1','http://someone@localhost:3000']) {
    assert.throws(() => assertSafeE2ETarget({...safe,NEXT_BASE_URL:target}), /NEXT_BASE_URL/, target);
    assert.throws(() => assertSafeE2ETarget({...safe,API_BASE_URL:target}), /API_BASE_URL/, target);
  }
});
test('V10.1 guard prohibits Next proxying to a remote/wrong-port API during E2E', async () => {
  const {assertSafeE2ETarget} = await guard();
  assert.throws(() => assertSafeE2ETarget({...safe,API_INTERNAL_URL:'https://api.production.example.org'}), /API_INTERNAL_URL/);
  assert.throws(() => assertSafeE2ETarget({...safe,API_INTERNAL_URL:'http://127.0.0.1:8099'}), /API_INTERNAL_URL port/);
  assert.equal(assertSafeE2ETarget({...safe,API_INTERNAL_URL:'http://127.0.0.1:8080'}).databaseName,'thiendo_test');
});
test('V10.1 release runner includes Next + API proxy test and fails closed without lockfile', () => {
  const runner=readFileSync(join(root,'infrastructure/scripts/verify-release.mjs'),'utf8');
  assert.match(runner,/tests\/next-proxy-smoke\.mjs/);
  assert.match(runner,/tests\/api-postgres-e2e\.test\.mjs/);
  assert.match(runner,/tests\/wait-for-next\.mjs/);
  assert.match(runner,/package-lock\.json/);
  assert.match(runner,/assertSafeE2ETarget/);
  assert.match(runner,/API_BASE_URL: `http:\/\/127\.0\.0\.1:/);
  assert.match(runner,/API_BASE_URL: nextBase, NEXT_BASE_URL: nextBase/);
  const res=spawnSync(process.execPath,['infrastructure/scripts/verify-release.mjs','--full'], {
    cwd:root, encoding:'utf8',timeout:10000,env:{...process.env,DATABASE_URL:safe.DATABASE_URL,E2E_LOCAL_DB_CONFIRM:'NO',THIENDO_RELEASE_REPORT_DIR:require('node:path').join(require('node:os').tmpdir(),'thiendo-release-test-'+process.pid)}
  });
  assert.equal(res.status,1,res.stderr+' '+res.stdout);
  assert.match(res.stdout,/\[BLOCKED\]/);
});
test('V10.1 CI tests first-party Next proxy and uses dedicated *_test database', () => {
  const ci=readFileSync(join(root,'.github/workflows/ci.yml'),'utf8');
  assert.match(ci,/POSTGRES_DB: thiendo_test/);
  assert.match(ci,/npm ci --no-audit --no-fund/);
  assert.match(ci,/run-ci-http\.sh/);
  const runner=readFileSync(join(root,'infrastructure/scripts/run-ci-http.sh'),'utf8');
  assert.match(runner,/API_BASE_URL="http:\/\/127\.0\.0\.1:/);
  assert.match(ci,/WEB_ORIGIN: http:\/\/127\.0\.0\.1:3000/);
  assert.match(runner,/tests\/next-proxy-smoke\.mjs/);
  assert.match(runner,/tests\/api-postgres-e2e\.test\.mjs/);
});
