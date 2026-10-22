'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), {readFileSync}=require('node:fs'), {join}=require('node:path');
const root=join(__dirname,'..');
const source=name=>readFileSync(join(root,name),'utf8');
const gate=source('apps/web/src/features/membership/admin-mfa-gate.tsx');
const mail=source('apps/web/src/features/community-hub/email-verification.tsx');
const scene=source('apps/web/src/features/western/mystic-scene.tsx');
const motion=source('apps/web/src/features/western/mystic-scene.module.css');
const viewport=source('apps/web/src/features/western/celestial-frame.module.css');
test('admin first enrollment distinguishes email, password and TOTP steps and never treats email as MFA',()=>{
 for(const copy of ['Bước 1 · Xác minh email','Bước 2 · Liên kết ứng dụng Authenticator','Bước 3 · Thêm khóa vào ứng dụng xác thực','Mã email và mã Authenticator là hai mã khác nhau'])assert.ok(gate.includes(copy),copy);
 assert.match(gate,/if\(emailVerified===true\)void enroll\(\)/);
 assert.match(gate,/disabled=\{busy\|\|emailVerified!==true\}/);
 assert.match(gate,/status\.configured&&\(status\.enabled\|\|!!key\)/);
 assert.match(gate,/\/api\/auth\/mfa\/.*\(key\?'confirm':'verify'\)/);
});
test('email verification informs MFA gate about initial status and verified event',()=>{
 assert.match(mail,/onStatus\?\.\(r\.verified\)/);
 assert.match(gate,/onStatus=\{setEmailVerified\}/);
 assert.match(gate,/onVerified=\{\(\)=>setEmailVerified\(true\)\}/);
});
test('MFA gate keeps backend enforcement and never inserts automatic bypass',()=>{
 for(const endpoint of ['mfa/setup','mfa/confirm','mfa/verify','mfa/status'])assert.match(source('apps/api/src/modules/auth/auth.controller.ts'),new RegExp(endpoint.replace('/','\\/')));
 const svc=source('apps/api/src/modules/auth/admin-mfa.service.ts');
 assert.match(svc,/email_verified_at/);assert.match(svc,/timingSafeEqual/);assert.match(svc,/verified_at>clock_timestamp\(\)-\(\$3::integer/);
});
test('natal chart fits viewport at 100%, reserving overflow for deliberate zoom',()=>{
 assert.match(viewport,/min\(100%, 76dvh, 760px\)/);
 assert.match(viewport,/\.viewport\[data-zoom="1"\][^\n]*overflow:hidden/);
 assert.match(source('apps/web/src/features/western/celestial-frame.tsx'),/setZoom\(1\)/);
});
test('three branches get their own decorative 3D scene without changing reading engines',()=>{
 for(const [path,variant] of [['apps/web/src/app/western-astrology/page.tsx','astrology'],['apps/web/src/app/numerology/page.tsx','numerology'],['apps/web/src/app/tarot/page.tsx','tarot']])assert.ok(source(path).includes(`variant="${variant}"`),path);
 for(const decoration of ['orbitOuter','orbitInner','constellation','mysticEye','leftHand','rightHand','numberPolyhedron','tarotFan'])assert.ok(scene.includes('css.'+decoration),decoration);
});
test('CSS 3D motion is decoration-only, reduced-motion aware and paused off viewport',()=>{
 for(const key of ['rotateX(','rotateY(','translateZ(','prefers-reduced-motion','data-paused'])assert.ok(motion.includes(key),key);
 assert.match(scene,/observeVisibleMotion\(ref\.current\)/);
 assert.match(scene,/aria-hidden="true"/);
 assert.match(source('apps/web/src/lib/visible-motion.ts'),/IntersectionObserver/);
});
