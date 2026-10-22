/** Verify Google Identity Services ID tokens without trusting browser claims or Google's email as a unique key.
 * The stable `sub` is the Google identity; JWKS stays on Google's fixed HTTPS hostname.
 * No tokeninfo/debug endpoint is used in production. */
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

export type GoogleIdentity = { sub: string; email: string; name: string };
type Key = JsonWebKey & {kid: string; alg?: string; use?: string; kty: string};
let cache: { keys: Key[]; expiresAt: number } | undefined;
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
function plainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function decodePart(encoded: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]{1,6000}$/.test(encoded)) throw new UnauthorizedException('Thông tin Google không hợp lệ');
  try { const data = Buffer.from(encoded, 'base64url').toString('utf8'); return plainObject(JSON.parse(data)) || {}; }
  catch { throw new UnauthorizedException('Thông tin Google không hợp lệ'); }
}
async function loadGoogleKeys(): Promise<Key[]> {
  let response: globalThis.Response;
  try { response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(5000), redirect: 'error' }); }
  catch { throw new ServiceUnavailableException('Không xác minh được chữ ký Google, thử lại sau'); }
  if (!response.ok) throw new ServiceUnavailableException('Không xác minh được chữ ký Google');
  const data = plainObject(await response.json().catch(() => null));
  if (!Array.isArray(data?.keys) || data.keys.length < 1 || data.keys.length > 20) {
    throw new ServiceUnavailableException('Chứng thư Google không hợp lệ');
  }
  const keys = data.keys.filter((item: unknown): item is Key => {
    const value = plainObject(item);
    return !!value && value.kty === 'RSA' && typeof value.kid === 'string' && (value.alg === undefined || value.alg === 'RS256') && (value.use === undefined || value.use === 'sig');
  });
  if (!keys.length) throw new ServiceUnavailableException('Không có khóa chữ ký Google hợp lệ');
  const cacheHeader = response.headers.get('cache-control') || '';
  const seconds = Number(cacheHeader.match(/max-age=(\d+)/i)?.[1] || '300');
  cache = { keys, expiresAt: Date.now() + Math.min(Math.max(seconds, 60), 3600) * 1000 };
  return keys;
}
let pendingKeys: Promise<Key[]> | undefined;
let lastKeyFetchAttempt = 0;
async function googleKeys(force = false): Promise<Key[]> {
 if (pendingKeys) return pendingKeys;
 if (!force && cache && cache.expiresAt > Date.now()) return cache.keys;
 lastKeyFetchAttempt = Date.now();
 pendingKeys = loadGoogleKeys();
 try { return await pendingKeys; } finally { pendingKeys = undefined; }
}
export async function verifyGoogleCredential(token: unknown, nonce: string, clientId: string): Promise<GoogleIdentity> {
  if (typeof token !== 'string' || token.length > 12000 || token.length < 80) throw new BadRequestException('Thiếu thông tin đăng nhập Google');
  const parts = token.split('.');
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2])) throw new UnauthorizedException('Token Google không hợp lệ');
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (header.alg !== 'RS256' || header.typ && header.typ !== 'JWT' || typeof header.kid !== 'string') throw new UnauthorizedException('Thuật toán chữ ký Google không hợp lệ');
  const keys = await googleKeys();
  let matching = keys.find(k => k.kid === header.kid);
  // Key rotation may happen before the cached set expires. Share a pending
  // refresh, and bound attacker-controlled unknown-kid refreshes to one/minute.
  if (!matching && pendingKeys) matching = (await pendingKeys).find(k => k.kid === header.kid);
  if (!matching && Date.now() - lastKeyFetchAttempt >= 60_000) {
    matching = (await googleKeys(true)).find(k => k.kid === header.kid);
  }
  if (!matching) throw new UnauthorizedException('Không tìm thấy khóa chữ ký Google');
  let valid = false;
  try { valid = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({key: matching,format:'jwk'}), Buffer.from(parts[2], 'base64url')); }
  catch { /* Reject invalid signature/key */ }
  if (!valid) throw new UnauthorizedException('Chữ ký Google không hợp lệ');
  const now = Math.floor(Date.now()/1000);
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(String(payload.iss)) ||
      payload.aud !== clientId || (payload.azp !== undefined && payload.azp !== clientId) ||
      typeof payload.exp !== 'number' || payload.exp <= now ||
      typeof payload.iat !== 'number' || payload.iat > now + 120 || payload.iat < now - 3600 ||
      payload.nonce !== nonce || payload.email_verified !== true ||
      typeof payload.sub !== 'string' || !/^[0-9]{5,255}$/.test(payload.sub)) {
    throw new UnauthorizedException('Xác minh tài khoản Google không thành công');
  }
  const email = String(payload.email || '').trim().toLowerCase();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UnauthorizedException('Email Google chưa được xác minh');
  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 60) : '';
  return { sub: payload.sub, email, name };
}
