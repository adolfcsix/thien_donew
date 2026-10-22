/** Password reset is a separate, DB-backed, one-use email challenge.
 * Neither the reset request nor invalid-token failures disclose account existence. */
import { Injectable, BadRequestException, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../common/database.service';
import { sendVerificationCode } from './email-code';
import { derivePassword } from './auth.service';

type Challenge = {id:string;user_id:string;code_hash:string;attempts:number;valid:boolean};
const uuid = (value:unknown):value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function secret() {
  if (!process.env.AUTH_OTP_SECRET || process.env.AUTH_OTP_SECRET.length < 32) throw new ServiceUnavailableException('Máy chủ chưa cấu hình xác minh email');
  return process.env.AUTH_OTP_SECRET;
}
function codeHash(key:string,id:string,code:string) {return createHmac('sha256',key).update(`thiendo:reset:${id}:${code}`).digest('hex');}
function readEmail(body:unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as Record<string,unknown>).email !== 'string') throw new BadRequestException('Email không hợp lệ');
  const email = String((body as Record<string,unknown>).email).toLowerCase().trim();
  if(email.length>150|| !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email không hợp lệ');
  return email;
}
@Injectable()
export class PasswordRecoveryService {
 constructor(private readonly db:DatabaseService) {}
 async request(body:unknown) {
  const email=readEmail(body), key=secret(), id=randomUUID();
  const user=await this.db.query<{id:string}>('SELECT id FROM users WHERE email=$1 AND length(password_hash)=128',[email]);
  const account=user.rows[0];
  const response={requested:true,challengeId:id};
  if(!account)return response; // Same public response for unknown or Google-only accounts.
  const code=String(randomInt(0,1_000_000)).padStart(6,'0');
  const inserted=await this.db.transaction(async client=>{
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 20261115))',[`reset:${account.id}`]);
    // Recheck under a user-row lock so a concurrent deletion cannot leave an orphan challenge.
    const owner=await client.query<{id:string}>('SELECT id FROM users WHERE id=$1 AND length(password_hash)=128 FOR KEY SHARE',[account.id]);
    if(!owner.rows[0])return false;
    const limits=await client.query<{minute:string;quarter:string;daily:string}>(
      `SELECT COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '60 seconds')::text AS minute,
              COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '15 minutes')::text AS quarter,
              COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '24 hours')::text AS daily
       FROM password_reset_challenges WHERE user_id=$1`,[account.id]);
    const count=limits.rows[0];
    if(Number(count?.minute)>=1||Number(count?.quarter)>=5||Number(count?.daily)>=20)return false;
    await client.query(
      `INSERT INTO password_reset_challenges(id,user_id,code_hash,expires_at)
       VALUES($1,$2,$3,NOW()+INTERVAL '5 minutes')`,[id,account.id,codeHash(key,id,code)]);
    return true;
  });
  if(!inserted)return response;
  try {await sendVerificationCode(email,code,'password');}
  catch(e){await this.db.query('DELETE FROM password_reset_challenges WHERE id=$1',[id]).catch(()=>{});throw e;}
  return response;
 }
 async reset(body:unknown) {
  const key=secret();
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');
  const {challengeId,code,newPassword}=body as Record<string,unknown>;
  if(!uuid(challengeId)||typeof code!=='string'|| !/^\d{6}$/.test(code))throw new BadRequestException('Mã xác minh không hợp lệ');
  if(typeof newPassword!=='string'||newPassword.length<10||Buffer.byteLength(newPassword)>256)throw new BadRequestException('Mật khẩu mới cần ít nhất 10 ký tự');
  const status=await this.db.transaction(async client=>{
    const identity=await client.query<{user_id:string}>('SELECT user_id FROM password_reset_challenges WHERE id=$1',[challengeId]);
    const userId=identity.rows[0]?.user_id;
    if(!userId)return {error:'Mã không hợp lệ hoặc đã hết hạn'};
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 20261115))',[`reset:${userId}`]);
    // Lock the account before challenges: two valid codes for the same account
    // serialize, and account deletion uses the same user-before-challenge order.
    const owner=await client.query<{id:string}>('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
    if(!owner.rows[0])return {error:'Mã không hợp lệ hoặc đã hết hạn'};
    const result=await client.query<Challenge>(
      `SELECT id,user_id,code_hash,attempts,(expires_at>clock_timestamp() AND used_at IS NULL) AS valid
       FROM password_reset_challenges WHERE id=$1 FOR UPDATE`,[challengeId]);
    const ch=result.rows[0];
    if(!ch||!ch.valid||ch.attempts>=5) return {error:'Mã không hợp lệ hoặc đã hết hạn'};
    const a=Buffer.from(codeHash(key,challengeId,code),'hex'),b=Buffer.from(/^[a-f0-9]{64}$/.test(ch.code_hash)?ch.code_hash:'0'.repeat(64),'hex');
    if(!timingSafeEqual(a,b)){
      await client.query('UPDATE password_reset_challenges SET attempts=attempts+1 WHERE id=$1',[challengeId]);
      return {error:'Mã xác minh không đúng'};
    }
    const salt=randomBytes(16).toString('hex');
    const hash=await derivePassword(newPassword,salt);
    await client.query('UPDATE users SET password_hash=$1,salt=$2 WHERE id=$3',[hash,salt,ch.user_id]);
    // One successful password mutation consumes every previously issued reset code.
    await client.query('UPDATE password_reset_challenges SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[ch.user_id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1',[ch.user_id]);
    await client.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[ch.user_id]);
    return {updated:true};
  });
  if('error' in status)throw new UnauthorizedException(status.error);
  return status;
 }
}
