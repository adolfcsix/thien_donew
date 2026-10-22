import {BadRequestException,ConflictException,ForbiddenException,HttpException,HttpStatus,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request} from 'express';
import type {PoolClient} from 'pg';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import Contract = require('./forum-contract.cjs');
import {validatedImage} from './forum-image-contract.cjs';
import type {Response} from 'express';

type User={id:string;email:string};
type Thread={id:string;author_id:string;category_id:string;visibility:string;state:string;locked:boolean;pinned:boolean;chart_shared:boolean;chart_alias:string|null;revision:number};
function checked<T>(action:()=>T):T {try{return action();}catch{throw new BadRequestException('Nội dung, dữ liệu hoặc tham số không hợp lệ');}}
function ident(v:string){return checked(()=>Contract.uuid(v)) as string;}
function pagination(v:string|undefined){return checked(()=>Contract.page(v)) as number;}
const selection=`t.id,t.title,t.body,t.category_id AS category,t.visibility,t.state,t.locked,t.pinned,t.revision,t.chart_shared,t.chart_alias,t.author_id AS "authorId",COALESCE(NULLIF(u.display_name,''),NULLIF(u.username,''),'Thành viên · '||left(u.id::text,8)) AS author,t.created_at AS "createdAt",t.updated_at AS "updatedAt",EXISTS(SELECT 1 FROM forum_media m WHERE m.thread_id=t.id) AS "hasImage"`;
const publicFilter=`t.state='visible' AND (t.visibility='public' OR (t.visibility='members' AND $1::uuid IS NOT NULL) OR t.author_id=$1::uuid)`;
@Injectable()
export class ForumService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,_mfa:AdminMfaService){}
 private async optional(req:Request):Promise<User|null>{return this.auth.me(req);}
 private async member(req:Request):Promise<User>{return this.auth.required(req);}
 private async active(c:PoolClient,userId:string){
  if((await c.query(`SELECT 1 FROM forum_suspensions WHERE user_id=$1 AND expires_at>clock_timestamp()`,[userId])).rows[0])throw new ForbiddenException('Bạn đang bị tạm khóa tham gia diễn đàn');
  if((await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[userId])).rows[0])throw new ForbiddenException('Tài khoản bị giới hạn');
  const verified=(await c.query('SELECT email_verified_at FROM users WHERE id=$1',[userId])).rows[0];
  if(!verified?.email_verified_at)throw new ForbiddenException('Bạn cần xác minh email trước khi đăng hoặc tương tác trên diễn đàn');
 }
 /** Shared per-user per-hour DB budget across API instances, including retries. */
 private async limit(c:PoolClient,userId:string,action:string,max:number){
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,action]);
  const r=await c.query<{counter:number}>(`INSERT INTO forum_action_limits(user_id,action,window_start,counter)
    VALUES($1,$2,date_trunc('hour',clock_timestamp()),1)
    ON CONFLICT (user_id,action,window_start) DO UPDATE SET counter=forum_action_limits.counter+1
    RETURNING counter`,[userId,action]);
  if(Number(r.rows[0]?.counter)>max)throw new HttpException('Thao tác quá nhanh, vui lòng thử lại sau',HttpStatus.TOO_MANY_REQUESTS);
 }
 private async row(c:PoolClient,threadId:string,viewer:string|null,edit=false):Promise<Thread>{
  const r=await c.query<Thread>('SELECT * FROM forum_threads WHERE id=$1 FOR UPDATE',[threadId]);const t=r.rows[0];
  if(!t||t.state!=='visible')throw new NotFoundException();
  if(t.visibility==='private'&&viewer!==t.author_id)throw new NotFoundException();
  if(t.visibility==='members'&&!viewer)throw new UnauthorizedException('Vui lòng đăng nhập để đọc');
  if(edit&&(!viewer||t.author_id!==viewer))throw new ForbiddenException('Không có quyền sửa bài của người khác');
  return t;
 }
 /** Staged binary upload: not visible until atomically claimed by an authored thread. */
 async uploadImage(req:Request){
  const user=await this.member(req),mime=validatedImage(req.body,req.headers['content-type']);
  if(!mime)throw new BadRequestException('Ảnh phải là JPEG, PNG hoặc WebP nguyên vẹn, tối đa 1 MiB');
  return this.db.transaction(async c=>{
   await this.active(c,user.id);await this.limit(c,user.id,'image',10);
   // Bound cleanup; expired, unclaimed bytes can never be read publicly.
   await c.query(`DELETE FROM forum_media WHERE id IN (SELECT id FROM forum_media WHERE thread_id IS NULL AND expires_at<clock_timestamp() LIMIT 100)`);
   const id=randomUUID();
   await c.query('INSERT INTO forum_media(id,user_id,mime,data) VALUES($1,$2,$3,$4)',[id,user.id,mime,req.body]);
   return {id};
  });
 }
 async image(req:Request,id:string,res:Response){
  ident(id);const user=await this.optional(req);
  const r=await this.db.query<{data:Buffer;mime:string}>(`SELECT m.data,m.mime FROM forum_media m
    JOIN forum_threads t ON t.id=m.thread_id
    WHERE t.id=$2 AND ${publicFilter}`,[user?.id||null,id]);
  const found=r.rows[0];if(!found)throw new NotFoundException();
  res.setHeader('Content-Type',found.mime);res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Disposition','inline');res.setHeader('Cache-Control','private, no-store');
  return res.send(found.data);
 }
 private async attachImage(c:PoolClient,imageId:string,threadId:string,userId:string){
  const image=await c.query(`UPDATE forum_media SET thread_id=$1 WHERE id=$2 AND user_id=$3 AND thread_id IS NULL AND expires_at>clock_timestamp() RETURNING id`,[threadId,imageId,userId]);
  if(!image.rows[0])throw new BadRequestException('Ảnh đã hết hạn, không thuộc tài khoản hoặc đã được sử dụng');
 }
 async categories(){return {categories:(await this.db.query('SELECT id,name,summary FROM forum_categories WHERE enabled=true ORDER BY sort_order')).rows};}
 async list(req:Request,q:Record<string,string|undefined>){
  const user=await this.optional(req);const offset=pagination(q.offset);
  const term=checked(()=>Contract.search(q.q||'')) as string;
  const cat=q.category||'';if(cat&&!Contract.CATEGORIES.has(cat))throw new BadRequestException();
  const r=await this.db.query(`${`SELECT ${selection},(SELECT count(*)::int FROM forum_comments c WHERE c.thread_id=t.id AND c.state='visible') AS "commentsCount" FROM forum_threads t JOIN users u ON u.id=t.author_id`} WHERE ${publicFilter} AND ($2='' OR t.category_id=$2) AND ($3='' OR t.title ILIKE '%'||$3||'%' ESCAPE '\\' OR t.body ILIKE '%'||$3||'%' ESCAPE '\\') ORDER BY t.pinned DESC,t.updated_at DESC,t.id DESC LIMIT 21 OFFSET $4`,[user?.id||null,cat,term,offset]);
  return {threads:r.rows.slice(0,20).map((x:Record<string,unknown>)=>({...x,body:String(x.body).slice(0,250),chartShare:Contract.chartPreview(x)})),nextOffset:r.rows.length>20?offset+20:null};
 }
 async detail(req:Request,id:string){ident(id);const user=await this.optional(req);const r=await this.db.query(`${`SELECT ${selection} FROM forum_threads t JOIN users u ON u.id=t.author_id`} WHERE t.id=$2 AND ${publicFilter}`,[user?.id||null,id]);const t=r.rows[0];if(!t)throw new NotFoundException();const replies=await this.db.query(`SELECT c.id,c.parent_id AS "parentId",c.body,c.revision,c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.author_id AS "authorId",COALESCE(NULLIF(u.display_name,''),NULLIF(u.username,''),'Thành viên · '||left(u.id::text,8)) AS author FROM forum_comments c JOIN users u ON u.id=c.author_id WHERE c.thread_id=$1 AND c.state='visible' ORDER BY c.created_at ASC,c.id ASC LIMIT 51`,[id]);const comments=replies.rows.slice(0,50);const info=await this.db.query(`SELECT
 (SELECT count(*)::int FROM forum_reactions WHERE thread_id=$1 AND kind='like') AS "likesCount",
 (SELECT count(*)::int FROM forum_follows WHERE thread_id=$1) AS "followsCount",
 EXISTS(SELECT 1 FROM forum_bookmarks WHERE thread_id=$1 AND user_id=$2::uuid) AS "bookmarked",
 EXISTS(SELECT 1 FROM forum_follows WHERE thread_id=$1 AND user_id=$2::uuid) AS "following",
 EXISTS(SELECT 1 FROM forum_reactions WHERE thread_id=$1 AND user_id=$2::uuid AND kind='like') AS "liked"`,[id,user?.id||null]);return {thread:{...t,chartShare:Contract.chartPreview(t),...info.rows[0]},comments,nextCommentsOffset:replies.rows.length>50?50:null,hasMoreComments:replies.rows.length>50};}
 async moreComments(req:Request,id:string,rawOffset:string|undefined){ident(id);const offset=pagination(rawOffset),user=await this.optional(req);const t=(await this.db.query<{author_id:string;visibility:string;state:string}>('SELECT author_id,visibility,state FROM forum_threads WHERE id=$1',[id])).rows[0];if(!t||!Contract.visible(t,user?.id||null))throw new NotFoundException();const r=await this.db.query(`SELECT c.id,c.parent_id AS "parentId",c.body,c.revision,c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.author_id AS "authorId",COALESCE(NULLIF(u.display_name,''),NULLIF(u.username,''),'Thành viên · '||left(u.id::text,8)) AS author FROM forum_comments c JOIN users u ON u.id=c.author_id WHERE c.thread_id=$1 AND c.state='visible' ORDER BY c.created_at,c.id LIMIT 51 OFFSET $2`,[id,offset]);return {comments:r.rows.slice(0,50),nextOffset:r.rows.length>50?offset+50:null};}
 async moderatedMine(req:Request){const user=await this.member(req);const [t,c]=await Promise.all([this.db.query(`SELECT id,title,updated_at AS "updatedAt" FROM forum_threads WHERE author_id=$1 AND state='hidden' ORDER BY updated_at DESC LIMIT 50`,[user.id]),this.db.query(`SELECT c.id,c.thread_id AS "threadId",c.updated_at AS "updatedAt" FROM forum_comments c WHERE c.author_id=$1 AND c.state='hidden' ORDER BY c.updated_at DESC LIMIT 50`,[user.id])]);return {threads:t.rows,comments:c.rows};}
 async create(req:Request,raw:unknown){const user=await this.member(req),d=checked(()=>Contract.thread(raw));return this.db.transaction(async c=>{
  await this.active(c,user.id);await this.limit(c,user.id,'thread',5);
  if(d.chartId){const found=await c.query('SELECT 1 FROM charts WHERE id=$1 AND user_id=$2',[d.chartId,user.id]);if(!found.rows[0])throw new ForbiddenException('Lá số không thuộc tài khoản của bạn');}
  const id=randomUUID();await c.query(`INSERT INTO forum_threads(id,category_id,author_id,title,body,visibility,chart_id,chart_alias,chart_shared)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,d.category,user.id,d.title,d.body,d.visibility,d.chartId,d.chartAlias,d.chartShared]);if(d.imageId)await this.attachImage(c,d.imageId,id,user.id);return {id};
 });}
 async update(req:Request,id:string,raw:unknown){ident(id);const user=await this.member(req),d=checked(()=>Contract.thread(raw,true));const fields=raw as Record<string,unknown>;return this.db.transaction(async c=>{await this.active(c,user.id);await this.limit(c,user.id,'edit',20);const old=await this.row(c,id,user.id,true);if(old.locked)throw new ForbiddenException('Thảo luận đã khóa');if(!Number.isSafeInteger(fields.expectedRevision)||fields.expectedRevision!==old.revision)throw new ConflictException('Bài đã được sửa trên thiết bị khác');if(d.chartId){if(!(await c.query('SELECT 1 FROM charts WHERE id=$1 AND user_id=$2',[d.chartId,user.id])).rows[0])throw new ForbiddenException('Lá số không thuộc tài khoản của bạn');}const changingImage=Object.hasOwn(fields,'imageId');
  if(!d.body&&!d.imageId){
   const existing=await c.query('SELECT id FROM forum_media WHERE thread_id=$1',[id]);
   if(changingImage||!existing.rows[0])throw new BadRequestException('Bài viết phải có chữ hoặc ảnh');
  }
  if(changingImage){
   await c.query('DELETE FROM forum_media WHERE thread_id=$1',[id]);
   if(d.imageId)await this.attachImage(c,d.imageId,id,user.id);
  }
  await c.query(`UPDATE forum_threads SET title=$2,body=$3,category_id=$4,visibility=$5,chart_id=$6,chart_alias=$7,chart_shared=$8,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1`,[id,d.title,d.body,d.category,d.visibility,d.chartId,d.chartAlias,d.chartShared]);return {updated:true,revision:old.revision+1};});}
 async remove(req:Request,id:string){ident(id);const user=await this.member(req);return this.db.transaction(async c=>{await this.active(c,user.id);await this.row(c,id,user.id,true);await c.query('DELETE FROM forum_media WHERE thread_id=$1',[id]);await c.query(`UPDATE forum_threads SET state='deleted',body='',title='Bài viết đã xóa',chart_id=NULL,chart_alias=NULL,chart_shared=false,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1`,[id]);return {deleted:true};});}
 async comment(req:Request,id:string,raw:unknown){ident(id);const user=await this.member(req),d=checked(()=>Contract.comment(raw));return this.db.transaction(async c=>{await this.active(c,user.id);await this.limit(c,user.id,'comment',15);const thread=await this.row(c,id,user.id);if(thread.locked)throw new ForbiddenException('Thảo luận đã khóa');let notify:string|null=thread.author_id;if(d.parentId){const parent=(await c.query('SELECT id,thread_id,parent_id,author_id,state FROM forum_comments WHERE id=$1',[d.parentId])).rows[0];if(!parent||parent.thread_id!==id||parent.state!=='visible'||parent.parent_id)throw new BadRequestException('Chỉ trả lời bình luận cấp một trong cùng bài');notify=parent.author_id;}
  const commentId=randomUUID();await c.query('INSERT INTO forum_comments(id,thread_id,parent_id,author_id,body) VALUES($1,$2,$3,$4,$5)',[commentId,id,d.parentId,user.id,d.body]);
  if(thread.visibility!=='private'){
   await c.query(`INSERT INTO forum_notifications(id,user_id,actor_id,thread_id,kind,message)
    SELECT gen_random_uuid(),f.user_id,$2,$1,'comment','Thảo luận bạn theo dõi có bình luận mới'
    FROM forum_follows f WHERE f.thread_id=$1 AND f.user_id<>$2 AND ($3='public' OR $3='members') ON CONFLICT DO NOTHING`,[id,user.id,thread.visibility]);
  }
  if(notify&&notify!==user.id)await c.query('INSERT INTO forum_notifications(id,user_id,actor_id,thread_id,kind,message) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),notify,user.id,id,d.parentId?'reply':'comment','Có bình luận mới trong thảo luận của bạn']);
  return {id:commentId};});}
 async editComment(req:Request,id:string,raw:unknown){ident(id);const user=await this.member(req),d=checked(()=>Contract.comment(raw));return this.db.transaction(async c=>{await this.active(c,user.id);await this.limit(c,user.id,'edit',20);const x=(await c.query('SELECT c.*,t.locked,t.state AS thread_state FROM forum_comments c JOIN forum_threads t ON t.id=c.thread_id WHERE c.id=$1 FOR UPDATE OF c',[id])).rows[0];if(!x||x.state!=='visible'||x.thread_state!=='visible')throw new NotFoundException();if(x.author_id!==user.id||x.locked)throw new ForbiddenException();const expected=(raw as Record<string,unknown>).expectedRevision;if(!Number.isSafeInteger(expected)||expected!==x.revision)throw new ConflictException('Bình luận đã thay đổi');await c.query('UPDATE forum_comments SET body=$2,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1',[id,d.body]);return {updated:true,revision:x.revision+1};});}
 async deleteComment(req:Request,id:string){ident(id);const user=await this.member(req);return this.db.transaction(async c=>{await this.active(c,user.id);const x=(await c.query('SELECT c.*,t.locked,t.state AS thread_state FROM forum_comments c JOIN forum_threads t ON t.id=c.thread_id WHERE c.id=$1 FOR UPDATE OF c',[id])).rows[0];if(!x||x.state!=='visible'||x.thread_state!=='visible')throw new NotFoundException();if(x.author_id!==user.id)throw new ForbiddenException();await c.query("UPDATE forum_comments SET state='deleted',body='',revision=revision+1,updated_at=clock_timestamp() WHERE id=$1",[id]);return {deleted:true};});}
 async toggle(req:Request,id:string,kind:'bookmark'|'follow'|'like'|'helpful',target:'thread'|'comment'='thread'){
  ident(id);const user=await this.member(req);if(!['bookmark','follow','like','helpful'].includes(kind))throw new BadRequestException();
  return this.db.transaction(async c=>{await this.active(c,user.id);await this.limit(c,user.id,'reaction',90);
   let threadId=id;let authorId='';if(target==='comment'){const x=(await c.query('SELECT thread_id,author_id,state FROM forum_comments WHERE id=$1',[id])).rows[0];if(!x||x.state!=='visible')throw new NotFoundException();threadId=x.thread_id;authorId=x.author_id;}const t=await this.row(c,threadId,user.id);if(target==='thread')authorId=t.author_id;
   if(kind==='bookmark'||kind==='follow'){
    if(target!=='thread')throw new BadRequestException();const table=kind==='bookmark'?'forum_bookmarks':'forum_follows';const done=(await c.query(`DELETE FROM ${table} WHERE user_id=$1 AND thread_id=$2 RETURNING 1`,[user.id,id])).rows.length>0;
    if(!done)await c.query(`INSERT INTO ${table}(user_id,thread_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[user.id,id]);return {active:!done};
   }
   if(user.id===authorId)throw new ForbiddenException('Không thể tự đánh giá nội dung của chính mình');
   const field=target==='thread'?'thread_id':'comment_id';const done=(await c.query(`DELETE FROM forum_reactions WHERE user_id=$1 AND ${field}=$2 AND kind=$3 RETURNING 1`,[user.id,id,kind])).rows.length>0;
   if(!done){await c.query(`INSERT INTO forum_reactions(user_id,${field},kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[user.id,id,kind]);if(kind==='helpful'&&target==='comment')await c.query('INSERT INTO forum_notifications(id,user_id,actor_id,thread_id,kind,message) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),authorId,user.id,threadId,'helpful','Bình luận của bạn được đánh dấu hữu ích']);}
   return {active:!done};
  });
 }
 async myPosts(req:Request){const user=await this.member(req);return {threads:(await this.db.query(`SELECT id,title,category_id AS category,state,visibility,revision,updated_at AS "updatedAt" FROM forum_threads WHERE author_id=$1 ORDER BY updated_at DESC LIMIT 100`,[user.id])).rows};}
 async bookmarks(req:Request){const user=await this.member(req);return {threads:(await this.db.query(`SELECT t.id,t.title,t.category_id AS category,t.updated_at AS "updatedAt" FROM forum_bookmarks b JOIN forum_threads t ON t.id=b.thread_id WHERE b.user_id=$1 AND t.state='visible' AND (t.visibility='public' OR t.visibility='members' OR t.author_id=$1) ORDER BY b.created_at DESC LIMIT 100`,[user.id])).rows};}
 async notifications(req:Request){const user=await this.member(req);return {notifications:(await this.db.query(`SELECT id,thread_id AS "threadId",kind,message,seen_at AS "seenAt",created_at AS "createdAt" FROM forum_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[user.id])).rows};}
 async seen(req:Request,id:string){ident(id);const user=await this.member(req);const r=await this.db.query('UPDATE forum_notifications SET seen_at=clock_timestamp() WHERE id=$1 AND user_id=$2 RETURNING id',[id,user.id]);if(!r.rows[0])throw new NotFoundException();return {seen:true};}
 async profile(req:Request,id:string){ident(id);const user=await this.optional(req);const member=(await this.db.query('SELECT id,COALESCE(NULLIF(display_name,\'\'),NULLIF(username,\'\'),\'Thành viên · \'||left(id::text,8)) AS name,created_at AS "joinedAt" FROM users WHERE id=$1',[id])).rows[0];if(!member)throw new NotFoundException();const threads=(await this.db.query(`SELECT id,title,category_id AS category,updated_at AS "updatedAt" FROM forum_threads WHERE author_id=$1 AND state='visible' AND (visibility='public' OR (visibility='members' AND $2::uuid IS NOT NULL) OR author_id=$2::uuid) ORDER BY created_at DESC LIMIT 30`,[id,user?.id||null])).rows;const points=(await this.db.query('SELECT COALESCE(sum(points),0)::int AS points FROM forum_tinh_van_ledger WHERE user_id=$1',[id])).rows[0]?.points||0;return {member,threads,tinhVanPoints:points};}
}
