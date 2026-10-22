'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = join(__dirname, '..');
const httpPolicy = () => import('../infrastructure/scripts/e2e-http.mjs');
const releasePolicy = () => import('../infrastructure/scripts/release-http-policy.mjs');

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, base:`http://127.0.0.1:${server.address().port}`};
}
async function stop(server) {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}

test('V10.3 local HTTP helper rejects non-local, credentialed and redirectable origins', async () => {
  const {localTestOrigin} = await httpPolicy();
  assert.equal(localTestOrigin('http://127.0.0.1:8080'), 'http://127.0.0.1:8080');
  assert.equal(localTestOrigin('http://localhost:3000/'), 'http://localhost:3000');
  for(const value of ['https://localhost', 'http://prod.example.org','http://192.168.1.2','http://user:password@localhost:3000',
    'http://localhost:3000/other','http://localhost:3000?x=1','http://localhost#frag','//localhost:8000','file:///etc/passwd']) {
    assert.throws(() => localTestOrigin(value), /local HTTP origin|local origin/, value);
  }
});

test('V10.3 local HTTP paths reject protocol-relative URLs, traversal and query', async () => {
  const {localTestPath} = await httpPolicy();
  assert.equal(localTestPath('/api/auth/me'), '/api/auth/me');
  for(const path of ['//prod.example.org/collect','/api/../admin','/%2e%2e/admin','/api/charts?user=secret',
    '/api/charts#x','http://prod.example.org/','\\\\evil','/a\\b']) {
    assert.throws(() => localTestPath(path), /local path|no query|relative local path|traversal/, path);
  }
});

test('V10.3 refuses redirect of authenticated POST (never follows to other endpoint)', async () => {
  let receivedAtTarget = 0;
  const other = await serve((_req,res) => {receivedAtTarget++;res.writeHead(200,{'content-type':'application/json'});res.end('{}');});
  const first = await serve((_req,res) => {res.writeHead(307, {location:`${other.base}/collect`});res.end();});
  try {
    const {localE2EFetch} = await httpPolicy();
    await assert.rejects(() => localE2EFetch(first.base, '/api/auth/register', {
      method:'POST',headers:{cookie:'thiendo_session=secret','content-type':'application/json'},body:'{"password":"secret"}',
      redirect:'follow',
    }), /blocked unexpected HTTP redirect/);
    assert.equal(receivedAtTarget, 0, 'redirect target must not receive credentials or request body');
  } finally { await stop(first.server); await stop(other.server); }
});

test('V10.3 safe local HTTP GET succeeds without redirection', async () => {
  const first=await serve((_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"ready":true}');});
  try {
    const {localE2EFetch}=await httpPolicy();
    const response=await localE2EFetch(first.base,'/api/health/ready');
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ready:true});
  } finally {await stop(first.server);}
});

test('V10.3 release policy never executes data-writing E2E after failed smoke', async () => {
  const {smokeBeforeDestructiveE2E:run} = await releasePolicy();
  const order=[];
  assert.equal(run(stage => { order.push(stage); return false; }),false);
  assert.deepEqual(order,['smoke']);
  order.length=0;
  assert.equal(run(stage => {order.push(stage); return true;}),true);
  assert.deepEqual(order,['smoke','e2e']);
  order.length=0;
  assert.equal(run(stage => {order.push(stage); return stage==='smoke';}),false);
  assert.deepEqual(order,['smoke','e2e']);
});

test('V10.3 runner and HTTP requests actually wire the fail-closed policies', () => {
  const src=p=>readFileSync(join(root,p),'utf8');
  const runner=src('infrastructure/scripts/verify-release.mjs');
  const e2e=src('tests/api-postgres-e2e.test.mjs');
  const smoke=src('tests/next-proxy-smoke.mjs');
  const probe=src('tests/wait-for-next.mjs');
  assert.match(runner,/smokeBeforeDestructiveE2E\(/);
  assert.ok(runner.indexOf('Verify live disposable E2E database is empty') < runner.indexOf('smokeBeforeDestructiveE2E('));
  for(const source of [e2e,smoke,probe])assert.match(source,/localE2EFetch\(/);
  assert.match(runner,/process\.kill\(-child\.pid, 'SIGTERM'\)/);
});

test('V10.3 full-stack refuses to run when safety consent is missing', () => {
  const env={...process.env,NODE_ENV:'production',E2E_LOCAL_DB_CONFIRM:'NO',THIENDO_RELEASE_REPORT_DIR:require('node:path').join(require('node:os').tmpdir(),'thiendo-release-test-'+process.pid)};
  delete env.DATABASE_URL;
  const result=spawnSync(process.execPath,['infrastructure/scripts/verify-release.mjs','--full'],{
    cwd:root,env,encoding:'utf8',timeout:15000
  });
  assert.equal(result.status,1,result.stderr+'\n'+result.stdout);
  assert.match(result.stdout,/\[BLOCKED\]/);
  assert.doesNotMatch(result.stdout,/PostgreSQL HTTP E2E through Next proxy/);
});
