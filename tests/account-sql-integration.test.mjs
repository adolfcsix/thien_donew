/** Optional service/SQL integration against a disposable in-memory PostgreSQL WASM engine.
 * Requires a built API and THIENDO_SQL_TEST_MODULE pointing to PGlite's index.js.
 * No DATABASE_URL is used. This is NOT native PostgreSQL/network/concurrency E2E.
 */
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash,createHmac} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Set THIENDO_SQL_TEST_MODULE to an isolated PGlite index.js; no tests are silently skipped');
const {PGlite}=await import(pathToFileURL(resolve(process.env.THIENDO_SQL_TEST_MODULE)).href);
const {AuthService}=require(resolve(root,'apps/api/dist/modules/auth/auth.service.js'));
const {PasswordRecoveryService}=require(resolve(root,'apps/api/dist/modules/auth/password-recovery.service.js'));
const {GoogleAuthService}=require(resolve(root,'apps/api/dist/modules/auth/google-auth.service.js'));
const {StudyService}=require(resolve(root,'apps/api/dist/modules/study/study.service.js'));
const {ChartsService}=require(resolve(root,'apps/api/dist/modules/charts/charts.service.js'));
const {ProfileService}=require(resolve(root,'apps/api/dist/modules/auth/profile.service.js'));
const {BirthProfilesService}=require(resolve(root,'apps/api/dist/modules/birth-profiles/birth-profiles.service.js'));
const {HealthController}=require(resolve(root,'apps/api/dist/modules/health/health.controller.js'));
const emailAdapter=require(resolve(root,'apps/api/dist/modules/auth/email-code.js'));
const envKeys=['ADMIN_MFA_ENCRYPTION_KEY','PAYOS_CLIENT_ID','PAYOS_API_KEY','PAYOS_CHECKSUM_KEY','AUTH_OTP_SECRET','GOOGLE_CLIENT_ID','RESEND_API_KEY','AUTH_EMAIL_FROM','COOKIE_SECURE'];
const previousEnv=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');
process.env.AUTH_OTP_SECRET='isolated-sql-engine-test-secret-at-least-32-characters';
process.env.GOOGLE_CLIENT_ID='12345-isolated.apps.googleusercontent.com';
process.env.RESEND_API_KEY='isolated-no-email-network';process.env.AUTH_EMAIL_FROM='no-reply@example.invalid';process.env.COOKIE_SECURE='false';
process.env.PAYOS_CLIENT_ID='isolated-client';process.env.PAYOS_API_KEY='isolated-api';process.env.PAYOS_CHECKSUM_KEY='isolated-checksum-for-signed-tests-only';
const {PaymentGateway}=require(resolve(root,'apps/api/dist/modules/billing/payment-gateway.js'));
const signatureGateway=new PaymentGateway();let checkoutCalls=0,providerStatus;const providerOrders=new Map();
const paymentFixture={configured:()=>true,verify:body=>signatureGateway.verify(body),create:async p=>{checkoutCalls++;providerOrders.set(p.orderCode,p);return {status:'PENDING',orderCode:p.orderCode,amount:p.amount,currency:'VND',paymentLinkId:'link-'+p.orderCode,checkoutUrl:'https://pay.payos.vn/web/'+p.orderCode};},get:async()=>providerStatus,cancel:async code=>({status:'CANCELLED',id:'link-'+code,orderCode:code,amount:providerOrders.get(code)?.amount,amountPaid:0,amountRemaining:providerOrders.get(code)?.amount})};
let latestStudyConstraint='';
async function resetStudyConstraint(){await pg.exec('ALTER TABLE study_entries DROP CONSTRAINT study_entries_discipline_check; ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check '+latestStudyConstraint);}
let birthProfiles;
let pg,db,auth,recovery,google,study,charts,profile,httpApp,httpBase,insideTransaction=false,forbidPoolInsideTransaction=false;
let failQuery=null,beforeTransaction=null,queryInterceptor=null;
const delivered=[];const originalEmail=emailAdapter.sendVerificationCode;
emailAdapter.sendVerificationCode=async(email,code)=>delivered.push({email,code});
const request=(cookie='')=>({headers:{cookie}});
const response=()=>({cookies:[],cookie(name,value){this.cookies.push(`${name}=${value}`)},clearCookie(){},setHeader(){},send(value){this.sent=value;return this}});
const status=code=>error=>error.getStatus?.()===code;
const originalPassword='OriginalPassword123!';
const draft={discipline:'general',title:'SQL journal',summary:'Integration',notes:'Private note',tags:['sql'],snapshot:{},pinned:false};
const chartInput={label:'SQL chart',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
async function sqlQuery(client,sql,params=[]){
 if(queryInterceptor)await queryInterceptor(sql,params,client);
 if(failQuery?.(sql)){failQuery=null;throw Error('Injected persistence failure');}
 const result=await client.query(sql,params);
 return {rows:result.rows,rowCount:result.affectedRows||result.rows.length};
}
async function applyMigrations(target=pg){
 await target.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 let applied=0;
 for(const name of readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)).sort()){
  const body=readFileSync(resolve(root,'infrastructure/db',name),'utf8'),checksum=createHash('sha256').update(body).digest('hex');
  const prior=await target.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
  if(prior.rows.length){assert.equal(prior.rows[0].checksum,checksum);continue;}
  await target.transaction(async tx=>{await tx.exec(body);await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);});applied++;
 }
 return applied;
}
async function account(){
 const email=`sql-${randomUUID()}@example.invalid`,res=response();
 const result=await auth.register({email,password:originalPassword},request(),res);
 return {...result.user,password:originalPassword,email,req:request(res.cookies[0]),cookie:res.cookies[0]};
}
async function challenge(owner){
 const result=await recovery.request({email:owner.email});
 return {...result,code:delivered.at(-1).code};
}
async function googleChallenge(owner,purpose='login'){
 const id=randomUUID(),code='123456',sub='12345678901234567890';
 const hash=createHmac('sha256',process.env.AUTH_OTP_SECRET).update(`thiendo:google:otp:${id}:${code}`).digest('hex');
 await pg.query(`INSERT INTO auth_email_challenges(id,email,google_sub,link_user_id,code_hash,purpose,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '5 minutes')`,[id,owner.email,sub,owner.id,hash,purpose]);
 return {id,code,sub};
}
before(async()=>{
 pg=await PGlite.create({dataDir:'memory://'});
 await pg.exec('CREATE ROLE thiendo_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app');
 const migrationNames=readdirSync(resolve(root,'infrastructure/db')).filter(name=>/^\d{3}_.*\.sql$/.test(name));
 assert.equal(await applyMigrations(),migrationNames.length);
 assert.ok(migrationNames.includes('012_unified_birth_profiles.sql'));
 latestStudyConstraint=(await pg.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='study_entries'::regclass AND conname='study_entries_discipline_check'")).rows[0].definition;
 db={
  query:async(sql,params)=>{
   if(insideTransaction&&forbidPoolInsideTransaction)throw Error('Unexpected second pool connection inside transaction');
   return sqlQuery(pg,sql,params);
  },
  transaction:async work=>{
   if(beforeTransaction){const hook=beforeTransaction;beforeTransaction=null;await hook();}
   return pg.transaction(async tx=>{insideTransaction=true;try{return await work({query:(sql,params)=>sqlQuery(tx,sql,params)});}finally{insideTransaction=false;}});
  }
 };
 auth=new AuthService(db);recovery=new PasswordRecoveryService(db);google=new GoogleAuthService(db,auth);
 study=new StudyService(db,auth);charts=new ChartsService(db,auth);profile=new ProfileService(db,auth);birthProfiles=new BirthProfilesService(db,auth);
 // Real Nest controllers/DI/HTTP, with only DatabaseService replaced by the
 // memory SQL adapter. This does not bootstrap main.ts or a pg network pool.
 const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
 const {AppModule}=require(resolve(root,'apps/api/dist/app.module.js'));
 const {DatabaseService}=require(resolve(root,'apps/api/dist/common/database.service.js'));
 class SqlHttpModule {}
 Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(provider=>provider===DatabaseService?{provide:DatabaseService,useValue:db}:provider===PaymentGateway?{provide:PaymentGateway,useValue:paymentFixture}:provider)})(SqlHttpModule);
 httpApp=await NestFactory.create(SqlHttpModule,{logger:false});
 await httpApp.listen(0,'127.0.0.1');httpBase=await httpApp.getUrl();
});
beforeEach(async()=>{
 checkoutCalls=0;providerStatus=null;providerOrders.clear();failQuery=null;beforeTransaction=null;queryInterceptor=null;forbidPoolInsideTransaction=false;delivered.length=0;
 await pg.exec("TRUNCATE users,auth_email_challenges,auth_google_nonces CASCADE; UPDATE billing_plans SET price_vnd=0,enabled=false,days=30,features='[\"premium-report\",\"multi-chart-report\"]' WHERE id='pro30'; UPDATE billing_plans SET price_vnd=0,enabled=false,features='[\"private-consultation\"]' WHERE id='consultation'");
 await resetStudyConstraint();
});
after(async()=>{emailAdapter.sendVerificationCode=originalEmail;for(const key of envKeys){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}await httpApp?.close();await pg?.close();});
test('current migration SQL is applied once; checksum ledger repeat skips all versions',async()=>{
 assert.equal(await applyMigrations(),0);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM schema_migrations')).rows[0].n,readdirSync(resolve(root,'infrastructure/db')).filter(name=>/^\d{3}_.*\.sql$/.test(name)).length);
 assert.deepEqual(await new HealthController(db).ready(),{ok:true,database:'postgresql',schema:'v11.142.0'});
});
test('readiness blocks migration 014 not applied, even if all other tables exist',async()=>{
 await pg.exec("DELETE FROM schema_migrations WHERE name='014_bazi_study_snapshot.sql'");
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 // Restore the ledger from the known migration; beforeEach resets the constraint.
 const file='014_bazi_study_snapshot.sql';
 const checksum=createHash('sha256').update(readFileSync(resolve(root,'infrastructure/db',file))).digest('hex');
 await pg.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[file,checksum]);
 assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});
