'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root=resolve(__dirname,'..');
const script=name=>resolve(root,'infrastructure/scripts',name);
const load=name=>import(pathToFileURL(script(name)).href);

test('V11.67 npm registry: reachable is connectivity evidence, not build',async()=>{
  const {interpretRegistryProbe}=await load('registry-health.mjs');
  const x=interpretRegistryProbe({status:0,output:'npm notice PONG'});
  assert.equal(x.status,'PASS');
  assert.equal(x.category,'REACHABLE');
  assert.match(x.action,/does not prove.*build/i);
});
test('V11.67 npm registry: DNS temporary failure correctly classified',async()=>{
  const {interpretRegistryProbe}=await load('registry-health.mjs');
  const x=interpretRegistryProbe({status:1,output:'npm error code EAI_AGAIN registry.npmjs.org'});
  assert.equal(x.category,'DNS_TEMPORARY');
  assert.match(x.action,/GitHub Actions/);
});
test('V11.67 npm registry: permanent DNS and network failures distinguished',async()=>{
  const {interpretRegistryProbe}=await load('registry-health.mjs');
  assert.equal(interpretRegistryProbe({status:1,output:'getaddrinfo ENOTFOUND'}).category,'DNS_NOT_FOUND');
  assert.equal(interpretRegistryProbe({status:1,errorCode:'ETIMEDOUT'}).category,'NETWORK');
  assert.equal(interpretRegistryProbe({status:null,errorCode:'ETIMEDOUT'}).status,'BLOCKED');
});
test('V11.67 npm registry: certificate failures never recommend disabling TLS',async()=>{
  const {interpretRegistryProbe}=await load('registry-health.mjs');
  const x=interpretRegistryProbe({status:1,output:'SELF_SIGNED_CERT_IN_CHAIN'});
  assert.equal(x.category,'TLS');
  assert.match(x.action,/do not disable TLS/);
});
test('V11.67 npm registry: auth and unknown failures fail closed',async()=>{
  const {interpretRegistryProbe}=await load('registry-health.mjs');
  assert.equal(interpretRegistryProbe({status:1,output:'npm ERR E401'}).category,'AUTH');
  assert.equal(interpretRegistryProbe({status:1,output:'some unknown npm error'}).category,'UNCLASSIFIED');
});
test('V11.67 registry probe is explicitly read-only',()=>{
  const src=readFileSync(script('registry-preflight.mjs'),'utf8');
  assert.match(src,/\['ping', '--fetch-retries=0'/);
  assert.doesNotMatch(src,/\['(?:install|ci|publish|audit|update|run)',/);
  assert.match(src,/no package install/i);
});
test('V11.67 diagnostic does not install after failed registry probe',()=>{
  const src=readFileSync(script('diagnose-build.mjs'),'utf8');
  assert.match(src,/const registryOk = check\('npm registry connectivity'/);
  assert.match(src,/if \(registryOk\) check\('npm install from registry'/);
  assert.match(src,/skip\('npm install from registry'/);
  assert.match(src,/const ciOk = npmOk && lockOk && installRequested/);
});
test('V11.67 Windows lockfile installer probes npm before mutating files',()=>{
  const src=readFileSync(resolve(root,'PREPARE_LOCKFILE_WINDOWS.bat'),'utf8');
  assert.ok(src.indexOf('registry-preflight.mjs')>=0);
  assert.ok(src.indexOf('registry-preflight.mjs')<src.indexOf('npm.cmd install'));
  assert.match(src,/goto :blocked_registry/i);
  assert.match(readFileSync(resolve(root,'CHECK_THIEN_DO_NPM_WINDOWS.bat'),'utf8'),/registry-preflight.mjs/);
});
test('V11.67 offline fake blocked registry returns JSON without touching files',()=>{
  const r=spawnSync(process.execPath,[script('registry-preflight.mjs'),'--json'],{
    cwd:root,encoding:'utf8',timeout:18000,
    env:{...process.env,npm_config_registry:'http://127.0.0.1:1/',
      DATABASE_URL:'postgresql://user:secret123@localhost/db', SESSION_SECRET:'secret123'},
  });
  assert.equal(r.status,2,`${r.stdout}\n${r.stderr}`);
  const report=JSON.parse(r.stdout);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.category,'NETWORK');
  assert.doesNotMatch(r.stdout,/secret123|postgresql:\/\//);
});

test('V11.67 build diagnostics checks registry before the long regression suite',()=>{
  const src=readFileSync(script('diagnose-build.mjs'),'utf8');
  assert.ok(src.indexOf("const registryOk = check('npm registry connectivity'")<src.indexOf("if (registryBlocked) skip('Unit and regression tests'"));
  assert.match(src,/if \(registryBlocked\) skip\('Unit and regression tests'/);
  assert.match(src,/else check\('Unit and regression tests'/);
});
