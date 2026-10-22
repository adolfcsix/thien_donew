const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const root = path.resolve(__dirname, '..');
const load = () => import(pathToFileURL(path.join(root, 'infrastructure/scripts/diagnose-build-lib.mjs')).href);

test('a valid committed lockfile allows npm ci without an existing node_modules', async () => {
  const { chooseInstallStrategy } = await load();
  assert.equal(chooseInstallStrategy({
    installRequested: true, npmAvailable: true, lockfileValid: true, hasNodeModules: false,
  }), 'USE_LOCKFILE');
});
test('a valid lockfile skips npm install resolution, even with node_modules', async () => {
  const { chooseInstallStrategy } = await load();
  assert.equal(chooseInstallStrategy({
    installRequested: true, npmAvailable: true, lockfileValid: true, hasNodeModules: true,
  }), 'USE_LOCKFILE');
});
test('missing lockfile triggers real registry resolution only when explicitly requested', async () => {
  const { chooseInstallStrategy } = await load();
  assert.equal(chooseInstallStrategy({
    installRequested: true, npmAvailable: true, lockfileValid: false, hasNodeModules: false,
  }), 'GENERATE_LOCK');
  assert.equal(chooseInstallStrategy({
    installRequested: false, npmAvailable: true, lockfileValid: false, hasNodeModules: true,
  }), 'SKIP');
});
test('diagnostics block installation if npm is missing', async () => {
  const { chooseInstallStrategy } = await load();
  assert.equal(chooseInstallStrategy({
    installRequested: true, npmAvailable: false, lockfileValid: true, hasNodeModules: false,
  }), 'BLOCKED');
});
test('diagnostics runner validates a lock before deciding to resolve dependencies', () => {
  const script = readFileSync(path.join(root, 'infrastructure/scripts/diagnose-build.mjs'), 'utf8');
  assert.match(script, /validateRepositoryLock\(\)/);
  assert.match(script, /const ciOk = npmOk && lockOk && installRequested/);
  assert.match(script, /\['ci','--no-audit'/);
  assert.doesNotMatch(script, /\['run','db:migrate'\]|\['run','test:e2e'\]/);
});

test('Node engine validation refuses old Node versions and malformed output', async () => {
  const { isSupportedNodeVersion } = await load();
  assert.equal(isSupportedNodeVersion('v20.19.2'), false);
  assert.equal(isSupportedNodeVersion('v22.12.0'), false);
  assert.equal(isSupportedNodeVersion('v22.13.0'), true);
  assert.equal(isSupportedNodeVersion('v22.16.0'), true);
  assert.equal(isSupportedNodeVersion('v24.0.0'), true);
  assert.equal(isSupportedNodeVersion('unavailable'), false);
});
test('Node engine version is actually evaluated, not just the --version exit status', () => {
  const script = readFileSync(path.join(root, 'infrastructure/scripts/diagnose-build.mjs'), 'utf8');
  assert.match(script, /\['--version'\],12000, isSupportedNodeVersion/);
});
test('diagnostic redacts quoted credentials and common CI secrets', async () => {
  const { redactDiagnostic } = await load();
  const output = redactDiagnostic('TOKEN="secret with spaces"\nNPM_TOKEN=abc123\nGH_TOKEN: xyz456\nPASSWORD=\'quoted-secret\'');
  for (const secret of ['secret with spaces', 'abc123', 'xyz456', 'quoted-secret']) {
    assert.equal(output.includes(secret), false);
  }
  assert.equal((output.match(/\[REDACTED\]/g) || []).length, 4);
});