test('readiness refuses each missing migration 019–029 even with all tables present',async()=>{
 const files=readdirSync(resolve(root,'infrastructure/db')).filter(name=>/^0(?:19|2[0-9])_.*\.sql$/.test(name)).sort();assert.equal(files.length,11);
 for(const name of files){
  const original=(await pg.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];
  await pg.query('DELETE FROM schema_migrations WHERE name=$1',[name]);
  try{await assert.rejects(()=>new HealthController(db).ready(),status(503))}
  finally{await pg.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,original.checksum]);}
 }
 assert.equal((await new HealthController(db).ready()).ok,true);
});
test('readiness refuses a missing private-file table even when the migration ledger is complete',async()=>{
 await pg.exec('BEGIN; ALTER TABLE library_assets RENAME TO qa_missing_library_assets');
 try{await assert.rejects(()=>new HealthController(db).ready(),status(503))}
 finally{await pg.exec('ROLLBACK')}
 assert.equal((await new HealthController(db).ready()).ok,true);
});
test('readiness blocks the pre-Bazi study constraint, even when migration 014 is recorded',async()=>{
 await pg.exec("ALTER TABLE study_entries DROP CONSTRAINT study_entries_discipline_check; ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check CHECK(discipline IN ('general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot'))");
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await resetStudyConstraint();
 assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});
