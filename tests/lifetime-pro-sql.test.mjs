/** Real services and MFA/capability guards over disposable PGlite, not native PostgreSQL. */
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated SQL engine required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AuthService}=require('../apps/api/dist/modules/auth/auth.service.js');
const {AdminMfaService}=require('../apps/api/dist/modules/auth/admin-mfa.service.js');
const {CommunityHubService}=require('../apps/api/dist/modules/community-hub/community-hub.service.js');
const {BillingService}=require('../apps/api/dist/modules/billing/billing.service.js');
const {AdminService}=require('../apps/api/dist/modules/billing/admin.service.js');
const oldKey=process.env.ADMIN_MFA_ENCRYPTION_KEY;
process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');
let pg,db,auth,mfa,hub,billing,admin,operator,member;
const denied=status=>e=>e.getStatus?.()===status;
const query=async(c,q,p)=>{const r=await c.query(q,p);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};};
before(async()=>{
 pg=await PGlite.create();
 for(const n of readdirSync('infrastructure/db').filter(n=>/^\d{3}_.*\.sql$/.test(n)).sort())await pg.exec(readFileSync('infrastructure/db/'+n,'utf8'));
 db={query:(q,p)=>query(pg,q,p),transaction:fn=>pg.transaction(c=>fn({query:(q,p)=>query(c,q,p)}))};
 auth=new AuthService(db);mfa=new AdminMfaService(db,auth);hub=new CommunityHubService(db,auth,mfa);billing=new BillingService(db,auth,{},mfa,{});admin=new AdminService(db,auth,mfa);
});
after(async()=>{await pg.close();if(oldKey===undefined)delete process.env.ADMIN_MFA_ENCRYPTION_KEY;else process.env.ADMIN_MFA_ENCRYPTION_KEY=oldKey;});
async function identity(role){
 const id=randomUUID(),token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
 await pg.query("INSERT INTO users(id,email,password_hash,salt,email_verified_at) VALUES($1,$2,'fixture','fixture',NOW())",[id,id+'@example.invalid']);
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[hash,id]);
 if(role){await pg.query('INSERT INTO admin_memberships(user_id,role) VALUES($1,$2)',[id,role]);await pg.query("INSERT INTO admin_mfa_credentials(user_id,secret_encrypted,enabled_at) VALUES($1,'isolated-no-decrypt',NOW())",[id]);await pg.query("INSERT INTO admin_session_assurance(token_hash,user_id,method,verified_at) VALUES($1,$2,'totp',NOW())",[hash,id]);}
 return {id,hash,req:{headers:{cookie:'thiendo_session='+token},method:'POST',originalUrl:'/api/admin/console/pro/'+id+'/gift'}};
}
beforeEach(async()=>{await pg.exec("TRUNCATE users CASCADE; INSERT INTO premium_sections(path,title) VALUES('/pro/research','Report'),('/research/advanced','Methods');");operator=await identity('admin');member=await identity();await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2)',[operator.id,JSON.stringify(['members.read','finance.read','finance.write'])]);operator.req.originalUrl='/api/admin/console/pro/'+member.id+'/gift';});
const body=()=>({lifetime:true,reason:'Verified support lifetime grant',requestId:randomUUID()});
async function auditCount(){return Number((await pg.query('SELECT count(*) AS n FROM admin_audit')).rows[0].n);}
test('authorized admin grants genuine lifetime access; replay creates only one entitlement and records duration',async()=>{
 const b=body();await hub.gift(operator.req,member.id,b);assert.equal((await hub.gift(operator.req,member.id,b)).replayed,true);
 const r=await pg.query('SELECT expires_at,order_id FROM pro_entitlements WHERE user_id=$1',[member.id]);assert.equal(r.rows.length,1);assert.equal(r.rows[0].expires_at,null);assert.equal(r.rows[0].order_id,null);
 const access=await billing.access(member.req);assert.equal(access.lifetime,true);assert.ok(access.features.includes('premium-report'));assert.equal((await hub.assertSection(member.req,'/research/advanced')).allowed,true);
 const log=(await pg.query("SELECT details FROM admin_audit WHERE action='pro.gift' LIMIT 1")).rows[0].details;assert.equal(log.lifetime,true);assert.equal(log.requestId,b.requestId);
 await assert.rejects(hub.gift(operator.req,member.id,{days:30,reason:b.reason,requestId:b.requestId}),denied(409));
});
test('MFA, capability and user role cannot be forged to grant Pro',async()=>{
 await assert.rejects(hub.gift(member.req,member.id,body()),denied(403));
 await pg.query('UPDATE admin_permission_sets SET capabilities=\'[]\' WHERE user_id=$1',[operator.id]);await assert.rejects(hub.gift(operator.req,member.id,body()),denied(403));
 await pg.query('DELETE FROM admin_session_assurance WHERE user_id=$1',[operator.id]);await assert.rejects(hub.gift(operator.req,member.id,body()),denied(403));assert.equal(await auditCount(),0);
 assert.equal(Number((await pg.query('SELECT count(*) AS n FROM pro_entitlements')).rows[0].n),0);
});
test('expiry/foreign IDs, ambiguous lifetime inputs and short reasons are rejected',async()=>{
 for(const b of [{...body(),days:30},{...body(),lifetime:'true'},{...body(),reason:'x'}])await assert.rejects(hub.gift(operator.req,member.id,b),denied(400));
 const b=body();await hub.gift(operator.req,member.id,b);const other=await identity();await assert.rejects(hub.gift(operator.req,other.id,b),denied(409));
});
test('admin bypass works without buying a plan; ordinary users cannot fetch the protected content',async()=>{
 assert.equal((await hub.advanced(operator.req)).chapters.length>0,true);await assert.rejects(hub.advanced(member.req),denied(403));
});
test('finance admin can revoke lifetime access; history survives and protected API closes immediately',async()=>{
 const b=body();await hub.gift(operator.req,member.id,b);const req={...operator.req,method:'PATCH',originalUrl:'/api/admin/entitlements/'+b.requestId+'/revoke'};
 await admin.revoke(req,b.requestId,{reason:'Verified end of support authorization'});
 assert.equal((await billing.access(member.req)).lifetime,false);assert.deepEqual((await billing.access(member.req)).features,[]);await assert.rejects(hub.advanced(member.req),denied(403));
 assert.ok((await pg.query('SELECT revoked_at FROM pro_entitlements WHERE id=$1',[b.requestId])).rows[0].revoked_at);assert.equal(await auditCount(),2);
});
test('finite gifts keep expiry; paid records cannot be converted to lifetime by a null expiry',async()=>{
 await hub.gift(operator.req,member.id,{days:30,reason:'Verified finite support grant',requestId:randomUUID()});assert.equal((await billing.access(member.req)).lifetime,false);
 const row=(await pg.query('SELECT expires_at FROM pro_entitlements')).rows[0];assert.ok(row.expires_at);
 const order=randomUUID();await pg.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at) VALUES($1,$2,'pro30','Fixture',49000,30,'[]','paid',$3,NOW())",[order,member.id,randomUUID()]);
 await assert.rejects(pg.query("INSERT INTO pro_entitlements(id,user_id,order_id,features,starts_at,expires_at) VALUES($1,$2,$3,'[]',NOW(),NULL)",[randomUUID(),member.id,order]),e=>e.code==='23514');
});
test('role revoked between admission and transaction cannot commit a gift',async()=>{
 const raced={...db,transaction:fn=>db.transaction(async c=>{await c.query('DELETE FROM admin_memberships WHERE user_id=$1',[operator.id]);return fn(c);})};
 await assert.rejects(new CommunityHubService(raced,auth,mfa).gift(operator.req,member.id,body()),denied(403));assert.equal(await auditCount(),0);assert.equal(Number((await pg.query('SELECT count(*) AS n FROM pro_entitlements')).rows[0].n),0);
});

