'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
const mfa=read('apps/api/src/modules/auth/admin-mfa.service.ts');
const sql=read('infrastructure/db/035_admin_trusted_devices.sql');
const controller=read('apps/api/src/modules/auth/auth.controller.ts');
const profile=read('apps/web/src/features/admin-console/profile.tsx');
const chat=read('apps/web/src/features/community-hub/messages.tsx');
const css=read('apps/web/src/app/forum-chat-polish-a62.css');
test('A62 035 is additive, stores a SHA-256 hash instead of a raw trust token and records an assurance method',()=>{
 assert.match(sql,/ALTER TABLE admin_session_assurance\s+ADD COLUMN method TEXT NOT NULL DEFAULT 'totp'/);
 assert.match(sql,/CHECK \(method IN \('totp','trusted_device'\)\)/);
 assert.match(sql,/token_hash CHAR\(64\) PRIMARY KEY/);
 assert.match(sql,/user_id UUID NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
});
test('A62 trusted browser requires independent live session, membership and enrolled MFA; cannot assert TOTP',()=>{
 assert.match(mfa,/this\.membership\(req\)/);
 assert.match(mfa,/JOIN admin_mfa_credentials m ON m\.user_id=d\.user_id AND m\.enabled_at IS NOT NULL/);
 assert.match(mfa,/JOIN sessions s ON s\.user_id=d\.user_id AND s\.token_hash=\$3 AND s\.expires_at>clock_timestamp\(\)/);
 assert.match(mfa,/d\.expires_at>clock_timestamp\(\)/);
 assert.match(mfa,/VALUES\(\$1,\$2,NOW\(\),'trusted_device'\)/);
 assert.match(mfa,/AND \(\$4::boolean=false OR s\.method='totp'\)/);
 assert.match(mfa,/AND a\.method='totp' AND a\.verified_at>clock_timestamp\(\)-INTERVAL '10 minutes'/);
});
test('A62 remember-browser opt-in uses a 256-bit opaque random value and secure cookie attributes',()=>{
 assert.match(mfa,/trustDevice===true/);
 assert.match(mfa,/randomBytes\(32\)\.toString\('hex'\)/);
 assert.match(mfa,/\[digest\(raw\),userId,digest\(session\)/);
 assert.match(mfa,/res\.cookie\(TRUST_COOKIE,raw,\{httpOnly:true,sameSite:'strict',secure:/);
 assert.match(mfa,/maxAge:TRUST_DAYS\*86400000,path:'\/api\/auth'/);
 assert.match(mfa,/const TRUST_DAYS=30/);
});
test('A62 auth API exposes restore and explicit revoke but never adds signup Admin promotion',()=>{
 assert.match(controller,/@Post\('mfa\/trusted-session'\)/);
 assert.match(controller,/@Post\('mfa\/trusted-devices\/revoke'\)/);
 assert.doesNotMatch(controller,/@Post\('(?:register|signup)'\)[^\n]*\badmin=true/);
});
test('A62 role/password revocations invalidate trusted tokens',()=>{
 for(const p of [
  'apps/api/src/modules/auth/password-recovery.service.ts',
  'apps/api/src/modules/auth/auth.service.ts',
  'apps/api/src/modules/admin-console/admin-console.service.ts',
  'apps/api/src/modules/billing/admin.service.ts']){
  assert.match(read(p),/DELETE FROM admin_trusted_devices WHERE user_id=\$1/,p);
 }
 assert.match(profile,/\/api\/auth\/mfa\/trusted-devices\/revoke/);
 assert.match(profile,/if\(!mfa\.stepUp\)/);
});
test('A62 mobile chat opens thread view and provides accessible return navigation',()=>{
 assert.match(chat,/data-thread-open=\{Boolean\(selected\)\}/);
 assert.match(chat,/aria-label="Về danh sách hội thoại"/);
 assert.match(chat,/searchParams\.delete\('conversation'\)/);
 assert.match(css,/\.hub-chat\[data-thread-open=true\]>aside\{display:none\}/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test('A62 forum badges remain inline without a capsule and chat respects theme and reduced motion',()=>{
 assert.match(css,/\.hub-member-identity \.hub-badges\{display:inline-flex/);
 assert.match(css,/\.hub-member-identity \.hub-role\{border:0!important;border-radius:0;background:transparent!important/);
 assert.match(css,/--chat-paper:var\(--td-reading-surface,var\(--panel\)\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('A62 3D scenes are decorations, have no effect on calculation and pause offscreen',()=>{
 const scene=read('apps/web/src/features/western/mystic-scene.tsx');
 const style=read('apps/web/src/features/western/mystic-scene.module.css');
 assert.match(scene,/observeVisibleMotion/);
 assert.match(scene,/aria-hidden="true"/);
 assert.match(scene,/data-paused="true"/);
 for(const bit of ['planetaryTrack','arcaneSeal','numberPolyhedron','mysticEye'])assert.ok(scene.includes(bit));
 assert.match(style, /@media\(prefers-reduced-motion:reduce\)/);
});
