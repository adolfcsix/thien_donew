'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const source=relative=>readFileSync(resolve(__dirname,'..',relative),'utf8');
const auth=source('apps/web/src/components/auth-provider.tsx');
const profile=source('apps/web/src/components/account-settings.tsx');
const avatar=source('apps/web/src/components/avatar-editor.tsx');
const google=source('apps/web/src/components/google-auth-button.tsx');
const shell=source('apps/web/src/components/shell.tsx');

test('confirmed logout clears local identity without needing a successful second network request',()=>{
  assert.match(auth,/const clearUser = useCallback\(\(\) => \{/);
  assert.match(auth,/generation\.current\+\+;\s*setUser\(null\)/);
  const logout=auth.match(/async function logout\(all = false\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(logout); assert.match(logout,/await accountApi\.logout/); assert.match(logout,/clearUser\(\); close\(\)/);
  assert.doesNotMatch(logout,/await reload\(\)/);
});
test('successful account deletion, including Google-only flow, clears identity',()=>{
  assert.match(auth,/if \('deleted' in result\) clearUser\(\)/);
  assert.match(auth,/await accountApi\.remove\(deletePassword\)/);
  assert.match(auth,/setDeletePassword\(''\); clearUser\(\); close\(\)/);
});
test('intermittent /me outages do not force a previously verified user to appear logged out',()=>{
  const reload=auth.match(/const reload = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1];
  assert.ok(reload); assert.match(reload,/setUser\(result\.user\)/);
  const failure=reload.match(/\} catch \{([\s\S]*?)\} finally/)?.[1];
  assert.ok(failure); assert.doesNotMatch(failure,/setUser\(null\)/);
});
test('navbar avatar source version advances after profile refresh',()=>{
  assert.match(auth,/avatarRevision: number/);
  assert.match(auth,/setAvatarRevision\(current => current \+ 1\)/);
  assert.match(shell,/const \{ user, open, avatarRevision \} = useAuth\(\)/);
  assert.match(shell,/\/api\/auth\/avatar\?v=\$\{avatarRevision\}/);
});
test('file picker is a native focusable button, not an inaccessible label wrapping a hidden input',()=>{
  assert.match(profile,/useRef<HTMLInputElement>\(null\)/);
  assert.match(profile,/onClick=\{\(\) => avatarInputRef\.current\?\.click\(\)\}/);
  assert.match(profile,/aria-label="Tải ảnh đại diện mới"/);
  assert.doesNotMatch(profile,/<label className=\{`btn secondary account-file-label/);
});
test('avatar preview must decode before save and explicitly reports corrupt or oversized images',()=>{
  assert.match(avatar,/const \[ready, setReady\] = useState\(false\)/);
  assert.match(avatar,/if \(!ready \|\| !image\.current\?\.naturalWidth/);
  assert.match(avatar,/MAX_IMAGE_PIXELS = 36_000_000/);
  assert.match(avatar,/onError=\{\(\) => \{ setReady\(false\); setError/);
  assert.match(avatar,/disabled=\{!ready \|\| busy \|\| disabled\}/);
  assert.match(avatar,/ctx\.fillStyle = '#fff'/);
});
test('stale Google nonce automatically renews and reinitializes on tab visibility changes',()=>{
  assert.match(google,/NONCE_REFRESH_MS = 4 \* 60 \* 1000/);
  assert.match(google,/document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(google,/document\.removeEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(google,/renewalTimer = window\.setTimeout\(renew/);
  assert.match(google,/window\.clearTimeout\(renewalTimer\)/);
});
