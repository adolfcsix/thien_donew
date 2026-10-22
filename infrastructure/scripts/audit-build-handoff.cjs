'use strict';
// Offline static contract check: no registry access or claim of having run CI.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.resolve(root, file), 'utf8');
const assert = require('node:assert/strict');
try {
  const flow = read('.github/workflows/bootstrap-lockfile.yml');
  const e2e = flow.indexOf('run: bash infrastructure/scripts/run-ci-http.sh');
  const proof = flow.indexOf('build-proof.mjs --write');
  const upload = flow.indexOf('name: thien-do-fullstack-proof');
  assert.ok(e2e > 0 && proof > e2e && upload > proof, 'Receipt must follow live fullstack E2E');
  for (const fragment of ['npm install --package-lock-only', 'validate-lockfile.mjs', 'npm ci',
    'npm run typecheck && npm run build', 'postgres:16-alpine']) assert.ok(flow.includes(fragment), fragment);
  const cmd = read('infrastructure/scripts/get-github-build-results.ps1');
  for (const fragment of ['select-bootstrap-run.mjs', 'import-lockfile.mjs --candidate $candidate --apply',
    'thien-do-fullstack-proof', 'build-proof.mjs --verify $proofFile --sha $localSha --run-id $runId'])
    assert.ok(cmd.includes(fragment), fragment);
  const guard = read('infrastructure/scripts/import-lockfile.mjs');
  for (const fragment of ['validateLockFile(', "flag: 'wx'", 'linkSync(temp, assessment.target)', 'REFUSING to overwrite'])
    assert.ok(guard.includes(fragment), fragment);
  console.log('PASS: V11.100 offline bootstrap workflow order, artifact verification and atomic lockfile handoff');
} catch (error) {
  console.error('FAIL: V11.100 build-handoff contract:', error.message);
  process.exitCode = 1;
}