test('register, cookie, login rotation and real SQL session lookup round trip',async()=>{
 const owner=await account();assert.equal((await auth.me(owner.req)).id,owner.id);
 const res=response();await auth.login({email:owner.email,password:owner.password},owner.req,res);
 assert.equal(await auth.me(owner.req),null);assert.equal((await auth.me(request(res.cookies[0]))).id,owner.id);
 await assert.rejects(auth.login({email:owner.email,password:'wrong'},request(),response()),status(401));
});
test('duplicate registration leaves one user and one session, without a success cookie',async()=>{
 const owner=await account(),res=response();await assert.rejects(auth.register({email:owner.email,password:owner.password},request(),res),status(409));
 assert.equal(res.cookies.length,0);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,1);
});
test('session insertion failure rolls registration back completely',async()=>{
 failQuery=sql=>sql.includes('INSERT INTO sessions');const res=response();
 await assert.rejects(auth.register({email:'rollback@example.invalid',password:originalPassword},request(),res),/Injected persistence failure/);
 assert.equal(res.cookies.length,0);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,0);
});
test('password change keeps current session, revokes other sessions and pending reset codes',async()=>{
 const owner=await account(),other=response();await auth.login({email:owner.email,password:owner.password},request(),other);
 const oldCode=await challenge(owner);
 await auth.changePassword(owner.req,{currentPassword:owner.password,newPassword:'FreshPassword123!'});
 assert.equal((await auth.me(owner.req)).id,owner.id);assert.equal(await auth.me(request(other.cookies[0])),null);
 await assert.rejects(recovery.reset({...oldCode,newPassword:'StaleCodePassword123!'}),status(401));
});
test('redeeming one reset invalidates sibling codes and every session',async()=>{
 const owner=await account(),first=await challenge(owner);
 await pg.query("UPDATE password_reset_challenges SET created_at=NOW()-INTERVAL '65 seconds' WHERE id=$1",[first.challengeId]);
 const second=await challenge(owner);assert.notEqual(first.challengeId,second.challengeId);
 await recovery.reset({...first,newPassword:'FreshPassword123!'});
 assert.equal(await auth.me(owner.req),null);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM password_reset_challenges WHERE used_at IS NULL')).rows[0].n,0);
 await assert.rejects(recovery.reset({...second,newPassword:'SiblingPassword123!'}),status(401));
 await auth.login({email:owner.email,password:'FreshPassword123!'},request(),response());
});
test('five wrong OTP attempts persist, then the correct code is refused',async()=>{
 const owner=await account(),ch=await challenge(owner),wrong=ch.code==='999999'?'888888':'999999';
 for(let i=0;i<5;i++)await assert.rejects(recovery.reset({...ch,code:wrong,newPassword:'FreshPassword123!'}),status(401));
 assert.equal((await pg.query('SELECT attempts FROM password_reset_challenges WHERE id=$1',[ch.challengeId])).rows[0].attempts,5);
 await assert.rejects(recovery.reset({...ch,newPassword:'FreshPassword123!'}),status(401));
});
test('expired recovery code is rejected using the database clock',async()=>{
 const owner=await account(),ch=await challenge(owner);
 await pg.query("UPDATE password_reset_challenges SET created_at=NOW()-INTERVAL '10 minutes',expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[ch.challengeId]);
 await assert.rejects(recovery.reset({...ch,newPassword:'FreshPassword123!'}),status(401));
});
test('password reset failure rolls back password, codes and session revocation',async()=>{
 const owner=await account(),ch=await challenge(owner);failQuery=sql=>sql.startsWith('DELETE FROM sessions WHERE user_id');
 await assert.rejects(recovery.reset({...ch,newPassword:'FreshPassword123!'}),/Injected persistence failure/);
 assert.equal((await pg.query('SELECT used_at FROM password_reset_challenges WHERE id=$1',[ch.challengeId])).rows[0].used_at,null);
 assert.equal((await auth.me(owner.req)).id,owner.id);
 await auth.login({email:owner.email,password:owner.password},request(),response());
});
test('delayed login rejects a credential changed after KDF and sends no session cookie',async()=>{
 const owner=await account(),res=response();
 beforeTransaction=()=>pg.query('UPDATE users SET password_hash=$1 WHERE id=$2',['f'.repeat(128),owner.id]);
 await assert.rejects(auth.login({email:owner.email,password:owner.password},request(),res),status(401));
 assert.equal(res.cookies.length,0);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM sessions')).rows[0].n,1);
});
test('account deletion refuses a password proof made stale during KDF',async()=>{
 const owner=await account(),res=response();
 beforeTransaction=async()=>{await pg.query('UPDATE users SET password_hash=$1 WHERE id=$2',['f'.repeat(128),owner.id]);};
 await assert.rejects(auth.deleteAccount(owner.req,res,{password:owner.password}),status(401));
 assert.equal(res.cookies.length,0);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,1);
});
test('Google linking authenticates through the existing SQL transaction client',async()=>{
 const owner=await account(),ch=await googleChallenge(owner);forbidPoolInsideTransaction=true;
 const res=response(),result=await google.verify({challengeId:ch.id,code:ch.code},owner.req,res);
 assert.equal(result.user.id,owner.id);assert.equal((await pg.query('SELECT google_sub FROM users WHERE id=$1',[owner.id])).rows[0].google_sub,ch.sub);
 await assert.rejects(google.verify({challengeId:ch.id,code:ch.code},owner.req,response()),status(401));
});
test('Google deletion uses the transaction client and cascades account-owned data',async()=>{
 const owner=await account(),ch=await googleChallenge(owner,'delete');await pg.query('UPDATE users SET google_sub=$1 WHERE id=$2',[ch.sub,owner.id]);
 await study.create(owner.req,draft);forbidPoolInsideTransaction=true;
 assert.deepEqual(await google.verify({challengeId:ch.id,code:ch.code},owner.req,response()),{deleted:true});
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,0);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM study_entries')).rows[0].n,0);
});
test('private chart and study round trips cannot be read, edited or deleted by another owner',async()=>{
 const owner=await account(),other=await account(),chart=await charts.save(owner.req,chartInput),entry=await study.create(owner.req,draft);
 assert.equal((await charts.get(owner.req,chart.id)).result.houses.length,12);assert.equal((await study.get(owner.req,entry.id)).entry.title,draft.title);
 await assert.rejects(charts.get(other.req,chart.id),status(404));await assert.rejects(study.get(other.req,entry.id),status(404));
 await assert.rejects(study.update(other.req,entry.id,{notes:'not yours'}),status(404));await assert.rejects(study.remove(other.req,entry.id),status(404));
});
test('V11.120 Tarot RWS snapshot survives owner-only SQL round trip and strips forged result',async()=>{
 const owner=await account(),other=await account();
 const snapshot={version:1,deck:'rider-waite-smith-1909',spread:'three',includeReversed:true,
  question:'Một góc nhìn khác',draw:[{id:'major-00',reversed:false},{id:'cups-02',reversed:true},{id:'swords-10',reversed:false}]};
 const item={...draft,discipline:'tarot',title:'Tarot RWS · Ba lá',snapshot:{...snapshot,forgedPrediction:'definitely',draw:snapshot.draw.map(x=>({...x,secret:'discard'}))}};
 const entry=await study.create(owner.req,item);
 const stored=(await study.get(owner.req,entry.id)).entry;
 assert.equal(stored.discipline,'tarot');assert.deepEqual(stored.snapshot,snapshot);
 assert.equal((await study.list(owner.req)).entries.length,1);
 await assert.rejects(study.get(other.req,entry.id),status(404));
 await assert.rejects(study.create(owner.req,{...item,snapshot:{...snapshot,draw:[snapshot.draw[0],snapshot.draw[0],snapshot.draw[2]]}}),status(400));
 await assert.rejects(study.create(owner.req,{...item,snapshot:{...snapshot,deck:'unreviewed-deck'}}),status(400));
});
test('V11.120 Tarot backups retain position/direction and idempotent import receipt',async()=>{
 const owner=await account(),importId=randomUUID();
 const snapshot={version:1,deck:'rider-waite-smith-1909',spread:'one',includeReversed:false,question:'',draw:[{id:'major-21',reversed:false}]};
 const input={format:'thien-do.study-export',version:1,importId,
  entries:[{...draft,discipline:'tarot',title:'Tarot RWS · Một lá',snapshot,pinned:true}]};
 assert.deepEqual(await study.importBackup(owner.req,input),{importId,imported:1,replayed:false});
 assert.deepEqual(await study.importBackup(owner.req,input),{importId,imported:1,replayed:true});
 const list=(await study.list(owner.req)).entries;
 assert.equal(list.length,1);assert.equal(list[0].pinned,true);assert.deepEqual(list[0].snapshot,snapshot);
 assert.deepEqual(await study.importStatus(owner.req,importId),{importId,committed:true,imported:1});
});
test('study import receipts make repeats idempotent and reject payload reuse',async()=>{
 const owner=await account(),importId=randomUUID(),body={format:'thien-do.study-export',version:1,importId,entries:[draft]};
 assert.deepEqual(await study.importBackup(owner.req,body),{importId,imported:1,replayed:false});
 assert.deepEqual(await study.importBackup(owner.req,body),{importId,imported:1,replayed:true});
 assert.deepEqual(await study.importStatus(owner.req,importId),{importId,imported:1,committed:true});
 await assert.rejects(study.importBackup(owner.req,{...body,entries:[{...draft,title:'Changed'}]}),status(409));
 assert.equal((await study.list(owner.req)).entries.length,1);
});
test('failed study import receipt rolls entries back as one transaction',async()=>{
 const owner=await account(),body={format:'thien-do.study-export',version:1,importId:randomUUID(),entries:[draft]};
 failQuery=sql=>sql.startsWith('INSERT INTO study_import_receipts');await assert.rejects(study.importBackup(owner.req,body),/Injected persistence failure/);
 assert.equal((await study.list(owner.req)).entries.length,0);await assert.rejects(study.importStatus(owner.req,body.importId),status(404));
});
test('SQL-backed quotas stop the 101st chart and 201st study',async()=>{
 const owner=await account();const saved=await charts.save(owner.req,chartInput);
 await pg.query(`INSERT INTO charts(id,user_id,label,birth_date,hour,minute,calendar,leap,gender,rule_set)
 SELECT gen_random_uuid(),user_id,label,birth_date,hour,minute,calendar,leap,gender,rule_set FROM charts,generate_series(1,99) WHERE id=$1`,[saved.id]);
 await assert.rejects(charts.save(owner.req,chartInput),status(409));assert.equal((await charts.list(owner.req)).charts.length,100);
 await pg.query("INSERT INTO study_entries(id,user_id,discipline,title) SELECT gen_random_uuid(),$1,'general','quota' FROM generate_series(1,200)",[owner.id]);
 await assert.rejects(study.create(owner.req,draft),status(409));assert.equal((await study.list(owner.req)).entries.length,200);
});
test('profile name and JPEG bytea round trip through actual SQL',async()=>{
 const owner=await account();await profile.update(owner.req,{displayName:'Thiên  Đồ'});
 assert.equal((await auth.me(owner.req)).displayName,'Thiên Đồ');
 const bytes=readFileSync(resolve(root,'tests/fixtures/a30-forum-jpg'));
 await assert.rejects(()=>profile.uploadAvatar({...owner.req,body:Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(40)]),headers:{...owner.req.headers,'content-type':'image/jpeg'}}),status(400));
 await profile.uploadAvatar({...owner.req,body:bytes,headers:{...owner.req.headers,'content-type':'image/jpeg'}});
 assert.equal((await auth.me(owner.req)).hasAvatar,true);
 const result=await pg.query('SELECT avatar_data,avatar_mime FROM users WHERE id=$1',[owner.id]);
 assert.equal(result.rows[0].avatar_mime,'image/jpeg');assert.deepEqual(Buffer.from(result.rows[0].avatar_data),bytes);
});
test('session expiration uses wall clock even inside a transaction that began earlier',async()=>{
 const owner=await account();
 await db.transaction(async client=>{
  await client.query("UPDATE sessions SET expires_at=clock_timestamp()+INTERVAL '20 milliseconds' WHERE user_id=$1",[owner.id]);
  await new Promise(resolve=>setTimeout(resolve,60));
  const proof=await client.query('SELECT expires_at>NOW() AS transaction_clock_valid, expires_at>clock_timestamp() AS wall_clock_valid FROM sessions WHERE user_id=$1',[owner.id]);
  assert.equal(proof.rows[0].transaction_clock_valid,true);assert.equal(proof.rows[0].wall_clock_valid,false);
  assert.equal(await auth.me(owner.req,client),null);
 });
});
async function http(path,{method='GET',body,cookie}={}){
 const response=await fetch(httpBase+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(8000)});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function httpAccount(){
 const email=`http-${randomUUID()}@example.invalid`;
 const response=await http('/api/auth/register',{method:'POST',body:{email,password:originalPassword}});
 assert.equal(response.status,201);assert.match(response.cookie,/thiendo_session=/);
 return {email,cookie:response.cookie,id:response.body.user.id};
}
test('HTTP controllers register, validate bodies and revoke session cookies against SQL',async()=>{
 const owner=await httpAccount();
 assert.equal((await http('/api/auth/me',{cookie:owner.cookie})).body.user.id,owner.id);
 assert.equal((await http('/api/auth/register',{method:'POST',body:{email:owner.email,password:originalPassword}})).status,409);
 assert.equal((await http('/api/auth/login',{method:'POST',body:{email:owner.email,password:'wrong'}})).status,401);
 const logout=await http('/api/auth/logout',{method:'POST',cookie:owner.cookie});assert.equal(logout.status,200);
 assert.equal((await http('/api/auth/me',{cookie:owner.cookie})).body.user,null);
});
test('HTTP calculation requires a live SQL session and rejects expired or logged-out cookies',async()=>{
 const payload={date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
 assert.equal((await http('/api/charts/calculate',{method:'POST',body:payload})).status,401);
 const owner=await httpAccount();
 const valid=await http('/api/charts/calculate',{method:'POST',body:payload,cookie:owner.cookie});
 assert.equal(valid.status,200);assert.equal(valid.body.result.houses.length,12);
 await pg.query('UPDATE sessions SET expires_at=clock_timestamp()-INTERVAL \'1 second\' WHERE user_id=$1',[owner.id]);
 assert.equal((await http('/api/charts/calculate',{method:'POST',body:payload,cookie:owner.cookie})).status,401);
 const login=await http('/api/auth/login',{method:'POST',body:{email:owner.email,password:originalPassword}});
 assert.equal(login.status,200);assert.equal((await http('/api/charts/calculate',{method:'POST',body:payload,cookie:login.cookie})).status,200);
 await http('/api/auth/logout',{method:'POST',cookie:login.cookie});
 assert.equal((await http('/api/charts/calculate',{method:'POST',body:payload,cookie:login.cookie})).status,401);
});
test('Bazi input snapshot survives SQL/HTTP save, reopen and idempotent backup with owner isolation',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/bazi-study-snapshot.cjs'));
 const snapshot=P.createBaziSnapshot({date:'2018-03-05',hour:22,minute:28,dayBoundary:'late-zi',sex:'female'});
 const owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const created=await studyApi.create({...draft,discipline:'bazi',snapshot:{...snapshot,forgedConclusion:'discard'}});
 assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,snapshot);
 assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 assert.equal((await http('/api/study/'+created.id,{method:'PATCH',cookie:other.cookie,body:{title:'intrusion'}})).status,404);
 assert.equal((await http('/api/study/'+created.id,{method:'DELETE',cookie:other.cookie})).status,404);
 await studyApi.update(created.id,{title:'Đối chứng đã ghi chú'});
 const reopened=(await studyApi.get(created.id)).entry;assert.deepEqual(reopened.snapshot,snapshot);
 const receipt=randomUUID();assert.equal((await studyApi.importBackup([reopened],receipt)).imported,1);
 assert.equal((await studyApi.importBackup([reopened],receipt)).replayed,true);
 assert.equal((await studyApi.list()).entries.length,2);
});
test('Bazi storage rejects unverified method, timezone and forged schema without persisting',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/bazi-study-snapshot.cjs'));
 const snapshot=P.createBaziSnapshot({date:'2004-01-01',hour:8,minute:30,dayBoundary:'midnight',sex:'male'});
 const owner=await httpAccount();
 for(const patch of [{schemaVersion:999},{methodId:'unapproved'},{utcOffsetMinutes:480},{solarTimeCorrection:true},{date:'2004-02-30'}]){
  const response=await http('/api/study',{method:'POST',cookie:owner.cookie,body:{...draft,discipline:'bazi',snapshot:{...snapshot,...patch}}});
  assert.equal(response.status,400,JSON.stringify(patch));
 }
 assert.equal((await http('/api/study',{cookie:owner.cookie})).body.entries.length,0);
});
test('HTTP password recovery rejects a wrong OTP, resets once and revokes old cookie',async()=>{
 const owner=await httpAccount(),forgot=await http('/api/auth/password/forgot',{method:'POST',body:{email:owner.email}});
 assert.equal(forgot.status,200);const code=delivered.at(-1).code;
 const body={challengeId:forgot.body.challengeId,code,newPassword:'HttpFreshPassword123!'};
 assert.equal((await http('/api/auth/password/reset',{method:'POST',body:{...body,code:code==='999999'?'888888':'999999'}})).status,401);
 assert.equal((await http('/api/auth/password/reset',{method:'POST',body})).status,200);
 assert.equal((await http('/api/auth/me',{cookie:owner.cookie})).body.user,null);
 assert.equal((await http('/api/auth/password/reset',{method:'POST',body})).status,401);
 assert.equal((await http('/api/auth/login',{method:'POST',body:{email:owner.email,password:body.newPassword}})).status,200);
});
test('HTTP chart/study owner isolation and idempotent study import survive serialization',async()=>{
 const owner=await httpAccount(),other=await httpAccount();
 const chart=await http('/api/charts',{method:'POST',cookie:owner.cookie,body:chartInput});assert.equal(chart.status,201);
 assert.equal((await http('/api/charts/'+chart.body.id,{cookie:owner.cookie})).body.result.houses.length,12);
 assert.equal((await http('/api/charts/'+chart.body.id,{cookie:other.cookie})).status,404);
 const entry=await http('/api/study',{method:'POST',cookie:owner.cookie,body:draft});assert.equal(entry.status,201);
 assert.equal((await http('/api/study/'+entry.body.id,{method:'PATCH',cookie:other.cookie,body:{title:'intrusion'}})).status,404);
 const body={format:'thien-do.study-export',version:1,importId:randomUUID(),entries:[draft]};
 assert.equal((await http('/api/study/import',{method:'POST',cookie:owner.cookie,body})).body.replayed,false);
 assert.equal((await http('/api/study/import',{method:'POST',cookie:owner.cookie,body})).body.replayed,true);
 assert.equal((await http('/api/study',{cookie:owner.cookie})).body.entries.length,2);
});
function browserTransport(cookie){
 const ts=require('typescript'),mod={exports:{}};
 const code=ts.transpileModule(readFileSync(resolve(root,'apps/web/src/lib/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','fetch','setTimeout','clearTimeout','AbortController',code)(mod,mod.exports,(url,options)=>fetch(httpBase+url,{...options,headers:{...options.headers,cookie}}),setTimeout,clearTimeout,AbortController);
 return mod.exports;
}
test('browser chart transport validates real SQL/HTTP save, list, detail, import and delete payloads',async()=>{
 const owner=await httpAccount(),{chartApi}=browserTransport(owner.cookie);
 const saved=await chartApi.save(chartInput);assert.equal(saved.verified,true);
 assert.equal((await chartApi.list()).charts.length,1);assert.equal((await chartApi.get(saved.id)).result.houses.length,12);
 assert.deepEqual(await chartApi.importBackup({format:'thien-do.saved-charts',version:1,charts:[chartInput]}),{imported:0,skipped:1,total:1});
 assert.equal((await chartApi.remove(saved.id)).deleted,true);assert.equal((await chartApi.list()).charts.length,0);
});
test('browser study transport validates SQL/HTTP rows and correlated durable import receipts',async()=>{
 const owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const saved=await studyApi.create(draft);assert.equal((await studyApi.get(saved.id)).entry.title,draft.title);
 assert.equal((await studyApi.update(saved.id,{notes:'Updated note'})).updated,true);
 assert.equal((await studyApi.list()).entries[0].notes,'Updated note');
 const importId=randomUUID();assert.equal((await studyApi.importBackup([draft],importId)).imported,1);
 assert.deepEqual(await studyApi.importStatus(importId.toUpperCase()),{importId,imported:1,committed:true});
 assert.equal((await studyApi.remove(saved.id)).deleted,true);
});

test('Pythagoras inputs round-trip through owner-scoped HTTP, SQL, export/import and browser transport',async()=>{
 const owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const snapshot={method:'pythagorean-segmented-v1',name:'Đặng Thị Mỹ',date:'2004-01-01',year:2026,yMode:'vowel',masters:true};
 const created=await studyApi.create({...draft,discipline:'numerology',snapshot:{...snapshot,result:{lifePath:999},unknown:'discard'}});
 const saved=(await studyApi.get(created.id)).entry;assert.equal(saved.discipline,'numerology');assert.deepEqual(saved.snapshot,snapshot);
 const foreign=await http('/api/study/'+created.id,{cookie:other.cookie});assert.equal(foreign.status,404);
 const list=await studyApi.list();assert.equal(list.entries[0].snapshot.name,snapshot.name);
 const replayId=randomUUID();assert.equal((await studyApi.importBackup([{...saved,pinned:true}],replayId)).imported,1);
 assert.equal((await studyApi.importBackup([{...saved,pinned:true}],replayId)).replayed,true);
 assert.equal((await studyApi.list()).entries.length,2);
 await assert.rejects(()=>studyApi.create({...draft,discipline:'numerology',snapshot:{...snapshot,date:'2004-02-30'}}));
 await assert.rejects(()=>studyApi.create({...draft,discipline:'numerology',snapshot:{...snapshot,method:'chaldean'}}));
 assert.equal((await studyApi.list()).entries.length,2);
});

test('readiness refuses outdated constraints; migrations007–009 preserve older entries',async()=>{
 const owner=await account();await study.create(owner.req,draft);
 await pg.exec("ALTER TABLE study_entries DROP CONSTRAINT study_entries_discipline_check; ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check CHECK(discipline IN ('general','mai-hoa','luc-hao','ky-mon','phong-thuy'))");
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/007_numerology_study.sql'),'utf8'));
 assert.equal((await study.list(owner.req)).entries.length,1);
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/008_western_study.sql'),'utf8'));
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/009_tarot_rws_study.sql'),'utf8'));
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await resetStudyConstraint();
 assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/007_numerology_study.sql'),'utf8'));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/008_western_study.sql'),'utf8'));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/009_tarot_rws_study.sql'),'utf8'));
 assert.equal((await study.list(owner.req)).entries.length,1);
});

