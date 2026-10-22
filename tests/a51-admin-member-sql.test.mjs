import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'..');
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated PGlite required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AdminConsoleService}=require('../apps/api/dist/modules/admin-console/admin-console.service.js');
const actorId=randomUUID(),target=randomUUID();let pg,service,actor,calls,hook,deny;
before(async()=>{
 pg=await PGlite.create();for(const name of readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*sql$/.test(n)).sort())await pg.exec(readFileSync(resolve(root,'infrastructure/db',name),'utf8'));
 for(const [id,email] of [[actorId,'operator@example.invalid'],[target,'target@example.invalid']])await pg.query("INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,'private-fixture-hash','private-fixture-salt')",[id,email]);
 await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[actorId]);
 await pg.query("INSERT INTO expert_credentials(user_id,specialty,granted_by,reason) VALUES($1,'QA research',$2,'Independent QA reason')",[target,actorId]);
 await pg.query("INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$2,12,'Independent QA rank decision')",[target,actorId]);
 for(let i=0;i<23;i++)await pg.query("INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at) VALUES($1,$2,'[\"premium-report\"]',clock_timestamp()-INTERVAL '1 day',clock_timestamp()+INTERVAL '30 days')",[randomUUID(),target]);
 await pg.query("INSERT INTO admin_audit(actor_id,action,target) VALUES($1,'qa.decision',$2)",[actorId,target]);
 const db={query:async(q,p)=>{calls.push(q);const r=await pg.query(q,p);await hook?.(q);return r;}};
 service=new AdminConsoleService(db,{}, {requireAdmin:async()=>{if(deny)throw Object.assign(new Error('MFA required'),{getStatus:()=>403});return {...actor};}});
});
after(async()=>{await pg.close();});
async function caps(values){await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET capabilities=$2',[actorId,JSON.stringify(values)]);}
beforeEach(async()=>{actor={id:actorId,role:'owner'};calls=[];hook=null;deny=false;await caps([]);});
test('Owner dossier contains actual operational metadata, bounded history and full active Pro aggregate; no secret or birth data',async()=>{
 const d=await service.member({},target);assert.equal(d.member.email,'target@example.invalid');assert.equal(d.expert.specialty,'QA research');assert.equal(d.pro.activeGrants,23);assert.equal(d.pro.grants.length,20);assert.equal(d.rankDecisions[0].level,12);assert.equal(d.audit[0].action,'qa.decision');assert.deepEqual(d.restricted,[]);
 const json=JSON.stringify(d);for(const privateValue of ['private-fixture-hash','private-fixture-salt','password_hash','token_hash','birth_profiles'])assert.equal(json.includes(privateValue),false);
});
test('members.read does not run finance/rank/audit SQL and marks those domains restricted',async()=>{
 actor.role='admin';await caps(['members.read']);const d=await service.member({},target);assert.equal(d.member.id,target);assert.equal(d.pro,null);assert.equal(d.rankDecisions,null);assert.equal(d.audit,null);assert.deepEqual(d.restricted,['finance','ranks','audit']);
 for(const table of ['pro_entitlements','tinh_canh_rank_grants','admin_audit'])assert.equal(calls.some(q=>q.includes('FROM '+table)),false,table);
});
test('overview-only and finance-only callers fail before looking up the member',async()=>{
 actor.role='admin';for(const c of [['overview.read'],['finance.read'],[]]){await caps(c);calls=[];await assert.rejects(service.member({},target),e=>e.getStatus()===403);assert.equal(calls.some(q=>q.includes('FROM users')),false);}
});
test('finance-scoped reader gets Pro only, never rank decisions or audit',async()=>{
 actor.role='admin';await caps(['members.read','finance.read']);const d=await service.member({},target);assert.equal(d.pro.activeGrants,23);assert.equal(d.rankDecisions,null);assert.equal(d.audit,null);
});
test('capability revoked while domain data is being read prevents returning the completed dossier',async()=>{
 actor.role='admin';await caps(['members.read','finance.read']);hook=async q=>{if(q.includes('FROM pro_entitlements')){hook=null;await caps(['members.read']);}};await assert.rejects(service.member({},target),e=>e.getStatus()===403);
});
test('MFA failure prevents all queries; missing/invalid targets use bounded errors',async()=>{
 deny=true;await assert.rejects(service.member({},target),e=>e.getStatus()===403);assert.equal(calls.length,0);deny=false;
 await assert.rejects(service.member({},'../secret'),e=>e.getStatus()===400);await assert.rejects(service.member({},randomUUID()),e=>e.getStatus()===404);
});
