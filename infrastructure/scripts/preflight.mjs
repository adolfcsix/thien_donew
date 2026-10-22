/**
 * Dependency-free start-up configuration validation for Next/Nest.
 * Keep the predicates aligned with apps/api/src/common/runtime-config.ts
 * and apps/web/next.config.ts. This is not a DB connection or build check.
 * Do not print any value of DATABASE_URL, passwords, or environment variables.
 */
const env = process.env;
const production = env.NODE_ENV === 'production';
const issues = [];
function plainOrigin(name, raw, required = false) {
  if (!raw) { if (required) issues.push(`${name} is required`); return; }
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash ||
        parsed.origin !== raw.replace(/\/$/, '')) {
      issues.push(`${name} must be a plain HTTP(S) origin`);
    } else if (production && name === 'WEB_ORIGIN' && parsed.protocol !== 'https:') {
      issues.push('WEB_ORIGIN must use HTTPS in production');
    }
  } catch { issues.push(`${name} must be a valid HTTP(S) origin`); }
}
plainOrigin('WEB_ORIGIN', env.WEB_ORIGIN, production);
plainOrigin('API_INTERNAL_URL', env.API_INTERNAL_URL);
if (production && !env.DATABASE_URL) issues.push('DATABASE_URL is required in production');
if (env.DATABASE_URL) {
  try {
    const database = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname) {
      issues.push('DATABASE_URL must be a PostgreSQL URL');
    }
  } catch { issues.push('DATABASE_URL must be a PostgreSQL URL'); }
}
if (production && env.COOKIE_SECURE !== 'true') issues.push('COOKIE_SECURE must be true in production');
const port = Number(env.API_PORT || '8080');
if (!Number.isInteger(port) || port < 1 || port > 65535) issues.push('API_PORT must be an integer between 1 and 65535');
const host = env.API_HOST || '127.0.0.1';
if (!['0.0.0.0', '127.0.0.1', '::1', 'localhost'].includes(host))
  issues.push('API_HOST must be 0.0.0.0, 127.0.0.1, ::1 or localhost');
if (issues.length) {
  for (const issue of issues) console.error(`PRE-FLIGHT FAILED: ${issue}`);
  process.exitCode = 1;
} else {
  console.log('Preflight PASS: config syntax and runtime constraints agree; PostgreSQL and build NOT checked.');
}
