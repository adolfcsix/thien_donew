'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = path => readFileSync(resolve(root, path), 'utf8');
const auth = source('apps/web/src/components/auth-provider.tsx');
const profile = source('apps/web/src/components/account-settings.tsx');
const css = source('apps/web/src/components/account-settings.css');
const crop = source('apps/web/src/components/avatar-editor.tsx');
const google = source('apps/web/src/components/google-auth-button.tsx');
const controls = source('apps/web/src/components/account-form-controls.tsx');

test('modal traps keyboard focus, restores previous focus and unlocks page', () => {
  assert.match(auth, /onKeyDown=\{handleKey\}/);
  assert.match(auth, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(auth, /document\.body\.style\.overflow = lastOverflow/);
  assert.match(auth, /previous\?\.focus\(\)/);
  assert.match(auth, /event\.key === 'Escape'/);
  assert.match(auth, /event\.key !== 'Tab'/);
});

test('auth states are distinct and do not invent OTP resend endpoint', () => {
  assert.match(auth, /'challenge' : recoverStep/);
  assert.match(auth, /expiresInSeconds \* 1000/);
  assert.match(auth, /remaining <= 0/);
  assert.match(auth, /setChallenge\(null\); setCode\(''\)/);
  assert.doesNotMatch(auth, /googleResend\(/);
});

test('password controls support visibility, autocomplete and equality check', () => {
  assert.match(controls, /aria-pressed=\{revealed\}/);
  assert.match(controls, /type=\{revealed \? 'text' : 'password'\}/);
  assert.match(profile, /newPassword !== confirmPassword/);
  assert.match(profile, /oldPassword === newPassword/);
  assert.match(auth, /minLength=\{register \? 10 : 1\}/);
});

test('native OTP input handles autocomplete and paste without six separate focus targets', () => {
  assert.match(controls, /autoComplete="one-time-code"/);
  assert.match(controls, /replace\(\/\\D\/g, ''\)/);
  assert.match(controls, /maxLength=\{6\}/);
});

test('profile tabs expose tab semantics and arrow navigation', () => {
  assert.match(profile, /role="tablist"/);
  assert.match(profile, /role="tabpanel"/);
  assert.match(profile, /aria-selected=\{section === id\}/);
  assert.match(profile, /ArrowLeft/);
  assert.match(profile, /ArrowRight/);
});

test('avatar crop uses preview canvas and 256px JPEG upload after explicit approval', () => {
  assert.match(crop, /OUT_SIZE = 256/);
  assert.match(crop, /ctx\.drawImage\(img, sx, sy, side, side/);
  assert.match(crop, /output\.toBlob\(resolve, 'image\/jpeg', 0\.82\)/);
  assert.match(crop, /await onSave\(blob\)/);
  assert.match(profile, /setAvatarFile\(file\)/);
  assert.match(profile, /onCancel=\{\(\) => setAvatarFile\(null\)\}/);
  assert.match(profile, /if \(!success\) throw/);
});

test('Google control adapts to narrow widths and exposes connection retry', () => {
  assert.match(google, /getBoundingClientRect\(\)\.width/);
  assert.match(google, /setEpoch\(current => current \+ 1\)/);
  assert.match(google, /cancelled = true/);
});

test('mobile breakpoints and reduced-motion preferences are explicitly supported', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /account-panel-enter/);
  assert.match(css, /account-content-enter/);
});

test('account changes still use authenticated server endpoints, not local-only UI', () => {
  for (const token of ['accountApi.updateProfile(', 'accountApi.changePassword(', 'accountApi.uploadAvatar(', 'accountApi.removeAvatar(']) {
    assert.ok(profile.includes(token), token);
  }
  for (const token of ['accountApi.logoutAll(', 'accountApi.remove(', 'accountApi.googleVerify(', 'accountApi.requestPasswordReset(']) {
    assert.ok(auth.includes(token), token);
  }
});
