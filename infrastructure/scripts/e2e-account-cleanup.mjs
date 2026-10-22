/** Attempts to remove BOTH disposable E2E accounts, even when their original
 * cookies are expired, revoked by logout, or rotated by a later login.
 * This must only be used after the E2E dedicated-DB guard has passed.
 * All cleanup failures are reported: never silently swallow leftover test data.
 */
export async function cleanupDisposableTestAccounts(request, accounts) {
  if (typeof request !== 'function' || !Array.isArray(accounts)) throw new TypeError('Invalid E2E cleanup input');
  const failures = [];
  for (const account of accounts) {
    if (!account?.email || !account.password) continue;
    try {
      let cookie = account.cookie;
      let done = false;
      if (cookie) {
        const deleted = await request('/api/auth/account', {
          method: 'DELETE', cookie, body: { password: account.password },
        });
        done = deleted.status === 200 && deleted.json?.deleted === true;
      }
      if (!done) {
        const login = await request('/api/auth/login', {
          method: 'POST', body: { email: account.email, password: account.password },
        });
        if (login.status === 401) {
          // The account might not have been created before a failed test.
          if (!account.registered) continue;
          throw new Error('Registered test account cannot be reauthenticated');
        }
        if (login.status !== 200 || !/^thiendo_session=[a-f0-9]{64}$/i.test(login.cookie || '')) {
          throw new Error(`E2E cleanup login failed: HTTP ${login.status}`);
        }
        cookie = login.cookie;
        const deleted = await request('/api/auth/account', {
          method: 'DELETE', cookie, body: { password: account.password },
        });
        if (deleted.status !== 200 || deleted.json?.deleted !== true) {
          throw new Error(`E2E cleanup account deletion failed: HTTP ${deleted.status}`);
        }
      }
    } catch (error) {
      failures.push(`${account.email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) throw new AggregateError(failures.map(msg => new Error(msg)),
    `E2E cleanup failed for ${failures.length} disposable account(s); database must be reset before next run`);
}
