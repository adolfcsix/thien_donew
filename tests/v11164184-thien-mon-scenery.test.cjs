"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('apps/web/src/app/thien-mon-scenery-v11164184.css');
const shell=read('apps/web/src/components/shell.tsx');
const auth=read('apps/web/src/components/auth-provider.tsx');
const home=read('apps/web/src/app/page.tsx');
const login=read('apps/web/src/app/login/page.tsx');
const layout=read('apps/web/src/app/layout.tsx');

test('approved art assets are bundled as lightweight local WebP, for both themes',()=>{
  for(const t of ['dark','light'])for(const kind of ['icon','scene']) {
    const p=path.join(root,`apps/web/public/brand/thien-mon-${kind}-${t}.webp`);
    const b=fs.readFileSync(p);
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.ok(b.length>12000&&b.length<200_000, p);
    assert.match(css,new RegExp(`thien-mon-${kind}-${t}\.webp`));
  }
});
test('exact icon appears in sidebar while actual mountain scene is used on home',()=>{
  assert.match(shell,/className="thien-mon-approved-icon"/);
  assert.match(home,/className="thien-mon-home-scene thien-mon-home-scene--dark"/);
  assert.match(home,/className="thien-mon-home-scene thien-mon-home-scene--light"/);
  assert.match(css,/\.site\.light \.thien-mon-approved-icon/);
  assert.match(css,/\.site\.light \[data-home\] \.thien-mon-home-scene--light/);
});
test('account scene stays on the left; form, login and recover flow remain in content panel',()=>{
  assert.match(auth,/account-dialog-art thien-mon-auth-art/);
  assert.match(auth,/account-dialog-content/);
  assert.ok(auth.indexOf('thien-mon-auth-art')<auth.indexOf('account-dialog-content'));
  for(const s of ['accountApi.register(email.trim(), password, username.trim())', 'accountApi.login(email.trim(), password, remember)', 'accountApi.requestPasswordReset(email.trim())', 'accountApi.logoutAll()', 'accountApi.googleStart(credential, purpose)', 'PasswordField label="Mật khẩu"']) assert.ok(auth.includes(s),s);
  assert.match(css,/grid-template-columns:minmax\(0,47%\) minmax\(0,53%\)/);
  assert.match(css,/@media \(max-width:860px\)/);
});
test('light and dark popup synchronize even though AuthDialog is a sibling of .site',()=>{
  assert.match(shell,/document\.documentElement\.dataset\.thiendoTheme = resolvedLight \? 'light' : 'dark'/);
  assert.match(auth,/thien-mon-branded/);
  assert.match(css,/html\[data-thiendo-theme="light"\] \.modal\.account-modal\.thien-mon-branded/);
  assert.match(css,/--account-text:#22382d/);
  assert.match(css,/--account-field:#fffbf2/);
  assert.match(css,/--tm-brand-title:#193a2d/);
  assert.match(css,/--tm-brand-title:#fff2cf/);
});
test('small screens, non-interactive scenery and reduced motion retain usability',()=>{
  assert.match(css,/pointer-events:none/);
  assert.match(css,/z-index:1/);
  assert.match(css,/@media \(max-width:680px\)/);
  assert.match(css,/@media \(max-width:385px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/transition:none!important/);
  assert.match(css,/@media print/);
  assert.doesNotMatch(css,/https?:\/\//);
});
test('guest login landing retains identity and delegates server-verified role routing',()=>{
  assert.match(login,/thien-mon-login-landing/);
  assert.match(login,/loginDestination/);
  assert.match(login,/router\.replace\(destination\)/);
  assert.match(layout,/import '\.\/thien-mon-scenery-v11164184\.css'/);
  assert.ok(layout.indexOf('thien-mon-scenery-v11164184.css')>layout.indexOf('thien-mon-brand-v11164183.css'));
});
test('scenery adds no API requests or 3D engine and preserves the 30 old SQL migrations',()=>{
  assert.doesNotMatch(css,/javascript:|@import|webgl|three\.js|animation-iteration-count:infinite/i);
  assert.doesNotMatch(css,/input\[|\.chart-palace|\.astrology-grid|\.payment-confirm/);
  assert.equal(fs.readdirSync(path.join(root,'infrastructure/db')).filter(f=>f.endsWith('.sql')).length,37);
});
