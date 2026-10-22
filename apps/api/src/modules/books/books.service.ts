import type {PoolClient} from 'pg';
import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,open,readFile,realpath,stat,unlink} from 'node:fs/promises';
import {isAbsolute,join,resolve,sep} from 'node:path';
import {DatabaseService} from '../../common/database.service';
import {writeFileChunk} from '../../common/write-file-chunk';
import {rasterMime} from '../../common/raster-image-validation.cjs';
import {AuthService} from '../auth/auth.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {bookInput,canRead,sniff,epubChapters,UUID,SLUG,SUBJECTS} from './book-contract.cjs';
import {stringValue,offsetValue,literalLike} from '../../common/catalog-query.cjs';

const MAX_BYTES=24*1024*1024;
const CONTENT_TYPES:Record<string,string>={pdf:'application/pdf',epub:'application/epub+zip',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function uuid(value:string){if(typeof value!=='string'||!UUID.test(value))throw new BadRequestException('ID không hợp lệ');return value;}
function slug(value:string){if(typeof value!=='string'||value.length>120||!SLUG.test(value))throw new BadRequestException('Đường dẫn sách không hợp lệ');return value;}
function pagination(value:unknown,defaultValue=0){const n=value===undefined?defaultValue:Number(value);if(!Number.isSafeInteger(n)||n<0||n>10000)throw new BadRequestException('Số trang không hợp lệ');return n;}
async function privateDir(){
 const name=process.env.BOOK_PRIVATE_STORAGE_DIR;
 if(!name||!isAbsolute(name))throw new ServiceUnavailableException('Chưa cấu hình BOOK_PRIVATE_STORAGE_DIR an toàn');
 const unsafe=[resolve(process.cwd(),'apps/web/public'),resolve(process.cwd(),'public'),resolve(process.cwd(),'apps/web/.next'),resolve(process.cwd(),'node_modules')];
 await mkdir(name,{recursive:true,mode:0o700});const dir=await realpath(name);
 if(unsafe.some(x=>dir===x||dir.startsWith(x+sep)))throw new ServiceUnavailableException('Thư mục sách không được nằm trong webroot/build');
 return dir;
}
function assetPath(dir:string,id:string){return join(dir,uuid(id));}
type BookRow={id:string;slug:string;title:string;author:string;publisher:string;publishedYear:number|null;synopsis:string;subject:string;tags:string[];accessLevel:'free'|'member'|'pro';status:string;featured:boolean;licenseName?:string;licenseProof?:string;format:string|null;createdAt:string};
const FIELDS=`b.id,b.slug,b.title,b.author,b.publisher,b.published_year AS "publishedYear",b.synopsis,b.subject,b.tags,b.access_level AS "accessLevel",b.status,b.featured,b.created_at AS "createdAt",(SELECT format FROM library_assets a WHERE a.book_id=b.id AND kind='book') AS format, EXISTS(SELECT 1 FROM library_assets a WHERE a.book_id=b.id AND kind='cover') AS "hasCover"`;
@Injectable()
export class BooksService{
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly mfa:AdminMfaService){}
 private async optionalUser(req:Request){try{return await this.auth.required(req);}catch{return null;}}
 private async permitted(req:Request,book:BookRow){
  if(book.status!=='published')throw new NotFoundException('Sách chưa xuất bản');
  if(book.accessLevel==='free')return null;
  const user=await this.auth.required(req);
  if(book.accessLevel==='member')return user;
  const {rows}=await this.db.query(`SELECT EXISTS(SELECT 1 FROM admin_memberships WHERE user_id=$1) OR EXISTS(SELECT 1 FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND expires_at>clock_timestamp()) AS permitted`,[user.id]);
  if(!canRead(book.accessLevel,{signedIn:true,pro:rows[0]?.permitted===true}))throw new ForbiddenException('Sách này yêu cầu quyền Pro còn hiệu lực');
  return user;
 }
 async catalog(req:Request,query:Record<string,string|undefined>){
  let subject:string,term:string,sort:string,offset:number;
  try { subject=stringValue(query,'subject',40);term=literalLike(stringValue(query,'q',100));sort=stringValue(query,'sort',20)||'recent';offset=offsetValue(query,10000); }
  catch { throw new BadRequestException('Bộ lọc không hợp lệ'); }
  if((subject&&!SUBJECTS.has(subject))||!['recent','featured','title'].includes(sort))throw new BadRequestException('Bộ lọc không hợp lệ');
  const order=sort==='featured'?'b.featured DESC,b.updated_at DESC,b.id DESC':sort==='title'?'b.title ASC,b.id ASC':'b.updated_at DESC,b.id DESC';
  const rows=await this.db.query(`SELECT ${FIELDS} FROM library_books b WHERE b.status='published' AND ($1='' OR b.subject=$1) AND ($2='' OR b.title ILIKE '%'||$2||'%' ESCAPE '!' OR b.author ILIKE '%'||$2||'%' ESCAPE '!') ORDER BY ${order} LIMIT 26 OFFSET $3`,[subject,term,offset]);
  return {books:rows.rows.slice(0,25),nextOffset:rows.rows.length>25?offset+25:null};
 }
 private async published(slugValue:string){const id=slug(slugValue);const {rows}=await this.db.query<BookRow>(`SELECT ${FIELDS} FROM library_books b WHERE b.slug=$1 AND b.status='published'`,[id]);if(!rows[0])throw new NotFoundException('Không tìm thấy sách');return rows[0];}
 async detail(req:Request,name:string){const b=await this.published(name);const actor=await this.optionalUser(req);const pro=actor?(await this.db.query(`SELECT EXISTS(SELECT 1 FROM admin_memberships WHERE user_id=$1) OR EXISTS(SELECT 1 FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND expires_at>clock_timestamp()) AS permitted`,[actor.id])).rows[0].permitted===true:false;
 const related=await this.db.query(`SELECT ${FIELDS} FROM library_books b WHERE b.status='published' AND b.subject=$1 AND b.id<>$2 ORDER BY b.featured DESC,b.updated_at DESC LIMIT 6`,[b.subject,b.id]);
 const progress=actor?(await this.db.query(`SELECT position,bookmarks,favorite FROM library_reading_progress WHERE user_id=$1 AND book_id=$2`,[actor.id,b.id])).rows[0]:null;
 return {book:b,canRead:canRead(b.accessLevel,{signedIn:!!actor,pro}),related:related.rows,progress:progress||null};}
 private async ownedAsset(req:Request,bookSlug:string,kind:'cover'|'book'){
  const book=await this.published(bookSlug);
  if(kind==='book')await this.permitted(req,book);
  const {rows}=await this.db.query<{id:string;format:string;size_bytes:string;sha256:string}>(`SELECT id,format,size_bytes,sha256 FROM library_assets WHERE book_id=$1 AND kind=$2`,[book.id,kind]);
  if(!rows[0])throw new NotFoundException('Tệp sách chưa sẵn sàng');return {book,asset:rows[0]};
 }
 async serve(req:Request,res:Response,name:string,kind:'cover'|'book'){
  const {asset}=await this.ownedAsset(req,name,kind);const dir=await privateDir();const path=assetPath(dir,asset.id);
  let file;try{file=await stat(path);}catch{throw new ServiceUnavailableException('Tệp sách hiện không khả dụng');}
  if(!file.isFile()||file.size!==Number(asset.size_bytes))throw new ServiceUnavailableException('Tệp sách không khớp bản ghi');
  const mime=CONTENT_TYPES[asset.format];if(!mime)throw new ServiceUnavailableException('Định dạng chưa hỗ trợ');
  // No permanent or signed public URL, and no redirects to private storage.
  res.setHeader('Content-Type',mime);if(kind==='book'&&asset.format==='pdf')res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Content-Disposition',kind==='cover'?'inline':`inline; filename="tai-lieu.${asset.format}"`);res.setHeader('Accept-Ranges','bytes');
  const range=typeof req.headers.range==='string'?req.headers.range:'';
  let from=0,to=file.size-1;
  if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2])){res.status(416);res.setHeader('Content-Range',`bytes */${file.size}`);res.end();return;}
   if(!match[1]){const count=Number(match[2]);from=Math.max(0,file.size-count);}else {from=Number(match[1]);to=match[2]?Math.min(Number(match[2]),file.size-1):to;}
   if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||from>to||from>=file.size){res.status(416);res.setHeader('Content-Range',`bytes */${file.size}`);res.end();return;}
   res.status(206);res.setHeader('Content-Range',`bytes ${from}-${to}/${file.size}`);
  }
  res.setHeader('Content-Length',String(to-from+1));
  createReadStream(path,{start:from,end:to}).on('error',()=>res.destroy()).pipe(res);
 }
 async chapters(req:Request,name:string){const {asset}=await this.ownedAsset(req,name,'book');if(asset.format!=='epub')throw new BadRequestException('Sách này sử dụng trình đọc PDF');const content=await readFile(assetPath(await privateDir(),asset.id));const chapters=epubChapters(content);return {chapters:chapters.map(c=>({index:c.index,title:c.title}))};}
 async chapter(req:Request,name:string,index:string){const {asset}=await this.ownedAsset(req,name,'book');if(asset.format!=='epub')throw new BadRequestException('Định dạng không phù hợp');const pos=pagination(index);const chapters=epubChapters(await readFile(assetPath(await privateDir(),asset.id)));if(!chapters[pos])throw new NotFoundException('Không tìm thấy chương');return {chapter:chapters[pos],total:chapters.length};}
 async progress(req:Request,name:string,body:unknown){const book=await this.published(name);await this.permitted(req,book);const user=await this.auth.required(req);if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Tiến độ không hợp lệ');const x=body as Record<string,unknown>,position=pagination(x.position);const bookmarks=x.bookmarks;
  if(!Array.isArray(bookmarks)||bookmarks.length>100||bookmarks.some(v=>!Number.isSafeInteger(v)||v<0||v>1000000)||new Set(bookmarks).size!==bookmarks.length||typeof x.favorite!=='boolean')throw new BadRequestException('Đánh dấu không hợp lệ');
  await this.db.query(`INSERT INTO library_reading_progress(book_id,user_id,position,bookmarks,favorite) VALUES($1,$2,$3,$4,$5) ON CONFLICT(book_id,user_id) DO UPDATE SET position=$3,bookmarks=$4,favorite=$5,updated_at=NOW()`,[book.id,user.id,position,bookmarks,x.favorite]);return {saved:true};}
 async read(req:Request,name:string){const book=await this.published(name);const user=await this.permitted(req,book);await this.db.query('INSERT INTO library_read_events(book_id,user_id) VALUES($1,$2)',[book.id,user?.id||null]);return {allowed:true,format:book.format};}
 private async expertCheck(c:PoolClient,userId:string,bookId?:string){
  const user=await c.query('SELECT email_verified_at FROM users WHERE id=$1 FOR SHARE',[userId]);
  if(!user.rows[0]?.email_verified_at||(await c.query('SELECT 1 FROM account_blocks WHERE user_id=$1',[userId])).rows[0])throw new ForbiddenException('Cần tài khoản hoạt động và email đã xác minh');
  if(!(await c.query('SELECT user_id FROM expert_credentials WHERE user_id=$1 AND revoked_at IS NULL FOR SHARE',[userId])).rows[0])throw new ForbiddenException('Cần huy hiệu Chuyên gia đang hiệu lực');
  if(bookId){const book=(await c.query('SELECT submitted_by,status,submission_status FROM library_books WHERE id=$1 FOR UPDATE',[bookId])).rows[0];if(!book||book.submitted_by!==userId)throw new NotFoundException('Không tìm thấy sách của bạn');if(book.status==='published'||book.submission_status==='pending')throw new ConflictException('Sách đang xuất bản hoặc chờ duyệt; liên hệ quản trị để chỉnh sửa');}
 }
 async expertList(req:Request){const user=await this.auth.required(req);return this.db.transaction(async c=>{await this.expertCheck(c,user.id);return {books:(await c.query(`SELECT ${FIELDS},b.license_name AS "licenseName",b.license_proof AS "licenseProof",b.submission_status AS "submissionStatus" FROM library_books b WHERE b.submitted_by=$1 ORDER BY b.updated_at DESC LIMIT 200`,[user.id])).rows};});}
 async expertSubmit(req:Request,bookId:string){uuid(bookId);const user=await this.auth.required(req);return this.db.transaction(async c=>{await this.expertCheck(c,user.id,bookId);const book=(await c.query('SELECT license_name,license_proof FROM library_books WHERE id=$1',[bookId])).rows[0];if(!book.license_name||!book.license_proof||!(await c.query("SELECT id FROM library_assets WHERE book_id=$1 AND kind='book'",[bookId])).rows[0])throw new ConflictException('Bổ sung tệp sách và bằng chứng quyền sử dụng trước khi gửi duyệt');await c.query("UPDATE library_books SET submission_status='pending',updated_at=clock_timestamp() WHERE id=$1",[bookId]);await c.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[user.id,'expert.book.submit',bookId]);return {submitted:true};});}
 async adminList(req:Request){await this.mfa.requireAdmin(req);const rows=await this.db.query(`SELECT ${FIELDS},b.license_name AS "licenseName",b.license_proof AS "licenseProof",b.submitted_by AS "submittedBy",b.submission_status AS "submissionStatus" FROM library_books b ORDER BY (b.submission_status='pending') DESC,b.updated_at DESC,b.id LIMIT 200`);return {books:rows.rows};}
 async save(req:Request,body:unknown,id?:string,expert=false){const admin=expert?await this.auth.required(req):await this.mfa.requireAdmin(req,false,true);let data;try{data=bookInput(body);}catch(e){throw new BadRequestException((e as Error).message);}
  if(expert&&(data.status!=='draft'||data.featured))throw new ForbiddenException('Chuyên gia chỉ lưu bản nháp; quản trị duyệt xuất bản');
  if(id)uuid(id);
  const bookId=id||randomUUID();return this.db.transaction(async client=>{
   if(expert)await this.expertCheck(client,admin.id,id);else await this.mfa.assertWriteInTransaction(client,req,admin.id,false);
   // Publishing requires an actual validated EPUB/PDF and documented rights.
   if(data.status==='published'){
    const files=await client.query('SELECT format FROM library_assets WHERE book_id=$1 AND kind=$2',[bookId,'book']);if(!files.rows[0])throw new ConflictException('Tải và kiểm tra tệp sách trước khi xuất bản');
   }
   let rows;
   if(id)rows=await client.query(`UPDATE library_books SET slug=$2,title=$3,author=$4,subject=$5,access_level=$6,status=$7,featured=$8,published_year=$9,tags=$10,publisher=$11,synopsis=$12,license_name=$13,license_proof=$14,license_reviewed_at=CASE WHEN $7::varchar='published' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 RETURNING id`,[bookId,data.slug,data.title,data.author,data.subject,data.accessLevel,data.status,data.featured,data.publishedYear,data.tags,data.publisher,data.synopsis,data.licenseName,data.licenseProof]);
   else rows=await client.query(`INSERT INTO library_books(id,slug,title,author,subject,access_level,status,featured,published_year,tags,publisher,synopsis,license_name,license_proof,license_reviewed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $7::varchar='published' THEN NOW() ELSE NULL END) RETURNING id`,[bookId,data.slug,data.title,data.author,data.subject,data.accessLevel,data.status,data.featured,data.publishedYear,data.tags,data.publisher,data.synopsis,data.licenseName,data.licenseProof]);
   if(!rows.rows[0])throw new NotFoundException('Sách không tồn tại');
   if(expert)await client.query("UPDATE library_books SET submitted_by=$2,submission_status='draft' WHERE id=$1",[bookId,admin.id]);else await client.query("UPDATE library_books SET submission_status=CASE WHEN status='published' THEN 'reviewed' ELSE 'draft' END WHERE id=$1",[bookId]);await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[admin.id,id?'book.update':'book.create',bookId,JSON.stringify({slug:data.slug,status:data.status,access:data.accessLevel})]);return {id:bookId};
  }).catch((error:unknown)=>{
   const failure=error as {code?:string;constraint?:string};
   if(failure.code==='23505'&&failure.constraint==='library_books_slug_key')throw new ConflictException('Đường dẫn sách đã tồn tại. Hãy chọn đường dẫn khác.');
   throw error;
  });}
 async remove(req:Request,id:string){uuid(id);const admin=await this.mfa.requireAdmin(req,true,true);return this.db.transaction(async client=>{await this.mfa.assertWriteInTransaction(client,req,admin.id,true);const row=await client.query("UPDATE library_books SET status='hidden',updated_at=NOW() WHERE id=$1 RETURNING id",[id]);if(!row.rows[0])throw new NotFoundException();await client.query('INSERT INTO admin_audit(actor_id,action,target) VALUES($1,$2,$3)',[admin.id,'book.hide',id]);return {hidden:true};});}
 async upload(req:Request,id:string,kind:string,format:string,expert=false){uuid(id);if(!['book','cover'].includes(kind)||!Object.keys(CONTENT_TYPES).includes(format)||(kind==='book'&&!['pdf','epub'].includes(format))||(kind==='cover'&&!['jpeg','png','webp'].includes(format)))throw new BadRequestException('Định dạng tệp không hợp lệ');
  const admin=expert?await this.auth.required(req):await this.mfa.requireAdmin(req,false,true);
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/octet-stream'))throw new BadRequestException('Upload phải dùng application/octet-stream');
  const contentLength=req.headers['content-length']||req.headers['x-book-file-bytes'];if(!contentLength||typeof contentLength!=='string'||!/^\d+$/.test(contentLength)||Number(contentLength)>MAX_BYTES||Number(contentLength)<8)throw new BadRequestException('Thiếu hoặc vượt độ dài file cho phép (24 MiB)');
  const dir=await privateDir(),assetId=randomUUID(),path=assetPath(dir,assetId);let size=0,hash=createHash('sha256');let handle;
  try{
   handle=await open(path,'wx',0o600);
   for await(const chunk of req){const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=bytes.length;if(size>MAX_BYTES)throw new BadRequestException('Tệp vượt 24 MiB');hash.update(bytes);await writeFileChunk(handle,bytes);}
   await handle.close();handle=undefined;
   if(size!==Number(contentLength))throw new BadRequestException('Tệp tải lên chưa đầy đủ');
   const contents=await readFile(path);try{sniff(contents.subarray(0,16),kind,format);if(kind==='cover'&&!rasterMime(contents,format))throw new Error('Ảnh bìa không hoàn chỉnh hoặc vượt 5 MiB');if(format==='epub')epubChapters(contents);}catch(e){throw new BadRequestException((e as Error).message);}
   const previous=await this.db.transaction(async client=>{
    if(expert)await this.expertCheck(client,admin.id,id);else await this.mfa.assertWriteInTransaction(client,req,admin.id,false);
    const book=await client.query('SELECT id,status FROM library_books WHERE id=$1 FOR UPDATE',[id]);if(!book.rows[0])throw new NotFoundException('Sách không tồn tại');
    if(book.rows[0].status==='published')throw new ConflictException('Chuyển sách thành bản nháp trước khi cập nhật tệp');
    const old=await client.query('SELECT id FROM library_assets WHERE book_id=$1 AND kind=$2 FOR UPDATE',[id,kind]);
    await client.query('DELETE FROM library_assets WHERE book_id=$1 AND kind=$2',[id,kind]);
    await client.query('INSERT INTO library_assets(id,book_id,kind,format,size_bytes,sha256) VALUES($1,$2,$3,$4,$5,$6)',[assetId,id,kind,format,size,hash.digest('hex')]);
    await client.query('UPDATE library_books SET updated_at=NOW() WHERE id=$1',[id]);
    await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[admin.id,'book.asset.replace',id,JSON.stringify({kind,format,size})]);return old.rows[0]?.id as string|undefined;
   });
   // Old file deletion after transaction; orphan cleanup can be reconciled if crash occurs.
   if(previous)await unlink(assetPath(dir,previous)).catch(()=>{});
   return {uploaded:true,size,kind,format};
  }catch(e){await handle?.close().catch(()=>{});await unlink(path).catch(()=>{});throw e;}
 }
}
