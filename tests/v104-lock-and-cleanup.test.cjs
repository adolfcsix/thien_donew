'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createServer } = require('node:http');
const root = join(__dirname, '..');
const read = path => JSON.parse(readFileSync(join(root,path),'utf8'));
const lockHelper = () => import('../infrastructure/scripts/validate-lockfile.mjs');
const cleanupHelper = () => import('../infrastructure/scripts/e2e-account-cleanup.mjs');

function fixture() {
  const pkg = read('package.json');
  const manifests = Object.fromEntries(pkg.workspaces.map(path => [path,read(`${path}/package.json`)]));
  const lock = { name:pkg.name,version:pkg.version,lockfileVersion:3,packages:{
    '': { name: pkg.name, version:pkg.version, devDependencies:pkg.devDependencies }
  }};
  for(const [path,manifest] of Object.entries(manifests)) {
    lock.packages[path]={ name:manifest.name,version:manifest.version,
      dependencies:manifest.dependencies,devDependencies:manifest.devDependencies };
    lock.packages[`node_modules/${manifest.name}`]={resolved:path,link:true};
  }
  for(const manifest of [pkg,...Object.values(manifests)]) {
    for(const [name,range] of Object.entries({...manifest.dependencies,...manifest.devDependencies})) {
      if(String(range).startsWith('file:'))continue;
      lock.packages[`node_modules/${name}`] = {version:'1.2.3',resolved:`https://registry.npmjs.org/${name}/-/${name.split('/').pop()}-1.2.3.tgz`,integrity:'sha512-mock'};
    }
  }
  return {pkg,manifests,lock};
}

test('V10.4 offline lock validator accepts consistent v3 workspace and direct dependency metadata',async()=>{
  const {validateLockStructure}=await lockHelper();
  const {lock,pkg,manifests}=fixture();
  assert.deepEqual(validateLockStructure(lock,pkg,manifests),[]);
});

test('V10.4 offline lock validator blocks stale workspace versions, fake links and missing integrity',async()=>{
  const {validateLockStructure}=await lockHelper();
  const {lock,pkg,manifests}=fixture();
  lock.packages['apps/web'].version='0.0.0';
  lock.packages['node_modules/@thiendo/api'].resolved='apps/web';
  delete lock.packages['node_modules/next'].integrity;
  const errors=validateLockStructure(lock,pkg,manifests).join('; ');
  assert.match(errors,/Workspace identity\/version drift: apps\/web/);
  assert.match(errors,/Workspace link is missing or inconsistent: @thiendo\/api/);
  assert.match(errors,/missing HTTPS provenance or integrity: next/);
});

test('V10.4 offline lock validator refuses non-v3 or truncated lockfile',async()=>{
  const {validateLockStructure}=await lockHelper();
  const {pkg,manifests}=fixture();
  assert.match(validateLockStructure({lockfileVersion:2},pkg,manifests).join(' '),/lockfileVersion 3/);
  const {lock}=fixture();
  delete lock.packages['apps/web'];
  assert.match(validateLockStructure(lock,pkg,manifests).join(' '),/Missing workspace manifest or lock entry/);
});

test('V10.4 cleanup reauthenticates after an expired cookie, then deletes both test users',async()=>{
  const {cleanupDisposableTestAccounts}=await cleanupHelper();
  const calls=[];
  const request=async (path,options)=>{
    calls.push([path,options.cookie]);
    if(path==='/api/auth/login')return {status:200,cookie:'thiendo_session='+ 'a'.repeat(64),json:{user:{}}};
    if(path==='/api/auth/account' && options.cookie==='thiendo_session=old')return {status:401,json:{}};
    return {status:200,json:{deleted:true}};
  };
  await cleanupDisposableTestAccounts(request,[
    {email:'a@example.invalid',password:'testpass',cookie:'thiendo_session=old',registered:true},
    {email:'b@example.invalid',password:'testpass',cookie:'thiendo_session='+'b'.repeat(64),registered:true},
  ]);
  assert.equal(calls.filter(([p])=>p==='/api/auth/login').length,1);
  assert.equal(calls.filter(([p])=>p==='/api/auth/account').length,3);
});

test('V10.4 cleanup attempts every account and reports failure instead of hiding it',async()=>{
  const {cleanupDisposableTestAccounts}=await cleanupHelper();
  let visited=0;
  const request=async (path,options)=>{
    if(path==='/api/auth/account'){ visited++;if(options.cookie==='bad')throw Error('socket closed');return {status:200,json:{deleted:true}}; }
    return {status:401,json:{}};
  };
  await assert.rejects(()=>cleanupDisposableTestAccounts(request,[
    {email:'a@example.invalid',password:'x',cookie:'bad',registered:true},
    {email:'b@example.invalid',password:'y',cookie:'good',registered:true},
  ]),/cleanup failed for 1 disposable account/);
  assert.equal(visited,2);
});

test('V10.4 cleanup accepts missing account after failed register and does not fail',async()=>{
  const {cleanupDisposableTestAccounts}=await cleanupHelper();
  await cleanupDisposableTestAccounts(async()=>({status:401,json:{}}),[
    {email:'not-created@example.invalid',password:'p',registered:false,cookie:''}
  ]);
});

test('V10.4 local HTTP transport aborts unresponsive upstream within configured deadline',async()=>{
  const {localE2EFetch}=await import('../infrastructure/scripts/e2e-http.mjs');
  const server=createServer((_req,_res)=>{});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const start=Date.now();
    await assert.rejects(()=>localE2EFetch(base,'/api/health/ready',{timeoutMs:100}), /abort|timeout|signal/i);
    assert.ok(Date.now()-start<2000);
    await assert.rejects(()=>localE2EFetch(base,'/api/health/ready',{timeoutMs:0}), /timeoutMs/);
  } finally {
    server.closeAllConnections();
    await new Promise(r=>server.close(r));
  }
});

test('V10.4 release runner verifies existing lockfile before npm ci and E2E cleanup is wired',()=>{
  const runner=readFileSync(join(root,'infrastructure/scripts/verify-release.mjs'),'utf8');
  const e2e=readFileSync(join(root,'tests/api-postgres-e2e.test.mjs'),'utf8');
  assert.match(runner,/validate-lockfile\.mjs/);
  assert.ok(runner.indexOf('validate-lockfile.mjs')<runner.indexOf("['ci','--no-audit'"));
  assert.match(e2e,/cleanupDisposableTestAccounts\(request, accounts\)/);
});
