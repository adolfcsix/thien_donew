/** Billing/Auth services with isolated PGlite and a controlled gateway; no payment is made. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated PGlite required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AuthService}=require('../apps/api/dist/modules/auth/auth.service.js'),{BillingService}=require('../apps/api/dist/modules/billing/billing.service.js');
let pg,db,auth;const digest=x=>createHash('sha256').update(x).digest('hex'),denied=s=>e=>e.getStatus?.()===s;
before(async()=>{pg=await PGlite.create();for(const f of readdirSync('infrastructure/db').filter(n=>/^\d{3}.*\.sql$/.test(n)).sort())await pg.exec(readFileSync('infrastructure/db/'+f,'utf8'));const query=async(c,q,p)=>{const r=await c.query(q,p);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};db={query:(q,p)=>query(pg,q,p),transaction:f=>pg.transaction(tx=>f({query:(q,p)=>query(tx,q,p)}))};auth=new AuthService(db);});
after(async()=>pg?.close());
async function fixture(){
 const id=randomUUID(),token=randomBytes(32).toString('hex'),orderId=randomUUID();
 await pg.query("INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,'fixture','fixture')",[id,id+'@example.invalid']);
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[digest(token),id]);
 const o=(await pg.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at,payment_link_id) VALUES($1,$2,'pro30','QA Pro',49000,30,'[\"premium-report\"]','pending',$3,NOW()+INTERVAL '30 minutes',$4) RETURNING order_code",[orderId,id,randomUUID(),'link-'+orderId])).rows[0];
 return {id,token,orderId,code:Number(o.order_code),link:'link-'+orderId,req:{headers:{cookie:'thiendo_session='+token}}};
}
function service(f,status,options={}){
 let calls=0;const gateway={get:async()=>{calls++;await options.action?.();return {id:f.link,orderCode:f.code,amount:49000,status,amountPaid:status==='PAID'?49000:0,amountRemaining:status==='PAID'?0:49000,...options.snapshot};}};
 gateway.cancel=gateway.get;
 return {billing:new BillingService(options.db??db,auth,gateway,{},{}),calls:()=>calls};
}
async function stored(f){return (await pg.query('SELECT status FROM billing_orders WHERE id=$1',[f.orderId])).rows[0].status;}
async function receipts(f){return (await pg.query('SELECT action,details FROM admin_audit WHERE target=$1 ORDER BY created_at',[f.orderId])).rows;}
async function grants(f){return Number((await pg.query('SELECT COUNT(*)::int AS n FROM pro_entitlements WHERE order_id=$1',[f.orderId])).rows[0].n);}
for(const status of ['CANCELLED','EXPIRED'])test('verified unpaid '+status+' closes a pending order once without granting Pro',async()=>{
 const f=await fixture(),s=service(f,status);assert.equal((await s.billing.reconcile(f.req,f.orderId)).order.status,'cancelled');assert.equal(await stored(f),'cancelled');assert.equal(await grants(f),0);
 await s.billing.reconcile(f.req,f.orderId);const audit=await receipts(f);assert.equal(audit.length,1);assert.equal(audit[0].action,'payment.closed');assert.equal(audit[0].details.providerStatus,status);
});
test('pending and partially paid closed receipts do not become cancelled or grant Pro',async()=>{
 for(const [status,amountPaid]of [['PENDING',0],['UNDERPAID',12000],['CANCELLED',12000],['EXPIRED',12000]]){const f=await fixture(),s=service(f,status,{snapshot:{amountPaid,amountRemaining:49000-amountPaid}});await s.billing.reconcile(f.req,f.orderId);assert.equal(await stored(f),'pending');assert.equal(await grants(f),0);assert.deepEqual(await receipts(f),[]);}
});
test('late cancellation or expiry cannot downgrade an already paid order',async()=>{
 const f=await fixture();await service(f,'PAID').billing.reconcile(f.req,f.orderId);assert.equal(await grants(f),1);
 for(const status of ['CANCELLED','EXPIRED'])await service(f,status).billing.reconcile(f.req,f.orderId);
 assert.equal(await stored(f),'paid');assert.equal(await grants(f),1);assert.equal((await receipts(f)).some(r=>r.action==='payment.closed'),false);
});
test('a late paid receipt after local cancellation grants exactly once despite replay and later closed receipt',async()=>{
 const f=await fixture();await service(f,'CANCELLED').billing.reconcile(f.req,f.orderId);const paid=service(f,'PAID');await paid.billing.reconcile(f.req,f.orderId);await paid.billing.reconcile(f.req,f.orderId);await service(f,'EXPIRED').billing.reconcile(f.req,f.orderId);
 assert.equal(await stored(f),'paid');assert.equal(await grants(f),1);assert.equal((await receipts(f)).filter(r=>r.action==='payment.closed').length,1);
});
test('session revoked while awaiting the gateway cannot commit closure',async()=>{
 const f=await fixture(),s=service(f,'CANCELLED',{action:()=>pg.query('DELETE FROM sessions WHERE user_id=$1',[f.id])});await assert.rejects(s.billing.reconcile(f.req,f.orderId),denied(401));assert.equal(await stored(f),'pending');assert.deepEqual(await receipts(f),[]);
});
test('foreign account cannot look up or reconcile the order',async()=>{
 const f=await fixture(),other=await fixture(),s=service(f,'CANCELLED');await assert.rejects(s.billing.reconcile(other.req,f.orderId),denied(404));assert.equal(s.calls(),0);assert.equal(await stored(f),'pending');
});
test('wrong link or amount is rejected before changing state or recording closure',async()=>{
 for(const snapshot of [{id:'other-link'},{amount:1},{amountPaid:49000,amountRemaining:0}]){const f=await fixture(),s=service(f,'EXPIRED',{snapshot});if(snapshot.amountPaid){await s.billing.reconcile(f.req,f.orderId);}else{await assert.rejects(s.billing.reconcile(f.req,f.orderId),denied(503));}assert.equal(await stored(f),'pending');assert.deepEqual(await receipts(f),[]);}
});
test('closure and audit are atomic when the audit write fails',async()=>{
 const f=await fixture(),broken={...db,transaction:fn=>db.transaction(c=>fn({query:(q,p)=>{if(q.includes('INSERT INTO admin_audit'))throw Error('isolated audit failure');return c.query(q,p);}}))};
 await assert.rejects(service(f,'CANCELLED',{db:broken}).billing.reconcile(f.req,f.orderId),/isolated audit failure/);assert.equal(await stored(f),'pending');assert.deepEqual(await receipts(f),[]);
});
test('explicit cancellation uses the same atomic receipt and never creates Pro',async()=>{
 const f=await fixture(),s=service(f,'CANCELLED');assert.equal((await s.billing.cancel(f.req,f.orderId)).order.status,'cancelled');await s.billing.cancel(f.req,f.orderId);assert.equal(await grants(f),0);const r=await receipts(f);assert.equal(r.length,1);assert.equal(r[0].details.source,'verified-provider-cancel');
});
test('logout during explicit provider cancellation prevents local state mutation',async()=>{
 const f=await fixture(),s=service(f,'CANCELLED',{action:()=>pg.query('DELETE FROM sessions WHERE user_id=$1',[f.id])});await assert.rejects(s.billing.cancel(f.req,f.orderId),denied(401));assert.equal(await stored(f),'pending');assert.deepEqual(await receipts(f),[]);
});
test('closed provider receipts cannot downgrade a refunded order',async()=>{
 const f=await fixture();await pg.query("UPDATE billing_orders SET status='refunded' WHERE id=$1",[f.orderId]);
 await service(f,'EXPIRED').billing.reconcile(f.req,f.orderId);assert.equal(await stored(f),'refunded');assert.equal(await grants(f),0);assert.deepEqual(await receipts(f),[]);
});
