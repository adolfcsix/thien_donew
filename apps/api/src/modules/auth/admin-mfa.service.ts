import {effectiveCapabilities,requestCapability} from '../admin-console/permissions';
import { Injectable, ForbiddenException, UnauthorizedException, BadRequestException, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../common/database.service';
import { AuthService, derivePassword } from './auth.service';
import { randomTotpSecret, encryptTotpSecret, decryptTotpSecret, matchTotpStep, mfaEncryptionReady } from './totp';

type CredentialRow={secret_encrypted:string;enabled_at:Date|null;last_accepted_step:string|number;failed_attempts:number;locked_until:Date|null};
function digest(token:string){return createHash('sha256').update(token).digest('hex');}
const TRUST_DAYS=30;
const TRUST_COOKIE='thiendo_admin_device';
function trustedToken(req:Request){return (req.headers.cookie||'').match(/(?:^|;\s*)thiendo_admin_device=([a-f0-9]{64})(?:;|$)/)?.[1]||'';}
function wantsTrust(body:unknown){return !!(body&&typeof body==='object'&&!Array.isArray(body)&&(body as Record<string,unknown>).trustDevice===true);}

function codeBody(body:unknown):string {
 if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Mã xác thực không hợp lệ');
 const code=(body as Record<string,unknown>).code;
 if(typeof code!=='string'|| !/^\d{6}$/.test(code))throw new BadRequestException('Mã xác thực phải có 6 chữ số');
 return code;
}
@Injectable()
export class AdminMfaService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService){}
 private assertConfig(){if(!mfaEncryptionReady())throw new ServiceUnavailableException('Hệ thống MFA chưa được cấu hình');}
 private async membership(req:Request){
  const user=await this.auth.required(req);
  const result=await this.db.query<{role:string}>(`SELECT m.role FROM admin_memberships m
   WHERE m.user_id=$1 AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=m.user_id)`,[user.id]);
  if(!result.rows[0])throw new ForbiddenException('Không có quyền quản trị');
  return {...user,role:result.rows[0].role};
 }
 async status(req:Request){
  const user=await this.membership(req);
  const token=this.auth.getToken(req);
  const result=await this.db.query<{enabled:boolean;verified:boolean;stepUp:boolean}>(`
   SELECT EXISTS(SELECT 1 FROM admin_mfa_credentials m WHERE m.user_id=$1 AND m.enabled_at IS NOT NULL) AS enabled,
   EXISTS(SELECT 1 FROM admin_session_assurance a WHERE a.user_id=$1 AND a.token_hash=$2 AND a.verified_at>NOW()-INTERVAL '12 hours') AS verified,
   EXISTS(SELECT 1 FROM admin_session_assurance a WHERE a.user_id=$1 AND a.token_hash=$2 AND a.method='totp' AND a.verified_at>NOW()-INTERVAL '10 minutes') AS "stepUp"`,[user.id,digest(token)]);
  return {handle:(await this.db.query<{username:string|null}>('SELECT username FROM users WHERE id=$1',[user.id])).rows[0]?.username, role:user.role, ...result.rows[0], configured:mfaEncryptionReady()};
 }
 /** Requires current password before issuing a TOTP setup key. Never log the secret. */
 async setup(req:Request,body:unknown){
  this.assertConfig(); const user=await this.membership(req);
  const verified=await this.db.query('SELECT email_verified_at FROM users WHERE id=$1',[user.id]);
  if(!verified.rows[0]?.email_verified_at)throw new ForbiddenException('Xác minh email trước khi bật MFA quản trị');
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Xác nhận mật khẩu bắt buộc');
  const password=(body as Record<string,unknown>).password;
  if(typeof password!=='string'||password.length<1||Buffer.byteLength(password)>256)throw new BadRequestException('Mật khẩu không hợp lệ');
  const {rows}=await this.db.query<{password_hash:string;salt:string}>(`SELECT password_hash,salt FROM users WHERE id=$1`,[user.id]);
  const current=rows[0];
  const candidate=await derivePassword(password,current?.salt||'00000000000000000000000000000000');
  if(!current|| !/^[a-f0-9]{128}$/i.test(current.password_hash)||!timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(current.password_hash,'hex')))throw new UnauthorizedException('Mật khẩu không đúng');
  const secret=randomTotpSecret();
  const encrypted=encryptTotpSecret(secret,user.id);
  await this.db.transaction(async client=>{
   // Revalidate password and membership after slow password derivation.
   const fresh=await client.query<{password_hash:string}>(`SELECT u.password_hash FROM users u JOIN admin_memberships a ON a.user_id=u.id
     WHERE u.id=$1 AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=u.id) FOR UPDATE OF u`,[user.id]);
   if(!fresh.rows[0]||fresh.rows[0].password_hash!==current.password_hash)throw new UnauthorizedException('Tài khoản vừa thay đổi');
   const previous=await client.query<{enabled_at:Date|null}>('SELECT enabled_at FROM admin_mfa_credentials WHERE user_id=$1 FOR UPDATE',[user.id]);
   if(previous.rows[0]?.enabled_at)throw new ForbiddenException('MFA đã bật, không cho phép tạo lại khóa qua API');
   await client.query(`INSERT INTO admin_mfa_credentials(user_id,secret_encrypted) VALUES($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET secret_encrypted=$2,failed_attempts=0,locked_until=NULL`,[user.id,encrypted]);
   await client.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,'mfa.setup',user.id]);
  });
  const name=encodeURIComponent(user.email);
  const issuer=encodeURIComponent('Thien Do');
  return {manualKey:secret,otpauthUrl:`otpauth://totp/Thien%20Do:${name}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,expires: 'Chỉ hiển thị một lần, không lưu ảnh hoặc gửi khóa lên GitHub'};
 }
 async confirm(req:Request,res:Response,body:unknown){return this.verifyInternal(req,res,codeBody(body),true,wantsTrust(body));}
 async verify(req:Request,res:Response,body:unknown){return this.verifyInternal(req,res,codeBody(body),false,wantsTrust(body));}
 /** Refresh a READ-ONLY admin session after a normal login on a previously approved browser.
  * Server-side membership + active session + MFA enrollment + expiry are all mandatory.
  * A stolen password alone (or a forged role in DevTools) cannot create trusted access.
  * The token remains independent of the main session cookie and is never sent to JS.
  */
 async restoreTrustedSession(req:Request){
  this.assertConfig();const user=await this.membership(req);
  const token=this.auth.getToken(req),trusted=trustedToken(req);
  if(!token||!trusted)return {restored:false};
  const restored=await this.db.transaction(async client=>{
   const row=await client.query(`SELECT d.token_hash FROM admin_trusted_devices d
     JOIN admin_mfa_credentials m ON m.user_id=d.user_id AND m.enabled_at IS NOT NULL AND m.enabled_at<=d.created_at
     JOIN sessions s ON s.user_id=d.user_id AND s.token_hash=$3 AND s.expires_at>clock_timestamp()
     WHERE d.user_id=$1 AND d.token_hash=$2 AND d.expires_at>clock_timestamp()
     FOR UPDATE OF d`,[user.id,digest(trusted),digest(token)]);
   if(!row.rows[0])return false;
   // Never downgrade a recent, genuinely verified TOTP session to remembered-device assurance.
   await client.query(`INSERT INTO admin_session_assurance(token_hash,user_id,verified_at,method)
     VALUES($1,$2,NOW(),'trusted_device') ON CONFLICT(token_hash) DO UPDATE
     SET verified_at=CASE WHEN admin_session_assurance.method='totp' AND admin_session_assurance.verified_at>NOW()-INTERVAL '12 hours'
      THEN admin_session_assurance.verified_at ELSE NOW() END,
      method=CASE WHEN admin_session_assurance.method='totp' AND admin_session_assurance.verified_at>NOW()-INTERVAL '12 hours'
      THEN 'totp' ELSE 'trusted_device' END`,[digest(token),user.id]);
   await client.query('UPDATE admin_trusted_devices SET last_used_at=clock_timestamp() WHERE token_hash=$1',[digest(trusted)]);
   return true;
  });
  return {restored};
 }
 private async rememberBrowser(req:Request,res:Response,userId:string){
  const session=this.auth.getToken(req);
  if(!session)throw new UnauthorizedException('Phiên đăng nhập hết hạn');
  const raw=randomBytes(32).toString('hex');
  const inserted=await this.db.query(`INSERT INTO admin_trusted_devices(token_hash,user_id,expires_at,device_label)
    SELECT $1,$2,NOW()+INTERVAL '30 days',LEFT($4,120) FROM sessions s
    WHERE s.token_hash=$3 AND s.user_id=$2 AND s.expires_at>clock_timestamp() RETURNING token_hash`,
    [digest(raw),userId,digest(session),String(req.headers['user-agent']||'Thiết bị tin cậy').replace(/[\x00-\x1f\x7f<>]/g,'').slice(0,120)]);
  if(!inserted.rows[0])throw new UnauthorizedException('Phiên đăng nhập hết hạn');
  res.cookie(TRUST_COOKIE,raw,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production',maxAge:TRUST_DAYS*86400000,path:'/api/auth'});
 }
 async revokeTrustedDevices(req:Request,res:Response){
  const user=await this.membership(req);await this.requireAdmin(req,false,true);
  await this.db.transaction(async client=>{
   await this.assertWriteInTransaction(client,req,user.id,false);
   await client.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[user.id]);
   // Existing remembered sessions must lose read assurance as well as future restore tokens.
   await client.query("DELETE FROM admin_session_assurance WHERE user_id=$1 AND method='trusted_device'",[user.id]);
   await client.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,'mfa.trusted-devices.revoked',user.id]);
  });
  res.clearCookie(TRUST_COOKIE,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production',path:'/api/auth'});
  return {revoked:true};
 }

 private async verifyInternal(req:Request,res:Response,code:string,enrolling:boolean,trustDevice:boolean){
  this.assertConfig();const user=await this.membership(req);
  const token=this.auth.getToken(req);
  if(!token)throw new UnauthorizedException('Cần đăng nhập lại');
  const result=await this.db.transaction(async client=>{
   const {rows}=await client.query<CredentialRow>('SELECT secret_encrypted,enabled_at,last_accepted_step,failed_attempts,locked_until FROM admin_mfa_credentials WHERE user_id=$1 FOR UPDATE',[user.id]);
   const row=rows[0];
   if(!row||(!enrolling&&!row.enabled_at)||(enrolling&&row.enabled_at))return {status:'not-eligible'};
   if(row.locked_until && row.locked_until.getTime()>Date.now())return {status:'locked'};
   if(row.locked_until){await client.query('UPDATE admin_mfa_credentials SET failed_attempts=0,locked_until=NULL WHERE user_id=$1',[user.id]);}
   // Ciphertext decryption fails closed if the operator rotates/loses the MFA key.
   let secret:string;
   try{secret=decryptTotpSecret(row.secret_encrypted,user.id);}catch{throw new ServiceUnavailableException('Không thể xác minh MFA, liên hệ quản trị hệ thống');}
   const matched=matchTotpStep(secret,code);
   if(matched===null||matched<=Number(row.last_accepted_step)){
    await client.query(`UPDATE admin_mfa_credentials SET failed_attempts=failed_attempts+1,
      locked_until=CASE WHEN failed_attempts+1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE locked_until END
      WHERE user_id=$1`,[user.id]);
    await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'admin.mfa.failed']);
    return {status:'invalid'};
   }
   // An admin session may have been revoked in a parallel transaction.
   const active=await client.query('SELECT token_hash FROM sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>clock_timestamp() FOR UPDATE',[digest(token),user.id]);
   if(!active.rows[0])return {status:'expired'};
   await client.query(`UPDATE admin_mfa_credentials SET last_accepted_step=$2,failed_attempts=0,locked_until=NULL,
     enabled_at=COALESCE(enabled_at,clock_timestamp()) WHERE user_id=$1`,[user.id,matched]);
   await client.query(`INSERT INTO admin_session_assurance(token_hash,user_id,verified_at,method) VALUES($1,$2,NOW(),'totp')
     ON CONFLICT (token_hash) DO UPDATE SET verified_at=NOW(),method='totp'`,[digest(token),user.id]);
   await client.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,enrolling?'mfa.enrolled':'mfa.verified',user.id]);
   return {status:'ok'};
  });
  if(result.status==='locked')throw new HttpException('Quá nhiều lần xác minh MFA; thử lại sau',HttpStatus.TOO_MANY_REQUESTS);
  if(result.status!=='ok')throw new UnauthorizedException('Mã MFA không hợp lệ, đã dùng hoặc phiên hết hạn');
  if(trustDevice)await this.rememberBrowser(req,res,user.id);
  return {verified:true,mfaEnabled:true};
 }
 /** Every admin read requires verified MFA; writes require recent re-verification. */
 async requireAdmin(req:Request,owner=false,sensitive=false){
  // Identify the caller first: anonymous -> 401, non-admin -> 403.
  // An authenticated administrator still fails closed when MFA is not configured.
  const user=await this.membership(req);
  this.assertConfig();
  if(owner&&user.role!=='owner')throw new ForbiddenException('Cần quyền chủ hệ thống');
  const token=this.auth.getToken(req);
  if(!token)throw new UnauthorizedException('Cần đăng nhập lại');
  const passed=await this.db.query(`SELECT 1 FROM admin_session_assurance s JOIN admin_mfa_credentials m ON m.user_id=s.user_id
    WHERE s.token_hash=$1 AND s.user_id=$2 AND m.enabled_at IS NOT NULL
    AND s.verified_at>clock_timestamp()-($3::integer*INTERVAL '1 minute')
    AND ($4::boolean=false OR s.method='totp')`,[digest(token),user.id,sensitive?10:720,sensitive]);
  if(!passed.rows[0])throw new ForbiddenException('MFA bắt buộc: xác minh tại /api/auth/mfa/verify');
  await this.assertCapability(this.db,req,user.id,user.role);
  return user;
 }
 private async assertCapability(client:{query:Function},req:Request,userId:string,role:string){
  const capability=requestCapability(req);if(role==='owner'||!capability)return;
  const result=await client.query('SELECT capabilities FROM admin_permission_sets WHERE user_id=$1',[userId]);
  if(!effectiveCapabilities(role,result.rows[0]?.capabilities).includes(capability))throw new ForbiddenException('Bạn chưa được cấp quyền cho thao tác tại phân hệ này');
 }
 /** Recheck under same transaction as the protected mutation (prevent TOCTOU). */
 async assertWriteInTransaction(client:import('pg').PoolClient,req:Request,userId:string,owner:boolean){
  const hash=digest(this.auth.getToken(req));
  const found=await client.query(`SELECT m.role FROM admin_memberships m JOIN sessions s ON s.user_id=m.user_id
    JOIN admin_session_assurance a ON a.user_id=m.user_id AND a.token_hash=s.token_hash
    JOIN admin_mfa_credentials c ON c.user_id=m.user_id AND c.enabled_at IS NOT NULL
    WHERE m.user_id=$1 AND s.token_hash=$2 AND s.expires_at>clock_timestamp()
    AND a.method='totp' AND a.verified_at>clock_timestamp()-INTERVAL '10 minutes'
    AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=m.user_id)
    FOR UPDATE OF s`,[userId,hash]);
  if(!found.rows[0]||(owner&&found.rows[0].role!=='owner'))throw new ForbiddenException('MFA cần xác minh lại trước thao tác nhạy cảm');
  await this.assertCapability(client,req,userId,found.rows[0].role);
 }
}
