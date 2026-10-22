/** Native PostgreSQL and provider acceptance remain separate. No production data. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Set THIENDO_SQL_TEST_MODULE; no silent skip');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AuthService}=require('../apps/api/dist/modules/auth/auth.service.js');
const {dashboardSnapshot}=require('../apps/api/dist/modules/admin-insights/dashboard-snapshot.js');
const {AdminInsightsService}=require('../apps/api/dist/modules/admin-insights/admin-insights.service.js');
let pg,db,auth;const password='Isolated!'+randomBytes(12).toString('hex');
const req=()=>({headers:{'user-agent':'Isolated SQL suite'}});
function response(){return {cookie(name,value,options){this.token=value;this.options=options;}};}
before(async()=>{pg=await PGlite.create();for(const name of readdirSync('infrastructure/db').filter(f=>/^\d{3}.*sql$/.test(f)).sort())await pg.exec(readFileSync('infrastructure/db/'+name,'utf8'));const query=async(c,s,p)=>{const r=await c.query(s,p);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};};db={query:(s,p)=>query(pg,s,p),transaction:fn=>pg.transaction(tx=>fn({query:(s,p)=>query(tx,s,p)}))};auth=new AuthService(db);});
after(async()=>pg?.close());
test('new username is normalized, collision maps to 409 and failed insert rolls back session',async()=>{
 await auth.register({email:'new@example.invalid',username:' Research_01 ',password},req(),response());
 assert.equal((await pg.query("SELECT username FROM users WHERE email='new@example.invalid'")).rows[0].username,'research_01');
 const before=(await pg.query('SELECT COUNT(*)::int AS n FROM sessions')).rows[0].n;
 await assert.rejects(auth.register({email:'dup@example.invalid',username:'RESEARCH_01',password},req(),response()),e=>e.getStatus()===409);
 assert.equal((await pg.query("SELECT COUNT(*)::int AS n FROM users WHERE email='dup@example.invalid'")).rows[0].n,0);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM sessions')).rows[0].n,before);
});
test('username/email sign-in and remember flag enforce real expiry and browser-session cookies',async()=>{
 const res=response();await auth.login({identifier:'RESEARCH_01',password,remember:false},req(),res);
 assert.equal(res.options.maxAge,undefined);assert.equal(res.options.httpOnly,true);assert.equal(res.options.sameSite,'lax');
 const hours=(await pg.query('SELECT EXTRACT(EPOCH FROM(expires_at-NOW()))/3600 AS hours FROM sessions ORDER BY created_at DESC LIMIT 1')).rows[0].hours;assert.ok(Number(hours)>11.9&&Number(hours)<=12.01);
 const keep=response();await auth.login({email:'new@example.invalid',password,remember:true},req(),keep);assert.equal(keep.options.maxAge,604800000);
 await assert.rejects(auth.login({identifier:'research_01',password,remember:'false'},req(),response()),e=>e.getStatus()===400);
});
test('old email-only clients and existing null usernames remain compatible',async()=>{
 await auth.register({email:'legacy@example.invalid',password},req(),response());
 assert.equal((await pg.query("SELECT username FROM users WHERE email='legacy@example.invalid'")).rows[0].username,null);
 assert.ok((await auth.login({email:'LEGACY@example.invalid',password},req(),response())).user.id);
});
test('actual dashboard SQL distinguishes unavailable tracking from observed zero, and UTC/VN dates',async()=>{
 const data=await db.transaction(tx=>dashboardSnapshot(tx,7,false));
 assert.equal(data.metrics.find(m=>m.id==='users.total').value,2);assert.equal(data.metrics.find(m=>m.id==='users.new').value,2);
 assert.equal(data.metrics.find(m=>m.id==='traffic.views').value,null);assert.equal(data.daily.length,7);assert.equal(data.metrics.find(m=>m.id==='users.active').value,null);
 assert.equal(data.metrics.find(m=>m.id==='revenue.gross').value,0);assert.equal(data.metrics.find(m=>m.id==='users.total').previous,null);
});
test('tracking source produces true counts when explicitly enabled in isolated fixtures',async()=>{
 await pg.exec("INSERT INTO web_analytics_state(id) VALUES(1); INSERT INTO web_page_views(event_id) VALUES(gen_random_uuid()),(gen_random_uuid())");
 await new Promise(resolve=>setTimeout(resolve,12)); // Let the millisecond timestamp boundary pass.
 const data=await db.transaction(tx=>dashboardSnapshot(tx,1,true));assert.equal(data.metrics.find(m=>m.id==='traffic.views').value,2);assert.equal(data.daily[0].views,2);
});
test('dashboard rechecks MFA after SQL and never returns report following access revocation',async()=>{
 const id=(await pg.query('SELECT id FROM users LIMIT 1')).rows[0].id;let calls=0;
 const service=new AdminInsightsService(db,{requireAdmin:async()=>{calls++;if(calls>1)throw Error('revoked');return {id,role:'owner'};}},{enabled:()=>false},{});
 await assert.rejects(service.dashboard(req(),'7'),/revoked/);assert.equal(calls,2);
});
test('finance/system/library/chart Admin queries execute only fixed real aggregates',async()=>{
 const id=(await pg.query('SELECT id FROM users LIMIT 1')).rows[0].id;
 const service=new AdminInsightsService(db,{requireAdmin:async()=>({id,role:'owner'})},{enabled:()=>false},{explain:async()=>{throw Error('not configured');}});
 await pg.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at) VALUES(gen_random_uuid(),$1,'pro30','Isolated fixture',1000,30,'[]','pending',gen_random_uuid(),NOW()+INTERVAL '1 day')",[id]);
 const data=await service.ask(req(),{question:'Doanh thu, hệ thống, sách, tài liệu và lá số 7 ngày',explain:false});
 assert.equal(data.queues.orders.length,1);assert.equal(data.queues.orders[0].amountVnd,1000);assert.equal('email' in data.queues.orders[0],false);
 assert.equal(data.facts.find(f=>f.id==='finance.gross').value,0);assert.equal(data.facts.find(f=>f.id==='library.books').value,0);assert.equal(data.interpretation,null);
});

test('MFA adapter without a valid role fails closed before returning SQL facts',async()=>{
 const id=(await pg.query('SELECT id FROM users LIMIT 1')).rows[0].id;
 const service=new AdminInsightsService(db,{requireAdmin:async()=>({id})},{enabled:()=>false},{});
 await assert.rejects(service.dashboard(req(),'7'),e=>e.getStatus()===403);
});
