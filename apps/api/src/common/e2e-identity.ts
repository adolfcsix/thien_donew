/**
 * Only expose E2E backend identity when explicitly opted into an isolated,
 * local PostgreSQL *_test target. Never expose it in production.
 * No credentials or database URL are returned to HTTP callers.
 */
export function expectedDisposableDatabase(env: Record<string, string | undefined>): string | null {
  if (env.NODE_ENV === 'production' || env.E2E_LOCAL_DB_CONFIRM !== 'YES' || !env.DATABASE_URL) return null;
  let database: URL;
  try { database = new URL(env.DATABASE_URL); } catch { return null; }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) return null;
  let name: string;
  try { name = decodeURIComponent(database.pathname.slice(1)); } catch { return null; }
  if (!/^[A-Za-z0-9_]+_test$/.test(name)) return null;
  return name;
}
