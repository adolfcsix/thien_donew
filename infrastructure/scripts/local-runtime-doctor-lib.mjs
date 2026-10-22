/** Pure loopback-only probe policy. Never inspect or print user secrets. */
export function localOrigin(raw) {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
export function localPostgresTarget(raw) {
  try {
    const url = new URL(raw);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return null;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
    const port = Number(url.port || 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { host: url.hostname.replace(/^\[|\]$/g, ''), port };
  } catch { return null; }
}
export function classifyHttpHealth(apiHealth, dbReady, webHome, proxiedReady) {
  if (!apiHealth || !dbReady) return 'API_OR_DATABASE_NOT_READY';
  if (!webHome || !proxiedReady) return 'WEB_OR_PROXY_NOT_READY';
  return 'LOCAL_SMOKE_PASS';
}

/** Match the API's migration-014 readiness contract, not the historic V8 schema. */
export function isReadyResponse(data) {
  return data?.ok === true && data.database === 'postgresql' && data.schema === 'v11.142.0';
}
