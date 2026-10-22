'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root=path.resolve(__dirname,'..');
const get = (rel)=>fs.readFileSync(path.join(root, rel),'utf8');
const lessons=JSON.parse(get('apps/web/src/features/academy/lessons.json'));
const manifestPath=path.join(root,'infrastructure/scripts/read-only-route-manifest.mjs');
const loader=()=>import(pathToFileURL(manifestPath).href);

test('real Next HTTP smoke covers ALL academy lesson routes and glossary',async()=>{
  const {getReadOnlyRouteManifest}=await loader();
  const routes=getReadOnlyRouteManifest();
  const paths=routes.map(x=>x.path);
  assert.equal(new Set(paths).size, paths.length,'HTTP routes must not repeat');
  for(const page of ['/','/chart','/calendar','/good-days','/bazi','/academy','/library','/star-atlas']) {
    assert.ok(paths.includes(page),`Missing required page ${page}`);
  }
  for(const lesson of lessons) {
    const page='/academy/'+lesson.slug;
    assert.ok(paths.includes(page),`Missing dynamic lesson ${page}`);
    assert.equal(routes.find(x=>x.path===page).marker,lesson.title);
  }
  assert.equal(routes.length,8+lessons.length);
});

test('manifest derives titles and paths dynamically without stale duplicated JSON',async()=>{
  const {buildReadOnlyRouteManifest}=await loader();
  const dynamic=buildReadOnlyRouteManifest([{slug:'test-bai-moi',title:'Mở rộng Học viện'}]);
  assert.ok(dynamic.some(x=>x.path==='/academy/test-bai-moi'&&x.marker==='Mở rộng Học viện'));
  assert.equal(dynamic.length,9);
});

test('rejects empty, duplicate and traversal slugs',async()=>{
  const {buildReadOnlyRouteManifest}=await loader();
  assert.throws(()=>buildReadOnlyRouteManifest([]),/missing/i);
  assert.throws(()=>buildReadOnlyRouteManifest([{slug:'../admin',title:'Not valid'}]),/Invalid/);
  assert.throws(()=>buildReadOnlyRouteManifest([{slug:'abc',title:'Valid'}, {slug:'abc',title:'Duplicate'}]),/Duplicate/);
  assert.throws(()=>buildReadOnlyRouteManifest([{slug:'abc',title:''}]),/Invalid/);
});

test('read-only HTTP smoke uses the manifest and validates SSR body, not just HTTP 200',()=>{
  const source=get('tests/next-proxy-smoke.mjs');
  assert.match(source,/getReadOnlyRouteManifest\(\)/);
  assert.match(source,/response\.status, 200/);
  assert.match(source,/html\.includes\(route\.marker\)/);
  assert.match(source,/timeoutMs: 8000/);
  assert.match(source,/assertMatchedApiInstance\(verifiedDatabaseIdentity, identity\)/);
  assert.doesNotMatch(source,/\bmethod\s*:\s*['"](?:POST|DELETE|PUT|PATCH)['"]/);
});

test('manifest entries point to actual Next routes',async()=>{
  const {getReadOnlyRouteManifest}=await loader();
  const paths=getReadOnlyRouteManifest().map(x=>x.path);
  for(const name of paths){
    if(name.startsWith('/academy/') ) {
      assert.ok(fs.existsSync(path.join(root,'apps/web/src/app/academy/[slug]/page.tsx')));
    } else {
      assert.ok(fs.existsSync(path.join(root,'apps/web/src/app',name==='/'?'page.tsx':`${name.slice(1)}/page.tsx`)),name);
    }
  }
});

test('Windows local launcher validates environment and dependency state before dev',()=>{
  const launcher=get('START_THIEN_DO_WINDOWS.bat');
  const doctor=get('infrastructure/scripts/local-runtime-doctor.mjs');
  const dependencyCheck=get('infrastructure/scripts/dependency-install-check.mjs');
  const before=launcher.indexOf('call npm.cmd run dev');
  const validation=launcher.indexOf('local-runtime-doctor.mjs');
  assert.ok(before>0 && validation>0 && validation<before,
    'Read-only doctor must run before any app starts');
  assert.match(launcher,/if errorlevel 1 \([\s\S]*exit \/b 2/);
  assert.match(launcher,/if not exist "\.env"/);
  assert.match(doctor,/validateRepositoryLock/);
  assert.match(doctor,/inspectDependencyInstallation/);
  assert.match(doctor,/preflight\.mjs/);
  assert.match(dependencyCheck,/@nestjs\/core/);
  assert.match(dependencyCheck,/node_modules\/\.bin/);
  assert.doesNotMatch(launcher,/V10\.5/);
});

test('CI invokes the same read-only HTTP smoke before mutating test data',()=>{
  const script=get('infrastructure/scripts/run-ci-http.sh');
  const smoke=script.indexOf('node tests/next-proxy-smoke.mjs');
  const writes=script.indexOf('node --test tests/api-postgres-e2e.test.mjs');
  assert.ok(smoke>0 && writes>smoke);
  assert.ok(script.indexOf('node infrastructure/scripts/check-e2e-database.mjs')<smoke);
});
