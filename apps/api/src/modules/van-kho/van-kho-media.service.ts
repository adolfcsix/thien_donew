import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,open,realpath,readFile,stat,unlink} from 'node:fs/promises';
import {isAbsolute,join,resolve,sep} from 'node:path';
import type {Request,Response} from 'express';
import {DatabaseService} from '../../common/database.service';
import {writeFileChunk} from '../../common/write-file-chunk';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {UUID,SLUG} from './van-kho-contract.cjs';
import {LIMIT,mediaType,mediaReferenced,safeText} from './van-kho-media-contract.cjs';
const MIME:Record<string,string>={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function guid(raw:string){if(typeof raw!=='string'||!UUID.test(raw))throw new BadRequestException('Mã không hợp lệ');return raw;}
async function mediaRoot(){
 const v=process.env.VAN_KHO_PRIVATE_MEDIA_DIR;
 if(!v||!isAbsolute(v))throw new ServiceUnavailableException('Chưa cấu hình kho ảnh riêng tư');
 await mkdir(v,{recursive:true,mode:0o700});const dest=await realpath(v);
 const unsafe=[resolve(process.cwd(),'public'),resolve(process.cwd(),'apps/web/public'),resolve(process.cwd(),'apps/web/.next'),resolve(process.cwd(),'node_modules'),resolve(process.cwd(),'apps/api/dist')];
 if(unsafe.some(root=>dest===root||dest.startsWith(root+sep)))throw new ServiceUnavailableException('Kho ảnh không được nằm trong webroot hoặc build');
 return dest;
}
@Injectable()
export class VanKhoMediaService{
 constructor(private readonly db:DatabaseService,private readonly mfa:AdminMfaService){}
 async list(req:Request,doc:string){await this.mfa.requireAdmin(req);guid(doc);return {images:(await this.db.query(`SELECT id,format,content_bytes AS "bytes",sha256,alt_text AS "alt",rights_note AS "rights",uploaded_by AS "uploadedBy",reviewed_by AS "reviewedBy",reviewed_at AS "reviewedAt" FROM van_kho_media WHERE doc_id=$1 ORDER BY created_at DESC`,[doc])).rows};}
 async upload(req:Request,doc:string,format:string){
  guid(doc);if(!Object.keys(MIME).includes(format))throw new BadRequestException('Chỉ nhận PNG/JPEG/WebP');
  const actor=await this.mfa.requireAdmin(req,false,true);
  if(String(req.headers['content-type']||'').toLowerCase().split(';')[0].trim()!=='application/octet-stream')throw new BadRequestException('Upload dạng nhị phân mới được chấp nhận');
  const length=String(req.headers['content-length']||req.headers['x-image-file-bytes']||'');if(!/^\d+$/.test(length)||Number(length)<32||Number(length)>LIMIT)throw new BadRequestException('Ảnh vượt giới hạn 5 MiB hoặc thiếu Content-Length');
  let alt:string|null=null,rights:string|null=null;
  try{alt=safeText(decodeURIComponent(String(req.headers['x-image-alt']||'')),200);rights=safeText(decodeURIComponent(String(req.headers['x-image-rights']||'')),800);}catch{throw new BadRequestException('Metadata ảnh không hợp lệ');}
  if(!alt||!rights)throw new BadRequestException('Cần mô tả ảnh và khai báo nguồn/quyền sử dụng');
  const root=await mediaRoot(),fileKey=randomUUID(),mediaId=randomUUID(),path=join(root,fileKey);
  let handle;let bytes=0;const digest=createHash('sha256');
  try{
   handle=await open(path,'wx',0o600);
   for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.length;if(bytes>LIMIT)throw new BadRequestException('Ảnh quá lớn');digest.update(buffer);await writeFileChunk(handle,buffer);}
   await handle.close();handle=undefined;
   if(bytes!==Number(length))throw new BadRequestException('Upload không đầy đủ');
   try{mediaType(await readFile(path),format);}catch{throw new BadRequestException('Nội dung tệp không khớp loại ảnh');}
   await this.db.transaction(async c=>{
    await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
    const d=(await c.query('SELECT status FROM van_kho_documents WHERE id=$1 FOR UPDATE',[doc])).rows[0];
    if(!d)throw new NotFoundException('Tài liệu không tồn tại');
    if(!['draft','pending','approved'].includes(d.status))throw new ConflictException('Chỉ tải ảnh vào tài liệu chưa công bố');
    await c.query('INSERT INTO van_kho_media(id,doc_id,file_key,format,content_bytes,sha256,alt_text,rights_note,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[mediaId,doc,fileKey,format,bytes,digest.digest('hex'),alt,rights,actor.id]);
    await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[actor.id,'van-kho.media.upload',mediaId]);
   });
   return {id:mediaId,uploaded:true,reviewed:false,markdown:`![${alt}](vk-image:${mediaId})`};
  }catch(e){await handle?.close().catch(()=>{});await unlink(path).catch(()=>{});throw e;}
 }
 async verify(req:Request,doc:string,asset:string){guid(doc);guid(asset);const actor=await this.mfa.requireAdmin(req,false,true);return this.db.transaction(async c=>{
  await this.mfa.assertWriteInTransaction(c,req,actor.id,false);
  const row=(await c.query('SELECT uploaded_by,reviewed_at FROM van_kho_media WHERE id=$1 AND doc_id=$2 FOR UPDATE',[asset,doc])).rows[0];
  if(!row)throw new NotFoundException();if(row.uploaded_by===actor.id)throw new ForbiddenException('Người tải ảnh không tự xác minh quyền sử dụng');if(row.reviewed_at)throw new ConflictException('Ảnh đã được xác minh');
  await c.query('UPDATE van_kho_media SET reviewed_by=$3,reviewed_at=clock_timestamp() WHERE id=$1 AND doc_id=$2',[asset,doc,actor.id]);
  await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[actor.id,'van-kho.media.verify',asset]);
  return {verified:true};
 });}
 async serve(req:Request,res:Response,docRef:string,assetRef:string,preview:boolean){guid(assetRef);if(preview){guid(docRef);await this.mfa.requireAdmin(req);}else if(!SLUG.test(docRef)||docRef.length>120)throw new NotFoundException();
  const check=preview?'d.id=$1':'d.slug=$1 AND (d.status=\'published\' OR (d.status=\'scheduled\' AND d.scheduled_at<=clock_timestamp()))';
  const result=await this.db.query(`SELECT m.file_key,m.format,m.content_bytes,m.sha256,m.id,m.reviewed_at,v.body FROM van_kho_media m JOIN van_kho_documents d ON d.id=m.doc_id JOIN van_kho_revisions v ON v.doc_id=d.id AND v.version=d.revision WHERE ${check} AND m.id=$2`,[docRef,assetRef]);
  const record=result.rows[0];if(!record||!mediaReferenced(record.body,assetRef)||(!preview&&!record.reviewed_at))throw new NotFoundException('Ảnh không được cấp quyền');
  const path=join(await mediaRoot(),String(record.file_key));const f=await stat(path).catch(()=>null);
  if(!f||!f.isFile()||f.size!==Number(record.content_bytes))throw new ServiceUnavailableException('Ảnh không khớp dữ liệu');
  const mime=typeof record.format==='string' ? MIME[record.format] : undefined;if(!mime)throw new ServiceUnavailableException('Định dạng ảnh không hợp lệ');
  res.setHeader('Content-Type',mime);res.setHeader('Content-Length',String(f.size));res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition','inline');
  createReadStream(path).on('error',()=>res.destroy()).pipe(res);
 }
}
