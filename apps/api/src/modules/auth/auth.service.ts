import {
  Injectable, ConflictException, BadRequestException,
  UnauthorizedException, HttpException, HttpStatus, ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { accountDeletionError } from './account-deletion-error';
import { DatabaseService } from '../../common/database.service';

const SESSION_AGE_SECONDS = 7 * 24 * 3600;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const MAX_TRACKED_ADDRESSES = 4096;
const attempts = new Map<string, { count: number; started: number }>();

type LoginPayload = { email?: unknown; password?: unknown; username?: unknown; identifier?: unknown; remember?: unknown };

/** HTTP request bodies have no trustworthy shape. Validate at the service boundary,
 * so controllers can pass `unknown` without unsafe casts or TypeScript errors. */
function readLoginPayload(body: unknown): LoginPayload {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Dữ liệu xác thực phải là đối tượng JSON');
  }
  const fields = body as Record<string, unknown>;
  return { email: fields.email, password: fields.password, username: fields.username, identifier: fields.identifier, remember: fields.remember };
}
type UserRow = { id: string; email: string; password_hash: string; salt: string };
function deviceLabel(req: Request): string {
  const value = req.headers['user-agent'];
  return (typeof value === 'string' ? value : 'Thiết bị không xác định').replace(/[\x00-\x1f\x7f<>]/g, '').slice(0,120) || 'Thiết bị không xác định';
}
const SESSION_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Async scrypt may reserve significant memory per operation (~16 MiB).
 * A per-account attempt counter alone cannot prevent many distinct emails
 * from exhausting memory or libuv worker capacity. Keep a bounded local queue
 * and shed load with HTTP 429 rather than allow unbounded concurrent KDFs.
 * Multi-instance deployments additionally need shared edge/Redis controls.
 */
const MAX_ACTIVE_KDFS = 4;
const MAX_WAITING_KDFS = 32;
let activeKdfs = 0;
const waitingKdfs: Array<(release: () => void) => void> = [];
function releaseKdfSlot(): void {
  const next = waitingKdfs.shift();
  if (next) next(releaseKdfSlot);
  else activeKdfs--;
}
function acquireKdfSlot(): Promise<() => void> {
  if (activeKdfs < MAX_ACTIVE_KDFS) {
    activeKdfs++;
    return Promise.resolve(releaseKdfSlot);
  }
  if (waitingKdfs.length >= MAX_WAITING_KDFS) {
    return Promise.reject(new HttpException('Máy chủ đang xử lý nhiều yêu cầu xác thực, thử lại sau', HttpStatus.TOO_MANY_REQUESTS));
  }
  return new Promise(resolve => { waitingKdfs.push(resolve); });
}
export async function derivePassword(password: string, salt: string): Promise<string> {
  const release = await acquireKdfSlot();
  try {
    return await new Promise<string>((resolve, reject) => {
      scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey.toString('hex'));
      });
    });
  } finally {
    release();
  }
}

function readEmail(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Email không hợp lệ');
  const email = value.trim().toLowerCase();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Email không hợp lệ');
  }
  return email;
}

/** Same canonical rule as migration 019; absent usernames preserve legacy clients. */
export function readUsername(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new BadRequestException('Username không hợp lệ');
  const username = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{3,31}$/.test(username)) throw new BadRequestException('Username từ 4–32 ký tự a-z, 0-9, dấu gạch dưới; bắt đầu bằng chữ');
  return username;
}
function readIdentifier(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Nhập username hoặc email');
  return value.includes('@') ? readEmail(value) : readUsername(value)!;
}
function readRemember(value: unknown): boolean {
  if (value !== undefined && typeof value !== 'boolean') throw new BadRequestException('Lựa chọn ghi nhớ phiên không hợp lệ');
  return value !== false; // Existing clients retain their seven-day behavior.
}

/** Existing imported V7 accounts may have passwords shorter than today's sign-up policy. */
function readPassword(value: unknown, purpose: 'login' | 'register'): string {
  if (typeof value !== 'string' || value.length < (purpose === 'register' ? 10 : 1) || Buffer.byteLength(value) > 256) {
    throw new BadRequestException(purpose === 'register' ? 'Mật khẩu mới phải có ít nhất 10 ký tự' : 'Mật khẩu không hợp lệ');
  }
  return value;
}

