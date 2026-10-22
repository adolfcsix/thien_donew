'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>readFileSync(path.join(root,name),'utf8');
const settings=read('apps/web/src/components/account-settings.tsx');
const security=read('apps/web/src/components/account-security-extras.tsx');
const css=read('apps/web/src/components/account-settings.css');
const crop=read('apps/web/src/components/avatar-editor.tsx');
const backend=read('apps/api/src/modules/auth/profile.service.ts');
const api=read('apps/web/src/lib/api.ts');

test('A04-001: optimistic profile display name is canonical response from server',()=>{
 assert.match(backend,/replace\(\/\\s\+\/g,' '\)/);
 assert.match(backend,/return \{updated:true,displayName:name\}/);
 assert.match(settings,/receipt => \{/);
 assert.match(settings,/return \{ displayName: receipt\.displayName \};/);
 assert.match(settings,/setName\(receipt\.displayName\)/);
 assert.match(settings,/lastSavedName\.current = receipt\.displayName/);
 assert.doesNotMatch(settings,/\{ displayName: name\.trim\(\) \}/);
});
test('A04-002: profile form uses synchronous double-action guard and committed response',()=>{
 assert.match(settings,/const workingRef = useRef\(false\)/);
 assert.match(settings,/if \(workingRef\.current\) return false/);
 assert.match(settings,/workingRef\.current = true/);
 assert.match(settings,/const receipt = await action\(\)/);
 assert.match(settings,/if \(patch\) onProfileApplied\(patch\(receipt\), user\.id\)/);
 assert.match(settings,/workingRef\.current = false/);
});
test('A04-003: security mutations keep committed success distinct from refresh errors',()=>{
 assert.match(security,/const success=await action\(\)/);
 assert.match(security,/try\{await reload\(\);if\(mounted\.current\)setNotice\(success\);\}/);
 assert.match(security,/catch\{if\(mounted\.current\)setNotice\(`\$\{success\} Thông tin đã cập nhật/);
 assert.match(security,/if\(busyRef\.current \|\| !mounted\.current\)return/);
 assert.match(security,/finally\{busyRef\.current=false;if\(mounted\.current\)\{setWorking\(false\);onBusyChange\?\.\(false\);\}\}/);
 assert.match(security,/if\(!result\.revoked\)return/);
});
test('A04-004: oversized decoded images cannot be drawn to avatar canvas after slider changes',()=>{
 assert.match(crop,/img\.naturalWidth > MAX_IMAGE_DIMENSION \|\| img\.naturalHeight > MAX_IMAGE_DIMENSION/);
 assert.match(crop,/img\.naturalWidth \* img\.naturalHeight > MAX_IMAGE_PIXELS\) return false/);
 assert.match(crop,/if \(!ready \|\| !image\.current\?\.naturalWidth/);
 assert.match(crop,/\!event\.isPrimary/);
});
test('A04-005: touchscreen vertical scrolling remains available above avatar editor',()=>{
 assert.match(css,/\.avatar-editor-stage \{[^}]*touch-action:pan-y;/);
 assert.match(crop,/vuốt dọc để cuộn trang/);
 assert.match(css,/\.modal\.account-modal\.thien-mon-branded\.account-modal-signed-in[^}]*overflow-y: auto/s);
});
test('A04-006: light account modal selectors apply to a sibling of .site',()=>{
 assert.match(css,/html\[data-thiendo-theme="light"\] \.modal\.account-modal/);
 assert.doesNotMatch(css,/\.site\.light \.modal\.account-modal/);
 assert.match(css,/html\[data-thiendo-theme="light"\] \.account-inline-warning/);
 assert.match(css,/html\[data-thiendo-theme="light"\] \.account-connection-status\.connected/);
});
test('A04-007: account upload protocol remains validated, while session revocation respects server result',()=>{
 assert.match(api,/validateAccountResponse\('\/api\/auth\/avatar', data\)/);
 assert.match(security,/const result=await api<\{revoked:boolean;currentSession:boolean\}>\('\/api\/auth\/sessions\/revoke'/);
});
