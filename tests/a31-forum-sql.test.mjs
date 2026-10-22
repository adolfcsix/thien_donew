/** Actual service + disposable PostgreSQL WASM SQL. Not native PG or concurrency proof. */
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated THIENDO_SQL_TEST_MODULE required');
const {PGlite}=await import(pathToFileURL(resolve(process.env.THIENDO_SQL_TEST_MODULE)).href);
const {ForumService}=require(resolve(root,'apps/api/dist/modules/forum/forum.service.js'));
const bytes=readFileSync(resolve(root,'tests/fixtures/a30-forum-webp'));
const status=n=>e=>e.getStatus?.()===n;
let pg,forum,owner,other,unverified,db;
const query=async(c,s,p=[])=>{const r=await c.query(s,p);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length}};
before(async()=>{
 pg=await PGlite.create();
 for(const n of readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)).sort())await pg.exec(readFileSync(resolve(root,'infrastructure/db',n),'utf8'));
 db={query:(s,p)=>query(pg,s,p),transaction:f=>pg.transaction(c=>f({query:(s,p)=>query(c,s,p)}))};
 // Auth boundary is covered separately by account SQL/HTTP tests.
 forum=new ForumService(db,{me:async req=>req.user??null,required:async req=>{if(!req.user)throw Error('unauthenticated fixture');return req.user}},{});
});
after(async()=>{await pg?.close()});
beforeEach(async()=>{
 await pg.exec('TRUNCATE users CASCADE');
 async function user(verified=true){const id=randomUUID();await pg.query('INSERT INTO users(id,email,password_hash,salt,email_verified_at) VALUES($1,$2,$3,\'fixture-salt\',$4)',[id,id+'@example.invalid','test-fixture',verified?new Date():null]);return {user:{id,email:id+'@example.invalid'},headers:{'content-type':'image/webp'},body:bytes}}
 owner=await user();other=await user();unverified=await user(false);
});
const upload=(req=owner)=>forum.uploadImage(req);
const draft=(imageId,extra={})=>({category:'hoi-dap',title:'Ảnh kiểm thử',body:'',...(imageId===undefined?{}:{imageId}),...extra});
const image=(id,req={})=>{const res={headers:{},setHeader(k,v){this.headers[k]=v},send(data){this.data=data;return this}};return forum.image(req,id,res)};
const count=async(table)=>Number((await pg.query('SELECT count(*) AS n FROM '+table)).rows[0].n);
test('staging is unreadable; public, members and private image permissions follow the thread',async()=>{
 for(const visibility of ['public','members','private']){
  const media=await upload();await assert.rejects(()=>image(media.id,owner),status(404));
  const t=await forum.create(owner,draft(media.id,{visibility}));
  assert.deepEqual(Buffer.from((await image(t.id,owner)).data),bytes);
  if(visibility==='public')assert.equal((await image(t.id)).headers['Cache-Control'],'private, no-store');
  else await assert.rejects(()=>image(t.id),status(404));
  if(visibility==='private')await assert.rejects(()=>image(t.id,other),status(404));
  else assert.ok((await image(t.id,other)).data);
 }
});
test('foreign claim fails and rolls back the thread plus action budget',async()=>{
 const m=await upload();await assert.rejects(()=>forum.create(other,draft(m.id)),status(400));
 assert.equal(await count('forum_threads'),0);
 assert.equal((await pg.query("SELECT count(*)::int AS n FROM forum_action_limits WHERE action='thread'")).rows[0].n,0);
 assert.ok((await forum.create(owner,draft(m.id))).id);
});
test('expired and repeated claims cannot create orphan threads',async()=>{
 const m=await upload();await pg.query("UPDATE forum_media SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[m.id]);
 await assert.rejects(()=>forum.create(owner,draft(m.id)),status(400));assert.equal(await count('forum_threads'),0);
 const fresh=await upload();const t=await forum.create(owner,draft(fresh.id));
 await assert.rejects(()=>forum.create(owner,draft(fresh.id)),status(400));assert.equal(await count('forum_threads'),1);assert.ok((await image(t.id)).data);
});
test('image-only edit keeps bytes; removing last content is rejected atomically',async()=>{
 const m=await upload(),t=await forum.create(owner,draft(m.id));
 await forum.update(owner,t.id,{...draft(undefined),expectedRevision:1});
 await assert.rejects(()=>forum.update(owner,t.id,{...draft(null),expectedRevision:2}),status(400));
 assert.ok((await image(t.id)).data);assert.equal((await forum.detail(owner,t.id)).thread.revision,2);
 await forum.update(owner,t.id,{...draft(null,{body:'Giữ nội dung chữ'}),expectedRevision:2});
 await assert.rejects(()=>image(t.id),status(404));
});
test('failed replacement restores old image and original revision',async()=>{
 const m=await upload(),t=await forum.create(owner,draft(m.id)),foreign=await upload(other);
 await assert.rejects(()=>forum.update(owner,t.id,{...draft(foreign.id),expectedRevision:1}),status(400));
 assert.ok((await image(t.id)).data);assert.equal((await forum.detail(owner,t.id)).thread.revision,1);
});
test('visibility edits, moderation hiding and deletion immediately deny new image reads',async()=>{
 const m=await upload(),t=await forum.create(owner,draft(m.id));
 await forum.update(owner,t.id,{...draft(undefined,{visibility:'private'}),expectedRevision:1});
 await assert.rejects(()=>image(t.id,other),status(404));
 await pg.query("UPDATE forum_threads SET state='hidden' WHERE id=$1",[t.id]);await assert.rejects(()=>image(t.id,owner),status(404));
 await pg.query("UPDATE forum_threads SET state='visible' WHERE id=$1",[t.id]);
 await forum.remove(owner,t.id);assert.equal(await count('forum_media'),0);await assert.rejects(()=>image(t.id,owner),status(404));
});
test('foreign edit/delete and stale revision cannot mutate an attached image',async()=>{
 const m=await upload(),t=await forum.create(owner,draft(m.id));
 await assert.rejects(()=>forum.remove(other,t.id),status(403));
 await assert.rejects(()=>forum.update(other,t.id,{...draft(null,{body:'Forged'}),expectedRevision:1}),status(403));
 await assert.rejects(()=>forum.update(owner,t.id,{...draft(null,{body:'Stale'}),expectedRevision:99}),status(409));
 assert.ok((await image(t.id)).data);
});
test('unverified or suspended members cannot upload; upload budget stops the eleventh',async()=>{
 await assert.rejects(()=>upload(unverified),status(403));
 await pg.query("INSERT INTO forum_suspensions(user_id,expires_at,reason,moderator_id) VALUES($1,clock_timestamp()+interval '1 hour',$2,$3)",[other.user.id,'SQL test',owner.user.id]);
 await assert.rejects(()=>upload(other),status(403));
 for(let i=0;i<10;i++)await upload();await assert.rejects(()=>upload(),status(429));assert.equal(await count('forum_media'),10);
});
test('cleanup removes expired staging only; deleting user cascades attached bytes',async()=>{
 const attached=await upload(),t=await forum.create(owner,draft(attached.id)),expired=await upload();
 await pg.query("UPDATE forum_media SET expires_at=clock_timestamp()-interval '1 hour'");await upload();
 assert.equal((await pg.query('SELECT id FROM forum_media WHERE id=$1',[expired.id])).rows.length,0);assert.ok((await image(t.id)).data);
 await pg.query('DELETE FROM users WHERE id=$1',[owner.user.id]);assert.equal(await count('forum_media'),0);
});
