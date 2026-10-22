import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'..');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AdminMfaService}=require('../apps/api/dist/modules/auth/admin-mfa.service.js');
const {TinhCanhService}=require('../apps/api/dist/modules/tinh-canh/tinh-canh.service.js');
const {encryptTotpSecret,randomTotpSecret,totpCode}=require('../apps/api/dist/modules/auth/totp.js');
const hash=s=>createHash('sha256').update(s).digest('hex');
let pg,db,mfa,ranks,owner,reader,recipient;
async function account(role,method='totp',caps=[]){
 const id=randomUUID(),token=randomBytes(32).toString('hex'),secret=randomTotpSecret();
 await pg.query('INSERT INTO users(id,email,password_hash,salt,email_verified_at) VALUES($1,$2,$3,$4,NOW())',[id,id+'@example.invalid','fixture','fixture']);
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[hash(token),id]);
 if(role){
  await pg.query('INSERT INTO admin_memberships(user_id,role) VALUES($1,$2)',[id,role]);
  await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2)',[id,JSON.stringify(caps)]);
  await pg.query('INSERT INTO admin_mfa_credentials(user_id,secret_encrypted,enabled_at) VALUES($1,$2,NOW())',[id,encryptTotpSecret(secret,id)]);
  await pg.query('INSERT INTO admin_session_assurance(token_hash,user_id,verified_at,method) VALUES($1,$2,NOW(),$3)',[hash(token),id,method]);
 }
 return {id,token,secret};
}
const req=(a,path='/api/tinh-canh/admin/specialty-badges',method='POST')=>({userId:a.id,token:a.token,method,originalUrl:path,headers:{}});
const denied=status=>e=>e.getStatus?.()===status;
before(async()=>{
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');pg=await PGlite.create();
 await pg.exec('CREATE ROLE thiendo_app');
 const names=readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*sql$/.test(n)).sort();assert.equal(names.length,36);
 for(const n of names.slice(0,34))await pg.exec(readFileSync(resolve(root,'infrastructure/db',n),'utf8'));
 const legacy=randomUUID();await pg.query("INSERT INTO users(id,email,password_hash,salt) VALUES($1,'upgrade@example.invalid','preserve','preserve')",[legacy]);
 const beforeRows=(await pg.query('SELECT * FROM users')).rows;
 for(const n of names.slice(34))await pg.exec(readFileSync(resolve(root,'infrastructure/db',n),'utf8'));
 assert.deepEqual((await pg.query('SELECT * FROM users')).rows,beforeRows);
 const q=async(c,s,p)=>{const r=await c.query(s,p);return {...r,rowCount:r.affectedRows||r.rows.length}};
 db={query:(s,p)=>q(pg,s,p),transaction:f=>pg.transaction(c=>f({query:(s,p)=>q(c,s,p)}))};
 const auth={getToken:r=>r.token,required:async r=>{const u=(await pg.query('SELECT id,email FROM users WHERE id=$1',[r.userId])).rows[0];assert.ok(u);return u},me:async r=>r.userId?{id:r.userId}:null};
 mfa=new AdminMfaService(db,auth);ranks=new TinhCanhService(db,auth,mfa);
 owner=await account('owner');reader=await account('admin','totp',['ranks.read']);recipient=await account(null);
});
after(async()=>{await pg?.close()});
test('035/036 upgrade preserves existing user bytes and app role can access new tables',async()=>{
 for(const table of ['admin_trusted_devices','specialty_badge_grants','specialty_badge_revocations'])assert.equal((await pg.query('SELECT has_table_privilege($1,$2,$3) ok',['thiendo_app',table,'SELECT,INSERT,DELETE'])).rows[0].ok,true);
});
test('specialty grants require capability and fresh TOTP; do not grant account privileges',async()=>{
 const body={userId:recipient.id,badgeId:'astrologer',reason:'Synthetic evidence for grant policy'};
 await assert.rejects(ranks.grantSpecialtyBadge(req(reader),body),denied(403));
 const remembered=await account('admin','trusted_device',['ranks.read','ranks.write']);
 await assert.rejects(ranks.grantSpecialtyBadge(req(remembered),body),denied(403));
 await assert.rejects(ranks.grantSpecialtyBadge(req(owner),{...body,userId:owner.id}),denied(403));
 const result=await ranks.grantSpecialtyBadge(req(owner),body);assert.equal(result.granted,true);
 await assert.rejects(ranks.grantSpecialtyBadge(req(owner),body),denied(409));
 assert.equal((await pg.query('SELECT count(*)::int n FROM specialty_badge_grants WHERE user_id=$1',[recipient.id])).rows[0].n,1);
 for(const table of ['admin_memberships','expert_credentials','pro_entitlements','tinh_van_awards'])assert.equal((await pg.query('SELECT count(*)::int n FROM '+table+' WHERE user_id=$1',[recipient.id])).rows[0].n,0);
 assert.equal((await ranks.profile({},recipient.id)).specialtyBadges.length,1);
 await ranks.privacy({userId:recipient.id},{publicRank:false});await assert.rejects(ranks.profile({},recipient.id),denied(404));
 await ranks.revokeSpecialtyBadge(req(owner),result.grantId,{reason:'Synthetic evidence for revocation'});
 await assert.rejects(ranks.revokeSpecialtyBadge(req(owner),result.grantId,{reason:'Synthetic evidence for revocation'}),denied(409));
 assert.equal((await ranks.profile({userId:recipient.id},recipient.id)).specialtyBadges.length,0);
 assert.equal((await pg.query("SELECT count(*)::int n FROM admin_audit WHERE action IN ('specialty.badge.grant','specialty.badge.revoke')")).rows[0].n,2);
});
test('remembered browser restores read access only; forged/expired/cross-account tokens fail',async()=>{
 const a=await account('admin','totp',['ranks.read','ranks.write']);let cookie;
 await mfa.verify(req(a,'/api/auth/mfa/verify'),{cookie:(...args)=>{cookie=args}},{code:totpCode(a.secret,Math.floor(Date.now()/30000)),trustDevice:true});
 assert.equal(cookie[0],'thiendo_admin_device');assert.equal(cookie[2].httpOnly,true);assert.equal(cookie[2].sameSite,'strict');
 assert.notEqual((await pg.query('SELECT token_hash FROM admin_trusted_devices WHERE user_id=$1',[a.id])).rows[0].token_hash,cookie[1]);
 await pg.query('DELETE FROM admin_session_assurance WHERE user_id=$1',[a.id]);
 const r=req(a,'/api/auth/mfa/trusted-session');r.headers.cookie='thiendo_admin_device='+cookie[1];
 assert.equal((await mfa.restoreTrustedSession(r)).restored,true);
 assert.equal((await mfa.status(r)).stepUp,false);
 await mfa.requireAdmin(req(a,undefined,'GET'));
 await assert.rejects(mfa.requireAdmin(req(a),false,true),denied(403));
 const other=req(reader,'/api/auth/mfa/trusted-session');other.headers.cookie=r.headers.cookie;assert.equal((await mfa.restoreTrustedSession(other)).restored,false);
 r.headers.cookie='thiendo_admin_device='+'f'.repeat(64);assert.equal((await mfa.restoreTrustedSession(r)).restored,false);
 await pg.query("UPDATE admin_trusted_devices SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1",[a.id]);r.headers.cookie='thiendo_admin_device='+cookie[1];assert.equal((await mfa.restoreTrustedSession(r)).restored,false);
});
test('revoke trusted devices immediately removes remembered read assurance while retaining real TOTP',async()=>{
 const rememberedToken=randomBytes(32).toString('hex');
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[hash(rememberedToken),owner.id]);
 await pg.query("INSERT INTO admin_session_assurance(token_hash,user_id,verified_at,method) VALUES($1,$2,NOW(),'trusted_device')",[hash(rememberedToken),owner.id]);
 const remembered={...owner,token:rememberedToken};await mfa.requireAdmin(req(remembered,undefined,'GET'));
 await mfa.revokeTrustedDevices(req(owner,'/api/auth/mfa/trusted-devices/revoke'),{clearCookie:()=>{}});
 await assert.rejects(mfa.requireAdmin(req(remembered,undefined,'GET')),denied(403));
 await mfa.requireAdmin(req(owner),false,true);
});
