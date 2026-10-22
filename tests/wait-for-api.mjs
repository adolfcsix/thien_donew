import { localE2EFetch, localTestOrigin } from '../infrastructure/scripts/e2e-http.mjs';
const url = localTestOrigin(process.env.API_BASE_URL ?? 'http://127.0.0.1:8080');
for (let i = 0; i < 60; i++) {
  try {const response = await localE2EFetch(url, '/api/health/ready', {signal: AbortSignal.timeout(1800)});if (response.ok) process.exit(0);} catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.error('API/PostgreSQL not ready within startup retry budget'); process.exit(1);
