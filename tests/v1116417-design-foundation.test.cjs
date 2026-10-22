'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = relative => fs.readFileSync(path.join(root,relative),'utf8');
const foundation = read('apps/web/src/app/design-foundation-v1116417.css');
const landing = read('apps/web/src/app/login/login-entry.module.css');
const layout = read('apps/web/src/app/layout.tsx');
const entry = read('apps/web/src/app/login/page.tsx');
const auth = read('apps/web/src/components/auth-provider.tsx');

test('shared stylesheet is imported exactly once after prior visual layers', () => {
  const needle = "'./design-foundation-v1116417.css'";
  assert.equal(layout.split(needle).length - 1,1);
  assert.ok(layout.indexOf(needle) > layout.indexOf("'../customize/home.css'"));
});
test('both existing button APIs, including login .button.primary, have design coverage', () => {
  assert.match(foundation,/:is\(\.btn, \.button\)/);
  assert.match(foundation,/\.button\.primary/);
  assert.match(entry,/className="button primary"/);
  assert.match(entry,/className="button"/);
});
test('design tokens support dark and light mode without external assets', () => {
  assert.match(foundation,/\.site\s*\{/);
  assert.match(foundation,/\.site\.light\s*\{/);
  for (const token of ['--td-radius-control','--td-radius-card','--td-radius-dialog','--td-focus-ring','--td-field-bg','--td-card-edge']) {
    assert.ok(foundation.includes(token),token);
  }
  assert.doesNotMatch(foundation,/@import\s|https?:\/\//);
});
test('buttons have disabled treatment and avoid hover transform on touch screens', () => {
  assert.match(foundation,/:disabled/);
  assert.match(foundation,/@media \(hover: none\)/);
  assert.match(foundation,/prefers-reduced-motion: reduce/);
});
test('form controls preserve toggle/range and do not style unrelated divination board inputs', () => {
  assert.match(foundation,/\.main-content \.field/);
  assert.match(foundation,/not\(\[type="checkbox"\]\)/);
  assert.match(foundation,/not\(\[type="range"\]\)/);
  assert.doesNotMatch(foundation,/\.atlas-grid|\.atlas-house|\.chart-relation/);
});
test('focus visibility, invalid/disabled states and system high contrast are handled', () => {
  assert.match(foundation,/:focus-visible/);
  assert.match(foundation,/aria-invalid="true"/);
  assert.match(foundation,/@media \(forced-colors: active\)/);
});
test('mobile inputs use 16px to avoid Safari input auto zoom', () => {
  assert.match(foundation,/@media \(max-width: 680px\)/);
  assert.match(foundation,/font-size: 16px/);
});
test('login landing looks complete without modal and gracefully degrades on mobile', () => {
  assert.match(landing,/\.landing::before/);
  assert.match(landing,/\.landing::after/);
  assert.match(landing,/:global\(\.site\.light\)/);
  assert.match(landing,/@media \(max-width: 420px\)/);
  assert.match(landing,/\.actions > button \{ width: 100%; \}/);
});
test('account form keeps recovery while integrating username and session lifetime', () => {
  assert.match(auth,/await accountApi\.register\(email\.trim\(\), password, username\.trim\(\)\)/);
  assert.match(auth,/await accountApi\.login\(email\.trim\(\), password, remember\)/);
  assert.match(auth,/PasswordField label="Mật khẩu"/);
  assert.match(auth,/PasswordField label="Nhập lại mật khẩu"/);
});
