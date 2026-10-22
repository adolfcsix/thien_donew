'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = resolve(__dirname, '..');
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const pkg = json('package.json');
const workspaces = Object.fromEntries(pkg.workspaces.map(x => [x, json(`${x}/package.json`)]));
const load = filename => import(pathToFileURL(resolve(root,'infrastructure/scripts',filename)).href);
function lockFixture(){
  const rootPackage = {name:pkg.name,version:pkg.version,devDependencies:pkg.devDependencies};
  const packages = {'':rootPackage};
  for (const [dir,manifest] of Object.entries(workspaces)) {
    packages[dir] = {name:manifest.name,version:manifest.version,
      dependencies:{...manifest.dependencies},devDependencies:{...manifest.devDependencies},
      optionalDependencies:{...manifest.optionalDependencies},peerDependencies:{...manifest.peerDependencies}};
    packages[`node_modules/${manifest.name}`]={resolved:dir,link:true};
  }
  for (const manifest of [pkg,...Object.values(workspaces)]) {
    for (const [name,range] of Object.entries({ ...manifest.dependencies,...manifest.devDependencies,
      ...manifest.optionalDependencies, ...manifest.peerDependencies })){
      if(String(range).startsWith('file:'))continue;
      packages[`node_modules/${name}`] = { version:'1.0.0',
        resolved:`https://registry.npmjs.org/${encodeURIComponent(name)}/-/pkg-1.0.0.tgz`,
        integrity:'sha512-example'};
    }
  }
  return {lockfileVersion:3,packages};
}
test('V11.66 local references: accepts all 11 authentic workspace edges',async()=>{
  const {validateLockStructure}=await load('validate-lockfile.mjs');
  assert.deepEqual(validateLockStructure(lockFixture(),pkg,workspaces),[]);
});
test('V11.66 local references: blocks workspace name redirected to another valid workspace',async()=>{
  const {validateLockStructure}=await load('validate-lockfile.mjs');
  const lock=lockFixture();
  lock.packages['apps/web'].dependencies['@thiendo/knowledge']='file:../../packages/shared-types';
  const manifests=structuredClone(workspaces);
  manifests['apps/web'].dependencies['@thiendo/knowledge']='file:../../packages/shared-types';
  assert.match(validateLockStructure(lock,pkg,manifests).join(' '),/Unsafe or mismatched local workspace reference/);
});
test('V11.66 local references: blocks lock link redirected even if manifest is correct',async()=>{
  const {validateLockStructure}=await load('validate-lockfile.mjs');
  const lock=lockFixture();
  lock.packages['node_modules/@thiendo/knowledge'].resolved='packages/shared-types';
  assert.match(validateLockStructure(lock,pkg,workspaces).join(' '),/workspace link/);
});
test('V11.66 local references: rejects a file path escaping the repository',async()=>{
  const {validateLockStructure}=await load('validate-lockfile.mjs');
  const lock=lockFixture();
  const manifests=structuredClone(workspaces);
  lock.packages['apps/api'].dependencies['@thiendo/shared-types']='file:../../../../../some-external-package';
  manifests['apps/api'].dependencies['@thiendo/shared-types']='file:../../../../../some-external-package';
  assert.match(validateLockStructure(lock,pkg,manifests).join(' '),/Unsafe or mismatched local workspace reference/);
});
test('V11.66 local references: detects optional and peer lockfile drift',async()=>{
  const {validateLockStructure}=await load('validate-lockfile.mjs');
  const lock=lockFixture();
  const manifests=structuredClone(workspaces);
  manifests['apps/web'].peerDependencies={'react':'^19.2.0'};
  lock.packages['apps/web'].peerDependencies={'react':'^18.0.0'};
  assert.match(validateLockStructure(lock,pkg,manifests).join(' '),/Lock entry differs from apps\/web\/peerDependencies: react/);
});
test('V11.66 readiness distinguishes prerequisites from completed build or E2E',async()=>{
  const {assessReadiness}=await load('release-readiness-lib.mjs');
  const ready=assessReadiness({nodeOk:true,npmOk:true,workspacesOk:true,metadataOk:true,lockfileOk:true,depsOk:true});
  assert.equal(ready.verdict,'PREREQUISITES_PRESENT');
  assert.match(ready.scope,/NOT RUN/);
  const blocked=assessReadiness({nodeOk:true,npmOk:true,workspacesOk:true,metadataOk:true,lockfileOk:false,depsOk:false});
  assert.equal(blocked.verdict,'BLOCKED');
  assert.deepEqual(blocked.steps.filter(x=>x.status==='BLOCKED').map(x=>x.id),['lockfile','dependencies']);
});
test('V11.66 readiness CLI reports lockfile state and does not leak environment values',()=>{
  const exec=spawnSync(process.execPath,['infrastructure/scripts/release-readiness.mjs','--json'],{
    cwd:root,encoding:'utf8',timeout:12000,env:{...process.env,DATABASE_URL:'postgresql://u:extremely_secret@localhost/test',SESSION_SECRET:'extremely_secret'}});
  assert.ok([0,2].includes(exec.status),exec.stderr);
  const report=JSON.parse(exec.stdout);
  assert.equal(report.version,pkg.version);
  assert.ok(['BLOCKED','PREREQUISITES_PRESENT'].includes(report.verdict));
  assert.equal(report.steps.find(x=>x.id==='workspaces').status,'PASS');
  if (!existsSync(resolve(root,'package-lock.json'))) {
    assert.equal(report.steps.find(x=>x.id==='lockfile').status,'BLOCKED');
  } else {
    assert.ok(['PASS','BLOCKED'].includes(report.steps.find(x=>x.id==='lockfile').status));
  }
  assert.doesNotMatch(exec.stdout,/extremely_secret|postgresql:\/\//);
});
test('V11.66 diagnostic without --install never runs npm ci implicitly',()=>{
  const script=readFileSync(resolve(root,'infrastructure/scripts/diagnose-build.mjs'),'utf8');
  assert.match(script,/const ciOk = npmOk && lockOk && installRequested/);
  assert.doesNotMatch(script,/const ciOk = npmOk && lockOk && \(installRequested \|\| existsSync/);
  assert.doesNotMatch(script,/\['run','db:migrate'\]/);
});
