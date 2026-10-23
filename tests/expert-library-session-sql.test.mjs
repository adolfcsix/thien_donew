/** Real Auth/Books services, isolated SQL and temporary files; no production storage. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {mkdtemp,readdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated PGlite module required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AuthService}=require('../apps/api/dist/modules/auth/auth.service.js'),{BooksService}=require('../apps/api/dist/modules/books/books.service.js');
let pg,db,auth,books,storage;const oldStorage=process.env.BOOK_PRIVATE_STORAGE_DIR;
const digest=x=>createHash('sha256').update(x).digest('hex'),denied=status=>error=>error.getStatus?.()===status;
const bytes=Buffer.from('%PDF-1.4\n% isolated upload fixture, not PDF rendering certification\n%%EOF\n');
before(async()=>{
 storage=await mkdtemp(join(tmpdir(),'thiendo-expert-session-'));process.env.BOOK_PRIVATE_STORAGE_DIR=storage;
 pg=await PGlite.create();for(const f of readdirSync('infrastructure/db').filter(n=>/^\d{3}.*\.sql$/.test(n)).sort())await pg.exec(readFileSync('infrastructure/db/'+f,'utf8'));
 const query=async(c,q,p)=>{const r=await c.query(q,p);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
 db={query:(q,p)=>query(pg,q,p),transaction:fn=>pg.transaction(tx=>fn({query:(q,p)=>query(tx,q,p)}))};auth=new AuthService(db);books=new BooksService(db,auth,{});
});
after(async()=>{await pg?.close();await rm(storage,{recursive:true,force:true});if(oldStorage===undefined)delete process.env.BOOK_PRIVATE_STORAGE_DIR;else process.env.BOOK_PRIVATE_STORAGE_DIR=oldStorage;});
async function fixture(){
 const id=randomUUID(),token=randomBytes(32).toString('hex'),bookId=randomUUID();
 await pg.query("INSERT INTO users(id,email,password_hash,salt,email_verified_at) VALUES($1,$2,'fixture','fixture',NOW())",[id,id+'@example.invalid']);
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[digest(token),id]);
 await pg.query("INSERT INTO expert_credentials(user_id,specialty,granted_by,reason) VALUES($1,'Isolated research',$1,'Isolated permission fixture')",[id]);
 await pg.query("INSERT INTO library_books(id,slug,title,author,subject,submitted_by,license_name,license_proof) VALUES($1,$2,'Isolated book','Researcher','nghien-cuu',$3,'QA fixture','Not published')",[bookId,'qa-'+bookId,id]);
 return {id,token,bookId,req:{headers:{cookie:'thiendo_session='+token}}};
}
function request(f,action=async()=>{}){return {...f.req,headers:{...f.req.headers,'content-type':'application/octet-stream','content-length':String(bytes.length)},async *[Symbol.asyncIterator](){yield bytes.subarray(0,8);await action();yield bytes.subarray(8);}};}
async function assets(id){return (await pg.query('SELECT id,sha256 FROM library_assets WHERE book_id=$1',[id])).rows;}
test('active expert uploads, replaces and submits their own draft',async()=>{
 const f=await fixture();await books.upload(request(f),f.bookId,'book','pdf',true);const old=(await assets(f.bookId))[0];assert.deepEqual(await readFile(join(storage,old.id)),bytes);
 await books.upload(request(f),f.bookId,'book','pdf',true);assert.notEqual((await assets(f.bookId))[0].id,old.id);assert.equal((await readdir(storage)).includes(old.id),false);assert.equal((await books.expertSubmit(f.req,f.bookId)).submitted,true);
});
for(const [label,revoke,status] of [
 ['logout',f=>pg.query('DELETE FROM sessions WHERE token_hash=$1',[digest(f.token)]),401],
 ['expiry',f=>pg.query("UPDATE sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE token_hash=$1",[digest(f.token)]),401],
 ['expert revocation',f=>pg.query('UPDATE expert_credentials SET revoked_at=NOW() WHERE user_id=$1',[f.id]),403],
 ['account block',f=>pg.query("INSERT INTO account_blocks(user_id,reason) VALUES($1,'Isolated restriction')",[f.id]),401]
])test(label+' during upload rolls back DB/audit and removes temporary bytes',async()=>{
 const f=await fixture(),files=await readdir(storage),count=(await pg.query('SELECT COUNT(*)::int AS n FROM admin_audit WHERE actor_id=$1',[f.id])).rows[0].n;
 await assert.rejects(books.upload(request(f,()=>revoke(f)),f.bookId,'book','pdf',true),denied(status));assert.deepEqual(await assets(f.bookId),[]);assert.deepEqual(await readdir(storage),files);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM admin_audit WHERE actor_id=$1',[f.id])).rows[0].n,count);
});
test('logout during replacement preserves the old database reference and bytes',async()=>{
 const f=await fixture();await books.upload(request(f),f.bookId,'book','pdf',true);const old=(await assets(f.bookId))[0],files=await readdir(storage);
 await assert.rejects(books.upload(request(f,()=>pg.query('DELETE FROM sessions WHERE user_id=$1',[f.id])),f.bookId,'book','pdf',true),denied(401));assert.deepEqual(await assets(f.bookId),[old]);assert.deepEqual(await readFile(join(storage,old.id)),bytes);assert.deepEqual(await readdir(storage),files);
});
test('an expert cannot upload into another account draft',async()=>{
 const a=await fixture(),b=await fixture(),files=await readdir(storage);await assert.rejects(books.upload(request(b),a.bookId,'book','pdf',true),denied(404));assert.deepEqual(await assets(a.bookId),[]);assert.deepEqual(await readdir(storage),files);
});
test('revocation after initial authentication prevents submission',async()=>{
 const f=await fixture();await books.upload(request(f),f.bookId,'book','pdf',true);const original=auth.required.bind(auth);auth.required=async req=>{const actor=await original(req);await pg.query('DELETE FROM sessions WHERE user_id=$1',[actor.id]);return actor;};
 try{await assert.rejects(books.expertSubmit(f.req,f.bookId),denied(401));}finally{auth.required=original;}
 assert.equal((await pg.query('SELECT submission_status FROM library_books WHERE id=$1',[f.bookId])).rows[0].submission_status,'draft');
});

test('corrupt EPUB upload fails without replacing validated bytes or adding audit records',async()=>{
 const f=await fixture();await books.upload(request(f),f.bookId,'book','pdf',true);const original=await assets(f.bookId),files=await readdir(storage),audit=(await pg.query('SELECT COUNT(*)::int AS n FROM admin_audit WHERE actor_id=$1',[f.id])).rows[0].n;
 const {epub}=require('./helpers-epub-fixture.cjs'),bad=epub();bad.buffer[bad.records.at(-1).data+10]^=1;
 const req={...f.req,headers:{...f.req.headers,'content-type':'application/octet-stream','content-length':String(bad.buffer.length)},async *[Symbol.asyncIterator](){yield bad.buffer;}};
 await assert.rejects(books.upload(req,f.bookId,'book','epub',true),denied(400));assert.deepEqual(await assets(f.bookId),original);assert.deepEqual(await readdir(storage),files);assert.deepEqual(await readFile(join(storage,original[0].id)),bytes);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM admin_audit WHERE actor_id=$1',[f.id])).rows[0].n,audit);
});
test('published EPUB content, truncation metadata and account progress stay correctly scoped',async()=>{
 const a=await fixture(),b=await fixture(),{epub}=require('./helpers-epub-fixture.cjs'),data=epub({text:'a'.repeat(125000),paired:true,descriptor:true}).buffer;
 const req={...a.req,headers:{...a.req.headers,'content-type':'application/octet-stream','content-length':String(data.length)},async *[Symbol.asyncIterator](){yield data;}};
 await books.upload(req,a.bookId,'book','epub',true);await pg.query("UPDATE library_books SET status='published',access_level='free' WHERE id=$1",[a.bookId]);const name='qa-'+a.bookId;
 assert.equal((await books.chapters({headers:{}},name)).chapters.length,1);const content=await books.chapter(a.req,name,'0');assert.equal(content.chapter.text.length,120000);assert.equal(content.chapter.originalCharacters,125000);assert.equal(content.chapter.truncated,true);await assert.rejects(books.chapter(a.req,name,'1'),denied(404));
 const progress={position:0,bookmarks:[0],favorite:true};assert.deepEqual(await books.progress(a.req,name,progress),{saved:true});assert.deepEqual((await books.detail(a.req,name)).progress,progress);assert.equal((await books.detail(b.req,name)).progress,null);assert.equal((await books.detail({headers:{}},name)).progress,null);await assert.rejects(books.progress({headers:{}},name,progress),denied(401));
 await pg.query("UPDATE library_books SET access_level='member' WHERE id=$1",[a.bookId]);await assert.rejects(books.chapter({headers:{}},name,'0'),denied(401));assert.equal((await books.chapter(b.req,name,'0')).total,1);
 await pg.query("UPDATE library_books SET access_level='pro' WHERE id=$1",[a.bookId]);await assert.rejects(books.chapter(b.req,name,'0'),denied(403));
});
