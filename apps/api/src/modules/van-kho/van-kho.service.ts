import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import type {Request} from 'express';
import {randomUUID} from 'node:crypto';
import {DatabaseService} from '../../common/database.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {AuthService} from '../auth/auth.service';
import {UUID,SLUG,SUBJECTS,draft} from './van-kho-contract.cjs';
import {stringValue,offsetValue,literalLike} from '../../common/catalog-query.cjs';
const columns=`d.id,d.slug,d.title,d.excerpt,d.subject,d.tags,d.status,d.revision,d.published_at AS "publishedAt",d.updated_at AS "updatedAt",a.name AS "author",a.id AS "authorId"`;
const active=`(d.status='published' OR (d.status='scheduled' AND d.scheduled_at<=clock_timestamp()))`;
function id(value:string){if(!UUID.test(value))throw new BadRequestException('ID không hợp lệ');return value;}
function bounded(v:unknown,max:number,fallback=0){const n=v===undefined?fallback:Number(v);if(!Number.isSafeInteger(n)||n<0||n>max)throw new BadRequestException('Bộ lọc không hợp lệ');return n;}
@Injectable()
export class VanKhoService{
 constructor(private readonly db:DatabaseService,private readonly mfa:AdminMfaService,_auth:AuthService){}
 private async admin(req:Request,sensitive=false){return this.mfa.requireAdmin(req,false,sensitive);}
 private async write(req:Request,action:string,target:string,work:(c:any,actor:string)=>Promise<unknown>){
  const user=await this.admin(req,true);
  return this.db.transaction(async c=>{
   const owner=await c.query('SELECT role FROM admin_memberships WHERE user_id=$1 FOR UPDATE',[user.id]);
   if(!owner.rows[0])throw new ForbiddenException();
   await this.mfa.assertWriteInTransaction(c,req,user.id,false);
   const result=await work(c,user.id);
   await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,action,target]);
   return result;
  });
 }
 async list(q:Record<string,string|undefined>){
  let term:string,subject:string,tag:string,offset:number;
  try { term=literalLike(stringValue(q,'q',100));subject=stringValue(q,'subject',60);tag=stringValue(q,'tag',40);offset=offsetValue(q,100000); }
  catch { throw new BadRequestException('Bộ lọc không hợp lệ'); }
  if(subject&&!SUBJECTS.has(subject))throw new BadRequestException('Bộ lọc không hợp lệ');
  const r=await this.db.query(`SELECT ${columns} FROM van_kho_documents d LEFT JOIN van_kho_authors a ON a.id=d.author_id WHERE ${active} AND ($1='' OR d.subject=$1) AND ($2='' OR d.title ILIKE '%'||$2||'%' ESCAPE '!' OR d.excerpt ILIKE '%'||$2||'%' ESCAPE '!' OR a.name ILIKE '%'||$2||'%' ESCAPE '!' OR EXISTS(SELECT 1 FROM van_kho_revisions vr WHERE vr.doc_id=d.id AND vr.version=d.revision AND vr.body ILIKE '%'||$2||'%' ESCAPE '!')) AND ($3='' OR $3=ANY(d.tags)) ORDER BY d.published_at DESC NULLS LAST,d.updated_at DESC,d.id DESC LIMIT 21 OFFSET $4`,[subject,term,tag,offset]);
  return {documents:r.rows.slice(0,20),nextOffset:r.rows.length>20?offset+20:null};
 }
 async detail(slug:string){if(!SLUG.test(slug)||slug.length>120)throw new NotFoundException();const r=await this.db.query(`SELECT ${columns},v.body FROM van_kho_documents d JOIN van_kho_revisions v ON v.doc_id=d.id AND v.version=d.revision LEFT JOIN van_kho_authors a ON a.id=d.author_id WHERE d.slug=$1 AND ${active}`,[slug]);if(!r.rows[0])throw new NotFoundException();const doc=r.rows[0];const related=await this.db.query(`SELECT ${columns} FROM van_kho_documents d LEFT JOIN van_kho_authors a ON a.id=d.author_id WHERE d.subject=$1 AND d.id<>$2 AND ${active} ORDER BY d.updated_at DESC LIMIT 5`,[doc.subject,doc.id]);return {document:doc,related:related.rows};}
 async authors(){return {authors:(await this.db.query(`SELECT a.id,a.name,a.bio,COUNT(d.id)::int AS "publishedCount" FROM van_kho_authors a LEFT JOIN van_kho_documents d ON d.author_id=a.id AND ${active} GROUP BY a.id ORDER BY a.name LIMIT 150`)).rows};}
 async author(value:string){id(value);const author=(await this.db.query('SELECT id,name,bio FROM van_kho_authors WHERE id=$1',[value])).rows[0];if(!author)throw new NotFoundException();const documents=(await this.db.query(`SELECT ${columns} FROM van_kho_documents d LEFT JOIN van_kho_authors a ON a.id=d.author_id WHERE d.author_id=$1 AND ${active} ORDER BY d.updated_at DESC LIMIT 100`,[value])).rows;return {author,documents};}
 async adminList(req:Request){await this.admin(req);return {documents:(await this.db.query(`SELECT ${columns},d.scheduled_at AS "scheduledAt" FROM van_kho_documents d LEFT JOIN van_kho_authors a ON a.id=d.author_id ORDER BY d.updated_at DESC LIMIT 200`)).rows};}
 async saveAuthor(req:Request,body:unknown,value?:string){if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException();const x=body as Record<string,unknown>,name=x.name,bio=x.bio||'';if(typeof name!=='string'||!name.trim()||name.length>140||typeof bio!=='string'||bio.length>4000)throw new BadRequestException();if(value)id(value);return this.write(req,value?'van-kho.author.update':'van-kho.author.create',value||'author',async c=>{const chosen=value||randomUUID();if(value){const changed=await c.query('UPDATE van_kho_authors SET name=$2,bio=$3 WHERE id=$1 RETURNING id',[chosen,name.trim(),bio]);if(!changed.rows[0])throw new NotFoundException();}else await c.query('INSERT INTO van_kho_authors(id,name,bio) VALUES($1,$2,$3)',[chosen,name.trim(),bio]);return {id:chosen};});}
 async save(req:Request,body:unknown,value?:string){let d:ReturnType<typeof draft>;try{d=draft(body);}catch{throw new BadRequestException('Nội dung hoặc bộ môn không hợp lệ');}const target=value?id(value):randomUUID();return this.write(req,'van-kho.revision.save',target,async(c,actor)=>{
   if(d.authorId&&!((await c.query('SELECT id FROM van_kho_authors WHERE id=$1',[d.authorId])).rows[0]))throw new BadRequestException('Tác giả không tồn tại');
   const exists=value?(await c.query('SELECT id,revision,status FROM van_kho_documents WHERE id=$1 FOR UPDATE',[target])).rows[0]:null;
   if(value&&!exists)throw new NotFoundException();
   if(value){const expected=(body as Record<string,unknown>)?.expectedRevision;
    if(!Number.isSafeInteger(expected)||expected!==Number(exists.revision))throw new ConflictException('Bài viết đã thay đổi trên thiết bị khác. Tải lại phiên bản trước khi sửa.');
   }
   if((await c.query('SELECT id FROM van_kho_documents WHERE slug=$1 AND id<>$2',[d.slug,target])).rows[0])throw new ConflictException('Đường dẫn đã tồn tại');
   const rev=exists?Number(exists.revision)+1:1;
   if(exists){await c.query(`UPDATE van_kho_documents SET slug=$2,title=$3,excerpt=$4,subject=$5,tags=$6,author_id=$7,revision=$8,status='draft',approved_by=NULL,scheduled_at=NULL,published_at=NULL,updated_at=clock_timestamp() WHERE id=$1`,[target,d.slug,d.title,d.excerpt,d.subject,d.tags,d.authorId,rev]);}
   else {await c.query(`INSERT INTO van_kho_documents(id,slug,title,excerpt,subject,tags,author_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[target,d.slug,d.title,d.excerpt,d.subject,d.tags,d.authorId,actor]);}
   await c.query('INSERT INTO van_kho_revisions(doc_id,version,title,body,excerpt,author_id,subject,tags,editor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[target,rev,d.title,d.body,d.excerpt,d.authorId,d.subject,d.tags,actor]);
   await c.query('INSERT INTO van_kho_review_events(doc_id,actor_id,action,version) VALUES($1,$2,$3,$4)',[target,actor,'edit',rev]);return {id:target,revision:rev,status:'draft'};
 });}
 async revisions(req:Request,value:string){await this.admin(req);id(value);return {revisions:(await this.db.query('SELECT version,title,editor_id AS "editorId",created_at AS "createdAt" FROM van_kho_revisions WHERE doc_id=$1 ORDER BY version DESC LIMIT 100',[value])).rows};}
 async version(req:Request,value:string,version:string){await this.admin(req);id(value);const number=bounded(version,100000);if(!number)throw new BadRequestException('Số phiên bản không hợp lệ');const row=(await this.db.query('SELECT version,title,body,excerpt,subject,tags,editor_id AS "editorId",created_at AS "createdAt" FROM van_kho_revisions WHERE doc_id=$1 AND version=$2',[value,number])).rows[0];if(!row)throw new NotFoundException();return {revision:row};}
 async reviews(req:Request,value:string){await this.admin(req);id(value);return {events:(await this.db.query('SELECT action,version,actor_id AS "actorId",created_at AS "createdAt" FROM van_kho_review_events WHERE doc_id=$1 ORDER BY created_at DESC LIMIT 100',[value])).rows};}
 async restore(req:Request,value:string,oldVersion:string){id(value);const version=bounded(oldVersion,100000);if(!version)throw new BadRequestException('Phiên bản không hợp lệ');return this.write(req,'van-kho.revision.restore',value,async(c,actor)=>{
   const current=(await c.query('SELECT revision,slug FROM van_kho_documents WHERE id=$1 FOR UPDATE',[value])).rows[0];if(!current)throw new NotFoundException();
   const source=(await c.query('SELECT title,body,excerpt,subject,tags,author_id FROM van_kho_revisions WHERE doc_id=$1 AND version=$2',[value,version])).rows[0];if(!source)throw new NotFoundException('Không có phiên bản được chọn');
   const next=Number(current.revision)+1;
   await c.query(`UPDATE van_kho_documents SET title=$2,excerpt=$3,subject=$4,tags=$5,author_id=$6,revision=$7,status='draft',approved_by=NULL,scheduled_at=NULL,published_at=NULL,updated_at=clock_timestamp() WHERE id=$1`,[value,source.title,source.excerpt,source.subject,source.tags,source.author_id,next]);
   await c.query('INSERT INTO van_kho_revisions(doc_id,version,title,body,excerpt,author_id,subject,tags,editor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[value,next,source.title,source.body,source.excerpt,source.author_id,source.subject,source.tags,actor]);
   await c.query('INSERT INTO van_kho_review_events(doc_id,actor_id,action,version) VALUES($1,$2,$3,$4)',[value,actor,'restore',next]);return {id:value,revision:next,status:'draft',restoredFrom:version};
 });}
 async preview(req:Request,value:string){await this.admin(req);id(value);const row=(await this.db.query('SELECT d.*,v.body FROM van_kho_documents d JOIN van_kho_revisions v ON v.doc_id=d.id AND v.version=d.revision WHERE d.id=$1',[value])).rows[0];if(!row)throw new NotFoundException();return {document:row,watermark:'BẢN XEM TRƯỚC — CHƯA XUẤT BẢN'};}
 async transition(req:Request,value:string,next:'pending'|'approved'|'published'|'hidden',input?:unknown){id(value);return this.write(req,'van-kho.status.'+next,value,async(c,actor)=>{
   const current=(await c.query('SELECT status,revision,created_by,scheduled_at FROM van_kho_documents WHERE id=$1 FOR UPDATE',[value])).rows[0];if(!current)throw new NotFoundException();
   if(next==='pending'&&current.status!=='draft')throw new ConflictException('Chỉ gửi duyệt bản nháp');
   if(next==='approved'&&current.status!=='pending')throw new ConflictException('Bài viết chưa được gửi duyệt');
   if(next==='approved'){
    const edit=(await c.query('SELECT editor_id FROM van_kho_revisions WHERE doc_id=$1 AND version=$2',[value,current.revision])).rows[0];
    if(current.created_by===actor||edit?.editor_id===actor)throw new ForbiddenException('Người soạn hoặc sửa phiên bản hiện tại không được tự phê duyệt');
   }
   if(next==='published'&&current.status!=='approved')throw new ConflictException('Bài viết phải được duyệt trước');
   if(next==='published'){
    const currentBody=(await c.query('SELECT body FROM van_kho_revisions WHERE doc_id=$1 AND version=$2',[value,current.revision])).rows[0]?.body as string|undefined;
    if(!currentBody)throw new ConflictException('Không tìm thấy nội dung đã kiểm tra');
    const refs=[...new Set(Array.from(currentBody.matchAll(/!\[[^\]\n]{1,200}\]\(vk-image:([0-9a-f-]{36})\)/gi),m=>m[1].toLowerCase()))];
    if(refs.length){
     const verified=await c.query('SELECT id FROM van_kho_media WHERE doc_id=$1 AND id=ANY($2::uuid[]) AND reviewed_at IS NOT NULL',[value,refs]);
     if(verified.rows.length!==refs.length)throw new ConflictException('Ảnh minh họa thiếu, không thuộc tài liệu hoặc chưa xác minh quyền');
    }
   }
   const x=(input&&typeof input==='object'&&!Array.isArray(input)?input:{} ) as Record<string,unknown>;
   let scheduled:string|null=null;let state:'pending'|'approved'|'published'|'hidden'|'scheduled'=next;
   if(next==='published'&&x.scheduledAt!==undefined){
      if(typeof x.scheduledAt!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]{1,3})?)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(x.scheduledAt)||!Number.isFinite(Date.parse(x.scheduledAt)))throw new BadRequestException('Lịch hẹn không hợp lệ');
      const date=new Date(x.scheduledAt);if(date.getTime()<=Date.now()||date.getTime()>Date.now()+365*86400000)throw new BadRequestException('Thời điểm phải ở tương lai trong vòng một năm');
      scheduled=date.toISOString();state='scheduled';
   }
   await c.query(`UPDATE van_kho_documents SET status=$2,scheduled_at=$3,approved_by=CASE WHEN $2::varchar='approved' THEN $4 WHEN $2::varchar='draft' THEN NULL ELSE approved_by END,published_at=CASE WHEN $2::varchar='published' THEN clock_timestamp() WHEN $2::varchar='scheduled' THEN $3 ELSE published_at END,updated_at=clock_timestamp() WHERE id=$1`,[value,state,scheduled,actor]);
   await c.query('INSERT INTO van_kho_review_events(doc_id,actor_id,action,version) VALUES($1,$2,$3,$4)',[value,actor,state,current.revision]);return {id:value,status:state};
 });}
}
