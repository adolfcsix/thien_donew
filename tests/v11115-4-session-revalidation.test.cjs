'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const source = name => readFileSync(resolve(__dirname, '..', name), 'utf8');
const auth = source('apps/web/src/components/auth-provider.tsx');
const settings = source('apps/web/src/components/account-settings.tsx');
const google = source('apps/web/src/components/google-auth-button.tsx');

// Execute the *actual callback body* with an API stub; assert behavior, not only keywords.
function makeQuietCheck({ me, state = { id: 'existing-user' }, generation = { current: 0 } }) {
  const body = auth.match(/const quietlyRevalidateSession = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1];
  assert.ok(body, 'Quiet server check must exist');
  let avatarUpdates = 0;
  let localUser = state;
  let loading = true;
  const callback = Function('generation','accountApi','setUser','setAvatarRevision','setLoading',
    `return async function () {${body}\n}`)(generation, { me }, next => { localUser = next; }, fn => { avatarUpdates = fn(avatarUpdates); }, value => { loading = value; });
  return { callback, currentUser: () => localUser, avatarUpdates: () => avatarUpdates, loading: () => loading, generation };
}

test('a confirmed expired/revoked server session clears a stale local user', async () => {
  const check = makeQuietCheck({me: async () => ({user: null})});
  await check.callback();
  assert.equal(check.currentUser(), null);
  assert.equal(check.avatarUpdates(), 1);
  assert.equal(check.loading(), false, 'winning check must settle spinner');
});

test('a temporary network outage does not falsely log a user out', async () => {
  const original = {id: 'existing-user'};
  const check = makeQuietCheck({state: original, me: async () => { throw new Error('offline'); }});
  await check.callback();
  assert.equal(check.currentUser(), original);
  assert.equal(check.avatarUpdates(), 0);
  assert.equal(check.loading(), false, 'even a network failure must settle superseded startup spinner');
});

test('a superseded server response cannot replace a newer login/logout result', async () => {
  let deliver;
  const check = makeQuietCheck({me: () => new Promise(resolve => { deliver = resolve; })});
  const work = check.callback();
  check.generation.current++; // a newer login/logout invalidates previous /me request
  deliver({user: null});
  await work;
  assert.deepEqual(check.currentUser(), {id: 'existing-user'});
  assert.equal(check.avatarUpdates(), 0);
  assert.equal(check.loading(), true, 'stale work must not settle a newer active request');
});

test('focus/online/visibility events revalidate without polling, and listeners are removed', () => {
  assert.match(auth, /window\.addEventListener\('focus', checkWhenActive\)/);
  assert.match(auth, /window\.addEventListener\('online', checkWhenActive\)/);
  assert.match(auth, /document\.addEventListener\('visibilitychange', checkWhenActive\)/);
  for (const event of ['focus', 'online']) assert.match(auth, new RegExp(`window\\.removeEventListener\\('${event}', checkWhenActive\\)`));
  assert.match(auth, /document\.removeEventListener\('visibilitychange', checkWhenActive\)/);
  assert.match(auth, /event\?\.type !== 'online' && now - lastSessionCheck\.current < 30_000/);
  assert.match(auth, /if \(document\.visibilityState !== 'visible'\) return/);
  const callback = auth.match(/const quietlyRevalidateSession = useCallback[\s\S]*?\}, \[\]\);/)?.[0] || '';
  assert.doesNotMatch(callback, /setLoading\(true\)/, 'background revalidation must not flash a spinner');
});

test('remote display-name updates respect unsaved local edits', () => {
  assert.match(settings, /const lastSavedName = useRef\(user\.displayName \|\| ''\)/);
  assert.match(settings, /setName\(current => current === lastSavedName\.current \? serverName : current\)/);
  assert.match(settings, /lastSavedName\.current = serverName/);
});

test('Google callback ignores disabled/double-submit and releases its gate', () => {
  assert.match(google, /disabledRef\.current = disabled/);
  assert.match(google, /disabledRef\.current \|\| inFlight\.current/);
  assert.match(google, /inFlight\.current = true/);
  assert.match(google, /inFlight\.current = false/);
  assert.doesNotMatch(google, /postMessage\([^)]*credential/);
});