test('revoked, future and expired grants never unlock; a finite grant coexists with lifetime',async()=>{
 const b=body();await hub.gift(operator.req,member.id,b);
 await pg.query("INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at) VALUES($1,$2,'[\"premium-report\"]',NOW(),NOW()+INTERVAL '30 days')",[randomUUID(),member.id]);
 assert.equal((await billing.access(member.req)).lifetime,true);
 await pg.query('UPDATE pro_entitlements SET revoked_at=NOW() WHERE id=$1',[b.requestId]);
 assert.equal((await billing.access(member.req)).lifetime,false);assert.ok((await billing.access(member.req)).features.includes('premium-report'));
 await pg.query("UPDATE pro_entitlements SET starts_at=NOW()+INTERVAL '1 day',expires_at=NOW()+INTERVAL '2 days' WHERE revoked_at IS NULL");
 assert.deepEqual((await billing.access(member.req)).features,[]);await assert.rejects(hub.advanced(member.req),denied(403));
 await pg.query("UPDATE pro_entitlements SET starts_at=NOW()-INTERVAL '2 days',expires_at=NOW()-INTERVAL '1 day' WHERE revoked_at IS NULL");
 await assert.rejects(hub.advanced(member.req),denied(403));
});
test('replay binds reason and actor; retry after revocation cannot reactivate access',async()=>{
 const b=body();await hub.gift(operator.req,member.id,b);
 await assert.rejects(hub.gift(operator.req,member.id,{...b,reason:'A different support decision'}),denied(409));
 const other=await identity('admin');other.req.originalUrl=operator.req.originalUrl;
 await assert.rejects(hub.gift(other.req,member.id,b),denied(409));
 await pg.query('UPDATE pro_entitlements SET revoked_at=NOW() WHERE id=$1',[b.requestId]);
 assert.equal((await hub.gift(operator.req,member.id,b)).replayed,true);await assert.rejects(hub.advanced(member.req),denied(403));
});
test('revocation requires finance capability, fresh MFA and a meaningful reason',async()=>{
 const b=body();await hub.gift(operator.req,member.id,b);operator.req.originalUrl='/api/admin/entitlements/'+b.requestId+'/revoke';operator.req.method='PATCH';
 await assert.rejects(admin.revoke(operator.req,b.requestId,{reason:'x'}),denied(400));
 await pg.query("UPDATE admin_permission_sets SET capabilities='[]' WHERE user_id=$1",[operator.id]);
 await assert.rejects(admin.revoke(operator.req,b.requestId,{reason:'Verified support withdrawal'}),denied(403));
 assert.equal((await billing.access(member.req)).lifetime,true);
});
