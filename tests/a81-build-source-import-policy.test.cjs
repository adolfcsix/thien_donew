'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {existsSync} = require('node:fs');
const {resolve} = require('node:path');
const {pathToFileURL} = require('node:url');
const root = resolve(__dirname, '..');
const policy = import(pathToFileURL(resolve(root, 'infrastructure/scripts/source-import-policy.mjs')).href);

test('generated API modules are deferred only for legitimate isolated integration tests with real sources', async () => {
  const {deferredSqlTestSource} = await policy;
  const cases = [
    ['a44-insight-sql.test.mjs', 'admin-insights/dashboard-snapshot'],
    ['a49-message-order.test.mjs', 'community-hub/community-hub.service'],
    ['a51-admin-member-sql.test.mjs', 'admin-console/admin-console.service'],
    ['a64-merged-security-sql.test.mjs', 'auth/admin-mfa.service'],
    ['a64-merged-security-sql.test.mjs', 'auth/totp'],
    ['chat-recovery-sql.test.mjs', 'community-hub/community-hub.service'],
  ];
  for (const [testName, moduleName] of cases) {
    const source = deferredSqlTestSource(`tests/${testName}`, `../apps/api/dist/modules/${moduleName}.js`);
    assert.equal(source, `apps/api/src/modules/${moduleName}.ts`);
    assert.equal(existsSync(resolve(root, source)), true, source);
  }
});

test('never suppress a missing runtime import or an invalid test path', async () => {
  const {deferredSqlTestSource} = await policy;
  for (const [filename, specifier] of [
    ['apps/web/src/app/page.tsx', '../apps/api/dist/modules/auth/totp.js'],
    ['apps/api/src/service.ts', '../apps/api/dist/modules/auth/totp.js'],
    ['tests/nested/name.test.mjs', '../apps/api/dist/modules/auth/totp.js'],
    ['tests/fake.test.cjs', '../apps/api/dist/modules/auth/totp.js'],
    ['tests/test.test.mjs', '../apps/api/dist/common/e2e-identity.js'],
    ['tests/test.test.mjs', '../apps/api/dist/modules/../../secrets.js'],
    ['tests/test.test.mjs', '../apps/api/dist/modules/auth/totp.json'],
    ['tests/test.test.mjs', '/apps/api/dist/modules/auth/totp.js'],
  ]) assert.equal(deferredSqlTestSource(filename, specifier), null, filename);
});


test('GitHub source preflight checks source imports and parse errors, not only lockfile and secrets', () => {
  const {readFileSync} = require('node:fs');
  const preflight = readFileSync(resolve(root, 'infrastructure/scripts/check-github-readiness.mjs'), 'utf8');
  assert.match(preflight, /\['source-integrity', 'infrastructure\/scripts\/check-source\.mjs'\]/);
});
