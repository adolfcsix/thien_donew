import {BadRequestException,ConflictException,ForbiddenException,HttpException,HttpStatus,Injectable,NotFoundException} from '@nestjs/common';
import type {Request} from 'express';
import type {PoolClient} from 'pg';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import Rules = require('../../../../../packages/knowledge/src/tinh-canh-ranks.cjs');
import SpecialtyCatalog = require('../../../../../packages/knowledge/src/specialty-badges.cjs');
const specialtyCatalog=SpecialtyCatalog as ReadonlyArray<{id:string;name:string;subject:string;symbol:string;tone:string;description:string}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function id(x:unknown):string{if(typeof x!=='string'||!UUID.test(x))throw new BadRequestException('Mã đối tượng không hợp lệ');return x;}
function payload(x:unknown){if(!x||typeof x!=='object'||Array.isArray(x))throw new BadRequestException('Dữ liệu không hợp lệ');return x as Record<string,unknown>;}
function sourceType(k:unknown):{kind:string;direction:string;points:number;source:string}{if(typeof k!=='string'||!Object.prototype.hasOwnProperty.call(Rules.awards,k))throw new BadRequestException('Loại điểm không hợp lệ');return {kind:k,...Rules.awards[k]};}
function offsetNumber(raw:unknown){if(raw===undefined)return 0;if(typeof raw!=='string'||!/^(0|[1-9][0-9]{0,2})$/.test(raw))throw new BadRequestException('Phân trang không hợp lệ');const x=Number(raw);if(x>250)throw new BadRequestException('Phân trang không hợp lệ');return x;}
function subjectName(x:unknown):string{if(typeof x!=='string')return 'nghien-cuu';const value=x.trim().toLowerCase().replace(/\s+/g,'-');const translated:Record<string,string>={bazi:'bat-tu','western-astrology':'chiem-tinh',general:'nghien-cuu'};const result=translated[value]||value;return /^[a-z0-9-]{2,60}$/.test(result)?result:'nghien-cuu';}
@Injectable()
export class TinhCanhService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly mfa:AdminMfaService){}
 /** Public only includes active honorary badges; never expose administrator notes or account data. */
 private async activeSpecialtyBadges(userId:string){
  const found=await this.db.query<{badgeId:string;grantedAt:string}>(`SELECT g.badge_id AS "badgeId", g.granted_at AS "grantedAt"
   FROM specialty_badge_grants g LEFT JOIN specialty_badge_revocations r ON r.grant_id=g.id
   WHERE g.user_id=$1 AND r.grant_id IS NULL ORDER BY g.id DESC LIMIT 20`,[userId]);
  return found.rows.filter(row=>specialtyCatalog.some(entry=>entry.id===row.badgeId));
 }
 private async totals(userId:string,subject='',direction=''){
   const [items,legacy]=await Promise.all([
    this.db.query<{direction:string;points:string;events:string}>(`SELECT a.direction,COALESCE(SUM(a.points),0)::text AS points,COUNT(*)::text AS events
       FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id
       WHERE a.user_id=$1 AND r.id IS NULL AND ($2='' OR a.subject=$2) AND ($3='' OR a.direction=$3) GROUP BY a.direction`,[userId,subject,direction]),
    this.db.query<{points:string;events:string}>(`SELECT COALESCE(SUM(GREATEST(points,0)),0)::text AS points, COUNT(*)::text AS events FROM (
      SELECT SUM(l.points)::integer AS points FROM forum_tinh_van_ledger l
      JOIN forum_comments c ON c.id=l.comment_id JOIN forum_threads t ON t.id=c.thread_id
      WHERE l.user_id=$1 AND c.state='visible' AND t.state='visible' AND t.visibility='public' AND ($2='' OR t.category_id=$2) AND ($3='' OR $3='luan-gia')
      GROUP BY l.comment_id HAVING SUM(l.points)>0
    ) v`,[userId,subject,direction])
   ]);
   const counts:Record<string,number>={},score=items.rows.reduce((sum,r)=>{counts[r.direction]=Number(r.events);return sum+Number(r.points)},0);
   const earned=Rules.evaluate(score,counts,Number(legacy.rows[0]?.points||0),Number(legacy.rows[0]?.events||0));
   // Manual rank assignment NEVER increases points or unlocks contribution milestones.
   // The most recent non-revoked manual assignment takes precedence for the visible badge.
   const grant=await this.db.query<{id:string;level:number;reason:string;createdAt:string}>(`SELECT g.id::text AS id,g.level,g.reason,g.created_at AS "createdAt"
     FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
     WHERE g.user_id=$1 AND r.id IS NULL ORDER BY g.id DESC LIMIT 1`,[userId]);
   const manual=grant.rows[0];
   return {...earned,earnedRank:earned.rank,rank:manual?Rules.ranks[Number(manual.level)-1]:earned.rank,
    rankSource:manual?'admin':'earned',adminGrant:manual?{id:manual.id,createdAt:manual.createdAt}:null};
 }
 async rules(){return {ruleset:Rules.RULESET,ranks:Rules.ranks,directions:Rules.directions,awardKinds:Object.entries(Rules.awards).map(([kind,v])=>({kind,direction:v.direction})),policy:'Điểm do backend xác minh và ghi sổ; hành động lặp và treo máy không tự sinh điểm.'};}
 async mine(req:Request){const actor=await this.auth.required(req);const progress=await this.totals(actor.id);const rows=await this.db.query(`SELECT a.id,a.kind,a.direction,a.subject,a.points,a.created_at AS "createdAt",r.id IS NOT NULL AS reversed FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id WHERE a.user_id=$1 ORDER BY a.id DESC LIMIT 60`,[actor.id]);const pref=await this.db.query<{public_rank:boolean}>('SELECT public_rank FROM tinh_canh_preferences WHERE user_id=$1',[actor.id]);const grants=await this.db.query(`SELECT g.id::text AS id,g.level,g.created_at AS "createdAt",r.created_at AS "revokedAt" FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id WHERE g.user_id=$1 ORDER BY g.id DESC LIMIT 30`,[actor.id]);return {progress,history:rows.rows,rankHistory:grants.rows,specialtyBadges:await this.activeSpecialtyBadges(actor.id),publicRank:pref.rows[0]?.public_rank??true};}
 async profile(req:Request,userId:string){id(userId);const viewer=await this.auth.me(req);if(viewer?.id===userId)return {progress:await this.totals(userId),specialtyBadges:await this.activeSpecialtyBadges(userId)};
  const allowed=await this.db.query(`SELECT 1 FROM users u WHERE u.id=$1 AND NOT EXISTS(SELECT 1 FROM tinh_canh_preferences p WHERE p.user_id=u.id AND p.public_rank=false) AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=u.id) AND NOT EXISTS(SELECT 1 FROM forum_suspensions s WHERE s.user_id=u.id AND s.expires_at>clock_timestamp())`,[userId]);if(!allowed.rows[0])throw new NotFoundException('Không có hồ sơ cảnh giới công khai');return {progress:await this.totals(userId),specialtyBadges:await this.activeSpecialtyBadges(userId)};}
 async privacy(req:Request,raw:unknown){const actor=await this.auth.required(req);const b=payload(raw);if(typeof b.publicRank!=='boolean')throw new BadRequestException('Chọn trạng thái hiển thị');await this.db.query(`INSERT INTO tinh_canh_preferences(user_id,public_rank) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET public_rank=EXCLUDED.public_rank,updated_at=clock_timestamp()`,[actor.id,b.publicRank]);return {publicRank:b.publicRank};}
 /** Aggregate complete verified ledger, then sort. Never trust client-supplied points or levels. */
 async leaderboard(q:Record<string,unknown>){
  const subject=q.subject===undefined?'':q.subject;if(typeof subject!=='string'||(subject&& !/^[a-z0-9-]{2,60}$/.test(subject)))throw new BadRequestException('Bộ môn không hợp lệ');
  const direction=q.direction===undefined?'':q.direction;if(typeof direction!=='string'||(direction&&!Rules.directions.some(value=>value===direction)))throw new BadRequestException('Hướng đóng góp không hợp lệ');
  const offset=offsetNumber(q.offset),limit=30;
  const sql=`WITH earned AS (
    SELECT a.user_id,SUM(a.points)::bigint AS points FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id
    WHERE r.id IS NULL AND ($1='' OR a.subject=$1) AND ($2='' OR a.direction=$2) GROUP BY a.user_id
   ), legacy AS (
    SELECT z.user_id,SUM(z.points)::bigint AS points FROM (
      SELECT l.user_id,l.comment_id,SUM(l.points)::bigint AS points FROM forum_tinh_van_ledger l
      JOIN forum_comments c ON c.id=l.comment_id JOIN forum_threads t ON t.id=c.thread_id
      WHERE c.state='visible' AND t.state='visible' AND t.visibility='public' AND ($1='' OR t.category_id=$1) AND ($2='' OR $2='luan-gia')
      GROUP BY l.user_id,l.comment_id HAVING SUM(l.points)>0
    ) z GROUP BY z.user_id
   ), manual AS (
    SELECT g.user_id,0::bigint AS points FROM tinh_canh_rank_grants g
    LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
    WHERE r.id IS NULL AND $1='' AND $2=''
   ), totals AS (
    SELECT user_id,SUM(points)::bigint AS points FROM (
      SELECT * FROM earned UNION ALL SELECT * FROM legacy UNION ALL SELECT * FROM manual
    ) raw GROUP BY user_id
   )
   SELECT t.user_id AS "userId",COALESCE(NULLIF(u.display_name,''),u.username,'Thành viên') AS "displayName",t.points::text AS points
   FROM totals t JOIN users u ON u.id=t.user_id
   WHERE (t.points>0 OR ($1='' AND $2='' AND EXISTS(
     SELECT 1 FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
     WHERE g.user_id=t.user_id AND r.id IS NULL))) AND NOT EXISTS(SELECT 1 FROM tinh_canh_preferences p WHERE p.user_id=t.user_id AND p.public_rank=false)
   AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=t.user_id) AND NOT EXISTS(SELECT 1 FROM forum_suspensions s WHERE s.user_id=t.user_id AND s.expires_at>clock_timestamp())
   ORDER BY t.points DESC,t.user_id ASC LIMIT $3 OFFSET $4`;
  const rows=await this.db.query<{userId:string;displayName:string;points:string}>(sql,[subject,direction,limit,offset]);
  // Public leaderboard ranking is ordered by verified scores, not paid Pro status or hours online.
  const entries=await Promise.all(rows.rows.map(async (r,i)=>{
    const score=await this.totals(r.userId,subject,direction);
    return {position:offset+i+1,userId:r.userId,displayName:r.displayName,points:Number(r.points),level:score.rank.level,rankName:score.rank.name,stage:score.rank.stageName,rankSource:score.rankSource};
  }));
  return {ruleset:Rules.RULESET,subject:subject||'all',direction:direction||'all',entries,nextOffset:rows.rows.length===limit&&offset+limit<=250?offset+limit:null};
 }
 private async verifiedSource(c:PoolClient,userId:string,kind:{source:string;kind:string},sourceId:string){
  if(kind.source==='study'){
   // Metadata-only ownership checks; never read birth details, snapshots or private notes.
   const r=await c.query('SELECT discipline FROM study_entries WHERE id=$1 AND user_id=$2',[sourceId,userId]);
   if(!r.rows[0])throw new NotFoundException('Minh chứng học tập không thuộc người nhận');
   return subjectName(r.rows[0].discipline?.toLowerCase().replace(/\s+/g,'-'));
  }
  if(kind.source==='document'){
   const r=await c.query('SELECT subject,tags,status,approved_by,created_by FROM van_kho_documents WHERE id=$1 FOR UPDATE',[sourceId]);const doc=r.rows[0];
   if(!doc||doc.created_by!==userId||doc.status!=='published'||!doc.approved_by||doc.approved_by===userId)throw new ConflictException('Bài chưa xuất bản hoặc chưa được duyệt độc lập');
   if(kind.kind==='research-reviewed'&&!(doc.tags||[]).some((t:string)=>/nghien-cuu|research|doi-chieu/i.test(t)))throw new ConflictException('Cần chứng cứ nghiên cứu trong nhãn của bài');
   return subjectName(doc.subject?.toLowerCase().replace(/\s+/g,'-'));
  }
  const r=await c.query(`SELECT c.author_id,c.state,t.visibility,t.state AS thread_state,t.category_id,
    (SELECT count(DISTINCT v.user_id)::int FROM forum_reactions v WHERE v.comment_id=c.id AND v.kind='helpful' AND v.user_id<>c.author_id) AS votes
    FROM forum_comments c JOIN forum_threads t ON t.id=c.thread_id WHERE c.id=$1 FOR UPDATE OF c`,[sourceId]);
  const row=r.rows[0];if(!row||row.author_id!==userId||row.state!=='visible'||row.thread_state!=='visible'||row.visibility!=='public'||Number(row.votes)<2)throw new ConflictException('Cần bình luận công khai có ít nhất 2 người độc lập xác nhận hữu ích');
  const historic=(await c.query(`SELECT COALESCE(SUM(points),0)::integer AS points FROM forum_tinh_van_ledger WHERE comment_id=$1`,[sourceId])).rows[0];
  if(Number(historic?.points)>0)throw new ConflictException('Minh chứng đã được cộng Tinh Văn ở Luận Đàn');
  if(kind.kind==='guide-verified'&&row.category_id!=='hoi-dap')throw new ConflictException('Hướng dẫn người mới phải thuộc chuyên mục Hỏi đáp');
  if(kind.kind==='discussion-verified'&&row.category_id==='hoi-dap')throw new ConflictException('Thảo luận ở Hỏi đáp đã có nhánh Người Dẫn Lối');
  return subjectName(row.category_id);
 }
 async award(req:Request,raw:unknown){const actor=await this.mfa.requireAdmin(req,false,true),b=payload(raw);
  const target=id(b.userId),source=id(b.sourceId),kind=sourceType(b.kind);if(target===actor.id)throw new ForbiddenException('Không tự ghi điểm');
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[actor.id,'tinhvan']);
   const rate=await c.query<{count:number}>(`INSERT INTO tinh_van_rate_limits(actor_id,window_start,count) VALUES($1,date_trunc('hour',clock_timestamp()),1)
    ON CONFLICT(actor_id,window_start) DO UPDATE SET count=tinh_van_rate_limits.count+1 RETURNING count`,[actor.id]);
   if(Number(rate.rows[0].count)>50)throw new HttpException('Giới hạn kiểm duyệt điểm theo giờ',HttpStatus.TOO_MANY_REQUESTS);
   // Serialize award quotas by recipient across *different* admins. Lock before the
   // daily count, so concurrent transactions cannot both admit the 10th award.
   const recipient=await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target]);
   if(!recipient.rows[0])throw new NotFoundException('Thành viên không tồn tại');
   if((await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[target])).rows[0])throw new ForbiddenException('Tài khoản bị hạn chế');
   if((await c.query('SELECT 1 FROM forum_suspensions WHERE user_id=$1 AND expires_at>clock_timestamp()',[target])).rows[0])throw new ForbiddenException('Tài khoản bị tạm khóa');
   const earned=(await c.query<{n:string}>(`SELECT count(*)::text AS n FROM tinh_van_awards WHERE user_id=$1 AND created_at>=date_trunc('day',clock_timestamp())`,[target])).rows[0];
   if(Number(earned?.n)>=10)throw new HttpException('Đạt giới hạn 10 minh chứng được duyệt mỗi ngày',HttpStatus.TOO_MANY_REQUESTS);
   const subject=await this.verifiedSource(c,target,kind,source);
   const ins=await c.query(`INSERT INTO tinh_van_awards(user_id,actor_id,kind,direction,subject,source_id,points,ruleset)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(source_id) DO NOTHING RETURNING id`,[target,actor.id,kind.kind,kind.direction,subject,source,kind.points,Rules.RULESET]);
   if(!ins.rows[0])throw new ConflictException('Minh chứng này đã được công nhận');
   await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,'tinhvan.award',target,JSON.stringify({awardId:ins.rows[0].id,kind:kind.kind,sourceId:source})]);
   return {awarded:true,awardId:ins.rows[0].id,category:kind.direction,points:kind.points};
  });
 }
 async revoke(req:Request,rawId:string,raw:unknown){const actor=await this.mfa.requireAdmin(req,false,true);const awardId=Number(rawId),b=payload(raw);
  if(!Number.isSafeInteger(awardId)||awardId<1||typeof b.reason!=='string'||b.reason.trim().length<12||b.reason.length>600)throw new BadRequestException('Cần lý do tối thiểu 12 ký tự');
  const reason=b.reason.trim();
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const a=await c.query('SELECT id,user_id FROM tinh_van_awards WHERE id=$1 FOR UPDATE',[awardId]);if(!a.rows[0])throw new NotFoundException();
   if(a.rows[0].user_id===actor.id)throw new ForbiddenException('Không tự điều chỉnh điểm');
   const r=await c.query(`INSERT INTO tinh_van_reversals(award_id,actor_id,reason) VALUES($1,$2,$3) ON CONFLICT(award_id) DO NOTHING RETURNING id`,[awardId,actor.id,reason]);
   if(!r.rows[0])throw new ConflictException('Điểm này đã bị thu hồi');
   await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,'tinhvan.revoke',a.rows[0].user_id,JSON.stringify({awardId,reason})]);
   return {revoked:true,awardId};
  });
 }
 /** Separate ceremonial titles. They do not change rank, Expert, paid access or role. */
 async specialtyBadgeCatalog(){return {badges:specialtyCatalog};}
 async specialtyBadgeGrants(req:Request){await this.mfa.requireAdmin(req);
  const rows=await this.db.query(`SELECT g.id::text AS id,g.user_id AS "userId",g.actor_id AS "actorId",g.badge_id AS "badgeId",
   g.reason,g.granted_at AS "grantedAt",r.revoked_at AS "revokedAt",r.reason AS "revocationReason"
   FROM specialty_badge_grants g LEFT JOIN specialty_badge_revocations r ON r.grant_id=g.id
   ORDER BY g.id DESC LIMIT 100`);
  return {grants:rows.rows};
 }
 async grantSpecialtyBadge(req:Request,raw:unknown){
  const actor=await this.mfa.requireAdmin(req,false,true),body=payload(raw);
  const target=id(body.userId),badgeId=body.badgeId,reason=body.reason;
  if(typeof badgeId!=='string'||!specialtyCatalog.some(entry=>entry.id===badgeId))throw new BadRequestException('Danh hiệu chuyên môn không hợp lệ');
  if(typeof reason!=='string'||reason.trim().length<12||reason.length>600)throw new BadRequestException('Cần lý do cấp danh hiệu từ 12 đến 600 ký tự');
  if(target===actor.id)throw new ForbiddenException('Không được tự cấp danh hiệu');
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const recipient=await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target]);
   if(!recipient.rows[0])throw new NotFoundException('Thành viên không tồn tại');
   if((await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[target])).rows[0])throw new ForbiddenException('Tài khoản đang bị khóa');
   const current=await c.query(`SELECT g.id FROM specialty_badge_grants g
    LEFT JOIN specialty_badge_revocations r ON r.grant_id=g.id
    WHERE g.user_id=$1 AND g.badge_id=$2 AND r.grant_id IS NULL LIMIT 1`,[target,badgeId]);
   if(current.rows[0])throw new ConflictException('Thành viên đã có danh hiệu này');
   const grant=await c.query<{id:string}>(`INSERT INTO specialty_badge_grants(user_id,actor_id,badge_id,reason)
    VALUES($1,$2,$3,$4) RETURNING id::text AS id`,[target,actor.id,badgeId,reason.trim()]);
   await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',
    [actor.id,'specialty.badge.grant',target,JSON.stringify({badgeId,grantId:grant.rows[0].id,reason:reason.trim()})]);
   return {granted:true,grantId:grant.rows[0].id,badgeId,rolesChanged:false,pointsChanged:false};
  });
 }
 async revokeSpecialtyBadge(req:Request,rawId:string,raw:unknown){
  const actor=await this.mfa.requireAdmin(req,false,true),body=payload(raw),grantId=Number(rawId),reason=body.reason;
  if(!Number.isSafeInteger(grantId)||grantId<1||typeof reason!=='string'||reason.trim().length<12||reason.length>600)throw new BadRequestException('Mã quyết định hoặc lý do thu hồi không hợp lệ');
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const existing=await c.query<{user_id:string;badge_id:string}>('SELECT user_id,badge_id FROM specialty_badge_grants WHERE id=$1',[grantId]);
   if(!existing.rows[0])throw new NotFoundException('Không tìm thấy danh hiệu');
   const target=existing.rows[0].user_id;
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target]);
   const revoked=await c.query(`INSERT INTO specialty_badge_revocations(grant_id,actor_id,reason)
    VALUES($1,$2,$3) ON CONFLICT(grant_id) DO NOTHING RETURNING grant_id`,[grantId,actor.id,reason.trim()]);
   if(!revoked.rows[0])throw new ConflictException('Danh hiệu đã được thu hồi');
   await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',
    [actor.id,'specialty.badge.revoke',target,JSON.stringify({grantId,badgeId:existing.rows[0].badge_id,reason:reason.trim()})]);
   return {revoked:true,rolesChanged:false,pointsChanged:false};
  });
 }
 /** A manual rank is an explicit admin-awarded badge, not earned Tinh Van. */
 async grantRank(req:Request,raw:unknown){
  const actor=await this.mfa.requireAdmin(req,false,true),body=payload(raw);
  const target=id(body.userId),level=body.level,reason=body.reason;
  if(typeof level!=='number'||!Number.isSafeInteger(level)||level<1||level>18)
   throw new BadRequestException('Cảnh giới phải từ 1 đến 18');
  if(typeof reason!=='string'||reason.trim().length<12||reason.length>600)
   throw new BadRequestException('Vui lòng ghi rõ lý do cấp cảnh giới (12–600 ký tự)');
  if(target===actor.id)throw new ForbiddenException('Không được tự cấp cảnh giới');
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   // Serialize ALL rank mutations for the same member, including simultaneous admins.
   const user=await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target]);
   if(!user.rows[0])throw new NotFoundException('Thành viên không tồn tại');
   const blocked=await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[target]);
   if(blocked.rows[0])throw new ForbiddenException('Không thể cấp cảnh giới cho tài khoản bị khóa');
   const active=await c.query<{id:string;level:number}>(`SELECT g.id::text AS id,g.level
     FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
     WHERE g.user_id=$1 AND r.id IS NULL ORDER BY g.id DESC LIMIT 1 FOR UPDATE OF g`,[target]);
   if(active.rows[0]&&Number(active.rows[0].level)===level)
    throw new ConflictException('Thành viên hiện đã được cấp cảnh giới này');
   if(active.rows[0])await c.query(`INSERT INTO tinh_canh_rank_revocations(grant_id,actor_id,reason)
      VALUES($1,$2,$3)`,[active.rows[0].id,actor.id,'Thay thế bằng quyết định cấp cảnh giới mới của Admin']);
   const grant=await c.query<{id:string}>(`INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason,ruleset)
     VALUES($1,$2,$3,$4,$5) RETURNING id::text AS id`,[target,actor.id,level,reason.trim(),Rules.RULESET]);
   await c.query(`INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)`,
     [actor.id,'tinhcanh.rank.grant',target,JSON.stringify({grantId:grant.rows[0].id,level,reason:reason.trim(),replacedGrantId:active.rows[0]?.id||null})]);
   return {granted:true,grantId:grant.rows[0].id,userId:target,rank:Rules.ranks[Number(level)-1],pointsChanged:false};
  });
 }
 async revokeRank(req:Request,rawId:string,raw:unknown){
  const actor=await this.mfa.requireAdmin(req,false,true),body=payload(raw),grantId=Number(rawId),reason=body.reason;
  if(!Number.isSafeInteger(grantId)||grantId<1||typeof reason!=='string'||reason.trim().length<12||reason.length>600)
   throw new BadRequestException('Cần mã quyết định và lý do thu hồi (12–600 ký tự)');
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const grant=await c.query<{user_id:string;level:number}>(
    'SELECT user_id,level FROM tinh_canh_rank_grants WHERE id=$1',[grantId]);
   if(!grant.rows[0])throw new NotFoundException('Không tìm thấy quyết định cấp cảnh giới');
   const target=grant.rows[0].user_id;
   // Same serialization lock as grantRank; prevents stale concurrent revocations.
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target]);
   const revoked=await c.query('SELECT 1 FROM tinh_canh_rank_revocations WHERE grant_id=$1',[grantId]);
   if(revoked.rows[0])throw new ConflictException('Quyết định này đã hết hiệu lực');
   const latest=await c.query<{id:string}>(`SELECT g.id::text AS id FROM tinh_canh_rank_grants g
     LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
     WHERE g.user_id=$1 AND r.id IS NULL ORDER BY g.id DESC LIMIT 1`,[target]);
   if(latest.rows[0]?.id!==String(grantId))throw new ConflictException('Chỉ được thu hồi quyết định đang có hiệu lực');
   await c.query('INSERT INTO tinh_canh_rank_revocations(grant_id,actor_id,reason) VALUES($1,$2,$3)',[grantId,actor.id,reason.trim()]);
   await c.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',
     [actor.id,'tinhcanh.rank.revoke',target,JSON.stringify({grantId,previousLevel:grant.rows[0].level,reason:reason.trim()})]);
   return {revoked:true,userId:target,pointsChanged:false,rankSource:'earned'};
  });
 }
 async rankGrants(req:Request){await this.mfa.requireAdmin(req);
  const rows=await this.db.query(`SELECT g.id::text AS id,g.user_id AS "userId",g.actor_id AS "actorId",
    g.level,g.reason,g.created_at AS "createdAt",r.reason AS "reversalReason",r.created_at AS "revokedAt"
    FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
    ORDER BY g.id DESC LIMIT 100`);
  return {grants:rows.rows};
 }
 async audit(req:Request){await this.mfa.requireAdmin(req);const r=await this.db.query(`SELECT a.id,a.user_id AS "userId",a.kind,a.direction,a.subject,a.points,a.created_at AS "createdAt",r.reason AS "reversalReason" FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id ORDER BY a.id DESC LIMIT 100`);return {events:r.rows};}
}
