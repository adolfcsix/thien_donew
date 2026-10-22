const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'infrastructure/scripts/run-ci-http.sh');
const script = fs.readFileSync(file, 'utf8');

// Release guard must be an explicit, inspectable ordering constraint.
test('Full-stack shell E2E verifies disposable DB before launching servers, and runs smoke before HTTP mutations', () => {
  const steps = [
    'node infrastructure/scripts/check-e2e-target.mjs',
    'node infrastructure/scripts/check-e2e-database.mjs',
    'npm run start -w @thiendo/api',
    'npm run start -w @thiendo/web',
    'node tests/next-proxy-smoke.mjs',
    'node --test tests/api-postgres-e2e.test.mjs',
  ];
  let previous = -1;
  for (const step of steps) {
    const at = script.indexOf(step);
    assert.ok(at > previous, `Missing or misplaced E2E guard: ${step}`);
    previous = at;
  }
  assert.match(script, /set -Eeuo pipefail/);
  assert.match(script, /trap cleanup EXIT INT TERM/);
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(root, '.github/workflows/bootstrap-lockfile.yml'), 'utf8');
  for (const wf of [ci, bootstrap]) {
    assert.match(wf, /bash infrastructure\/scripts\/run-ci-http\.sh/);
    assert.match(wf, /postgres:16-alpine/);
    assert.match(wf, /E2E_LOCAL_DB_CONFIRM: 'YES'/);
  }
});

const linuxBash = process.platform !== 'win32' && fs.existsSync('/bin/bash');
test('E2E runner stops before server startup when database identity check fails', {skip:!linuxBash}, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thiendo-ci-guard-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const events = path.join(dir,'events');
  fs.writeFileSync(path.join(dir,'node'), '#!/bin/sh\necho "node:$*" >> "$CI_GUARD_LOG"\ncase "$*" in *check-e2e-database.mjs*) exit 19;; esac\nexit 0\n');
  fs.writeFileSync(path.join(dir,'npm'), '#!/bin/sh\necho "npm:$*" >> "$CI_GUARD_LOG"\nexit 0\n');
  fs.chmodSync(path.join(dir,'node'),0o755);
  fs.chmodSync(path.join(dir,'npm'),0o755);
  const res = spawnSync('bash',['infrastructure/scripts/run-ci-http.sh'],{
    cwd:root, encoding:'utf8',timeout:5000,
    env:{...process.env,PATH:`${dir}:${process.env.PATH}`, CI_GUARD_LOG:events},
  });
  assert.equal(res.status,19, res.stderr||res.stdout);
  const calls = fs.readFileSync(events,'utf8');
  assert.match(calls,/node:infrastructure\/scripts\/check-e2e-target\.mjs/);
  assert.match(calls,/node:infrastructure\/scripts\/check-e2e-database\.mjs/);
  assert.doesNotMatch(calls,/npm:/);
});

test('CI names its source-only result honestly and retains strict lockfile gating', () => {
  const sourceWf = fs.readFileSync(path.join(root,'.github/workflows/source-integrity.yml'),'utf8');
  const ci = fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
  assert.match(sourceWf,/NOT a build/);
  assert.match(sourceWf,/npm run check:release:source/);
  assert.doesNotMatch(sourceWf,/npm run build/);
  assert.match(ci,/Require committed npm lockfile/);
  assert.match(ci,/npm run check:lockfile/);
  assert.match(ci,/npm ci --no-audit --no-fund/);
  assert.match(ci,/npm run typecheck/);
  assert.match(ci,/npm run build/);
});

test('CI HTTP runner never performs write E2E when first-party proxy smoke fails', {skip:!linuxBash}, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thiendo-ci-smoke-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const events = path.join(dir,'events');
  fs.writeFileSync(path.join(dir,'node'), '#!/bin/sh\necho "node:$*" >> "$CI_GUARD_LOG"\ncase "$*" in *next-proxy-smoke.mjs*) exit 27;; esac\nexit 0\n');
  fs.writeFileSync(path.join(dir,'npm'), '#!/bin/sh\necho "npm:$*" >> "$CI_GUARD_LOG"\nexit 0\n');
  fs.chmodSync(path.join(dir,'node'),0o755);
  fs.chmodSync(path.join(dir,'npm'),0o755);
  const res = spawnSync('bash',['infrastructure/scripts/run-ci-http.sh'],{
    cwd:root,encoding:'utf8',timeout:5000,
    env:{...process.env,PATH:`${dir}:${process.env.PATH}`,CI_GUARD_LOG:events},
  });
  assert.equal(res.status,27,res.stderr||res.stdout);
  const calls = fs.readFileSync(events,'utf8');
  assert.match(calls,/node:tests\/next-proxy-smoke\.mjs/);
  assert.doesNotMatch(calls,/node:--test tests\/api-postgres-e2e\.test\.mjs/);
});

test('GitHub result downloader stages candidates and delegates atomic, SHA-256 checked import', () => {
  const ps = fs.readFileSync(path.join(root, 'infrastructure/scripts/get-github-build-results.ps1'),'utf8');
  assert.match(ps,/run-\$runId/);
  assert.match(ps,/import-lockfile\.mjs --candidate \$candidate --apply/);
  const importer = fs.readFileSync(path.join(root, 'infrastructure/scripts/import-lockfile.mjs'),'utf8');
  assert.match(importer,/createHash\('sha256'\)/);
  assert.match(importer,/linkSync\(temp, assessment\.target\)/);
  assert.match(importer,/REFUSING to overwrite/);
});
