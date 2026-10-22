/**
 * Mandatory safety guard for HTTP E2E tests that create/delete accounts.
 * This DOES NOT make a local database safe for testing if it contains real data:
 * use a fresh disposable <name>_test database with no user records.
 */
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertSafeE2ETarget(env = process.env) {
  if (env.NODE_ENV === 'production') throw new Error('Destructive E2E prohibited with NODE_ENV=production');
  if (env.E2E_LOCAL_DB_CONFIRM !== 'YES') throw new Error('Set E2E_LOCAL_DB_CONFIRM=YES for disposable local test database');
  if (!env.DATABASE_URL) throw new Error('E2E requires explicit DATABASE_URL to a dedicated local *_test database');
  let db;
  try { db = new URL(env.DATABASE_URL); }
  catch { throw new Error('E2E DATABASE_URL is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || !localHosts.has(db.hostname)) {
    throw new Error('E2E database must be a local PostgreSQL URL');
  }
  // Reject libpq/driver URL options and fragments: connection options must not override the checked host.
  // Disposable E2E is deliberately stricter than a general PostgreSQL connection.
  if (db.search || db.hash) throw new Error('E2E DATABASE_URL must not contain query parameters or fragments');
  const databaseName = decodeURIComponent(db.pathname.slice(1));
  if (!/^[A-Za-z0-9_]+_test$/.test(databaseName)) {
    throw new Error('E2E database name must end with _test (e.g. thiendo_test); never use personal or production data');
  }
  for (const key of ['API_BASE_URL', 'NEXT_BASE_URL', 'WEB_ORIGIN', 'API_INTERNAL_URL']) {
    if (!env[key]) continue;
    let target;
    try { target = new URL(env[key]); }
    catch { throw new Error(`${key} must be a plain local HTTP origin`); }
    if (target.protocol !== 'http:' || !localHosts.has(target.hostname) ||
        target.username || target.password || target.search || target.hash ||
        target.pathname !== '/' || target.origin !== env[key].replace(/\/$/, '')) {
      throw new Error(`${key} must be a plain local HTTP origin`);
    }
  }
  // Prevent Next's server rewrite from reaching a different (possibly real) API.
  const apiPort = Number(env.API_PORT || 8080);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) throw new Error('E2E requires a valid API_PORT');
  if (env.API_INTERNAL_URL) {
    const upstream = new URL(env.API_INTERNAL_URL);
    if (Number(upstream.port || 80) !== apiPort) {
      throw new Error('API_INTERNAL_URL port must match the local API_PORT during E2E');
    }
  }
  return { databaseName, databaseHost: db.hostname };
}
