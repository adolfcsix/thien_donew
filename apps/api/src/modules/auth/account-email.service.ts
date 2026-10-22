import { Injectable, BadRequestException, UnauthorizedException, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../common/database.service';
import { AuthService } from './auth.service';
import { sendVerificationCode } from './email-code';
function key(){const value=process.env.AUTH_OTP_SECRET;if(!value||value.length<32)throw new ServiceUnavailableException('Chưa cấu hình xác minh email');return value;}
function hash(secret:string,id:string,code:string){return createHmac('sha256',secret).update('thiendo:email-verify:'+id+':'+code).digest('hex');}
function isUuid(value:unknown):value is string {return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
@Injectable()
export class AccountEmailService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService){}
 async status(req:Request){const user=await this.auth.required(req);const row=await this.db.query('SELECT email_verified_at AS "verifiedAt" FROM users WHERE id=$1',[user.id]);return {verified:!!row.rows[0]?.verifiedAt, verifiedAt:row.rows[0]?.verifiedAt||null};}
 async send(req:Request){const user=await this.auth.required(req);const secret=key();const id=randomUUID(),code=String(randomInt(0,1_000_000)).padStart(6,'0');
  const decision=await this.db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20261115))',['email:'+user.id]);
   const current=await client.query<{email:string;email_verified_at:Date|null}>('SELECT email,email_verified_at FROM users WHERE id=$1 FOR UPDATE',[user.id]);
   if(!current.rows[0])throw new UnauthorizedException();
   if(current.rows[0].email_verified_at)return {alreadyVerified:true};
   const recent=await client.query<{minute:string;hour:string}>(`SELECT COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '60 seconds')::text AS minute,
    COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '1 hour')::text AS hour
    FROM account_email_verifications WHERE user_id=$1`,[user.id]);
   if(Number(recent.rows[0].minute)>0||Number(recent.rows[0].hour)>=6)throw new HttpException('Đã gửi mã gần đây, vui lòng thử sau',HttpStatus.TOO_MANY_REQUESTS);
   await client.query(`INSERT INTO account_email_verifications(id,user_id,code_hash,expires_at)
      VALUES($1,$2,$3,NOW()+INTERVAL '5 minutes')`,[id,user.id,hash(secret,id,code)]);
   return {email:current.rows[0].email};
  });
  if('alreadyVerified' in decision)return {alreadyVerified:true};
  try{await sendVerificationCode(decision.email,code,'email');}
  catch(error){await this.db.query('DELETE FROM account_email_verifications WHERE id=$1 AND used_at IS NULL',[id]).catch(()=>{});throw error;}
  return {sent:true,challengeId:id,expiresInSeconds:300};
 }
 async verify(req:Request,body:unknown){const user=await this.auth.required(req),secret=key();
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');
  const {challengeId,code}=body as Record<string,unknown>;
  if(!isUuid(challengeId)||typeof code!=='string'||!/^[0-9]{6}$/.test(code))throw new BadRequestException('Mã email không hợp lệ');
  const result=await this.db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20261115))',['email:'+user.id]);
   const current=await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);if(!current.rows[0])return false;
   const found=await client.query<{code_hash:string;attempts:number;valid:boolean}>(`SELECT code_hash,attempts,
      (used_at IS NULL AND expires_at>clock_timestamp()) AS valid
      FROM account_email_verifications WHERE id=$1 AND user_id=$2 FOR UPDATE`,[challengeId,user.id]);
   const challenge=found.rows[0];if(!challenge||!challenge.valid||challenge.attempts>=5)return false;
   const candidate=Buffer.from(hash(secret,challengeId,code),'hex');
   const stored=/^[0-9a-f]{64}$/i.test(challenge.code_hash)?Buffer.from(challenge.code_hash,'hex'):Buffer.alloc(32);
   if(!timingSafeEqual(candidate,stored)){
    await client.query('UPDATE account_email_verifications SET attempts=attempts+1 WHERE id=$1',[challengeId]);
    await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'email.verify.failed']);return false;
   }
   await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1',[user.id]);
   await client.query('UPDATE account_email_verifications SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
   await client.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[user.id,'email.verified']);return true;
  });
  if(!result)throw new UnauthorizedException('Mã email không đúng hoặc hết hạn');
  return {verified:true};
 }
}
