'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file),'utf8');
const auth = read('apps/web/src/components/auth-provider.tsx');
const account = read('apps/web/src/components/account-settings.tsx');
const shell = read('apps/web/src/components/shell.tsx');
const rank = read('apps/web/src/components/account-rank.tsx');
const modalCss = read('apps/web/src/components/account-settings.css');
const birth = read('apps/web/src/app/birth-profiles/page.tsx');
const avatarApi = read('apps/api/src/modules/auth/profile.service.ts');

test('A25-001: avatar revision is passed from AuthProvider to both surfaces',()=>{
  assert.match(auth,/AuthDialog[^\n]*avatarRevision=\{avatarRevision\}/);
  assert.match(auth,/<AccountSettings[^>]*avatarRevision=\{avatarRevision\}/);
  assert.match(account,/src=\{`\/api\/auth\/avatar\?v=\$\{avatarRevision\}`\}/);
  assert.match(shell,/src=\{`\/api\/auth\/avatar\?v=\$\{avatarRevision\}`\}/);
  assert.doesNotMatch(account,/avatarKey|setAvatarKey/);
});

test('A25-002: uploading/removing an avatar uses canonical mutation receipt',()=>{
  assert.match(account,/accountApi\.uploadAvatar\(image\)/);
  assert.match(account,/\(\) => \(\{ hasAvatar: true \}\)/);
  assert.match(account,/accountApi\.removeAvatar\(\)/);
  assert.match(account,/\(\) => \(\{ hasAvatar: false \}\)/);
  assert.match(auth,/setAvatarRevision\(current => current \+ 1\)/);
  assert.match(avatarApi,/Cache-Control','private, no-store'/);
});

test('A25-003: profile and navigation recover when an avatar image breaks',()=>{
  assert.match(account,/onError=\{\(\) => setAvatarFailed\(true\)\}/);
  assert.match(account,/\[user\.id, user\.hasAvatar, avatarRevision\]/);
  assert.match(shell,/onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(shell,/\[userId,hasAvatar,avatarRevision\]/);
  assert.match(shell,/!hasAvatar \|\| failed/);
});

test('A25-004: clicking the personal rank opens the existing 18-medal inspector',()=>{
  assert.match(rank,/className="account-rank-medal-trigger" onClick=\{\(\) => setViewingMedal\(progress\.rank\.level\)\}/);
  assert.match(rank,/<MedalInspector level=\{viewingMedal\} onChoose=\{setViewingMedal\} onClose=/);
  assert.match(rank,/aria-label=\{`Xem chi tiết huy hiệu/);
  assert.match(rank,/setProgress\(null\)/);
  assert.match(modalCss,/\.account-rank-medal-trigger:focus-visible/);
});

test('A25-005: signed-in account stays compact; authentication keeps the branded scenery',()=>{
  assert.match(auth,/account-modal-signed-in/);
  assert.match(modalCss,/account-modal-signed-in \.account-dialog-art \{ display:none; \}/);
  assert.match(modalCss,/account-modal-signed-in\s*\{\s*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(auth,/thien-mon-auth-art/);
  assert.match(auth,/THIÊN ĐỒ · THIÊN MÔN/);
});

test('A25-006: obsolete internal version is not shown in the birth-profile hero',()=>{
  assert.doesNotMatch(birth,/HỒ SƠ DÙNG CHUNG \/ V11\.138/);
  assert.match(birth,/THIÊN ĐỒ \/ HỒ SƠ SINH/);
});
