'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const root = join(__dirname, '..');
const shaA = 'a'.repeat(40), shaB = 'b'.repeat(40);
const selector = () => import('../infrastructure/scripts/select-bootstrap-run.mjs');
const run = (id, sha = shaA, status = 'completed', conclusion = 'success') =>
  ({ databaseId: id, headSha: sha, headBranch: 'main', status, conclusion });

test('bootstrap artifact selector never picks a run belonging to another commit', async () => {
  const { selectBootstrapRun } = await selector();
  assert.equal(selectBootstrapRun([run(200,shaB), run(100,shaA)], shaA).id, '100');
  assert.throws(() => selectBootstrapRun([run(200,shaB)],shaA),/No bootstrap run matches/);
});

test('latest matching run is authoritative, even when it has not finished', async () => {
  const { selectBootstrapRun } = await selector();
  assert.throws(() => selectBootstrapRun([run(300,shaA,'in_progress',null),run(250,shaA)],shaA),/in_progress/);
});

test('failed fullstack step can still yield lockfile from successful first job', async () => {
  const { selectBootstrapRun } = await selector();
  assert.equal(selectBootstrapRun([run(40,shaA,'completed','failure')],shaA).conclusion,'failure');
});

test('cancelled/skipped runs are rejected and missing SHA cannot silently match', async () => {
  const { selectBootstrapRun } = await selector();
  assert.throws(() => selectBootstrapRun([run(50,shaA,'completed','cancelled')],shaA),/cancelled/);
  assert.throws(() => selectBootstrapRun([run(50,shaA)],'abc'),/40-character/);
  assert.throws(() => selectBootstrapRun([{...run(40), headSha:undefined}],shaA),/No bootstrap run matches/);
});

test('selector CLI returns only a run ID and refuses mismatched input', () => {
  const script=join(root,'infrastructure/scripts/select-bootstrap-run.mjs');
  const ok=spawnSync(process.execPath,[script,shaA],{input:JSON.stringify([run(42)]),encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(ok.stdout,'42\n');
  const bad=spawnSync(process.execPath,[script,shaB],{input:JSON.stringify([run(42)]),encoding:'utf8'});
  assert.notEqual(bad.status,0);
  assert.match(bad.stderr,/BLOCKED/);
});

test('download helper checks local, remote and run SHAs before downloading artifact', () => {
  const script=readFileSync(join(root,'infrastructure/scripts/get-github-build-results.ps1'),'utf8');
  assert.match(script,/git rev-parse HEAD/);
  assert.match(script,/repos\/\$remote\/branches\/main/);
  assert.match(script,/select-bootstrap-run\.mjs \$localSha/);
  assert.ok(script.indexOf('select-bootstrap-run.mjs') < script.indexOf('gh run download'));
  assert.match(script,/import-lockfile\.mjs --candidate \$candidate --apply/);
  const importer=readFileSync(join(root,'infrastructure/scripts/import-lockfile.mjs'),'utf8');
  assert.match(importer,/validateLockFile\(path, root\)/);
  assert.match(importer,/REFUSING to overwrite/);
});

test('validator verifies an artifact at another path without requiring root lockfile', async () => {
  const { validateLockFile }=await import('../infrastructure/scripts/validate-lockfile.mjs');
  const temp=mkdtempSync(join(tmpdir(),'thiendo-artifact-'));
  try {
    const dir=join(temp,'apps','web'); mkdirSync(dir,{recursive:true});
    const main={name:'test-project',version:'1.0.0',workspaces:['apps/web']};
    const web={name:'@demo/web',version:'1.0.0',dependencies:{react:'^19.0.0'}};
    const lock={lockfileVersion:3,packages:{
      '':{name:main.name,version:main.version},
      'apps/web':{name:web.name,version:web.version,dependencies:web.dependencies},
      'node_modules/@demo/web':{link:true,resolved:'apps/web'},
      'node_modules/react':{version:'19.2.0',resolved:'https://registry.npmjs.org/react/-/react-19.2.0.tgz',integrity:'sha512-mock'}
    }};
    writeFileSync(join(temp,'package.json'),JSON.stringify(main));
    writeFileSync(join(dir,'package.json'),JSON.stringify(web));
    const artifact=join(temp,'staged.json');
    writeFileSync(artifact,JSON.stringify(lock));
    assert.deepEqual(validateLockFile(artifact,temp),[]);
    delete lock.packages['node_modules/react'].integrity;
    writeFileSync(artifact,JSON.stringify(lock));
    assert.match(validateLockFile(artifact,temp).join(';'),/react/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('direct validator CLI fails for an absent or invalid candidate file', () => {
  const script=join(root,'infrastructure/scripts/validate-lockfile.mjs');
  const bad=spawnSync(process.execPath,[script,join(tmpdir(),'fake-no-file-thiendo.json')],{encoding:'utf8'});
  assert.notEqual(bad.status,0);
  assert.match(bad.stderr,/BLOCKED/);
});
