/** Live Nest HTTP + disposable PostgreSQL authorization smoke.
 * Must run only after `npm run db:migrate` and API starts on 127.0.0.1:8080.
 */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
const allowed='http://127.0.0.1:8080';
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/.test(url||'')||process.env.API_INTERNAL_URL!==allowed)throw Error('BLOCKED: HTTP E2E requires disposable CI PostgreSQL and loopback Nest API');
const db=new pg.Client({connectionString:url});await db.connect();
const a=randomUUID(),b=randomUUID(),sessA=randomBytes(32).toString('hex'),sessB=randomBytes(32).toString('hex');
const hex=token=>createHash('sha256').update(token).digest('hex');
const origin=process.env.WEB_ORIGIN||'http://127.0.0.1:3000';
async function request(path,method='GET',body,token){const r=await fetch(allowed+path,{method,headers:{'Origin':origin,'Content-Type':'application/json',...(token?{Cookie:'thiendo_session='+token}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});const data=await r.json().catch(()=>null);return {status:r.status,body:data};}
try{
 const responsive=await request('/api/forum/categories');assert.equal(responsive.status,200);
 for(const id of [a,b])await db.query('INSERT INTO users(id,email,password_hash,salt,email_verified_at) VALUES($1,$2,$3,$4,NOW())',[id,`v11157-${id}@example.invalid`,'test-only','test-only']);
 for(const [id,token] of [[a,sessA],[b,sessB]])await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'1 hour\')',[hex(token),id]);
 const valid={title:'Đối chiếu Tử Vi',body:'Đây là bài kiểm thử E2E cho tình huống phân quyền và ẩn thông tin',category:'tu-vi'};
 const made=await request('/api/forum/threads','POST',{...valid,visibility:'private'},sessA);assert.equal(made.status,201,JSON.stringify(made));const postId=made.body.id;
 assert.equal((await request('/api/forum/threads/'+postId,'GET',undefined,sessB)).status,404,'Private must not expose to another member');
 assert.equal((await request('/api/forum/threads/'+postId)).status,404,'Private must not leak to anonymous');
 assert.equal((await request('/api/forum/threads/'+postId,'GET',undefined,sessA)).status,200,'Owner must access private');
 assert.equal((await request('/api/forum/threads/'+postId,'PATCH',{...valid,visibility:'public',expectedRevision:1},sessB)).status,404,'Cannot edit other owner private');
 assert.equal((await request('/api/forum/threads','POST',{...valid,body:'<script>alert(1)</script>'},sessA)).status,400,'XSS payload rejected');
 assert.equal((await request('/api/forum/moderation/queue','GET',undefined,sessA)).status,403,'Member must not access moderation');
 const shared=await request('/api/forum/threads','POST',{...valid,visibility:'public'},sessA);assert.equal(shared.status,201);
 assert.equal((await request('/api/forum/threads/'+shared.body.id+'/comments','POST',{body:'Bình luận xác minh quyền truy cập'},sessB)).status,201);
 const detail=await request('/api/forum/threads/'+shared.body.id,'GET',undefined,sessB);assert.equal(detail.status,200);assert.equal(detail.body.comments.length,1);
 assert.equal((await request('/api/forum/threads/'+shared.body.id+'/bookmark','POST',undefined,sessB)).status,201);
 assert.equal((await request('/api/forum/threads/'+shared.body.id+'/follow','POST',undefined,sessB)).status,201);
 const abuse=await request('/api/forum/reports/threads/'+shared.body.id,'POST',{reason:'privacy',explanation:'Kiểm tra báo cáo giả lập'},sessB);assert.equal(abuse.status,201);
 const me=await request('/api/forum/notifications','GET',undefined,sessA);assert.equal(me.status,200);
 console.log('PASS: Live Nest owner-only/private, author writes, XSS, moderator RBAC, comments, bookmark, follow, report, notifications');
}finally{
 try{await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[a,b]])}finally{await db.end()}
}