test('Natal snapshot round-trip is owner-scoped, typed and idempotent under real SQL/HTTP',async()=>{
 const owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const snapshot={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:19,minute:0,utcOffsetMinutes:420,offsetConfirmed:true,latitude:21.03,longitude:105.85,houseSystem:'whole-sign',orb:6};
 const created=await studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,result:{ascendant:999}}});
 const saved=(await studyApi.get(created.id)).entry;assert.deepEqual(saved.snapshot,snapshot);
 assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const importId=randomUUID();assert.equal((await studyApi.importBackup([{...saved,pinned:true}],importId)).imported,1);assert.equal((await studyApi.importBackup([{...saved,pinned:true}],importId)).replayed,true);
 await assert.rejects(()=>studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,offsetConfirmed:false}}));
 await assert.rejects(()=>studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,houseSystem:'placidus'}}));
 assert.equal((await studyApi.list()).entries.length,2);
});

test('migration008 retains numerology/general data and readiness refuses pre-Natal constraint',async()=>{
 const owner=await account();await study.create(owner.req,draft);
 await study.create(owner.req,{...draft,discipline:'numerology',snapshot:{method:'pythagorean-segmented-v1',name:'Ada Lovelace',date:'1980-10-22',year:2026,yMode:'consonant',masters:true}});
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/007_numerology_study.sql'),'utf8'));
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/008_western_study.sql'),'utf8'));
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await pg.exec(readFileSync(resolve(root,'infrastructure/db/009_tarot_rws_study.sql'),'utf8'));
 await assert.rejects(()=>new HealthController(db).ready(),status(503));
 await resetStudyConstraint();
 assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
 assert.deepEqual(new Set((await study.list(owner.req)).entries.map(e=>e.discipline)),new Set(['general','numerology']));
});

test('IANA Natal v2 resolution proof and uncertainty round-trip; forged proof and gap never persist',async()=>{
 const owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const raw={method:'western-tropical-geocentric-whole-sign-iana-v2',date:'2012-11-04',hour:1,minute:30,timeZone:'America/New_York',disambiguation:'later',latitude:40.7128,longitude:-74.006,houseSystem:'whole-sign',orb:6,uncertaintyMinutes:30};
 const created=await studyApi.create({...draft,discipline:'western-astrology',snapshot:{...raw,result:{utc:'forged'}}});
 const saved=(await studyApi.get(created.id)).entry;assert.equal(saved.snapshot.resolvedUtc,'2012-11-04T06:30:00.000Z');assert.equal(saved.snapshot.offsetSeconds,-18000);assert.equal(saved.snapshot.tzdbVersion,'2026e');assert.equal(saved.snapshot.uncertaintyMinutes,30);assert.ok(!('result' in saved.snapshot));
 assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const importId=randomUUID();assert.equal((await studyApi.importBackup([saved],importId)).imported,1);assert.equal((await studyApi.importBackup([saved],importId)).replayed,true);
 for(const snapshot of [{...saved.snapshot,offsetSeconds:-14400},{...saved.snapshot,tzdbVersion:'2024a'},{...raw,date:'2012-03-11',hour:2},{...raw,disambiguation:'reject'}])await assert.rejects(()=>studyApi.create({...draft,discipline:'western-astrology',snapshot}));
 assert.equal((await studyApi.list()).entries.length,2);
});


test('Tarot V11.125 advanced layout/method/context persists through real SQL, owner access and idempotent backup',async()=>{
 const {newAdvancedSpread,makeCustomLayout}=require(resolve(root,'packages/astrology-engine/src/tarot-spreads.cjs'));
 const owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const positions=Array.from({length:16},(_,i)=>({id:'p'+(i+1),label:'Vị trí riêng '+(i+1),role:i?'action':'focus',prompt:'Câu hỏi phản tư cần đối chiếu '+(i+1),x:i%5,y:Math.floor(i/5),rotation:0}));
 const snapshot=newAdvancedSpread({spread:'custom',layout:makeCustomLayout(positions,'Bố cục lưu SQL'),context:'relationship',includeReversed:true,question:'Private SQL question'});
 assert.ok(JSON.stringify(snapshot).length>2048);
 const created=await studyApi.create({...draft,discipline:'tarot',snapshot:{...snapshot,result:{predicted:true}}});
 const saved=(await studyApi.get(created.id)).entry;assert.deepEqual(saved.snapshot,snapshot);assert.equal(saved.snapshot.method.version,2);assert.equal(saved.snapshot.context,'relationship');assert.equal(saved.snapshot.layout.positions.length,16);assert.ok(!('result' in saved.snapshot));
 assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const importId=randomUUID();assert.equal((await studyApi.importBackup([saved],importId)).imported,1);assert.equal((await studyApi.importBackup([saved],importId)).replayed,true);
 const list=(await studyApi.list()).entries;assert.equal(list.length,2);assert.ok(list.every(e=>e.snapshot.method.knowledgeChecksum===snapshot.method.knowledgeChecksum));
 await assert.rejects(()=>studyApi.create({...draft,discipline:'tarot',snapshot:{...snapshot,method:{...snapshot.method,version:99}}}));
 assert.equal((await studyApi.list()).entries.length,2);
});

