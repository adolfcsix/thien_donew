import {BadRequestException,ForbiddenException,Injectable,NotFoundException,ConflictException} from '@nestjs/common';
import {DatabaseService} from '../../common/database.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import type {Request} from 'express';
import {validKind as portalKind,validSlug as portalSlug,parseDraft} from './portal-contract.cjs';

function validKind(kind:string){if(!portalKind(kind))throw new NotFoundException();return kind;}
function validSlug(slug:string){if(!portalSlug(slug))throw new NotFoundException();return slug;}
function validate(input:unknown){try{return parseDraft(input);}catch{throw new BadRequestException('Dữ liệu hoặc Markdown không hợp lệ');}}
@Injectable()
export class PortalService {
 constructor(private readonly db:DatabaseService,private readonly mfa:AdminMfaService){}
 private async write<T>(req:Request,kind:string,slug:string,action:string,callback:(c:any,actor:string)=>Promise<T>){
  validKind(kind);validSlug(slug);
  const actor=await this.mfa.requireAdmin(req,false,true);
  return this.db.transaction(async c=>{
   const {rows}=await c.query('SELECT role FROM admin_memberships WHERE user_id=$1 FOR UPDATE',[actor.id]);
   if(!rows[0])throw new ForbiddenException();
   await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
   const result=await callback(c,actor.id);
   await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[actor.id,`portal.${action}`,`${kind}/${slug}`]);
   return result;
  });
 }
 async catalog(kind:string){
  validKind(kind);
  const {rows}=await this.db.query(`SELECT d.slug,d.kind,r.title,r.summary,r.tool_href AS "toolHref",d.published_at AS "publishedAt",(d.kind='policy' AND d.legal_reviewed_at IS NULL) AS "legalDraft" FROM portal_documents d JOIN portal_revisions r ON r.document_id=d.id AND r.version=d.published_revision WHERE d.kind=$1 AND d.published_revision IS NOT NULL ORDER BY d.slug LIMIT 100`,[kind]);
  return {documents:rows};
 }
 async detail(kind:string,slug:string){
  validKind(kind);validSlug(slug);
  const {rows}=await this.db.query(`SELECT d.kind,d.slug,r.title,r.summary,r.body,r.tool_href AS "toolHref",r.related_href AS "relatedHref",d.published_at AS "publishedAt",(d.kind='policy' AND d.legal_reviewed_at IS NULL) AS "legalDraft",d.published_revision AS "revision" FROM portal_documents d JOIN portal_revisions r ON r.document_id=d.id AND r.version=d.published_revision WHERE d.kind=$1 AND d.slug=$2 AND d.published_revision IS NOT NULL`,[kind,slug]);
  if(!rows[0])throw new NotFoundException();return {document:rows[0]};
 }
 async adminList(req:Request){await this.mfa.requireAdmin(req);const {rows}=await this.db.query(`SELECT d.id,d.slug,d.kind,d.workflow,d.current_revision AS "revision",d.published_revision AS "publishedRevision",d.updated_at AS "updatedAt",r.title,r.summary,r.body,r.tool_href AS "toolHref",r.related_href AS "relatedHref" FROM portal_documents d JOIN portal_revisions r ON r.document_id=d.id AND r.version=d.current_revision ORDER BY d.kind,d.slug LIMIT 120`);return {documents:rows};}
 async history(req:Request,kind:string,slug:string){await this.mfa.requireAdmin(req);validKind(kind);validSlug(slug);const {rows}=await this.db.query(`SELECT r.version,r.title,r.editor_id AS "editorId",r.created_at AS "createdAt" FROM portal_revisions r JOIN portal_documents d ON d.id=r.document_id WHERE d.kind=$1 AND d.slug=$2 ORDER BY r.version DESC LIMIT 100`,[kind,slug]);return {revisions:rows};}
 async save(req:Request,kind:string,slug:string,input:unknown){const body=validate(input);return this.write(req,kind,slug,'save',async(c,actor)=>{
  const {rows}=await c.query('SELECT id,current_revision,workflow FROM portal_documents WHERE kind=$1 AND slug=$2 FOR UPDATE',[kind,slug]);
  let documentId:string;let rev:number;
  if(rows[0]){
   if((input as Record<string,unknown>).expectedRevision !== rows[0].current_revision)throw new ConflictException('Phiên bản đã thay đổi, hãy tải lại trước khi lưu');
   documentId=rows[0].id;rev=rows[0].current_revision+1;
   await c.query(`UPDATE portal_documents SET current_revision=$2,workflow='draft',last_editor=$3,approved_by=NULL,updated_at=clock_timestamp() WHERE id=$1`,[documentId,rev,actor]);
  }else{
   if((input as Record<string,unknown>).expectedRevision!==null)throw new ConflictException('Không thể tạo khi kỳ vọng có phiên bản cũ');
   const inserted=await c.query(`INSERT INTO portal_documents(kind,slug,workflow,current_revision,created_by,last_editor) VALUES($1,$2,'draft',1,$3,$3) RETURNING id`,[kind,slug,actor]);
   documentId=inserted.rows[0].id;rev=1;
  }
  await c.query(`INSERT INTO portal_revisions(document_id,version,title,summary,body,tool_href,related_href,editor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[documentId,rev,body.title,body.summary,body.body,body.toolHref,body.relatedHref,actor]);
  await c.query(`INSERT INTO portal_review_events(document_id,version,actor_id,action) VALUES($1,$2,$3,'save')`,[documentId,rev,actor]);
  return {slug,kind,revision:rev,workflow:'draft'};
 });}
 async transition(req:Request,kind:string,slug:string,action:string){
  if(!['submit','approve','publish'].includes(action))throw new BadRequestException();
  return this.write(req,kind,slug,action,async(c,actor)=>{
   const {rows}=await c.query(`SELECT id,workflow,current_revision,last_editor,created_by,approved_by FROM portal_documents WHERE kind=$1 AND slug=$2 FOR UPDATE`,[kind,slug]);
   const row=rows[0];if(!row)throw new NotFoundException();
   const allowed:Record<string,string>={submit:'draft',approve:'pending',publish:'approved'};
   if(row.workflow!==allowed[action])throw new ConflictException('Trạng thái không cho phép thao tác');
   if(action==='approve'&&(row.last_editor===actor || row.created_by===actor))throw new ForbiddenException('Người tạo hoặc sửa bài không thể tự phê duyệt');
   if(action==='publish'&&!row.approved_by)throw new ForbiddenException('Bắt buộc có phê duyệt độc lập');
   const next=action==='submit'?'pending':action==='approve'?'approved':'published';
   await c.query(`UPDATE portal_documents SET workflow=$2,approved_by=CASE WHEN $2='approved' THEN $3 ELSE approved_by END,published_revision=CASE WHEN $2='published' THEN current_revision ELSE published_revision END,published_at=CASE WHEN $2='published' THEN clock_timestamp() ELSE published_at END,updated_at=clock_timestamp() WHERE id=$1`,[row.id,next,actor]);
   await c.query('INSERT INTO portal_review_events(document_id,version,actor_id,action) VALUES($1,$2,$3,$4)',[row.id,row.current_revision,actor,action]);
   return {slug,kind,workflow:next,revision:row.current_revision};
  });
 }
}
