import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import pg from 'pg';
import {assertSafeE2ETarget} from '../infrastructure/scripts/e2e-guard.mjs';
import {localE2EFetch,localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
const target=assertSafeE2ETarget();
const BASE=localTestOrigin(process.env.API_BASE_URL||'http://127.0.0.1:8080');
const storage=process.env.BOOK_PRIVATE_STORAGE_DIR;
if(!storage||!isAbsolute(storage)||!/thiendo-ci-private-books/.test(storage))throw Error('BLOCKED: library HTTP E2E demands disposable CI-only storage');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
const pdf=Buffer.from('%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF\n','ascii');
const epub=(await import('node:fs/promises')).readFile(new URL('./fixtures/v11155-synthetic.epub',import.meta.url));
async function request(path,{method='GET',cookie,body,binary,range}={}){
 const headers={...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(binary?{'Content-Type':'application/octet-stream','X-Book-File-Bytes':String(binary.length)}:{}),...(range?{Range:range}:{})};
 const response=await localE2EFetch(BASE,path,{method,headers,body:binary||(body?JSON.stringify(body):undefined)});
 return {status:response.status,headers:response.headers,json:response.headers.get('content-type')?.includes('json')?await response.json():null,bytes:response.headers.get('content-type')?.includes('json')?null:Buffer.from(await response.arrayBuffer()),cookie:(response.headers.get('set-cookie')||'').split(';')[0]};
}
test('V11.155: direct PDF/EPUB URL authorization and user progress with real HTTP/PostgreSQL',async()=>{
 await client.connect();
 const info=await client.query('SELECT current_database() AS db');
 assert.equal(info.rows[0].db,target.databaseName);
 const health=await request('/api/health/e2e');assert.equal(health.status,200);assert.equal(health.json.database,target.databaseName);
 await mkdir(storage,{recursive:true,mode:0o700});
 const id1=randomUUID(),id2=randomUUID(),id3=randomUUID(),id4=randomUUID();
 const slug1='ci-free-'+id1.slice(0,8),slug2='ci-member-'+id2.slice(0,8),slug3='ci-pro-'+id3.slice(0,8),slug4='ci-hidden-'+id4.slice(0,8);
 const bookIds=[id1,id2,id3,id4],assetIds=[],accounts=[];
 try{
  for(const [id,slug,access,status] of [[id1,slug1,'free','published'],[id2,slug2,'member','published'],[id3,slug3,'pro','published'],[id4,slug4,'free','hidden']]){
   await client.query('INSERT INTO library_books(id,slug,title,author,subject,access_level,status,license_name,license_proof) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,slug,'Test fixture '+slug,'V11.155 CI author','kinh-dich',access,status,'Test fixture (original)','CI synthetic content, no copyright holder']);
   const assetId=randomUUID();assetIds.push(assetId);const content=id===id3?await epub:pdf;await writeFile(join(storage,assetId),content,{mode:0o600,flag:'wx'});
   const {createHash}=await import('node:crypto');await client.query('INSERT INTO library_assets(id,book_id,kind,format,size_bytes,sha256) VALUES($1,$2,\'book\',$3,$4,$5)',[assetId,id,id===id3?'epub':'pdf',content.length,createHash('sha256').update(content).digest('hex')]);
  }
  const a=await request('/api/auth/register',{method:'POST',body:{email:'book-a-'+id1.slice(0,12)+'@example.invalid',password:'TEST-'+randomUUID()+'-safe'}});
  assert.equal(a.status,201);const cookieA=a.cookie;accounts.push(a.json.user.id);
  const b=await request('/api/auth/register',{method:'POST',body:{email:'book-b-'+id1.slice(0,12)+'@example.invalid',password:'TEST-'+randomUUID()+'-safe'}});
  assert.equal(b.status,201);const cookieB=b.cookie;accounts.push(b.json.user.id);
  assert.equal((await request('/api/books')).status,200);
  assert.equal((await request('/api/books/'+slug1+'/file')).status,200,'free book readable by guest');
  assert.equal((await request('/api/books/'+slug1+'/file',{range:'bytes=0-3'})).status,206,'single byte range supported');
  assert.equal((await request('/api/books/'+slug1+'/file',{range:'bytes=999999-'})).status,416,'invalid range rejected');
  assert.equal((await request('/api/books/'+slug2+'/file')).status,401,'member file blocked for guest');
  assert.equal((await request('/api/books/'+slug2+'/file',{cookie:cookieA})).status,200,'member can read member file');
  assert.equal((await request('/api/books/'+slug3+'/file')).status,401,'Pro EPUB blocked for guest');
  assert.equal((await request('/api/books/'+slug3+'/file',{cookie:cookieA})).status,403,'Pro EPUB blocked for non-Pro member');
  assert.equal((await request('/api/books/'+slug3+'/chapters',{cookie:cookieA})).status,403,'EPUB chapter API also checks access');
  assert.equal((await request('/api/books/'+slug4+'/file')).status,404,'hidden file inaccessible by direct URL');
  assert.equal((await request('/api/books/'+assetIds[0]+'/file')).status,404,'opaque asset path not a public book slug');
  assert.equal((await request('/api/books/admin/catalog')).status,401,'Admin endpoint needs login');
  assert.equal((await request('/api/books/admin/catalog',{cookie:cookieA})).status,403,'member cannot list unpublished books');
  assert.equal((await request('/api/books/admin/'+id2+'/assets/book/pdf',{method:'POST',cookie:cookieA,binary:pdf})).status,403,'member cannot upload files');
  assert.equal((await request('/api/books/'+slug2+'/progress',{method:'PATCH',cookie:cookieA,body:{position:4,bookmarks:[1,4],favorite:true}})).status,200);
  const own=await request('/api/books/'+slug2,{cookie:cookieA});assert.equal(own.json.progress.position,4);assert.deepEqual(own.json.progress.bookmarks,[1,4]);
  const other=await request('/api/books/'+slug2,{cookie:cookieB});assert.equal(other.json.progress,null,'reading progress private');
  await client.query("INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at) VALUES($1,$2,'[]',clock_timestamp()-INTERVAL '1 minute',clock_timestamp()+INTERVAL '1 day')",[randomUUID(),a.json.user.id]);
  assert.equal((await request('/api/books/'+slug3+'/file',{cookie:cookieA})).status,200,'live Pro entitlement unlocks EPUB');
  const ch=await request('/api/books/'+slug3+'/chapters',{cookie:cookieA});assert.equal(ch.status,200);assert.equal(ch.json.chapters.length,2);
  const text=await request('/api/books/'+slug3+'/chapters/0',{cookie:cookieA});assert.equal(text.status,200);assert.ok(!text.json.chapter.text.includes('alert(1)'));
  assert.equal((await request('/api/books/'+slug3+'/file',{cookie:cookieB})).status,403,'other member remains blocked');
 }finally{
  await client.query('DELETE FROM library_books WHERE id=ANY($1::uuid[])',[bookIds]);
  for(const id of accounts)await client.query('DELETE FROM users WHERE id=$1',[id]);
  for(const id of assetIds)await unlink(join(storage,id)).catch(()=>{});
  await client.end();
 }
});