test('Tarot Celtic 10-card and legacy v1 coexist; editing metadata cannot overwrite saved snapshot',async()=>{
 const E=require(resolve(root,'packages/astrology-engine/src/tarot-rws.cjs')),A=require(resolve(root,'packages/astrology-engine/src/tarot-spreads.cjs'));
 const owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie),advanced=A.newAdvancedSpread({spread:'celtic-cross',context:'work'}),legacy=E.newSpread({spread:'three'});
 const one=await studyApi.create({...draft,discipline:'tarot',snapshot:advanced});await studyApi.create({...draft,discipline:'tarot',snapshot:legacy});
 await studyApi.update(one.id,{title:'Đổi tiêu đề'});assert.deepEqual((await studyApi.get(one.id)).entry.snapshot,advanced);
 assert.equal((await http('/api/study/'+one.id,{method:'PATCH',cookie:owner.cookie,body:{snapshot:legacy}})).status,400);
 assert.deepEqual(new Set((await studyApi.list()).entries.map(e=>e.snapshot.version)),new Set([1,2]));
});

test('V11.127 Natal reading method/context/checksum round-trip, owner isolation and idempotent backup',async()=>{
 const W=require(resolve(root,'packages/interpretation/src/western-depth.cjs')),owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const snapshot={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:19,minute:0,utcOffsetMinutes:420,offsetConfirmed:true,latitude:21.03,longitude:105.85,houseSystem:'whole-sign',orb:6,reading:W.readingMetadata('work')};
 const created=await studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,report:{predicted:true}}}),saved=(await studyApi.get(created.id)).entry;
 assert.deepEqual(saved.snapshot,snapshot);assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 assert.deepEqual(W.studyWesternInput(saved.snapshot).planets,W.studyWesternInput(snapshot).planets);
 const id=randomUUID();assert.equal((await studyApi.importBackup([saved],id)).imported,1);assert.equal((await studyApi.importBackup([saved],id)).replayed,true);
 for(const patch of [{version:99},{knowledgeChecksum:'fake'},{context:'unsupported'}])await assert.rejects(()=>studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,reading:{...snapshot.reading,...patch}}}));
 assert.equal((await studyApi.list()).entries.length,2);
});
test('V11.127 pinned IANA Natal and legacy reading coexist without retroactive method upgrade',async()=>{
 const W=require(resolve(root,'packages/interpretation/src/western-depth.cjs')),owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const legacy={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:12,minute:0,utcOffsetMinutes:0,offsetConfirmed:true,latitude:0,longitude:0,houseSystem:'whole-sign',orb:6};
 const zoned={...legacy,method:'western-tropical-geocentric-whole-sign-iana-v2',date:'2024-11-03',hour:1,minute:30,timeZone:'America/New_York',disambiguation:'later',reading:W.readingMetadata('relationship')};
 const first=await studyApi.create({...draft,discipline:'western-astrology',snapshot:legacy}),second=await studyApi.create({...draft,discipline:'western-astrology',snapshot:zoned});
 const saved=(await studyApi.get(second.id)).entry.snapshot;assert.equal(saved.resolvedUtc,'2024-11-03T06:30:00.000Z');assert.deepEqual(saved.reading,zoned.reading);assert.deepEqual((await studyApi.get(first.id)).entry.snapshot,legacy);
 await studyApi.update(second.id,{title:'Updated title'});assert.deepEqual((await studyApi.get(second.id)).entry.snapshot,saved);
});

test('V11.128 relationship stores two Natal inputs and method in existing western discipline, owner-scoped and idempotent',async()=>{
 const R=require(resolve(root,'packages/astrology-engine/src/western-relationship.cjs')),owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const a={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:12,minute:0,utcOffsetMinutes:0,offsetConfirmed:true,latitude:0,longitude:0,houseSystem:'whole-sign',orb:6},b={...a,method:'western-tropical-geocentric-whole-sign-iana-v2',date:'2024-11-03',hour:1,minute:30,timeZone:'America/New_York',disambiguation:'later',uncertaintyMinutes:30};
 const snapshot=R.createRelationshipInput(a,b,{compositeHouses:'whole-sign-from-midpoint-asc',context:'partnership'}),created=await studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,result:{score:100}}}),saved=(await studyApi.get(created.id)).entry;
 assert.deepEqual(saved.snapshot,snapshot);assert.equal(saved.snapshot.b.resolvedUtc,'2024-11-03T06:30:00.000Z');assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const id=randomUUID();assert.equal((await studyApi.importBackup([saved],id)).imported,1);assert.equal((await studyApi.importBackup([saved],id)).replayed,true);
 for(const patch of [{knowledge:{...snapshot.knowledge,version:99}},{knowledge:{...snapshot.knowledge,knowledgeChecksum:'fake'}},{orb:11},{compositeHouses:'davison'},{b:{...b,disambiguation:'reject'}}])await assert.rejects(()=>studyApi.create({...draft,discipline:'western-astrology',snapshot:{...snapshot,...patch}}));
 assert.equal((await studyApi.list()).entries.length,2);await studyApi.update(created.id,{title:'Metadata only'});assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,snapshot);
});
test('V11.128 relationship and individual Natal entries coexist without migration or reinterpretation',async()=>{
 const R=require(resolve(root,'packages/astrology-engine/src/western-relationship.cjs')),owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const a={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:12,minute:0,utcOffsetMinutes:0,offsetConfirmed:true,latitude:0,longitude:0,houseSystem:'whole-sign',orb:6};
 const natal=await studyApi.create({...draft,discipline:'western-astrology',snapshot:a}),rel=await studyApi.create({...draft,discipline:'western-astrology',snapshot:R.createRelationshipInput(a,{...a,date:'2002-06-15'})});
 const entries=(await studyApi.list()).entries;assert.equal(entries.length,2);assert.deepEqual((await studyApi.get(natal.id)).entry.snapshot,a);assert.equal((await studyApi.get(rel.id)).entry.snapshot.method,R.METHOD);assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});

test('V11.129 Mai Hoa method/evidence/nuclear/timing profile persists via HTTP/SQL with owner isolation and idempotent backup',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/mai-hoa-profile.cjs')),owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie);
 const snapshot=P.createMaiHoaProfile({mode:'sound-hour',first:1,second:5,hourBranch:10,nuclearPolicy:'pure-transformed',seasonBranch:9,timingUnit:'day',pace:'fast',question:'Tiến độ bản nháp',evidence:[{kind:'counter',statement:'Chưa có lịch duyệt'}]});
 const created=await studyApi.create({...draft,discipline:'mai-hoa',snapshot:{...snapshot,result:{forecast:'fake'}}}),saved=(await studyApi.get(created.id)).entry;assert.deepEqual(saved.snapshot,snapshot);assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const id=randomUUID();assert.equal((await studyApi.importBackup([saved],id)).imported,1);assert.equal((await studyApi.importBackup([saved],id)).replayed,true);
 for(const patch of [{version:2},{method:'future'},{knowledge:'future'},{seasonBranch:0},{mode:'count-hour',count:0}])await assert.rejects(()=>studyApi.create({...draft,discipline:'mai-hoa',snapshot:{...snapshot,...patch}}));
 await studyApi.update(created.id,{title:'Đổi tên'});assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,snapshot);assert.equal((await studyApi.list()).entries.length,2);
});
test('V11.129 all five Mai Hoa profiles and legacy snapshots coexist without migration',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/mai-hoa-profile.cjs')),owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie),legacy={mode:'numbers',first:1,second:5};
 const old=await studyApi.create({...draft,discipline:'mai-hoa',snapshot:legacy});
 for(const mode of P.MODES){const snapshot=P.createMaiHoaProfile({mode,yearBranch:5,lunarMonth:12,lunarDay:17,hourBranch:10,first:1,second:5,count:10,objectTrigram:1,directionTrigram:5});const c=await studyApi.create({...draft,discipline:'mai-hoa',snapshot});assert.deepEqual((await studyApi.get(c.id)).entry.snapshot,snapshot);}
 assert.deepEqual((await studyApi.get(old.id)).entry.snapshot,legacy);assert.equal((await studyApi.list()).entries.length,6);assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});

