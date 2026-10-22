/** Wait for the built Next server AND its first-party API proxy. */
import { assertSafeE2ETarget } from '../infrastructure/scripts/e2e-guard.mjs';
import { localE2EFetch, localTestOrigin } from '../infrastructure/scripts/e2e-http.mjs';
assertSafeE2ETarget();
const base = localTestOrigin(process.env.NEXT_BASE_URL || 'http://127.0.0.1:3000');
for (let i = 0; i < 60; i++) {
  try {
    const [home, api] = await Promise.all([
      localE2EFetch(base, '/', { signal: AbortSignal.timeout(1500) }),
      localE2EFetch(base, '/api/health/ready', {signal: AbortSignal.timeout(1500)}),
    ]);
    if (home.ok && api.ok) process.exit(0);
  } catch { /* Server may still be starting. */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.error('Next.js + Nest first-party proxy not ready in startup retry budget');
process.exit(1);
