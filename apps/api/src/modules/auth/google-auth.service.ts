import { Injectable, BadRequestException, ConflictException, UnauthorizedException, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import {accountDeletionError} from './account-deletion-error';
import { DatabaseService } from '../../common/database.service';
import { AuthService } from './auth.service';
import { verifyGoogleCredential } from './google-token';
import { sendVerificationCode } from './email-code';

const NONCE_AGE_MS = 5 * 60 * 1000;
const CODE_AGE_MS = 5 * 60 * 1000;
const GOOGLE_NONCE_DEV = 'thiendo_google_nonce';
const GOOGLE_NONCE_PROD = '__Host-thiendo_google_nonce';
const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function configured() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const secret = process.env.AUTH_OTP_SECRET || '';
  if (!clientId || !process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM || secret.length < 32) {
    throw new ServiceUnavailableException('Đăng nhập Google chưa được cấu hình đầy đủ');
  }
  return {clientId, secret};
}
function nonceCookieName() { return process.env.NODE_ENV === 'production' ? GOOGLE_NONCE_PROD : GOOGLE_NONCE_DEV; }
function readCookie(req: Request, name: string): string {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length+1) || '';
}
function nonceCookieOptions() {return {httpOnly:true,sameSite:'lax' as const,secure:process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production',path:'/'};}
function otpHash(secret: string, challengeId: string, code: string): string {
  return createHmac('sha256', secret).update(`thiendo:google:otp:${challengeId}:${code}`).digest('hex');
}
type ChallengeRow = { id:string; email:string; google_sub:string; display_name:string|null; link_user_id:string|null; code_hash:string; attempts:number; valid:boolean; purpose:'login'|'delete' };

@Injectable()
export class GoogleAuthService {
  constructor(private readonly db:DatabaseService, private readonly auth:AuthService) {}

  config() { const c = process.env.GOOGLE_CLIENT_ID || ''; return { enabled: !!c && !!process.env.RESEND_API_KEY && !!process.env.AUTH_EMAIL_FROM && (process.env.AUTH_OTP_SECRET || '').length >= 32, clientId: c || null }; }
  async nonce(res:Response) {
    configured();
    const nonce = randomBytes(24).toString('base64url');
    await this.db.query(`INSERT INTO auth_google_nonces(nonce_hash,expires_at) VALUES($1,clock_timestamp()+INTERVAL '5 minutes')`,[createHash('sha256').update(nonce).digest('hex')]);
    res.cookie(nonceCookieName(),nonce,{...nonceCookieOptions(),maxAge:NONCE_AGE_MS});
    return {nonce};
  }
  async start(body:unknown, req:Request, res:Response) {
    const {clientId,secret} = configured();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Thông tin Google không hợp lệ');
    const fields = body as Record<string,unknown>;
    const credential = fields.credential;
    const purpose = fields.purpose === 'delete' ? 'delete' : 'login';
    const nonce = readCookie(req,nonceCookieName());
    if (!/^[A-Za-z0-9_-]{32}$/.test(nonce)) throw new UnauthorizedException('Phiên Google đã hết hạn, vui lòng thử lại');
    // Consume nonce even when validation fails; replay requires a new Google interaction.
    res.clearCookie(nonceCookieName(),nonceCookieOptions());
    const consumed = await this.db.query<{nonce_hash:string}>(
      'DELETE FROM auth_google_nonces WHERE nonce_hash=$1 AND expires_at>clock_timestamp() RETURNING nonce_hash',
      [createHash('sha256').update(nonce).digest('hex')]);
    if (!consumed.rows[0]) throw new UnauthorizedException('Phiên Google đã hết hạn hoặc đã được sử dụng');
    const identity = await verifyGoogleCredential(credential,nonce,clientId);
    const signedIn = await this.auth.me(req);
    const linked = await this.db.query<{id:string;email:string}>('SELECT id,email FROM users WHERE google_sub=$1',[identity.sub]);
    const providerUser = linked.rows[0];
    if (providerUser && providerUser.email !== identity.email) {
      throw new ConflictException('Email Google đã thay đổi. Liên hệ hỗ trợ để cập nhật tài khoản an toàn');
    }
    if (signedIn && providerUser && signedIn.id !== providerUser.id) throw new ConflictException('Google này đã liên kết với tài khoản khác');
    if(purpose==='delete' && (!signedIn || !providerUser || signedIn.id!==providerUser.id)) {
      throw new UnauthorizedException('Cần đăng nhập tài khoản Google muốn xóa trước');
    }
    const existing = await this.db.query<{id:string;google_sub:string|null}>('SELECT id,google_sub FROM users WHERE email=$1',[identity.email]);
    const current = existing.rows[0];
    if (current && !providerUser && (!signedIn || signedIn.id !== current.id)) {
      throw new ConflictException('Email đã có tài khoản. Hãy đăng nhập bằng mật khẩu rồi liên kết Google trong Hồ sơ');
    }
    if (current?.google_sub && current.google_sub !== identity.sub) throw new ConflictException('Email này đã liên kết với Google khác');
    // Advisory lock makes cooldown + INSERT atomic across concurrent API instances.
    const id = randomUUID(), code = String(randomInt(0,1_000_000)).padStart(6,'0');
    const hash = otpHash(secret,id,code);
    await this.db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 20261115))',[`google:${identity.sub}`]);
      const rate = await client.query<{minute:string;quarter:string;daily:string}>(
        `SELECT COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '60 seconds')::text AS minute,
                COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '15 minutes')::text AS quarter,
                COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '24 hours')::text AS daily
           FROM auth_email_challenges WHERE google_sub=$1`,[identity.sub]);
      const counters = rate.rows[0];
      if (Number(counters?.minute) >= 1 || Number(counters?.quarter) >= 5 || Number(counters?.daily) >= 20) {
        throw new HttpException('Đã yêu cầu mã gần đây, vui lòng thử lại sau', HttpStatus.TOO_MANY_REQUESTS);
      }
      await client.query(
        `INSERT INTO auth_email_challenges(id,email,google_sub,display_name,link_user_id,code_hash,purpose,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+INTERVAL '5 minutes')`,
        [id,identity.email,identity.sub,identity.name || null,purpose === 'delete' ? signedIn?.id : (signedIn && current?.id === signedIn.id && !providerUser ? signedIn.id : null),hash,purpose]);
    });
    try { await sendVerificationCode(identity.email,code); }
    catch(error) {
      await this.db.query('DELETE FROM auth_email_challenges WHERE id=$1 AND used_at IS NULL',[id]).catch(()=>{});
      throw error;
    }
    return {challengeId:id,email:identity.email,purpose,expiresInSeconds:CODE_AGE_MS/1000};
  }

  async verify(body:unknown,req:Request,res:Response) {
    const {secret} = configured();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Mã xác minh không hợp lệ');
    const {challengeId,code} = body as Record<string,unknown>;
    if (!isUuid(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new BadRequestException('Nhập mã gồm 6 chữ số');
    const token = randomBytes(32).toString('hex');
    const previous = this.auth.getToken(req);
    const status = await this.db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(20261014,13)');
      const result = await client.query<ChallengeRow>(
        `SELECT id,email,google_sub,display_name,link_user_id,code_hash,attempts,purpose,
           (expires_at > clock_timestamp() AND used_at IS NULL) AS valid
         FROM auth_email_challenges WHERE id=$1 FOR UPDATE`,[challengeId]);
      const ch = result.rows[0];
      if (!ch || !ch.valid || ch.attempts >= 5) return {error:'Mã đã hết hạn hoặc không còn hợp lệ'};
      const candidate = Buffer.from(otpHash(secret,challengeId,code),'hex');
      const stored = /^[0-9a-f]{64}$/.test(ch.code_hash) ? Buffer.from(ch.code_hash,'hex') : Buffer.alloc(32);
      if (!timingSafeEqual(candidate,stored)) {
        await client.query('UPDATE auth_email_challenges SET attempts=attempts+1 WHERE id=$1',[challengeId]);
        return {error:'Mã xác minh không đúng'};
      }
      // Distinct OTP challenges for one Google identity must not race to create/link users.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 20261115))',[`google:${ch.google_sub}`]);
      if(ch.purpose==='delete') {
        const authenticated=await this.auth.me(req,client);
        if(!ch.link_user_id || authenticated?.id!==ch.link_user_id) return {error:'Phiên đăng nhập cần xóa đã hết hạn'};
        // Checkout also acquires this lock before its user foreign-key lock.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['checkout:'+ch.link_user_id]);
        const owner=await client.query<{id:string}>(
          'SELECT id FROM users WHERE id=$1 AND google_sub=$2 FOR UPDATE',[ch.link_user_id,ch.google_sub]);
        if(!owner.rows[0]) return {error:'Tài khoản Google không còn liên kết'};
        await client.query('SELECT pg_advisory_xact_lock(20261014,13)');
        if((await client.query("SELECT user_id FROM admin_memberships WHERE user_id=$1 AND role='owner'",[ch.link_user_id])).rows[0]||(await client.query('SELECT id FROM billing_orders WHERE user_id=$1 LIMIT 1',[ch.link_user_id])).rows[0])return {error:'Cần xử lý quyền chủ hệ thống hoặc hồ sơ giao dịch trước khi xóa'};
        await client.query('UPDATE auth_email_challenges SET used_at=NOW() WHERE id=$1',[ch.id]);
        await client.query('DELETE FROM users WHERE id=$1',[ch.link_user_id]).catch(accountDeletionError);
        return {deleted:true};
      }
      let user: {id:string;email:string} | undefined;
      const byProvider = await client.query<{id:string;email:string}>('SELECT id,email FROM users WHERE google_sub=$1 FOR UPDATE',[ch.google_sub]);
      user = byProvider.rows[0];
      if (!user) {
        const existing = await client.query<{id:string;google_sub:string|null}>('SELECT id,google_sub FROM users WHERE email=$1 FOR UPDATE',[ch.email]);
        if (existing.rows[0]) {
          if (!ch.link_user_id || ch.link_user_id !== existing.rows[0].id || existing.rows[0].google_sub) return {error:'Tài khoản đã tồn tại, cần liên kết Google lại'};
          // Binding an identity requires still having the SAME authenticated local session.
          const authenticated = await this.auth.me(req,client);
          if (authenticated?.id !== ch.link_user_id) return {error:'Phiên tài khoản đã hết hạn, vui lòng đăng nhập và liên kết lại'};
          await client.query('UPDATE users SET google_sub=$1,email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$2 AND google_sub IS NULL',[ch.google_sub, ch.link_user_id]);
          user = {id:existing.rows[0].id,email:ch.email};
        } else {
          if (ch.link_user_id) return {error:'Không tìm thấy tài khoản cần liên kết'};
          user = {id:randomUUID(),email:ch.email};
          await client.query(
            'INSERT INTO users(id,email,password_hash,salt,google_sub,display_name,email_verified_at) VALUES($1,$2,$3,$4,$5,$6,NOW())',
            [user.id,user.email,'','',ch.google_sub,ch.display_name]);
        }
      }
      if (user.email !== ch.email) return {error:'Email Google đã thay đổi, vui lòng thử lại'};
      await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1',[user.id]);
      if((await client.query('SELECT user_id FROM account_blocks WHERE user_id=$1',[user.id])).rows[0])return {error:'Tài khoản đang bị khóa'};
      await client.query('UPDATE auth_email_challenges SET used_at=NOW() WHERE id=$1',[ch.id]);
      await client.query(`INSERT INTO sessions(token_hash,user_id,expires_at,device_label) VALUES($1,$2,NOW()+INTERVAL '7 days',$3)`,[createHash('sha256').update(token).digest('hex'),user.id,typeof req.headers['user-agent']==='string'?req.headers['user-agent'].replace(/[\x00-\x1f\x7f<>]/g,'').slice(0,120):'Thiết bị không xác định']);
      if (previous) await client.query('DELETE FROM sessions WHERE token_hash=$1',[createHash('sha256').update(previous).digest('hex')]);
      return {user};
    });
    if ('error' in status) throw new UnauthorizedException(status.error);
    if('deleted' in status){this.auth.setSessionCookie(res,'',0);return status;}
    this.auth.setSessionCookie(res,token);
    return status;
  }
}
