/** V10.5: first-party E2E HTTP transport. Never follow an upstream redirect.
 * Critical for POST/DELETE with credentials: a server on localhost could redirect
 * to a different origin, which must not receive test payloads or cookies.
 */
const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function localTestOrigin(raw) {
  let url;
  try { url = new URL(raw); }
  catch { throw new Error('E2E HTTP base must be a local origin'); }
  if (url.protocol !== 'http:' || !hosts.has(url.hostname) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin !== raw.replace(/\/$/, '')) {
    throw new Error('E2E HTTP base must be a plain local HTTP origin');
  }
  return url.origin;
}

export function localTestPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
      path.includes('\\') || /[\x00-\x1f]/.test(path)) {
    throw new Error('E2E HTTP path must be a relative local path');
  }
  const url = new URL(path, 'http://localhost');
  if (url.origin !== 'http://localhost' || url.pathname !== path.split(/[?#]/)[0] || url.search || url.hash) {
    throw new Error('E2E HTTP path must have no query, fragment or traversal');
  }
  return path;
}

export async function localE2EFetch(base, path, init = {}) {
  const origin = localTestOrigin(base);
  localTestPath(path);
  // All E2E network calls are bounded; a stuck API cannot hang CI indefinitely.
  const { timeoutMs = 12000, ...options } = init;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 60000) {
    throw new Error('E2E HTTP timeoutMs must be 50..60000');
  }
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  // Host redirects are never followed, even if fetch's default is 'follow'.
  const response = await fetch(`${origin}${path}`, {...options, signal, redirect:'manual'});
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`E2E blocked unexpected HTTP redirect (${response.status}) from ${path}`);
  }
  return response;
}