test('V11.130 Luc Hao selected useful god and calendar persist; invalid candidate cannot be stored',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/luc-hao-profile.cjs')),owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie),snapshot=P.createLucHaoProfile({selection:{kind:'visible',position:3},rationale:'Phụ Mẫu Thìn làm mốc',question:'Khảo sát tài liệu',calendar:{mode:'manual',dayStem:'Mậu',dayBranch:'Thân',monthBranch:'Thìn',confirmed:true}});
 const created=await studyApi.create({...draft,discipline:'luc-hao',snapshot:{...snapshot,result:{fortune:100}}}),saved=(await studyApi.get(created.id)).entry;assert.deepEqual(saved.snapshot,snapshot);assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);
 const id=randomUUID();assert.equal((await studyApi.importBackup([saved],id)).imported,1);assert.equal((await studyApi.importBackup([saved],id)).replayed,true);
 for(const patch of [{version:2},{method:'future'},{knowledge:'future'},{selection:{kind:'visible',position:2}},{selection:{kind:'hidden',position:3}},{calendar:{...snapshot.calendar,confirmed:false}}])await assert.rejects(()=>studyApi.create({...draft,discipline:'luc-hao',snapshot:{...snapshot,...patch}}));
 await studyApi.update(created.id,{title:'Metadata'});assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,snapshot);assert.equal((await studyApi.list()).entries.length,2);
});
test('V11.130 Luc Hao hidden selection and day-only calendar coexist with legacy snapshots',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/luc-hao-profile.cjs')),registry=require(resolve(root,'packages/knowledge/src/luc-hao-candidates-v11130.json')),owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie);let input;
 for(const [bits,e] of Object.entries(registry.entries)){for(const [family,c] of Object.entries(e.families))if(c.kind==='hidden'){input=P.createLucHaoProfile({lines:[...bits].map(x=>x==='1'?7:8),family,selection:{kind:'hidden',position:c.positions[0]},rationale:'Lục Thân vắng, chọn Phục tham chiếu',calendar:{mode:'manual',dayStem:'Giáp',dayBranch:'Tý',monthBranch:null,confirmed:true}});break;}if(input)break;}
 const hidden=await studyApi.create({...draft,discipline:'luc-hao',snapshot:input}),legacy={mode:'manual',lines:[7,8,7,8,7,8],dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'},old=await studyApi.create({...draft,discipline:'luc-hao',snapshot:legacy});assert.deepEqual((await studyApi.get(hidden.id)).entry.snapshot,input);assert.deepEqual((await studyApi.get(old.id)).entry.snapshot,legacy);assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});

test('V11.131 Qimen profile preserves method, school board and ownership through HTTP SQL',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/qimen-profile.cjs')),R=require(resolve(root,'apps/web/src/features/ky-mon/depth-reading.cjs')),owner=await httpAccount(),other=await httpAccount(),{studyApi}=browserTransport(owner.cookie),p=P.createQimenProfile({indicator:'star:Thiên Cầm',question:'Khảo sát tài liệu',rationale:'Mốc Trung cung',referencePalace:3}),board=R.studyQimen(p).board;
 const snapshot=P.validateQimenProfile({...p,reference:{layout:'rotating-reference',school:'SQL fixture',source:'Bàn kỹ thuật kiểm thử',solarTermIndex:0,dayCycleIndex:0,hourBranchIndex:0,rows:board.rows}}),created=await studyApi.create({...draft,discipline:'ky-mon',snapshot:{...snapshot,forecast:100}}),saved=(await studyApi.get(created.id)).entry;
 assert.deepEqual(saved.snapshot,snapshot);assert.equal((await http('/api/study/'+created.id,{cookie:other.cookie})).status,404);const key=randomUUID();assert.equal((await studyApi.importBackup([saved],key)).imported,1);assert.equal((await studyApi.importBackup([saved],key)).replayed,true);await studyApi.update(created.id,{title:'Changed metadata'});assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,snapshot);
});
test('V11.131 invalid Qimen boards reject and legacy remains available without migration',async()=>{
 const P=require(resolve(root,'packages/astrology-engine/src/qimen-profile.cjs')),owner=await httpAccount(),{studyApi}=browserTransport(owner.cookie),p=P.createQimenProfile();for(const patch of [{version:2},{method:'future'},{rules:'future'},{clockSource:''},{readBoard:'reference'},{indicator:'door:Khai'}])await assert.rejects(()=>studyApi.create({...draft,discipline:'ky-mon',snapshot:{...p,...patch}}));
 const old={mode:'manual',withHour:true,solarTermIndex:0,dayCycleIndex:0,hourBranchIndex:0},created=await studyApi.create({...draft,discipline:'ky-mon',snapshot:old});assert.deepEqual((await studyApi.get(created.id)).entry.snapshot,old);assert.equal((await new HealthController(db).ready()).schema,'v11.142.0');
});

