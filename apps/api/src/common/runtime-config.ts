/** Strict runtime configuration. Invoked before Nest creates providers or binds a port. */
export type RuntimeEnvironment = Record<string, string | undefined>;

function plainOrigin(label: string, raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error(`${label} must be a valid HTTP(S) origin`); }
  const normalized = raw.replace(/\/$/, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin !== normalized) {
    throw new Error(`${label} must be a plain HTTP(S) origin`);
  }
  return url.origin;
}

export function runtimeConfig(env: RuntimeEnvironment) {
  const production = env.NODE_ENV === 'production';
  if (production && !env.DATABASE_URL) throw new Error('Production requires DATABASE_URL');
  if (production && env.COOKIE_SECURE !== 'true') throw new Error('Production requires COOKIE_SECURE=true');
  if (env.DATABASE_URL) {
    let db: URL;
    try { db = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL must be PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || !db.hostname) {
      throw new Error('DATABASE_URL must be PostgreSQL URL');
    }
  }
  if (production && !env.WEB_ORIGIN) throw new Error('Production requires WEB_ORIGIN');
  if (env.GOOGLE_CLIENT_ID) {
    if (!/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID)) throw new Error('GOOGLE_CLIENT_ID must be a Google Web Client ID');
    if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM || (env.AUTH_OTP_SECRET || '').length < 32) {
      throw new Error('Google sign-in requires RESEND_API_KEY, AUTH_EMAIL_FROM and AUTH_OTP_SECRET (>=32 characters)');
    }
  }
  if (env.RESEND_API_KEY && (env.AUTH_OTP_SECRET || '').length < 32) throw new Error('Email verification requires a strong AUTH_OTP_SECRET');
  const webOrigin = plainOrigin('WEB_ORIGIN', env.WEB_ORIGIN || 'http://localhost:3000');
  if (production && !webOrigin.startsWith('https://')) throw new Error('Production WEB_ORIGIN requires HTTPS');
  const port = Number(env.API_PORT || '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT must be an integer between 1 and 65535');
  const host = env.API_HOST || '127.0.0.1';
  if (host !== '0.0.0.0' && host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    throw new Error('API_HOST must be 0.0.0.0, 127.0.0.1, ::1 or localhost');
  }
  return { production, webOrigin, port, host };
}
