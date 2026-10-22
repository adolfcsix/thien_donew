'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const source = rel => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const auth = source('apps/web/src/components/auth-provider.tsx');
const settings = source('apps/web/src/components/account-settings.tsx');
const api = source('apps/web/src/lib/api.ts');

test('cross-tab event bus broadcasts only event types, not user identity or tokens', () => {
  assert.match(auth, /const AUTH_CHANNEL = 'thiendo\.auth-session\.v1'/);
  assert.match(auth, /type AuthEvent = \{ type: 'signed-in' \| 'signed-out' \}/);
  assert.match(auth, /postMessage\(\{ type: 'signed-out' \} satisfies AuthEvent\)/);
  assert.match(auth, /postMessage\(\{ type: 'signed-in' \} satisfies AuthEvent\)/);
  assert.doesNotMatch(auth, /postMessage\(\{[^}]*user:/);
});
test('another tab signing out invalidates local session and closes account dialog', () => {
  assert.match(auth, /channel\.onmessage = \(message: MessageEvent<AuthEvent>\) => \{/);
  assert.match(auth, /message\.data\?\.type === 'signed-out'\) \{\s*dropLocalIdentity\(\);\s*setVisible\(false\)/);
  assert.match(auth, /else if \(message\.data\?\.type === 'signed-in'\) \{\s*void reload\(\)/);
  assert.match(auth, /channel\.close\(\)/);
  assert.match(auth, /typeof BroadcastChannel === 'undefined'/);
});
test('successful login POST preserves the authenticated user when /me is unreachable', () => {
  const complete = auth.split('const completeLogin = useCallback(async')[1]?.split('}, [router,pathname]')[0];
  assert.ok(complete);
  assert.match(complete, /setUser\(current => current\?\.id === result\.user\.id/);
  assert.match(complete, /void accountApi\.me\(\)\.then\(profile =>/);
  assert.match(complete, /if \(generation\.current === id\) setUser\(profile\.user\)/);
  assert.match(complete, /\.catch\(\(\) => \{/);
  assert.doesNotMatch(complete, /setUser\(null\)/);
  assert.match(auth, /const result = register \? await accountApi\.register/);
  assert.match(auth, /await completeLogin\(result\);/);
});
test('Google verifier distinguishes confirmed account deletion from successful login', () => {
  assert.match(auth, /const result = await accountApi\.googleVerify/);
  assert.match(auth, /if \('deleted' in result\) clearUser\(\);/);
  assert.match(auth, /else await completeLogin\(result\)/);
});
test('password reset has expiration clock, safe resend delay and a new challenge per resend', () => {
  assert.match(auth, /resetIssuedAt \+ 5 \* 60_000 - Date\.now\(\)/);
  assert.match(auth, /resetIssuedAt \+ 65_000 - Date\.now\(\)/);
  assert.match(auth, /async function resendReset\(\)/);
  assert.match(auth, /setResetId\(started\.challengeId\);\s*setResetIssuedAt\(Date\.now\(\)\);\s*setCode\(''\)/);
  assert.match(auth, /resetRemaining <= 0 \|\| resetPasswordValue\.length < 10/);
  assert.match(auth, /Đổi email/);
  assert.match(auth, /Gửi mã mới/);
  assert.doesNotMatch(api, /resendPasswordReset/);
});
test('successful profile mutation is not misreported as failed due to subsequent GET outage', () => {
  const perform = settings.match(/async function perform<T>\(action: \(\) => Promise<T>, success: string, patch\?: \(receipt: T\) => Partial<AuthUser>\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(perform);
  assert.match(perform, /await action\(\)/);
  assert.match(perform, /if \(patch\) onProfileApplied\(patch\(receipt\), user\.id\)/);
  assert.match(perform, /try \{\s*await reload\(\);\s*if \(owner\.signal\.aborted\) return false;\s*setNotice\(success\);\s*\} catch \{\s*if \(owner\.signal\.aborted\) return false;/);
  assert.match(perform, /setNotice\(`\$\{success\} Dữ liệu đã lưu/);
  assert.match(perform, /return true/);
});
test('locally confirmed profile changes reflect immediately in header and other tabs', () => {
  assert.match(auth, /const applyLocalProfile = useCallback\(\(patch: Partial<AuthUser>, accountId: AuthUser\['id'\]\) => \{/);
  assert.match(auth, /setUser\(current => current\?\.id === accountId \? \{ \.\.\.current, \.\.\.patch \} : current\)/);
  assert.match(settings, /receipt => \{/);
  assert.match(settings, /return \{ displayName: receipt\.displayName \};/);
  assert.match(settings, /lastSavedName\.current = receipt\.displayName/);
  assert.match(settings, /\{ hasAvatar: true \}/);
  assert.match(settings, /\{ hasAvatar: false \}/);
});