// V11.140: current owner-scoped birth-profile contract must be covered by SQL, too.
const privateBirth={name:'Private birth',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam',timeZone:'Asia/Ho_Chi_Minh',birthPlace:'',latitude:null,longitude:null,timeAccuracy:'exact',notes:''};
test('birth profiles cannot be read, changed, removed or linked by another owner',async()=>{
 const a=await account(),b=await account();const saved=await birthProfiles.create(a.req,privateBirth);
 await assert.rejects(birthProfiles.get(b.req,saved.id),status(404));
 await assert.rejects(birthProfiles.update(b.req,saved.id,privateBirth),status(404));
 await assert.rejects(birthProfiles.remove(b.req,saved.id),status(404));
 await assert.rejects(study.create(b.req,{...draft,birthProfileId:saved.id}),status(404));
 assert.equal((await birthProfiles.get(a.req,saved.id)).profile.name,privateBirth.name);
});
test('profile deletion detaches saved study and chart without deleting either result',async()=>{
 const a=await account();const source=await birthProfiles.create(a.req,privateBirth);
 const entry=await study.create(a.req,{...draft,birthProfileId:source.id});
 const chart=await charts.save(a.req,{...chartInput,birthProfileId:source.id});
 await birthProfiles.remove(a.req,source.id);
 assert.equal((await study.get(a.req,entry.id)).entry.birthProfileId,null);
 assert.equal((await charts.get(a.req,chart.id)).chart.birthProfileId,null);
});


test('Google nonce is stored as hash and consumed atomically across service instances',async()=>{
 const res=response();const {nonce}=await google.nonce(res);
 const hash=createHash('sha256').update(nonce).digest('hex');
 const stored=await pg.query('SELECT nonce_hash,expires_at>clock_timestamp() AS valid FROM auth_google_nonces WHERE nonce_hash=$1',[hash]);
 assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].valid,true);assert.notEqual(stored.rows[0].nonce_hash,nonce);
 const req=request('thiendo_google_nonce='+nonce),other=new GoogleAuthService(db,auth);
 const results=await Promise.allSettled([google.start({credential:'bad'},req,response()),other.start({credential:'bad'},req,response())]);
 assert.ok(results.every(x=>x.status==='rejected'));assert.deepEqual(results.map(x=>x.reason.getStatus()).sort(),[400,401]);
 assert.equal((await pg.query('SELECT * FROM auth_google_nonces WHERE nonce_hash=$1',[hash])).rows.length,0);
});
test('Expired or browser-invented Google nonce is denied before token validation',async()=>{
 const res=response();const {nonce}=await google.nonce(res);
 await pg.query("UPDATE auth_google_nonces SET expires_at=clock_timestamp()-INTERVAL '1 second'");
 for(const value of [nonce,'a'.repeat(32)])await assert.rejects(()=>google.start({credential:'bad'},request('thiendo_google_nonce='+value),response()),status(401));
});
test('Readiness refuses a schema missing the server nonce migration',async()=>{
 await pg.exec('ALTER TABLE auth_google_nonces RENAME TO auth_google_nonces_hidden');
 try{await assert.rejects(()=>new HealthController(db).ready(),status(503));}
 finally{await pg.exec('ALTER TABLE auth_google_nonces_hidden RENAME TO auth_google_nonces');}
});
test('Disk-backed SQL restart and backup restore retain sessions, Bazi snapshots and migration checksums',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'thiendo-pglite-restart-'));
 let disk,restored;
 const adapter=()=>({query:(sql,params)=>sqlQuery(disk,sql,params),transaction:work=>disk.transaction(tx=>work({query:(sql,params)=>sqlQuery(tx,sql,params)}))});
 try{
  disk=await PGlite.create({dataDir:resolve(dir,'data')});
  assert.equal(await applyMigrations(disk),readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)).length);
  const localDb=adapter(),localAuth=new AuthService(localDb),localStudy=new StudyService(localDb,localAuth),res=response();
  const created=await localAuth.register({email:'restart-fixture@example.invalid',password:originalPassword},request(),res);
  const req=request(res.cookies[0]);
  const P=require(resolve(root,'packages/astrology-engine/src/bazi-study-snapshot.cjs'));
  const snapshot=P.createBaziSnapshot({date:'2004-01-01',hour:8,minute:30,dayBoundary:'midnight',sex:'male'});
  const saved=await localStudy.create(req,{...draft,discipline:'bazi',snapshot});
  await disk.close();disk=await PGlite.create({dataDir:resolve(dir,'data')});
  assert.equal((await localAuth.me(req)).id,created.user.id);
  assert.deepEqual((await localStudy.get(req,saved.id)).entry.snapshot,snapshot);
  assert.equal(await applyMigrations(disk),0);
  const backup=await disk.dumpDataDir('gzip');assert.ok(backup.size>0);
  await disk.close();disk=null;
  restored=await PGlite.create({dataDir:'memory://',loadDataDir:backup});
  assert.equal((await restored.query('SELECT snapshot FROM study_entries WHERE id=$1',[saved.id])).rows.length,1);
  assert.deepEqual((await restored.query('SELECT snapshot FROM study_entries WHERE id=$1',[saved.id])).rows[0].snapshot,snapshot);
  assert.equal((await restored.query('SELECT COUNT(*)::int AS n FROM sessions WHERE user_id=$1',[created.user.id])).rows[0].n,1);
  assert.equal(await applyMigrations(restored),0);
 }finally{await restored?.close();await disk?.close();rmSync(dir,{recursive:true,force:true});}
});
// Test-only membership seed; verification and MFA use the real controllers and SQL.
async function enrollAdmin(account){
 const sent=await http('/api/auth/email/send',{method:'POST',cookie:account.cookie});assert.equal(sent.status,200);
 const emailCode=delivered.at(-1)?.code;assert.match(emailCode,/^\d{6}$/);
 assert.equal((await http('/api/auth/email/verify',{method:'POST',cookie:account.cookie,body:{challengeId:sent.body.challengeId,code:emailCode}})).status,200);
 const setup=await http('/api/auth/mfa/setup',{method:'POST',cookie:account.cookie,body:{password:originalPassword}});assert.equal(setup.status,200);
 const {totpCode}=require(resolve(root,'apps/api/dist/modules/auth/totp.js'));
 const code=totpCode(setup.body.manualKey,Math.floor(Date.now()/30000));
 assert.equal((await http('/api/auth/mfa/confirm',{method:'POST',cookie:account.cookie,body:{code}})).status,200);
}
async function billingOwner(){const owner=await httpAccount();await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.id]);await enrollAdmin(owner);return owner;}
async function recordApprovedRefund(owner,orderId,reference){
 // The legacy one-step endpoint must stay closed. Use the current two-person flow.
 assert.equal((await http('/api/admin/orders/'+orderId+'/refund',{method:'PATCH',cookie:owner.cookie,body:{reason:'Refund fixture already executed',reference}})).status,409);
 const base='/api/admin/finance/orders/'+orderId;
 assert.equal((await http(base+'/refund-request',{method:'POST',cookie:owner.cookie,body:{reason:'Isolated SQL refund verification'}})).status,200);
 assert.equal((await http(base+'/refund-approval',{method:'POST',cookie:owner.cookie,body:{approve:true}})).status,403);
 const approver=await billingOwner();
 assert.equal((await http(base+'/refund-approval',{method:'POST',cookie:approver.cookie,body:{approve:true}})).status,200);
 assert.equal((await http(base+'/refund-complete',{method:'POST',cookie:owner.cookie,body:{reference,confirmedExternally:true}})).status,200);
}
async function sell(owner){const r=await http('/api/admin/plans/pro30',{method:'PATCH',cookie:owner.cookie,body:{name:'Pro test',priceVnd:49000,days:30,features:['premium-report','multi-chart-report'],enabled:true}});assert.equal(r.status,200);}
async function signedPayment(order,patch={}){const data={orderCode:Number(order.orderCode),amount:order.amountVnd,description:'THIENDO',accountNumber:'000-test',reference:'ref-'+order.orderCode,transactionDateTime:'2026-10-14 12:00:00',currency:'VND',paymentLinkId:'link-'+order.orderCode,code:'00',desc:'success',...patch};const message=Object.keys(data).sort().map(k=>k+'='+String(data[k])).join('&');return {code:'00',desc:'success',success:true,data,signature:createHmac('sha256',process.env.PAYOS_CHECKSUM_KEY).update(message).digest('hex')};}
test('Admin API denies guests, members and forged role claims; only owner manages roles/prices',async()=>{
 assert.equal((await http('/api/admin/overview')).status,401);const owner=await billingOwner(),member=await httpAccount();
 assert.equal((await http('/api/admin/users',{cookie:member.cookie})).status,403);
 assert.equal((await http('/api/admin/users/'+member.id+'/role',{method:'PATCH',cookie:member.cookie,body:{role:'admin'}})).status,403);
 assert.equal((await http('/api/admin/users/'+member.id+'/role',{method:'PATCH',cookie:owner.cookie,body:{role:'admin'}})).status,200);
 // Granting a privileged role revokes old sessions; require a fresh login before MFA.
 assert.equal((await http('/api/admin/overview',{cookie:member.cookie})).status,401);
 const relogin=await http('/api/auth/login',{method:'POST',body:{email:member.email,password:originalPassword}});
 assert.equal(relogin.status,200);member.cookie=relogin.cookie;
 assert.equal((await http('/api/admin/overview',{cookie:member.cookie})).status,403);
 await enrollAdmin(member);
 assert.equal((await http('/api/admin/overview',{cookie:member.cookie})).status,200);
 assert.equal((await http('/api/admin/plans/pro30',{method:'PATCH',cookie:member.cookie,body:{}})).status,400);
 assert.equal((await http('/api/admin/entitlements',{method:'POST',cookie:member.cookie,body:{userId:member.id,days:30,reason:'test'}})).status,403);
 assert.equal((await http('/api/admin/users/'+owner.id+'/block',{method:'PATCH',cookie:owner.cookie,body:{blocked:true,reason:'test'}})).status,409);
 assert.equal((await http('/api/auth/account',{method:'DELETE',cookie:owner.cookie,body:{password:originalPassword}})).status,409);
});
test('Checkout uses server price snapshot and idempotency; other accounts cannot read/reconcile it',async()=>{
 const owner=await billingOwner(),a=await httpAccount(),b=await httpAccount();await sell(owner);const requestKey=randomUUID();
 const first=await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'pro30',requestKey,amount:1,days:999,features:['admin']}});assert.equal(first.status,200);assert.equal(first.body.order.amountVnd,49000);
 const again=await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'pro30',requestKey}});assert.equal(again.body.order.id,first.body.order.id);assert.equal(checkoutCalls,1);
 assert.equal((await http('/api/billing/orders/'+first.body.order.id,{cookie:b.cookie})).status,404);
 assert.equal((await http('/api/billing/orders/'+first.body.order.id+'/reconcile',{method:'POST',cookie:b.cookie})).status,404);
 assert.deepEqual((await http('/api/billing/access',{cookie:a.cookie})).body.features,[]);
 await http('/api/admin/plans/pro30',{method:'PATCH',cookie:owner.cookie,body:{name:'Changed',priceVnd:99000,days:5,features:['premium-report'],enabled:true}});
 assert.equal((await http('/api/billing/orders/'+first.body.order.id,{cookie:a.cookie})).body.order.amountVnd,49000);
});
test('Signed payOS webhook grants once; forged signatures, wrong amount/currency/link do not unlock',async()=>{
 const owner=await billingOwner(),a=await httpAccount();await sell(owner);const o=(await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'pro30',requestKey:randomUUID()}})).body.order;
 const signed=await signedPayment(o);assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:{...signed,signature:'bad'}})).status,403);
 for(const patch of [{amount:1},{currency:'USD'},{paymentLinkId:'wrong'}])assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:await signedPayment(o,patch)})).status,400);
 assert.deepEqual((await http('/api/billing/access',{cookie:a.cookie})).body.features,[]);
 await pg.query('UPDATE billing_orders SET payment_link_id=NULL WHERE id=$1',[o.id]);
 assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:signed})).status,503);
 assert.deepEqual((await http('/api/billing/access',{cookie:a.cookie})).body.features,[]);
 await pg.query('UPDATE billing_orders SET payment_link_id=$1 WHERE id=$2',['link-'+o.orderCode,o.id]);
 assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:signed})).status,200);
 assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:signed})).body.replayed,true);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM pro_entitlements WHERE user_id=$1',[a.id])).rows[0].n,1);
 assert.deepEqual((await http('/api/billing/access',{cookie:a.cookie})).body.features.sort(),['multi-chart-report','premium-report']);
 providerStatus={status:'PAID',amount:49000,amountPaid:49000,amountRemaining:0,id:'link-'+o.orderCode,orderCode:Number(o.orderCode)};
 assert.equal((await http('/api/billing/orders/'+o.id+'/reconcile',{method:'POST',cookie:a.cookie})).status,200);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM pro_entitlements WHERE user_id=$1',[a.id])).rows[0].n,1);
});
test('Paid research reports enforce entitlement and ownership; revocation/expiry remove access, free calculate remains',async()=>{
 const owner=await billingOwner(),a=await httpAccount(),b=await httpAccount();
 const chart=(await http('/api/charts',{method:'POST',cookie:a.cookie,body:{...chartInput,label:'<script>alert(1)</script>'}})).body;
 assert.equal((await http('/api/billing/research-report',{method:'POST',cookie:a.cookie,body:{chartIds:[chart.id]}})).status,403);
 const granted=await http('/api/admin/entitlements',{method:'POST',cookie:owner.cookie,body:{userId:a.id,days:30,reason:'isolated support'}});assert.equal(granted.status,201);
 const r=await http('/api/billing/research-report',{method:'POST',cookie:a.cookie,body:{chartIds:[chart.id]}});assert.equal(r.status,200);assert.ok(!r.body.html.includes('<script>'));assert.ok(r.body.html.includes('&lt;script&gt;'));
 await pg.query("UPDATE charts SET rule_set='legacy-paid-report-test' WHERE id=$1",[chart.id]);
 const legacy=await http('/api/billing/research-report',{method:'POST',cookie:a.cookie,body:{chartIds:[chart.id]}});assert.equal(legacy.status,200);assert.ok(legacy.body.html.includes('legacy-paid-report-test'));assert.ok(legacy.body.html.includes('không tái tạo engine cũ'));
 await http('/api/admin/entitlements',{method:'POST',cookie:owner.cookie,body:{userId:b.id,days:1,reason:'test'}});
 assert.equal((await http('/api/billing/research-report',{method:'POST',cookie:b.cookie,body:{chartIds:[chart.id]}})).status,404);
 await http('/api/admin/entitlements/'+granted.body.id+'/revoke',{method:'PATCH',cookie:owner.cookie,body:{reason:'withdraw test'}});
 assert.equal((await http('/api/billing/research-report',{method:'POST',cookie:a.cookie,body:{chartIds:[chart.id]}})).status,403);
 const again=(await http('/api/admin/entitlements',{method:'POST',cookie:owner.cookie,body:{userId:a.id,days:1,reason:'expiry'}})).body;
 await pg.query("UPDATE pro_entitlements SET starts_at=NOW()-INTERVAL '2 days',expires_at=NOW()-INTERVAL '1 day' WHERE id=$1",[again.id]);
 assert.equal((await http('/api/billing/access',{cookie:a.cookie})).body.features.length,0);
 assert.equal((await http('/api/charts/calculate',{method:'POST',cookie:a.cookie,body:chartInput})).status,200);
});
test('Owner blocks sessions/login; CMS drafts stay private and changes are audited',async()=>{
 const owner=await billingOwner(),a=await httpAccount();
 const draftPost={slug:'private-test',title:'SQL draft',body:'Plain <script>text</script>',published:false};
 assert.equal((await http('/api/admin/posts',{method:'POST',cookie:a.cookie,body:draftPost})).status,403);
 const saved=await http('/api/admin/posts',{method:'POST',cookie:owner.cookie,body:draftPost});assert.equal(saved.status,201);
 assert.equal((await http('/api/articles')).body.posts.length,0);
 await http('/api/admin/posts',{method:'POST',cookie:owner.cookie,body:{...draftPost,id:saved.body.id,published:true}});
 assert.equal((await http('/api/articles')).body.posts.length,1);
 await http('/api/admin/users/'+a.id+'/block',{method:'PATCH',cookie:owner.cookie,body:{blocked:true,reason:'test block'}});
 assert.equal((await http('/api/auth/me',{cookie:a.cookie})).body.user,null);
 assert.equal((await http('/api/auth/login',{method:'POST',body:{email:a.email,password:originalPassword}})).status,401);
 assert.ok((await http('/api/admin/audit',{cookie:owner.cookie})).body.events.some(e=>e.action==='user.block'));
});
test('Cancellation checks ownership and confirmed provider state; recorded refund revokes only paid order rights',async()=>{
 const owner=await billingOwner(),a=await httpAccount(),b=await httpAccount();await sell(owner);
 const o=(await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'pro30',requestKey:randomUUID()}})).body.order;
 assert.equal((await http('/api/billing/orders/'+o.id+'/cancel',{method:'POST',cookie:b.cookie})).status,404);
 assert.equal((await http('/api/billing/orders/'+o.id+'/cancel',{method:'POST',cookie:a.cookie})).body.order.status,'cancelled');
 const paid=(await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'pro30',requestKey:randomUUID()}})).body.order;
 const signed=await signedPayment(paid);await http('/api/billing/webhook/payos',{method:'POST',body:signed});
 assert.equal((await http('/api/billing/orders/'+paid.id+'/cancel',{method:'POST',cookie:a.cookie})).status,409);
 assert.equal((await http('/api/admin/orders/'+paid.id+'/refund',{method:'PATCH',cookie:a.cookie,body:{reason:'test',reference:'bank-refund-test'}})).status,403);
 await recordApprovedRefund(owner,paid.id,'bank-refund-test');
 assert.equal((await http('/api/billing/access',{cookie:a.cookie})).body.features.length,0);
 await http('/api/billing/webhook/payos',{method:'POST',body:signed});
 assert.equal((await http('/api/billing/orders/'+paid.id,{cookie:a.cookie})).body.order.status,'refunded');
 assert.equal((await http('/api/billing/access',{cookie:a.cookie})).body.features.length,0);
});
test('A checkout created during deletion KDF is retained; account deletion refuses financial records',async()=>{
 const owner=await billingOwner(),a=await account();await sell(owner);
 beforeTransaction=async()=>{beforeTransaction=null;await pg.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at) VALUES($1,$2,'pro30','Race test',49000,30,'[\"premium-report\"]','pending',$3,NOW()+INTERVAL '30 minutes')",[randomUUID(),a.id,randomUUID()]);};
 await assert.rejects(auth.deleteAccount(a.req,response(),{password:a.password}),status(409));
 assert.equal((await auth.me(a.req)).id,a.id);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM billing_orders WHERE user_id=$1',[a.id])).rows[0].n,1);
});
test('Restricted API role can allocate order codes and audit IDs after migration 015',async()=>{
 const result=await pg.query("SELECT has_sequence_privilege('thiendo_app','public.billing_order_code_seq','USAGE') AS orders,has_sequence_privilege('thiendo_app','public.admin_audit_id_seq','USAGE') AS audit");
 assert.deepEqual(result.rows[0],{orders:true,audit:true});
 await pg.exec('SET ROLE thiendo_app');
 try{assert.ok(Number((await pg.query("SELECT nextval('billing_order_code_seq') AS n")).rows[0].n)>0);assert.ok(Number((await pg.query("SELECT nextval('admin_audit_id_seq') AS n")).rows[0].n)>0);}finally{await pg.exec('RESET ROLE');}
});
const consultationConfig={name:'Tư vấn thử',priceVnd:150000,enabled:true,advisor:'Người tư vấn thử',zaloPhone:'0900000000',scope:'Ba câu hỏi về cấu trúc lá số. Không cam kết kết quả.',responseHours:48,questionLimit:3};
async function openConsultation(owner){const r=await http('/api/admin/consultation-config',{method:'PATCH',cookie:owner.cookie,body:consultationConfig});assert.equal(r.status,200);}
test('Consultation configuration is owner-only, validates phone, hides contact from catalog, and stays separate from Pro',async()=>{
 const owner=await billingOwner(),member=await httpAccount();
 assert.equal((await http('/api/admin/consultation-config')).status,401);
 assert.equal((await http('/api/admin/consultation-config',{method:'PATCH',cookie:member.cookie,body:consultationConfig})).status,403);
 assert.equal((await http('/api/admin/consultation-config',{method:'PATCH',cookie:owner.cookie,body:{...consultationConfig,zaloPhone:'javascript:1'}})).status,400);
 await openConsultation(owner);
 const catalog=(await http('/api/billing/consultation-plans')).body;assert.equal(catalog.plans[0].advisor,consultationConfig.advisor);assert.equal(catalog.plans[0].zaloPhone,undefined);assert.equal(catalog.plans[0].zalo_phone,undefined);
 assert.equal((await http('/api/billing/plans')).body.plans.some(p=>p.id==='consultation'),false);
 assert.equal((await http('/api/admin/plans/consultation',{method:'PATCH',cookie:owner.cookie,body:{name:'Bad override',priceVnd:1,days:1,features:['premium-report'],enabled:true}})).status,404);
});
test('Consultation checkout enforces owned chart and immutable question, price, advisor and contact snapshots',async()=>{
 const owner=await billingOwner(),a=await httpAccount(),b=await httpAccount();await openConsultation(owner);const c=await charts.save(request(a.cookie),chartInput),foreign=await charts.save(request(b.cookie),chartInput);
 const body={planId:'consultation',requestKey:randomUUID(),chartId:c.id,question:'Tôi muốn hỏi về cấu trúc lá số.',amount:1};
 assert.equal((await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{...body,chartId:foreign.id}})).status,404);
 assert.equal((await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{...body,question:' '}})).status,400);
 const created=await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body});assert.equal(created.status,200);assert.equal(created.body.order.amountVnd,150000);
 assert.equal((await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body})).body.order.id,created.body.order.id);assert.equal(checkoutCalls,1);
 assert.equal((await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{...body,question:'Nội dung khác'}})).status,409);
 await http('/api/admin/consultation-config',{method:'PATCH',cookie:owner.cookie,body:{...consultationConfig,advisor:'Người mới',zaloPhone:'0911111111',priceVnd:200000}});
 const pending=(await http('/api/billing/consultations',{cookie:a.cookie})).body.requests[0];assert.equal(pending.advisor,consultationConfig.advisor);assert.equal(pending.contactUrl,null);
 await charts.remove(request(a.cookie),c.id);
 const admin=(await http('/api/admin/consultations',{cookie:owner.cookie})).body.requests[0];assert.equal(admin.chartSnapshot.date,chartInput.date);assert.equal(admin.question,body.question);
 assert.equal((await http('/api/billing/consultations',{cookie:b.cookie})).body.requests.length,0);
});
test('Signed consultation payment opens only the purchaser Zalo contact once, not Pro; refund closes contact',async()=>{
 const owner=await billingOwner(),a=await httpAccount();await openConsultation(owner);const c=await charts.save(request(a.cookie),chartInput);
 const o=(await http('/api/billing/orders',{method:'POST',cookie:a.cookie,body:{planId:'consultation',requestKey:randomUUID(),chartId:c.id,question:'Câu hỏi riêng'}})).body.order;
 assert.equal((await http('/api/admin/consultations/'+o.id,{method:'PATCH',cookie:owner.cookie,body:{serviceStatus:'completed'}})).status,409);
 const signed=await signedPayment(o);assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:signed})).status,200);assert.equal((await http('/api/billing/webhook/payos',{method:'POST',body:signed})).status,200);
 const r=(await http('/api/billing/consultations',{cookie:a.cookie})).body.requests[0];assert.equal(r.contactUrl,'https://zalo.me/0900000000');assert.deepEqual((await http('/api/billing/access',{cookie:a.cookie})).body.features,[]);
 assert.equal((await http('/api/admin/consultations/'+o.id,{method:'PATCH',cookie:a.cookie,body:{serviceStatus:'completed'}})).status,403);
 assert.equal((await http('/api/admin/consultations/'+o.id,{method:'PATCH',cookie:owner.cookie,body:{serviceStatus:'in_progress'}})).status,200);
 assert.equal((await http('/api/admin/consultations/'+o.id,{method:'PATCH',cookie:owner.cookie,body:{serviceStatus:'completed'}})).status,200);
 await recordApprovedRefund(owner,o.id,'bank-ref-test');
 assert.equal((await http('/api/billing/consultations',{cookie:a.cookie})).body.requests[0].contactUrl,null);
 await http('/api/billing/webhook/payos',{method:'POST',body:signed});assert.equal((await http('/api/billing/consultations',{cookie:a.cookie})).body.requests[0].contactUrl,null);
});

