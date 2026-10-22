/**
 * Real Next.js HTTP smoke. Run only after `npm run build` and `next start`.
 * Exercises public pages and /api -> Nest rewrite, not merely offline HTML.
 * Browser animations/responsiveness are NOT proved by these HTTP checks.
 */
import assert from 'node:assert/strict';
import { assertSafeE2ETarget } from '../infrastructure/scripts/e2e-guard.mjs';
import { localE2EFetch, localTestOrigin } from '../infrastructure/scripts/e2e-http.mjs';
import { assertMatchedApiInstance } from '../infrastructure/scripts/e2e-db-policy.mjs';
// Live, read-only PostgreSQL query. Importing this module fails closed on an
// unexpected/nonempty target. The proxy must return proof from THIS instance.
import { verifiedDatabaseIdentity } from '../infrastructure/scripts/check-e2e-database.mjs';
import { getReadOnlyRouteManifest } from '../infrastructure/scripts/read-only-route-manifest.mjs';
const expectedTarget = assertSafeE2ETarget();
const base = localTestOrigin(process.env.NEXT_BASE_URL || 'http://127.0.0.1:3000');
async function get(path, accept = 'text/html') {
  // The transport owns the deadline until the response body has been consumed;
  // clearing an AbortController after headers would not bound SSR streaming.
  return localE2EFetch(base, path, {headers: { accept }, timeoutMs: 8000});
}
// This checks real Next SSR responses, including each Academy dynamic route,
// rather than trusting the Academy HTML preview to represent the production app.
const readOnlyRoutes = getReadOnlyRouteManifest();
for (const route of readOnlyRoutes) {
  const response = await get(route.path);
  assert.equal(response.status, 200, `Next route ${route.path} returned HTTP ${response.status}`);
  assert.match(response.headers.get('content-type') || '', /text\/html/, `Missing SSR HTML for ${route.path}`);
  const html = await response.text();
  assert.ok(html.includes('<html') && html.includes(route.marker),
    `Missing expected content on real Next route ${route.path}: ${route.marker}`);
  console.log(`PASS Next route ${route.path}`);
}
console.log(`PASS ${readOnlyRoutes.length} read-only Next routes incl. all Academy lessons`);
// The E2E guard checks the test-runner's DB, but that alone cannot prove
// that the Next -> Nest upstream uses the SAME database. Verify identity now,
// before any account/chart mutations can occur.
const identityResponse = await get('/api/health/e2e', 'application/json');
assert.equal(identityResponse.status, 200, 'API is not opted into disposable E2E mode');
assert.match(identityResponse.headers.get('content-type') || '', /application\/json/);
const identity = await identityResponse.json();
assert.equal(verifiedDatabaseIdentity.database, expectedTarget.databaseName,
  'Direct PostgreSQL connection did not use the expected disposable database');
// Do NOT compare identity.fingerprint to itself. Two local PostgreSQL servers
// can have the same database name; compare independently queried fingerprints.
assertMatchedApiInstance(verifiedDatabaseIdentity, identity);
console.log(`PASS Next -> Nest -> PostgreSQL instance verified: ${identity.database}`);
for (const endpoint of ['/api/health/ready', '/api/auth/me']) {
  const response = await get(endpoint, 'application/json');
  assert.equal(response.status, 200, `Next proxy ${endpoint} returned HTTP ${response.status}`);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  const payload = await response.json();
  assert.equal(typeof payload, 'object');
  console.log(`PASS Next -> Nest proxy ${endpoint}`);
}
// This smoke never creates accounts or charts. The guarded HTTP E2E suite
// repeats the exact match before it issues its first POST/DELETE.
console.log('PASS read-only Next.js HTTP/proxy smoke, including independent live PostgreSQL fingerprint match');