/** In production Next.js proxies HTTP requests to Nest over localhost, so
 * req.socket.remoteAddress is the same for ALL visitors. A socket-IP-only
 * limiter would lock out unrelated accounts after 12 combined attempts.
 * Limit authentication attempts per action + normalized account identity.
 * Keys are SHA-256 digests, never raw emails or session tokens.
 * This is only per-process mitigation; a shared Redis/edge limiter remains
 * necessary before deploying multiple API instances on the public Internet.
 */
function throttle(identity: string, action: 'register' | 'login' | 'delete' | 'password'): void {
  const key = digest(`${action}:${identity}`);
  const now = Date.now();
  if (attempts.size >= MAX_TRACKED_ADDRESSES && !attempts.has(key)) {
    for (const [storedKey, value] of attempts) {
      if (now - value.started > ATTEMPT_WINDOW_MS) attempts.delete(storedKey);
    }
    if (attempts.size >= MAX_TRACKED_ADDRESSES) {
      const oldest = attempts.keys().next().value;
      if (oldest !== undefined) attempts.delete(oldest);
    }
  }
  const value = attempts.get(key);
  if (!value || now - value.started > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, started: now });
    return;
  }
  value.count += 1;
  if (value.count > MAX_ATTEMPTS) {
    throw new HttpException('Thao tác quá nhiều, thử lại sau', HttpStatus.TOO_MANY_REQUESTS);
  }
}

/** Login limits count only failed credentials. Valid logins must not exhaust the
 * failure budget or make an account unavailable after legitimate use.
 * Block BEFORE the expensive KDF once the budget is exceeded.
 * This process-local limit is defense-in-depth, not a distributed limiter.
 */
function loginKey(email: string): string { return digest(`login:${email}`); }
function assertLoginAllowed(email: string): void {
  const key = loginKey(email);
  const value = attempts.get(key);
  if (!value) return;
  if (Date.now() - value.started > ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return;
  }
  if (value.count >= MAX_ATTEMPTS) {
    throw new HttpException('Thao tác quá nhiều, thử lại sau', HttpStatus.TOO_MANY_REQUESTS);
  }
}
function recordLoginFailure(email: string): void {
  // Reuse bounded/expiring storage, but only for genuinely failed credentials.
  throttle(email, 'login');
}
function clearLoginFailures(email: string): void { attempts.delete(loginKey(email)); }

/** Keep expected database outages distinct from malformed registration data.
 * Never send PostgreSQL exception text, query parameters or credentials to browsers.
 */
