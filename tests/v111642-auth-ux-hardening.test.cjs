'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = file => readFileSync(resolve(root, file), 'utf8');
const provider = source('apps/web/src/components/auth-provider.tsx');
const login = source('apps/web/src/app/login/page.tsx');
const google = source('apps/web/src/components/google-auth-button.tsx');
const forms = source('apps/web/src/components/account-form-controls.tsx');
const layout = source('apps/web/src/app/login/login-entry.module.css');

test('Login entry exposes distinct login, registration and recovery paths', () => {
  for (const mode of ['login', 'register', 'recover']) {
    assert.ok(login.includes(`open('${mode}')`), mode);
    assert.ok(provider.includes(`'${mode}'`));
  }
  assert.match(login, /new URLSearchParams\(window\.location\.search\)\.get\('mode'\)/);
  assert.match(login, /loginDestination/);
  assert.match(source('apps/web/src/lib/login-destination.ts'), /safeToolReturn\(new URLSearchParams/);
  assert.match(login, /router\.replace\(destination\)/);
});

test('Auth entry intent is propagated to a newly mounted dialog', () => {
  assert.match(provider, /entryScreen=\{entryIntent\.screen\}/);
  assert.match(provider, /key=\{entryIntent\.revision\}/);
  assert.match(provider, /useState\(entryScreen === 'register'\)/);
  assert.match(provider, /entryScreen === 'recover' \? 'email' : null/);
});

test('Modal cannot be dismissed during an in-flight account mutation', () => {
  assert.match(provider, /if \(!pending\) close\(\)/);
  assert.match(provider, /useDialogFocus\(close, pending \|\| profileWorking\)/);
  assert.match(provider, /if \(!pending && !profileWorking && event\.target === event\.currentTarget\) close\(\)/);
  assert.match(provider, /className="icon-button close account-close" disabled=\{pending \|\| profileWorking\}/);
});

test('Recovery and third-party controls remain guarded when unavailable', () => {
  assert.match(provider, /!resetId \|\| code\.length !== 6 \|\| resetRemaining <= 0/);
  assert.match(google, /inert=\{disabled \|\| available !== 'enabled'\}/);
  const finalizer = google.match(/\.finally\(\(\) => \{([\s\S]*?)\n\s*\}\);/)?.[1];
  assert.ok(finalizer);
  assert.doesNotMatch(finalizer, /setEpoch\(/);
  assert.match(forms, /aria-pressed=\{revealed\} disabled=\{inputProps\.disabled\}/);
});

test('Account entry stays legible and accessible at mobile widths', () => {
  assert.match(layout, /max-width: 100%/);
  assert.match(layout, /min-height: 44px/);
  assert.match(layout, /max-width: 420px/);
  assert.match(login, /aria-labelledby="login-page-title"/);
});

test('Legacy account buttons do not accidentally pass MouseEvent as the screen argument', () => {
  const { readdirSync, readFileSync } = require('node:fs');
  const { join } = require('node:path');
  function inspect(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) inspect(path);
      else if (entry.name.endsWith('.tsx')) assert.ok(!readFileSync(path, 'utf8').includes('onClick={open}'), path);
    }
  }
  inspect(resolve(root, 'apps/web/src'));
});
