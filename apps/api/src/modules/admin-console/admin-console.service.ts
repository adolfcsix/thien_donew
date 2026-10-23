import {Injectable,BadRequestException,ConflictException,NotFoundException,ForbiddenException} from '@nestjs/common';
import type {Request} from 'express';
import type {PoolClient} from 'pg';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {object,text,integer} from '../billing/billing.service';
import {assertChartId} from '../../common/identifiers';
import {ADMIN_CAPABILITIES,effectiveCapabilities,assertContentPublishing} from './permissions';
function pageQuery(q:Record<string,string>){const page=Number(q.page||1);if(!Number.isSafeInteger(page)||page<1||page>10000)throw new BadRequestException('Trang không hợp lệ');const search=(q.q||'').trim();if(search.length>100)throw new BadRequestException('Từ khóa quá dài');return {page,search,offset:(page-1)*20};}
function reason(raw:unknown){const value=text(raw,500);if(value.length<8)throw new BadRequestException('Lý do cần ít nhất 8 ký tự');return value;}
@Injectable()
export class AdminConsoleService{
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly mfa:AdminMfaService){}
 /** Own display identity only, never permission to execute an admin operation. */
 async identity(req:Request){const user=await this.auth.required(req);const r=await this.db.query(`SELECT m.role,ARRAY(SELECT b.level FROM admin_badge_showcase b WHERE b.user_id=m.user_id ORDER BY b.position) AS "showcaseLevels",COALESCE(p.badge_style,'gate') AS "badgeStyle",COALESCE(p.badge_tone,CASE WHEN m.role='owner' THEN 'gold' ELSE 'jade' END) AS "badgeTone",COALESCE(p.motto,'') AS motto FROM admin_memberships m LEFT JOIN admin_profile_preferences p ON p.user_id=m.user_id WHERE m.user_id=$1 AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=m.user_id)`,[user.id]);return {identity:r.rows[0]||null};}
 async session(req:Request){const user=await this.mfa.requireAdmin(req);const r=await this.db.query('SELECT capabilities FROM admin_permission_sets WHERE user_id=$1',[user.id]);return {...await this.identity(req),capabilities:effectiveCapabilities(user.role,r.rows[0]?.capabilities),allCapabilities:ADMIN_CAPABILITIES};}
 /** Operational metadata only. Each optional domain is checked before its SQL runs. */
 async member(req:Request,id:string){
  const actor=await this.mfa.requireAdmin(req);assertChartId(id);
  const readCaps=async(role:string)=>effectiveCapabilities(role,(await this.db.query('SELECT capabilities FROM admin_permission_sets WHERE user_id=$1',[actor.id])).rows[0]?.capabilities);
  const caps=await readCaps(actor.role),used=['members.read'];
  if(!caps.includes('members.read'))throw new ForbiddenException('Cần quyền xem thành viên');
  const member=(await this.db.query(`SELECT u.id,u.email,u.username,u.display_name AS "displayName",u.created_at AS "createdAt",
    u.email_verified_at IS NOT NULL AS "emailVerified",m.role,b.user_id IS NOT NULL AS blocked,
    (SELECT count(*)::int FROM sessions s WHERE s.user_id=u.id AND s.expires_at>clock_timestamp()) AS "activeSessions"
    FROM users u LEFT JOIN admin_memberships m ON m.user_id=u.id LEFT JOIN account_blocks b ON b.user_id=u.id WHERE u.id=$1`,[id])).rows[0];
  if(!member)throw new NotFoundException('Không có tài khoản này');
  const expert=(await this.db.query(`SELECT specialty,granted_at AS "grantedAt",revoked_at AS "revokedAt" FROM expert_credentials WHERE user_id=$1`,[id])).rows[0]||null;
  let pro:unknown=null,rankDecisions:unknown=null,audit:unknown=null;
  const restricted:string[]=[];
  if(caps.includes('finance.read')){
   used.push('finance.read');
   const summary=(await this.db.query(`SELECT count(*)::int AS "activeGrants",COALESCE(bool_or(expires_at IS NULL),false) AS "hasLifetime",MAX(expires_at) AS "expiresAt" FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND (expires_at IS NULL OR expires_at>clock_timestamp())`,[id])).rows[0];
   const grants=(await this.db.query(`SELECT id,features,starts_at AS "startsAt",expires_at AS "expiresAt",revoked_at AS "revokedAt",order_id AS "orderId",
     revoked_at IS NULL AND starts_at<=clock_timestamp() AND (expires_at IS NULL OR expires_at>clock_timestamp()) AS active
     FROM pro_entitlements WHERE user_id=$1 ORDER BY starts_at DESC,id DESC LIMIT 20`,[id])).rows;
   pro={...summary,grants};
  }else restricted.push('finance');
  if(caps.includes('ranks.read')){
   used.push('ranks.read');
   rankDecisions=(await this.db.query(`SELECT g.id::text AS id,g.level,g.reason,g.created_at AS "createdAt",r.created_at AS "revokedAt"
     FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id WHERE g.user_id=$1 ORDER BY g.id DESC LIMIT 10`,[id])).rows;
  }else restricted.push('ranks');
  if(caps.includes('audit.read')){
   used.push('audit.read');
   audit=(await this.db.query(`SELECT id::text,action,created_at AS "createdAt" FROM admin_audit WHERE target=$1 ORDER BY admin_audit.id DESC LIMIT 10`,[id])).rows;
  }else restricted.push('audit');
  // A request already in flight must not return domain data after scope/MFA revocation.
  const current=await this.mfa.requireAdmin(req),currentCaps=await readCaps(current.role);
  if(current.id!==actor.id||used.some(cap=>!currentCaps.includes(cap)))throw new ForbiddenException('Quyền vừa thay đổi. Hãy tải lại hồ sơ quản trị.');
  return {member,expert,pro,rankDecisions,audit,restricted};
 }
 private async write(req:Request,owner:boolean,action:string,target:string,details:unknown,work:(c:PoolClient,actor:string)=>Promise<unknown>){const actor=await this.mfa.requireAdmin(req,owner,true);return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(20261014,13)');await this.mfa.assertWriteInTransaction(c,req,actor.id,owner);
  const result=await work(c,actor.id);await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,action,target,JSON.stringify(details)]);return result;
 });}
 async profile(req:Request,raw:unknown){const b=object(raw);if(!['gate','orbit','seal'].includes(String(b.badgeStyle))||!['gold','jade','azure'].includes(String(b.badgeTone)))throw new BadRequestException('Mẫu huy hiệu không hợp lệ');const showcase=b.showcaseLevels;if(showcase!==undefined&&(!Array.isArray(showcase)||showcase.length>18||showcase.some(v=>!Number.isInteger(v)||v<1||v>18)||new Set(showcase).size!==showcase.length))throw new BadRequestException('Bộ huy hiệu cần các cảnh giới riêng biệt từ 1 đến 18');const motto=typeof b.motto==='string'?b.motto.trim():'';if(motto.length>120)throw new BadRequestException('Lời giới thiệu tối đa 120 ký tự');return this.write(req,false,'admin.profile','self',{badgeStyle:b.badgeStyle,badgeTone:b.badgeTone,...(showcase!==undefined?{showcaseLevels:showcase}:{})},async(c,actor)=>{await c.query(`INSERT INTO admin_profile_preferences(user_id,badge_style,badge_tone,motto) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET badge_style=$2,badge_tone=$3,motto=$4,updated_at=clock_timestamp()`,[actor,b.badgeStyle,b.badgeTone,motto]);if(showcase!==undefined){await c.query('DELETE FROM admin_badge_showcase WHERE user_id=$1',[actor]);await c.query('INSERT INTO admin_badge_showcase(user_id,level,position) SELECT $1,level,ord-1 FROM unnest($2::smallint[]) WITH ORDINALITY AS s(level,ord)',[actor,showcase]);}return {updated:true};});}
 async members(req:Request,q:Record<string,string>,team=false){await this.mfa.requireAdmin(req,team);const {page,search,offset}=pageQuery(q);const filter=q.status||'all';if(!['all','admin','member','blocked'].includes(filter))throw new BadRequestException('Bộ lọc không hợp lệ');const where=`WHERE (u.email ILIKE $1 OR COALESCE(u.username,'') ILIKE $1 OR COALESCE(u.display_name,'') ILIKE $1) AND ($2='all' OR ($2='admin' AND m.role IS NOT NULL) OR ($2='member' AND m.role IS NULL) OR ($2='blocked' AND b.user_id IS NOT NULL))`;
 const from='FROM users u LEFT JOIN admin_memberships m ON m.user_id=u.id LEFT JOIN account_blocks b ON b.user_id=u.id';const count=await this.db.query(`SELECT count(*)::int AS total ${from} ${where}`,['%'+search+'%',filter]);
 const rows=await this.db.query(`SELECT u.id,u.email,u.username,u.display_name AS "displayName",u.created_at AS "createdAt",u.email_verified_at IS NOT NULL AS "emailVerified",m.role,b.user_id IS NOT NULL AS blocked,(SELECT count(*)::int FROM sessions s WHERE s.user_id=u.id AND s.expires_at>clock_timestamp()) AS "activeSessions",COALESCE(p.revision,0) AS "permissionRevision"${team?',p.capabilities':''} ${from} LEFT JOIN admin_permission_sets p ON p.user_id=u.id ${where} ORDER BY u.created_at DESC,u.id LIMIT 20 OFFSET $3`,['%'+search+'%',filter,offset]);return {users:rows.rows,page,total:count.rows[0].total};}
 async team(req:Request,id:string,raw:unknown){assertChartId(id);const b=object(raw),why=reason(b.reason),expected=integer(b.expectedRevision,0,2147483647);if(!['admin','member'].includes(String(b.role))||!['admin','member'].includes(String(b.expectedRole))||!Array.isArray(b.capabilities)||b.capabilities.length>ADMIN_CAPABILITIES.length||!b.capabilities.every(x=>typeof x==='string'&&ADMIN_CAPABILITIES.includes(x))||new Set(b.capabilities).size!==b.capabilities.length)throw new BadRequestException('Phạm vi quyền không hợp lệ');const caps=b.capabilities;
 if((caps.includes('content.publish')||caps.includes('content.delete'))&&!caps.includes('content.write'))throw new BadRequestException('Xuất bản và quản lý thùng rác cần kèm quyền biên tập');
 if(caps.some(c=>c.endsWith('.write')&&!caps.includes(c.replace('.write','.read'))))throw new BadRequestException('Quyền thao tác cần kèm quyền xem cùng phân hệ');
 return this.write(req,true,'admin.permissions',id,{role:b.role,capabilities:caps,reason:why},async(c,actor)=>{
  if(actor===id)throw new ConflictException('Không tự thay quyền của chính mình');if(!(await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0])throw new NotFoundException();
  const current=(await c.query('SELECT role FROM admin_memberships WHERE user_id=$1',[id])).rows[0];if(current?.role==='owner')throw new ConflictException('Không thay chủ hệ thống qua giao diện');
  const config=(await c.query('SELECT revision FROM admin_permission_sets WHERE user_id=$1',[id])).rows[0];if((config?.revision||0)!==expected||(current?'admin':'member')!==b.expectedRole)throw new ConflictException('Quyền vừa được thay đổi. Tải lại trước khi lưu.');
  if(b.role==='admin'&&(await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[id])).rows[0])throw new ConflictException('Mở khóa tài khoản trước khi cấp quản trị');
  if(b.role==='admin')await c.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'admin') ON CONFLICT(user_id) DO NOTHING",[id]);else await c.query('DELETE FROM admin_memberships WHERE user_id=$1',[id]);
  await c.query(`INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET capabilities=$2,revision=admin_permission_sets.revision+1,updated_at=clock_timestamp()`,[id,JSON.stringify(b.role==='admin'?caps:[])]);
  await c.query('DELETE FROM sessions WHERE user_id=$1',[id]);await c.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[id]);await c.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[id,'admin.permissions.changed']);return {updated:true,sessionsRevoked:true};
 });}
 async revokeSessions(req:Request,id:string,raw:unknown){assertChartId(id);const why=reason(object(raw).reason);return this.write(req,true,'user.sessions.revoke',id,{reason:why},async(c,actor)=>{if(id===actor)throw new ConflictException('Dùng Hồ sơ & Bảo mật để quản lý phiên của bạn');const user=(await c.query('SELECT u.id,m.role FROM users u LEFT JOIN admin_memberships m ON m.user_id=u.id WHERE u.id=$1 FOR UPDATE OF u',[id])).rows[0];if(!user)throw new NotFoundException();if(user.role==='owner')throw new ConflictException('Không thu hồi phiên Owner qua thao tác này');const r=await c.query('DELETE FROM sessions WHERE user_id=$1 RETURNING token_hash',[id]);await c.query('DELETE FROM admin_trusted_devices WHERE user_id=$1',[id]);return {updated:true,revoked:r.rowCount};});}
 async posts(req:Request,q:Record<string,string>){await this.mfa.requireAdmin(req);const {page,search,offset}=pageQuery(q),status=q.status||'all';if(!['all','draft','published','deleted'].includes(status))throw new BadRequestException();const where=`WHERE (title ILIKE $1 OR slug ILIKE $1) AND (($2='deleted' AND deleted_at IS NOT NULL) OR ($2<>'deleted' AND deleted_at IS NULL AND ($2='all' OR ($2='published' AND published) OR ($2='draft' AND NOT published))))`;const params=['%'+search+'%',status];const total=await this.db.query(`SELECT count(*)::int AS total FROM content_posts ${where}`,params);const r=await this.db.query(`SELECT id,slug,title,published,revision,deleted_at AS "deletedAt",updated_at AS "updatedAt" FROM content_posts ${where} ORDER BY updated_at DESC,id LIMIT 20 OFFSET $3`,[...params,offset]);return {posts:r.rows,page,total:total.rows[0].total};}
 async post(req:Request,id:string){await this.mfa.requireAdmin(req);assertChartId(id);const post=(await this.db.query('SELECT id,slug,title,body,published,revision,deleted_at AS "deletedAt" FROM content_posts WHERE id=$1',[id])).rows[0];if(!post)throw new NotFoundException();const history=await this.db.query('SELECT v.revision,v.action,u.email AS actor,v.created_at AS "createdAt" FROM content_post_versions v LEFT JOIN users u ON u.id=v.actor_id WHERE v.post_id=$1 ORDER BY v.revision DESC LIMIT 30',[id]);return {post,history:history.rows};}
 async transition(req:Request,id:string,action:string,raw:unknown){assertChartId(id);const b=object(raw),revision=integer(b.revision,1,2147483647),why=reason(b.reason);if(!['delete','restore','publish','unpublish','rollback'].includes(action))throw new BadRequestException();const source=action==='rollback'?integer(b.sourceRevision,1,2147483647):null;
 return this.write(req,false,'content.'+action,id,{reason:why,sourceRevision:source},async(c,actor)=>{
  const post=(await c.query('SELECT * FROM content_posts WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!post)throw new NotFoundException();if(post.revision!==revision)throw new ConflictException('Bài viết vừa thay đổi. Tải lại trước khi thao tác.');if(action==='restore'?!post.deleted_at:!!post.deleted_at)throw new ConflictException('Trạng thái bài không phù hợp');
  if(action==='rollback'&&post.published)await assertContentPublishing(c,actor);
  let {slug,title,body}=post;let published=action==='publish',deleted=action==='delete';
  if(action==='rollback'){const old=(await c.query('SELECT snapshot FROM content_post_versions WHERE post_id=$1 AND revision=$2',[id,source])).rows[0];if(!old)throw new NotFoundException('Không có phiên bản đã chọn');({slug,title,body}=old.snapshot);}
  if((await c.query('SELECT id FROM content_posts WHERE slug=$1 AND id<>$2',[slug,id])).rows[0])throw new ConflictException('Đường dẫn phiên bản cũ đã được dùng');
  const r=await c.query(`UPDATE content_posts SET slug=$2,title=$3,body=$4,published=$5,deleted_at=CASE WHEN $6 THEN clock_timestamp() ELSE NULL END,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING revision`,[id,slug,title,body,published,deleted]);
  await c.query('INSERT INTO content_post_versions(post_id,revision,snapshot,actor_id,action) VALUES($1,$2,$3,$4,$5)',[id,r.rows[0].revision,JSON.stringify({slug,title,body,published}),actor,action]);return {updated:true,revision:r.rows[0].revision};
 });}
 async audit(req:Request,q:Record<string,string>){await this.mfa.requireAdmin(req);const {page,search,offset}=pageQuery(q);const where=`WHERE (a.action ILIKE $1 OR a.target ILIKE $1 OR COALESCE(u.email,'') ILIKE $1)`;const params=['%'+search+'%'];const total=await this.db.query(`SELECT count(*)::int AS total FROM admin_audit a LEFT JOIN users u ON u.id=a.actor_id ${where}`,params);const r=await this.db.query(`SELECT a.id::text,a.action,a.target,a.details,u.email AS actor,a.created_at AS "createdAt" FROM admin_audit a LEFT JOIN users u ON u.id=a.actor_id ${where} ORDER BY a.id DESC LIMIT 20 OFFSET $2`,[...params,offset]);return {events:r.rows,page,total:total.rows[0].total};}
}