function registrationStorageError(error: unknown): never {
  const fault = error && typeof error === 'object' ? error as {code?:unknown;constraint?:unknown} : {};
  // The unique index on sessions or another table does NOT mean the email exists.
  if (fault.code === '23505' && fault.constraint === 'users_email_key') {
    throw new ConflictException('Email đã được sử dụng');
  }
  if (fault.code === '23505' && fault.constraint === 'users_username_unique_idx') throw new ConflictException('Username đã được sử dụng');
  const code = typeof fault.code === 'string' ? fault.code : '';
  if (/^(08|28|53|57|58)/.test(code) || ['3D000','42P01','42703','42501','25006','ETIMEDOUT','ECONNREFUSED','ECONNRESET','ENOTFOUND'].includes(code)) {
    // SafeExceptionFilter returns a generic 503 and a traceable requestId.
    // The underlying SQLSTATE is categorized (never printed verbatim) in server logs.
    throw new ServiceUnavailableException('Dịch vụ tài khoản chưa sẵn sàng', {cause:error});
  }
  throw error;
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  setSessionCookie(res: Response, value: string, maxAge = SESSION_AGE_SECONDS, persistent = true): void {
    res.cookie('thiendo_session', value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      ...(persistent ? { maxAge: maxAge * 1000 } : {}),
      path: '/',
    });
  }

  getToken(req: Request): string {
    const match = (req.headers.cookie || '').match(/(?:^|;\s*)thiendo_session=([a-f\d]{64})(?:;|$)/);
    return match?.[1] || '';
  }

  async me(req: Request, client?: PoolClient): Promise<{ id: string; email: string; username?: string | null; displayName?: string | null; hasAvatar?: boolean; hasPassword?: boolean; hasGoogle?: boolean } | null> {
    const token = this.getToken(req);
    if (!token) return null;
    type ProfileRow = { id: string; email: string; username: string | null; displayName: string | null; hasAvatar: boolean; hasPassword: boolean; hasGoogle: boolean };
    const sql = `SELECT u.id,u.email,u.username,u.display_name AS "displayName",
              (u.avatar_data IS NOT NULL) AS "hasAvatar",
              (length(u.password_hash)=128) AS "hasPassword",
              (u.google_sub IS NOT NULL) AS "hasGoogle"
       FROM sessions s JOIN users u ON u.id=s.user_id
       WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp()
         AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=u.id)`;
    const result = client
      ? await client.query<ProfileRow>(sql, [digest(token)])
      : await this.db.query<ProfileRow>(sql, [digest(token)]);
    return result.rows[0] || null;
  }

  async required(req: Request): Promise<{ id: string; email: string }> {
    const user = await this.me(req);
    if (!user) throw new UnauthorizedException('Vui lòng đăng nhập');
    return user;
  }

  private async establishSession(id: string, email: string, res: Response, req: Request, passwordHash: string, remember = true) {
    const token = randomBytes(32).toString('hex');
    // A new login rotates the browser's previous token, even if it belonged to
    // another account. Both operations commit together; failure keeps the old token.
    const previous = this.getToken(req);
    await this.db.transaction(async client => {
      // The KDF can finish after another request resets the password. Lock and
      // compare the credential snapshot before creating a session. A later
      // password mutation must wait, then revoke this session in its own commit.
      const current = await client.query<{id:string}>(
        'SELECT id FROM users WHERE id=$1 AND password_hash=$2 AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=users.id) FOR SHARE', [id,passwordHash]);
      if (!current.rows[0]) throw new UnauthorizedException('Thông tin đăng nhập vừa thay đổi. Vui lòng đăng nhập lại');
      await client.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at,device_label)
         VALUES($1,$2,NOW()+($4::int * INTERVAL '1 second'),$3)`,
        [digest(token), id,deviceLabel(req), remember ? SESSION_AGE_SECONDS : 12 * 3600],
      );
      if (previous) await client.query('DELETE FROM sessions WHERE token_hash=$1', [digest(previous)]);
      await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[id,'auth.login.success']);
    });
    this.setSessionCookie(res, token, remember ? SESSION_AGE_SECONDS : 12 * 3600, remember);
    return { user: { id, email } };
  }

  async register(body: unknown, req: Request, res: Response) {
    const payload = readLoginPayload(body);
    const email = readEmail(payload.email);
    const username = readUsername(payload.username);
    const password = readPassword(payload.password, 'register');
    throttle(email, 'register');
    let existing: {rowCount: number | null};
    try {
      existing = await this.db.query('SELECT id FROM users WHERE email=$1', [email]);
    } catch (error) { registrationStorageError(error); }
    if (existing.rowCount) throw new ConflictException('Email đã được sử dụng');

    const id = randomUUID();
    const salt = randomBytes(16).toString('hex');
    const passwordHash = await derivePassword(password, salt);
    // User + session are one atomic PostgreSQL transaction. If session
    // creation fails, no orphan user is left behind; the response cookie is
    // not sent until COMMIT succeeds.
    const token = randomBytes(32).toString('hex');
    const previous = this.getToken(req);
    try {
      await this.db.transaction(async (client: PoolClient) => {
        await client.query(
          'INSERT INTO users(id,email,password_hash,salt,username) VALUES($1,$2,$3,$4,$5)',
          [id, email, passwordHash, salt, username],
        );
        await client.query(
          `INSERT INTO sessions(token_hash,user_id,expires_at,device_label)
           VALUES($1,$2,NOW()+INTERVAL '7 days',$3)`,
          [digest(token), id,deviceLabel(req)],
        );
        if (previous) await client.query('DELETE FROM sessions WHERE token_hash=$1', [digest(previous)]);
        await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[id,'auth.register']);
      });
    } catch (error: unknown) {
      registrationStorageError(error);
    }
    this.setSessionCookie(res, token);
    return { user: { id, email, username } };
  }

  async login(body: unknown, req: Request, res: Response) {
    const payload = readLoginPayload(body);
    const email = readIdentifier(payload.identifier ?? payload.email);
    const remember = readRemember(payload.remember);
    const password = readPassword(payload.password, 'login');
    assertLoginAllowed(email);
    const result = await this.db.query<UserRow>(
      'SELECT id,email,password_hash,salt FROM users WHERE (email=$1 OR LOWER(username)=$1) AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=users.id)',
      [email],
    );
    const user = result.rows[0];
    if (user) assertLoginAllowed(`account:${user.id}`);
    const candidate = await derivePassword(password, user?.salt || '00000000000000000000000000000000');
    // An old or corrupted imported hash must produce a normal 401, not crash
    // timingSafeEqual with a size mismatch (which would otherwise return 500).
    const stored = user?.password_hash || '';
    const validHash = /^[a-f0-9]{128}$/i.test(stored);
    const valid = validHash && timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(stored, 'hex'));
    if (!user || !valid) {
      recordLoginFailure(email);
      if (user) recordLoginFailure(`account:${user.id}`);
      if(user)void this.db.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'auth.login.failed']).catch(()=>{});
      throw new UnauthorizedException('Username/email hoặc mật khẩu không đúng');
    }
    clearLoginFailures(email);
    clearLoginFailures(`account:${user.id}`);
    return this.establishSession(user.id, user.email, res, req, stored, remember);
  }

  /** Change password only after proving knowledge of the current password; revoke other sessions. */
  async changePassword(req: Request, body: unknown) {
    const user = await this.required(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Mật khẩu không hợp lệ');
    const fields = body as Record<string, unknown>;
    const currentPassword = readPassword(fields.currentPassword, 'login');
    const newPassword = readPassword(fields.newPassword, 'register');
    if (newPassword === currentPassword) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
    throttle(user.id, 'password');
    const row = await this.db.query<Pick<UserRow, 'password_hash' | 'salt'>>(
      'SELECT password_hash,salt FROM users WHERE id=$1', [user.id]);
    const stored = row.rows[0];
    if (!stored || !/^[a-f0-9]{128}$/i.test(stored.password_hash)) {
      throw new BadRequestException('Tài khoản Google chưa có mật khẩu riêng. Bạn có thể tiếp tục đăng nhập bằng Google');
    }
    const candidate = await derivePassword(currentPassword, stored.salt);
    if (!timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(stored.password_hash,'hex'))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    const salt = randomBytes(16).toString('hex');
    const passwordHash = await derivePassword(newPassword, salt);
    const sessionHash = digest(this.getToken(req));
    await this.db.transaction(async client => {
      // Same lock order as recovery: account recovery lock, user row, challenges.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 20261115))',[`reset:${user.id}`]);
      // Compare-and-set: concurrent password changes cannot overwrite each other.
      const updated = await client.query(
        'UPDATE users SET password_hash=$1,salt=$2 WHERE id=$3 AND password_hash=$4',
        [passwordHash,salt,user.id,stored.password_hash]);
      if (!updated.rowCount) throw new ConflictException('Mật khẩu vừa thay đổi. Hãy đăng nhập lại');
      await client.query('UPDATE password_reset_challenges SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,sessionHash]);
      await client.query('DELETE FROM admin_session_assurance WHERE user_id=$1',[user.id]);
      await client.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[user.id]);
      await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'auth.password.changed']);
    });
    return {updated:true,otherSessionsRevoked:true};
  }

  async logout(req: Request, res: Response) {
    const token = this.getToken(req);
    if (token) {
      await this.db.query('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]);
    }
    this.setSessionCookie(res, '', 0);
    return { ok: true };
  }

  /** Explicitly revoke ALL sessions; current browser cookie is cleared only after DB success. */
  async logoutAll(req:Request,res:Response) {
    const user=await this.required(req);
    // Either both revocation and its security record commit, or neither does.
    // Otherwise a failed audit INSERT would leave the caller unsure whether
    // sessions were already deleted (and the current cookie uncleared).
    await this.db.transaction(async client => {
      await client.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);
      await client.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[user.id]);
      await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'sessions.all.revoked']);
    });
    this.setSessionCookie(res,'',0);
    return {revoked:true};
  }

  async securityEvents(req:Request){
    const user=await this.required(req);
    const events=await this.db.query<{id:string;event:string;createdAt:Date}>(
      'SELECT id::text,event,created_at AS "createdAt" FROM account_security_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id]);
    return {events:events.rows};
  }
  /** Public opaque session IDs, never disclose a token nor its verifier hash. */
  async sessions(req:Request){
    const user=await this.required(req),token=this.getToken(req);
    const rows=await this.db.query<{id:string;createdAt:Date;expiresAt:Date;deviceLabel:string;current:boolean}>(`
      SELECT public_id AS id,created_at AS "createdAt",expires_at AS "expiresAt",device_label AS "deviceLabel",
      token_hash=$2 AS current FROM sessions WHERE user_id=$1 AND expires_at>clock_timestamp()
      ORDER BY created_at DESC LIMIT 50`,[user.id,digest(token)]);
    return {sessions:rows.rows};
  }
  async logoutOthers(req:Request){
    const user=await this.required(req),token=this.getToken(req);
    return this.db.transaction(async client=>{
      const value=await client.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,digest(token)]);
      await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'sessions.other.revoked']);
      return {revoked:value.rowCount||0};
    });
  }
  async revokeSession(req:Request,res:Response,body:unknown){
    const user=await this.required(req);
    const id=body && typeof body==='object'&&!Array.isArray(body) ? (body as Record<string,unknown>).sessionId : null;
    if(typeof id!=='string'||!SESSION_UUID.test(id))throw new BadRequestException('Mã phiên không hợp lệ');
    const current=digest(this.getToken(req));
    const result=await this.db.transaction(async client=>{
      const found=await client.query<{current:boolean}>(
        'DELETE FROM sessions WHERE user_id=$1 AND public_id=$2 RETURNING token_hash=$3 AS current',
        [user.id,id,current]);
      if(found.rows[0])await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'session.revoked']);
      return found.rows[0];
    });
    if(!result)return {revoked:false,currentSession:false};
    if(result.current)this.setSessionCookie(res,'',0);
    return {revoked:true,currentSession:result.current};
  }

  /** Irreversible account deletion demands the current password, not just a session cookie. */
  async deleteAccount(req: Request, res: Response, body: unknown) {
    const payload = readLoginPayload(body);
    const user = await this.required(req);
    if((await this.db.query("SELECT user_id FROM admin_memberships WHERE user_id=$1 AND role='owner'",[user.id])).rows[0])throw new ConflictException('Chủ hệ thống cần chuyển giao quyền trước khi xóa tài khoản');
    if((await this.db.query('SELECT id FROM billing_orders WHERE user_id=$1 LIMIT 1',[user.id])).rows[0])throw new ConflictException('Tài khoản có đơn thanh toán; cần xử lý hồ sơ giao dịch trước khi xóa');
    throttle(user.id, 'delete');
    const password = readPassword(payload.password, 'login');
    const result = await this.db.query<Pick<UserRow, 'password_hash' | 'salt'>>(
      'SELECT password_hash,salt FROM users WHERE id=$1', [user.id],
    );
    const stored = result.rows[0];
    const hash = stored?.password_hash || '';
    // Do not attempt timingSafeEqual on malformed imported V7 hashes.
    const candidate = await derivePassword(password, stored?.salt || '00000000000000000000000000000000');
    if (!/^[0-9a-f]{128}$/i.test(hash) ||
        !timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))) {
      throw new UnauthorizedException('Mật khẩu xác nhận không đúng');
    }
    // A reset while scrypt was running invalidates the earlier password proof.
    const deleted = await this.db.transaction(async client=>{
      await client.query('SELECT pg_advisory_xact_lock(20261014,13)');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['checkout:'+user.id]);
      if((await client.query("SELECT user_id FROM admin_memberships WHERE user_id=$1 AND role='owner'",[user.id])).rows[0]||(await client.query('SELECT id FROM billing_orders WHERE user_id=$1 LIMIT 1',[user.id])).rows[0])throw new ConflictException('Cần xử lý quyền chủ hệ thống hoặc hồ sơ giao dịch trước khi xóa');
      return client.query('DELETE FROM users WHERE id=$1 AND password_hash=$2', [user.id,hash]);
    }).catch(accountDeletionError);
    if (!deleted.rowCount) throw new UnauthorizedException('Mật khẩu vừa thay đổi. Vui lòng xác minh lại');
    this.setSessionCookie(res, '', 0);
    return { deleted: true };
  }
}
