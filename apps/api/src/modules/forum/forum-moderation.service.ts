import {BadRequestException,ConflictException,ForbiddenException,HttpException,HttpStatus,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request} from 'express';
import type {PoolClient} from 'pg';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import Contract = require('./forum-contract.cjs');
function parsed<T>(f:()=>T):T{try{return f();}catch{throw new BadRequestException('Tham số không hợp lệ');}}
function id(x:string):string{return parsed(()=>Contract.uuid(x));}
function reason(raw:unknown):string{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();return parsed(()=>Contract.plain((raw as Record<string,unknown>).reason,800,8));}
@Injectable()
export class ForumModerationService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly mfa:AdminMfaService){}
 private async limit(c:PoolClient,userId:string,action:string,maximum:number){
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,action]);
  const r=await c.query<{counter:number}>(`INSERT INTO forum_action_limits(user_id,action,window_start,counter)
   VALUES($1,$2,date_trunc('hour',clock_timestamp()),1)
   ON CONFLICT(user_id,action,window_start) DO UPDATE SET counter=forum_action_limits.counter+1 RETURNING counter`,[userId,action]);
  if(Number(r.rows[0].counter)>maximum)throw new HttpException('Đã vượt giới hạn báo cáo/khiếu nại trong một giờ',HttpStatus.TOO_MANY_REQUESTS);
 }
 private async viewer(req:Request){return this.auth.required(req);}
 private async admin(req:Request,sensitive=false){return this.mfa.requireAdmin(req,false,sensitive);}
 private async write(req:Request,action:string,target:string,fn:(c:PoolClient,actor:string)=>Promise<unknown>){const user=await this.admin(req,true);return this.db.transaction(async c=>{
  const membership=await c.query('SELECT role FROM admin_memberships WHERE user_id=$1 FOR UPDATE',[user.id]);if(!membership.rows[0])throw new ForbiddenException();
  await this.mfa.assertWriteInTransaction(c,req,user.id,false);
  const result=await fn(c,user.id);
  await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,`forum.${action}`,target]);return result;
 });}
 async report(req:Request,target:'thread'|'comment',targetId:string,raw:unknown){id(targetId);const user=await this.viewer(req),item=parsed(()=>Contract.report(raw));return this.db.transaction(async c=>{
  await this.limit(c,user.id,'report',12);
  const view=target==='thread'? (await c.query('SELECT id,author_id,visibility,state FROM forum_threads WHERE id=$1',[targetId])).rows[0]
  : (await c.query('SELECT t.id,t.author_id,t.visibility,t.state,c.state AS comment_state FROM forum_comments c JOIN forum_threads t ON t.id=c.thread_id WHERE c.id=$1',[targetId])).rows[0];
  if(!view||view.state!=='visible'||view.comment_state && view.comment_state!=='visible'||view.visibility==='private'&&view.author_id!==user.id)throw new NotFoundException();
  if(view.visibility==='members'&&!user.id)throw new UnauthorizedException();
  const field=target==='thread'?'thread_id':'comment_id';
  const r=await c.query(`INSERT INTO forum_reports(id,reporter_id,${field},reason,explanation) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),user.id,targetId,item.reason,item.explanation]);
  return {submitted:true,duplicate:!r.rows[0]};
 });}
 async queue(req:Request){await this.admin(req);const [reports,appeals]=await Promise.all([
  this.db.query(`SELECT r.id,r.reason,r.explanation,r.status,r.thread_id AS "threadId",r.comment_id AS "commentId",r.created_at AS "createdAt" FROM forum_reports r WHERE r.status IN ('open','reviewing') ORDER BY r.created_at LIMIT 100`),
  this.db.query(`SELECT a.id,a.reason,a.status,a.thread_id AS "threadId",a.comment_id AS "commentId",a.created_at AS "createdAt" FROM forum_appeals a WHERE a.status='open' ORDER BY a.created_at LIMIT 100`)
 ]);return {reports:reports.rows,appeals:appeals.rows};}
 async inspectReport(req:Request,reportId:string){id(reportId);const actor=await this.admin(req,true);
  return this.db.transaction(async c=>{
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const report=(await c.query('SELECT thread_id,comment_id,status FROM forum_reports WHERE id=$1 FOR UPDATE',[reportId])).rows[0];
   if(!report||!['open','reviewing'].includes(report.status))throw new NotFoundException();
   const target=report.thread_id?(await c.query('SELECT title,body,state,visibility FROM forum_threads WHERE id=$1',[report.thread_id])).rows[0]
     :(await c.query('SELECT body,state FROM forum_comments WHERE id=$1',[report.comment_id])).rows[0];
   if(!target)throw new NotFoundException();
   // Image-only reports must be reviewable through the same MFA/audit boundary.
   // Never grant moderators a public URL bypassing thread privacy.
   if(report.thread_id){
    const media=(await c.query<{mime:string;data:Buffer}>('SELECT mime,data FROM forum_media WHERE thread_id=$1',[report.thread_id])).rows[0];
    if(media)target.imageDataUrl=`data:${media.mime};base64,${Buffer.from(media.data).toString('base64')}`;
   }
   await c.query('INSERT INTO forum_moderation_events(actor_id,thread_id,comment_id,action,reason) VALUES($1,$2,$3,$4,$5)',[actor.id,report.thread_id,report.comment_id,'report.read','Xem nội dung để kiểm duyệt theo báo cáo']);
   return {content:target,readFor:'moderation-only',mustNotRedistribute:true};
  });
 }
 async changeReport(req:Request,reportId:string,raw:unknown){id(reportId);const body=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};const status=body.status;
  if(!['reviewing','resolved','dismissed'].includes(String(status)))throw new BadRequestException();return this.write(req,'report.resolve',reportId,async(c,actor)=>{
   const x=(await c.query('SELECT status FROM forum_reports WHERE id=$1 FOR UPDATE',[reportId])).rows[0];if(!x)throw new NotFoundException();if(!['open','reviewing'].includes(x.status))throw new ConflictException('Báo cáo đã được xử lý');await c.query('UPDATE forum_reports SET status=$2,handled_by=$3,handled_at=clock_timestamp() WHERE id=$1',[reportId,status,actor]);return {updated:true};
  });}
 async act(req:Request,target:'thread'|'comment',targetId:string,raw:unknown){id(targetId);const action=parsed(()=>Contract.moderate(raw));if(!['hide','restore','lock','unlock','pin','unpin'].includes(action.action))throw new BadRequestException();
  if(target==='comment'&&!['hide','restore'].includes(action.action))throw new BadRequestException();
  return this.write(req,'moderate.'+action.action,targetId,async(c,actor)=>{
   const table=target==='thread'?'forum_threads':'forum_comments';const x=(await c.query(`SELECT id,author_id,state FROM ${table} WHERE id=$1 FOR UPDATE`,[targetId])).rows[0];if(!x)throw new NotFoundException();if(x.state==='deleted')throw new ForbiddenException('Không khôi phục nội dung đã được chủ tài khoản xóa');
   if(action.action==='hide'||action.action==='restore'){
    if((action.action==='hide'&&x.state!=='visible')||(action.action==='restore'&&x.state!=='hidden'))throw new ConflictException('Trạng thái đã thay đổi');
    await c.query(`UPDATE ${table} SET state=$2,updated_at=clock_timestamp() WHERE id=$1`,[targetId,action.action==='hide'?'hidden':'visible']);
    if(target==='comment'){
      const sum=(await c.query<{total:number;awards:number}>(`SELECT COALESCE(SUM(points),0)::int AS total,COUNT(*) FILTER (WHERE event='helpful')::int AS awards FROM forum_tinh_van_ledger WHERE comment_id=$1`,[targetId])).rows[0];
      if(action.action==='hide'&&Number(sum.total)>0)await c.query(`INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'reversal',-2)`,[x.author_id,targetId]);
      if(action.action==='restore'&&Number(sum.awards)>0&&Number(sum.total)===0)await c.query(`INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'restoration',2)`,[x.author_id,targetId]);
    }
   }else {const field=['lock','unlock'].includes(action.action)?'locked':'pinned';await c.query(`UPDATE forum_threads SET ${field}=$2,updated_at=clock_timestamp() WHERE id=$1`,[targetId,['lock','pin'].includes(action.action)]);}
   await c.query('INSERT INTO forum_moderation_events(actor_id,thread_id,comment_id,affected_user,action,reason) VALUES($1,$2,$3,$4,$5,$6)',[actor,target==='thread'?targetId:null,target==='comment'?targetId:null,x.author_id,action.action,action.reason]);
   if(x.author_id!==actor)await c.query('INSERT INTO forum_notifications(id,user_id,actor_id,thread_id,kind,message) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),x.author_id,actor,target==='thread'?targetId:null,'moderation','Nội dung của bạn có cập nhật kiểm duyệt']);
   return {updated:true};
  });}
 async sanction(req:Request,userId:string,raw:unknown){id(userId);const body=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const type=body.action;const why=reason(raw);if(!['warn','suspend','unsuspend'].includes(String(type)))throw new BadRequestException();
  const days=type==='suspend'?Number(body.days):0;if(type==='suspend'&&(!Number.isSafeInteger(days)||days<1||days>30))throw new BadRequestException('Tạm khóa tối đa 30 ngày');
  return this.write(req,'sanction.'+type,userId,async(c,actor)=>{
   if(actor===userId)throw new ForbiddenException('Không tự áp dụng kỷ luật');
   if(!(await c.query('SELECT id FROM users WHERE id=$1',[userId])).rows[0])throw new NotFoundException();
   // Moderator cannot suspend another administrator; requires separate owner workflow.
   if((await c.query('SELECT 1 FROM admin_memberships WHERE user_id=$1',[userId])).rows[0])throw new ForbiddenException('Không được xử lý quản trị viên qua kiểm duyệt diễn đàn');
   if(type==='warn')await c.query('INSERT INTO forum_warnings(id,user_id,moderator_id,reason) VALUES($1,$2,$3,$4)',[randomUUID(),userId,actor,why]);
   if(type==='suspend')await c.query(`INSERT INTO forum_suspensions(user_id,expires_at,reason,moderator_id) VALUES($1,clock_timestamp()+($2::integer*INTERVAL '1 day'),$3,$4) ON CONFLICT(user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,reason=EXCLUDED.reason,moderator_id=EXCLUDED.moderator_id,created_at=clock_timestamp()`,[userId,days,why,actor]);
   if(type==='unsuspend')await c.query('DELETE FROM forum_suspensions WHERE user_id=$1',[userId]);
   await c.query('INSERT INTO forum_moderation_events(actor_id,affected_user,action,reason) VALUES($1,$2,$3,$4)',[actor,userId,type,why]);
   await c.query('INSERT INTO forum_notifications(id,user_id,actor_id,kind,message) VALUES($1,$2,$3,$4,$5)',[randomUUID(),userId,actor,'moderation',type==='warn'?'Bạn có cảnh báo từ kiểm duyệt':type==='suspend'?'Quyền đăng diễn đàn tạm thời bị hạn chế':'Quyền đăng diễn đàn được khôi phục']);return {updated:true};
  });}
 async appeal(req:Request,target:'thread'|'comment',targetId:string,raw:unknown){id(targetId);const user=await this.viewer(req),why=reason(raw);return this.db.transaction(async c=>{
   await this.limit(c,user.id,'appeal',5);
   const table=target==='thread'?'forum_threads':'forum_comments';const content=(await c.query(`SELECT author_id,state FROM ${table} WHERE id=$1`,[targetId])).rows[0];if(!content||content.author_id!==user.id||content.state!=='hidden')throw new NotFoundException('Chỉ khiếu nại nội dung của chính mình đang bị ẩn');
   const field=target==='thread'?'thread_id':'comment_id';const opened=(await c.query(`SELECT id FROM forum_appeals WHERE user_id=$1 AND ${field}=$2 AND status='open'`,[user.id,targetId])).rows[0];if(opened)throw new ConflictException('Đã có khiếu nại chờ xử lý');await c.query(`INSERT INTO forum_appeals(id,user_id,${field},reason) VALUES($1,$2,$3,$4)`,[randomUUID(),user.id,targetId,why]);return {submitted:true};
  });}
 async appealDecision(req:Request,appealId:string,raw:unknown){id(appealId);const body=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  if(!['approved','denied'].includes(String(body.decision)))throw new BadRequestException();const why=reason(raw);
  return this.write(req,'appeal.'+body.decision,appealId,async(c,actor)=>{
   const a=(await c.query('SELECT * FROM forum_appeals WHERE id=$1 FOR UPDATE',[appealId])).rows[0];if(!a||a.status!=='open')throw new ConflictException('Khiếu nại không còn mở');
   if(a.user_id===actor)throw new ForbiddenException('Không tự phê duyệt khiếu nại');
   if(body.decision==='approved'){
    const table=a.thread_id?'forum_threads':'forum_comments',contentId=a.thread_id||a.comment_id;
    const restored=await c.query(`UPDATE ${table} SET state='visible',updated_at=clock_timestamp() WHERE id=$1 AND state='hidden' RETURNING id`,[contentId]);if(!restored.rows[0])throw new ConflictException('Nội dung đã bị xóa hoặc thay đổi trạng thái');
    if(a.comment_id){const total=(await c.query<{total:number;awards:number}>(`SELECT COALESCE(SUM(points),0)::int AS total,COUNT(*) FILTER(WHERE event='helpful')::int AS awards FROM forum_tinh_van_ledger WHERE comment_id=$1`,[a.comment_id])).rows[0];if(Number(total.awards)>0&&Number(total.total)===0)await c.query(`INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'restoration',2)`,[a.user_id,a.comment_id]);}
   }
   await c.query('UPDATE forum_appeals SET status=$2,reviewer_id=$3,reviewed_at=clock_timestamp() WHERE id=$1',[appealId,body.decision,actor]);
   await c.query('INSERT INTO forum_moderation_events(actor_id,thread_id,comment_id,affected_user,action,reason) VALUES($1,$2,$3,$4,$5,$6)',[actor,a.thread_id,a.comment_id,a.user_id,'appeal.'+body.decision,why]);
   return {updated:true};
  });}
 async award(req:Request,commentId:string,raw:unknown){id(commentId);const why=reason(raw);return this.write(req,'tinhvan.approve',commentId,async(c,actor)=>{
   const comment=(await c.query(`SELECT c.author_id,c.state,t.visibility,t.state AS thread_state,t.author_id AS thread_author FROM forum_comments c JOIN forum_threads t ON t.id=c.thread_id WHERE c.id=$1 FOR UPDATE OF c`,[commentId])).rows[0];
   if(!comment||comment.state!=='visible'||comment.thread_state!=='visible'||comment.visibility!=='public')throw new ConflictException('Chỉ công nhận lời giải công khai đang hiển thị');
   if(comment.author_id===actor)throw new ForbiddenException('Không tự chấm điểm');
   const votes=(await c.query(`SELECT count(*)::int AS total FROM forum_reactions WHERE comment_id=$1 AND kind='helpful' AND user_id<>$2`,[commentId,comment.author_id])).rows[0]?.total||0;
   if(votes<2)throw new ConflictException('Cần ít nhất hai thành viên độc lập đánh dấu hữu ích');
   const saved=await c.query(`INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'helpful',2) ON CONFLICT DO NOTHING RETURNING id`,[comment.author_id,commentId]);
   if(!saved.rows[0])throw new ConflictException('Đã công nhận Tinh Văn cho bình luận này');
   await c.query('INSERT INTO forum_moderation_events(actor_id,comment_id,affected_user,action,reason) VALUES($1,$2,$3,$4,$5)',[actor,commentId,comment.author_id,'tinhvan.award',why]);return {awarded:true,points:2};
  });}
 async audit(req:Request){await this.admin(req);return {events:(await this.db.query('SELECT action,reason,created_at AS "createdAt",thread_id AS "threadId",comment_id AS "commentId" FROM forum_moderation_events ORDER BY id DESC LIMIT 100')).rows};}
}