test('Access aggregates only active unrevoked grants with one role/entitlement query',async()=>{
 const owner=await billingOwner();
 await pg.query(`INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at) VALUES($1,$2,'["premium-report"]',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '1 day'),($3,$2,'["premium-report","multi-chart-report"]',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '2 days'),($4,$2,'["future-only"]',NOW()+INTERVAL '3 days',NOW()+INTERVAL '4 days'),($5,$2,'["expired-only"]',NOW()-INTERVAL '3 days',NOW()-INTERVAL '2 days')`,[randomUUID(),owner.id,randomUUID(),randomUUID(),randomUUID()]);
 const revoked=randomUUID();await pg.query(`INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at,revoked_at) VALUES($1,$2,'["revoked-only"]',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '10 days',NOW())`,[revoked,owner.id]);
 let reads=0;queryInterceptor=async()=>{reads++;};
 try{const result=await http('/api/billing/access',{cookie:owner.cookie});assert.equal(result.status,200);assert.equal(result.body.isOwner,true);assert.deepEqual(result.body.features.sort(),['multi-chart-report','premium-report']);assert.ok(+new Date(result.body.expiresAt)>Date.now()+86400000);assert.equal(reads,2,'One session query and one combined entitlement/role query');}finally{queryInterceptor=null;}
});
test('Operational migration creates indexes for growing admin histories and consultation chart references',async()=>{
 const names=(await pg.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'")).rows.map(r=>r.indexname);
 for(const name of ['billing_orders_recent_idx','users_recent_idx','pro_entitlements_recent_idx','pro_entitlements_active_user_idx','content_posts_recent_idx','content_posts_published_recent_idx','consultation_requests_chart_idx'])assert.ok(names.includes(name),name);
 assert.equal((await new HealthController(db).ready()).ok,true);
});
