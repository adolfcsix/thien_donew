'use strict';
/** Isolated behavior tests against REAL V8.2 Nest service methods, using a SQL-port stub.
 * No claim of PostgreSQL/HTTP E2E: that separate test runs only with a live DB in CI.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const Module=require('node:module');
const {scryptSync}=require('node:crypto');
const root=path.resolve(__dirname,'..');
function loadTypescript(){try{return require('typescript')}catch{}
 try {const global=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim();return require(path.join(global,'typescript'));} catch{return null}}
const ts=loadTypescript();
if(!ts){test('TypeScript unavailable: service tests require npm install or global typescript',{skip:true},()=>{});}
else {
 const Nest={};
 for(const name of ['Injectable','Controller','Get','Post','Delete','Body','Req','Res','Param','HttpCode','Module']) Nest[name]=()=>()=>{};
 for(const [name,status] of Object.entries({BadRequestException:400,UnprocessableEntityException:422,ConflictException:409,UnauthorizedException:401,NotFoundException:404,ServiceUnavailableException:503}))Nest[name]=class extends Error {constructor(message){super(message);this.status=status;}};
 Nest.HttpException=class extends Error{constructor(message,status){super(message);this.status=status;}};
 Nest.HttpStatus={TOO_MANY_REQUESTS:429,CREATED:201};
 const originalLoad=Module._load;
 Module._load=function(name,parent,isMain){
  if(name==='@nestjs/common') return Nest;
  if(name==='@thiendo/astrology-engine')return require(path.join(root,'packages/astrology-engine/src/tuvi.js'));
  return originalLoad.apply(this,arguments);
 };
 const oldTs=require.extensions['.ts'];
 require.extensions['.ts']=function(mod,file){const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:false,esModuleInterop:true}});mod._compile(out.outputText,file);};
 const {AuthService}=require(path.join(root,'apps/api/src/modules/auth/auth.service.ts'));
 const {ChartsService}=require(path.join(root,'apps/api/src/modules/charts/charts.service.ts'));
 require.extensions['.ts']=oldTs;
 Module._load=originalLoad;
 const birth={date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
 function req(cookie='',ip){return {headers:{cookie},socket:{remoteAddress:ip||'127.0.0.50'}}}
 function res(){return {cookie:(name,value)=>{if(name==='thiendo_session')this.token=value;}}}
 class DB{
  constructor(){this.users=[];this.sessions=[];this.charts=[];this.failNextSessionInsert=false;}
  async query(sql,params=[]){
   if(/SELECT (?:user_id FROM admin_memberships|id FROM billing_orders)/.test(sql))return {rows:[],rowCount:0};
   if(/INSERT INTO account_security_events/.test(sql))return {rows:[],rowCount:1};
   if(/DELETE FROM admin_session_assurance/.test(sql))return {rows:[],rowCount:0};
   if(/INSERT INTO users\(/.test(sql)){let [id,email,password_hash,salt]=params;this.users.push({id,email,password_hash,salt});return {rows:[],rowCount:1};}
   if(/SELECT id FROM users WHERE email/.test(sql)){let rows=this.users.filter(x=>x.email===params[0]).map(x=>({id:x.id}));return {rows,rowCount:rows.length};}
   if(/SELECT id FROM users WHERE id=\$1 AND password_hash=\$2/.test(sql)){const rows=this.users.filter(x=>x.id===params[0]&&x.password_hash===params[1]);return {rows,rowCount:rows.length};}
   if(/SELECT id,email,password_hash,salt FROM users/.test(sql)){let rows=this.users.filter(x=>x.email===params[0]);return {rows,rowCount:rows.length};}
   if(/SELECT password_hash,salt FROM users WHERE id/.test(sql)){let rows=this.users.filter(x=>x.id===params[0]).map(x=>({password_hash:x.password_hash,salt:x.salt}));return {rows,rowCount:rows.length};}
   if(/INSERT INTO sessions\(/.test(sql)){if(this.failNextSessionInsert){this.failNextSessionInsert=false;throw Error('Simulated PostgreSQL session failure');}this.sessions.push({token_hash:params[0],user_id:params[1]});return {rows:[],rowCount:1};}
   if(/SELECT u.id,u.email/.test(sql) && /FROM sessions/.test(sql)){let session=this.sessions.find(x=>x.token_hash===params[0]),user=this.users.find(x=>x.id===session?.user_id),rows=user?[{id:user.id,email:user.email,displayName:user.display_name||null,hasAvatar:!!user.avatar_data,hasPassword:user.password_hash?.length===128,hasGoogle:!!user.google_sub}]:[];return {rows,rowCount:rows.length};}
   if(/DELETE FROM sessions/.test(sql)){this.sessions=this.sessions.filter(x=>x.token_hash!==params[0]);return {rows:[],rowCount:1};}
   if(/DELETE FROM users/.test(sql)){this.users=this.users.filter(x=>x.id!==params[0]);this.charts=this.charts.filter(x=>x.user_id!==params[0]);this.sessions=this.sessions.filter(x=>x.user_id!==params[0]);return {rows:[],rowCount:1};}
   if(/pg_advisory_xact_lock/.test(sql))return {rows:[{}],rowCount:1};
   if(/COUNT\(\*\)::text/.test(sql)){let n=this.charts.filter(x=>x.user_id===params[0]).length;return {rows:[{n:String(n)}],rowCount:1};}
   if(/INSERT INTO charts\(/.test(sql)){let [id,user_id,label,date,hour,minute,calendar,leap,gender,ruleSet]=params;this.charts.push({id,user_id,label,date,hour,minute,calendar,leap,gender,ruleSet,createdAt:'now'});return {rows:[],rowCount:1};}
   if(/SELECT id,label,birth_date AS date/.test(sql)){let rows=this.charts.filter(x=>(params.length===1?x.user_id===params[0]:(x.id===params[0]&&x.user_id===params[1])));return {rows,rowCount:rows.length};}
   if(/DELETE FROM charts/.test(sql)){let length=this.charts.length;this.charts=this.charts.filter(x=>!(x.id===params[0]&&x.user_id===params[1]));return {rows:[],rowCount:length-this.charts.length};}
   throw Error('Unsupported stub query: '+sql);
  }
  async transaction(fn){const old=structuredClone({users:this.users,sessions:this.sessions,charts:this.charts});try{return await fn({query:this.query.bind(this)});}catch(e){this.users=old.users;this.sessions=old.sessions;this.charts=old.charts;throw e;}}
 }
 function response(){const obj={cookies:[]};obj.cookie=(name,value)=>obj.cookies.push(`${name}=${value}`);return obj;}
 test('V11.164.16 registration maps missing PostgreSQL schema to 503 before any insert or cookie',async()=>{
   const db=new DB(),svc=new AuthService(db),out=response();
   db.query=async()=>{throw Object.assign(new Error('PRIVATE SQL or connection information'),{code:'42P01'});};
   await assert.rejects(()=>svc.register({email:'v1116416-missing@example.test',password:'long-test-password-2026'},req(),out),err=>err.status===503);
   assert.equal(out.cookies.length,0);
 });
 test('V11.164.16 registration rejects only users_email_key as email conflict',async()=>{
   for(const constraint of ['users_email_key','sessions_token_hash_pkey']){
     const db=new DB(),svc=new AuthService(db),out=response(),orig=db.query.bind(db);
     db.query=async(sql,params)=>{
       if(sql.startsWith('INSERT INTO users('))throw Object.assign(new Error('duplicate key'),{code:'23505',constraint});
       return orig(sql,params);
     };
     await assert.rejects(()=>svc.register({email:`conflict-${constraint}@example.test`,password:'long-test-password-2026'},req(),out),err=>
       constraint==='users_email_key' ? err.status===409 : err.code==='23505');
     assert.equal(out.cookies.length,0);
     assert.equal(db.users.length,0);
   }
 });
 test('V11.164.16 migration drift during session transaction is 503 and rolls back signup',async()=>{
   const db=new DB(),svc=new AuthService(db),out=response(),orig=db.query.bind(db);
   db.query=async(sql,params)=>{
     if(sql.includes('INSERT INTO sessions('))throw Object.assign(new Error('missing device_label'),{code:'42703'});
     return orig(sql,params);
   };
   await assert.rejects(()=>svc.register({email:'v1116416-rollback@example.test',password:'long-test-password-2026'},req(),out),err=>err.status===503);
   assert.equal(out.cookies.length,0);assert.equal(db.sessions.length,0);assert.equal(db.users.length,0);
 });
 test('V10.7 auth service rejects malformed JSON bodies without creating users/sessions/cookies',async()=>{
   const db=new DB(), auth=new AuthService(db), malformed=[null, undefined, '', 42, true, [], ['email'], 'not-json', {email:'invalid',password:['array']}];
   for(let i=0;i<malformed.length;i++){
     const v=malformed[i];
     for(const action of ['register','login']){
       const result=response();
       await assert.rejects(()=>auth[action](v,req('',`127.0.7.${10+i*2+(action==='login'?1:0)}`),result),e=>e.status===400);
       assert.equal(result.cookies.length,0);
     }
   }
   assert.equal(db.users.length,0);
   assert.equal(db.sessions.length,0);
   const goodRes=response();
   await auth.register({email:'v107-safe@example.test',password:'strong-v107-password'},req('','127.0.8.1'),goodRes);
   const accountReq=req(goodRes.cookies[0],'127.0.8.2');
   for (const v of [null,[],17,'broken']) {
     const result=response();
     await assert.rejects(()=>auth.deleteAccount(accountReq,result,v),e=>e.status===400);
     assert.equal(result.cookies.length,0);
   }
   assert.equal(db.users.length,1,'malformed account deletion must preserve user');
 });
 test('V9.9 registration rolls back user if session insertion fails, sets no cookie and permits clean retry', async()=>{
   const db=new DB(), auth=new AuthService(db);
   const failedResponse=response();
   db.failNextSessionInsert=true;
   await assert.rejects(
     ()=>auth.register({email:'atomic-v99@example.test',password:'strong-v99-pass'},req('', '127.0.0.200'),failedResponse),
     /Simulated PostgreSQL session failure/,
   );
   assert.equal(db.users.length,0,'no orphan account after a failed session');
   assert.equal(db.sessions.length,0,'no partial sessions');
   assert.equal(failedResponse.cookies.length,0,'no cookie sent before COMMIT');
   const goodResponse=response();
   const good=await auth.register({email:'atomic-v99@example.test',password:'strong-v99-pass'},req('', '127.0.0.201'),goodResponse);
   assert.equal(db.users.length,1);
   assert.equal(db.sessions.length,1);
   assert.equal((await auth.me(req(goodResponse.cookies[0]))).id,good.user.id);
 });
 test('V9.9 a failed account switch preserves the previous authenticated session', async()=>{
   const db=new DB(),auth=new AuthService(db), oldRes=response();
   const original=await auth.register({email:'original-v99@example.test',password:'strong-v99-pass'},req('', '127.0.0.202'),oldRes);
   const oldCookie=oldRes.cookies[0];
   db.failNextSessionInsert=true;
   const failedRes=response();
   await assert.rejects(()=>auth.register({email:'new-v99@example.test',password:'strong-v99-pass'},req(oldCookie,'127.0.0.203'),failedRes),/Simulated PostgreSQL/);
   assert.equal(db.users.length,1);
   assert.equal(db.sessions.length,1);
   assert.equal(failedRes.cookies.length,0);
   assert.equal((await auth.me(req(oldCookie))).id,original.user.id);
 });
 test('V8.2 signup enforces strong new password; imported short V7 password still logs in',async()=>{
  const db=new DB(),svc=new AuthService(db);
  await assert.rejects(()=>svc.register({email:'weak@example.test',password:'short'},req('', '127.0.0.55'),response()),e=>e.status===400);
  let salt='a'.repeat(32),hash=scryptSync('oldpass',salt,64,{N:16384,r:8,p:1}).toString('hex');
  db.users.push({id:'a-legacy',email:'legacy@example.test',password_hash:hash,salt});
  const r=response();const x=await svc.login({email:'legacy@example.test',password:'oldpass'},req('', '127.0.0.56'),r);
  assert.equal(x.user.id,'a-legacy');assert.match(r.cookies[0],/^thiendo_session=[a-f\d]{64}$/);
  await assert.rejects(()=>svc.login({email:'legacy@example.test',password:'incorrect'},req('', '127.0.0.57'),response()),e=>e.status===401);
 });
 test('V8.2 services isolate users and create/list/get/delete correctly',async()=>{
  const db=new DB(),auth=new AuthService(db),chart=new ChartsService(db,auth);
  const aRes=response(),bRes=response();
  const a=await auth.register({email:'a@ex.test',password:'password-123456'},req('', '127.0.0.61'),aRes);
  const b=await auth.register({email:'b@ex.test',password:'password-123456'},req('', '127.0.0.62'),bRes);
  const aReq=req(aRes.cookies[0]), bReq=req(bRes.cookies[0]);
  const calculated=chart.calculate(birth);assert.equal(calculated.result.houses.length,12); // calculate no longer requires saved-chart label
  await assert.rejects(()=>chart.calculateForUser(req(),birth),e=>e.status===401);
  assert.equal((await chart.calculateForUser(aReq,birth)).result.houses.length,12);
  const saved=await chart.save(aReq,{...birth,label:'Kiểm tra'});
  assert.equal((await chart.list(aReq)).charts.length,1);
  assert.equal((await chart.list(bReq)).charts.length,0);
  assert.equal((await chart.get(aReq,saved.id)).chart.label,'Kiểm tra');
  await assert.rejects(()=>chart.get(aReq,'not-a-uuid'),e=>e.status===400);
  await assert.rejects(()=>chart.remove(aReq,'not-a-uuid'),e=>e.status===400);
  await assert.rejects(()=>chart.get(bReq,saved.id),e=>e.status===404);
  await assert.rejects(()=>chart.remove(bReq,saved.id),e=>e.status===404);
  await chart.remove(aReq,saved.id);
  assert.equal((await chart.list(aReq)).charts.length,0);
  await auth.logout(aReq,response());
  await assert.rejects(()=>chart.list(aReq),e=>e.status===401);
 });
 test('V8.2 chart cap remains enforced in a transactional owner-scoped check',async()=>{
  const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth);
  const r=response(),a=await auth.register({email:'limit@ex.test',password:'password-123456'},req('', '127.0.0.75'),r);
  db.charts=Array.from({length:100},(_,i)=>({id:String(i),user_id:a.user.id}));
  await assert.rejects(()=>charts.save(req(r.cookies[0]),{...birth,label:'Vượt hạn mức'}),e=>e.status===409);
 });
 test('V8.3 re-login rotates browser token across accounts',async()=>{
   const db=new DB(),auth=new AuthService(db);
   const aRes=response(), bRes=response();
   await auth.register({email:'rotate-a@ex.test',password:'longpassword-123'},req('', '127.0.0.93'),aRes);
   await auth.register({email:'rotate-b@ex.test',password:'longpassword-123'},req('', '127.0.0.94'),bRes);
   const oldCookie=aRes.cookies[0],newRes=response();
   await auth.login({email:'rotate-b@ex.test',password:'longpassword-123'},req(oldCookie, '127.0.0.95'),newRes);
   assert.equal(await auth.me(req(oldCookie)),null);
   assert.equal((await auth.me(req(newRes.cookies[0]))).email,'rotate-b@ex.test');
 });
 test('V8.3 malformed migrated hash returns 401 not 500',async()=>{
   const db=new DB(),auth=new AuthService(db);
   db.users.push({id:'invalid-import',email:'broken@ex.test',password_hash:'not-a-hex-hash',salt:'a'.repeat(32)});
   await assert.rejects(()=>auth.login({email:'broken@ex.test',password:'anything'},req('', '127.0.0.96'),response()),e=>e.status===401);
 });
 test('V8.5 deletion requires password and does not remove charts on bad password', async()=>{
   const db = new DB(), auth = new AuthService(db), charts = new ChartsService(db,auth);
   const responseA = response();
   await auth.register({email:'delete-confirm@ex.test',password:'strong-test-password'},req('', '127.0.0.107'),responseA);
   const cookie = responseA.cookies[0];
   const sessionReq = req(cookie, '127.0.0.107');
   const saved=await charts.save(sessionReq,{...birth,label:'Phải giữ'});
   await assert.rejects(()=>auth.deleteAccount(sessionReq,response(),{}),e=>e.status===400);
   await assert.rejects(()=>auth.deleteAccount(sessionReq,response(),{password:'incorrect'}),e=>e.status===401);
   assert.equal((await charts.get(sessionReq,saved.id)).chart.label,'Phải giữ');
   const result=await auth.deleteAccount(sessionReq,response(),{password:'strong-test-password'});
   assert.equal(result.deleted,true);
   assert.equal(db.users.length,0);
   assert.equal(db.charts.length,0);
   assert.equal(await auth.me(sessionReq),null);
 });

 test('V11.67 hotfix revalidates stored birth fields before rendering a saved chart',async()=>{
   const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth),out=response();
   await auth.register({email:'stored-chart-validation@example.test',password:'strong-test-password'},req('', '127.0.0.142'),out);
   const session=req(out.cookies[0], '127.0.0.142');
   const saved=await charts.save(session,{...birth,label:'Valid persisted chart'});
   assert.equal((await charts.get(session,saved.id)).result.houses.length,12);
   const stored=db.charts.find(x=>x.id===saved.id);
   stored.date='bad-date';
   await assert.rejects(()=>charts.get(session,saved.id),e=>e.status===400);
 });

 test('V8.5 accepts lunar 30/02 date as a calendar-specific string',async()=>{
   const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth);
   const r=response();await auth.register({email:'lunar-date@ex.test',password:'strong-test-password'},req('', '127.0.0.111'),r);
   const session=req(r.cookies[0], '127.0.0.111');
   const input={...birth,label:'Âm lịch 30/02',calendar:'lunar',date:'2024-02-30'};
   const result=await charts.save(session,input);
   assert.equal((await charts.get(session,result.id)).chart.date,'2024-02-30');
 });


 test('V8.9 import backup is authenticated, owner scoped, idempotent and ignores foreign IDs/stars',async()=>{
   const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth);
   const ar=response(),br=response();
   const a=(await auth.register({email:'restore-a@example.test',password:'strong-password-A'},req('', '127.0.0.121'),ar)).user;
   const b=(await auth.register({email:'restore-b@example.test',password:'strong-password-B'},req('', '127.0.0.122'),br)).user;
   const aReq=req(ar.cookies[0]),bReq=req(br.cookies[0]);
   const exportDoc={format:'thien-do.saved-charts',version:1,charts:[
     {...birth,label:'Bản một',id:'foreign-user-id',user_id:b.id,stars:['FAKE']},
     {...birth,label:'Bản hai',date:'2005-03-21',id:'another-fake',ruleSet:'untrusted-v999'},
     {...birth,label:'Bản một',id:'duplicate-in-file'}
   ]};
   await assert.rejects(()=>charts.importBackup(req(''),exportDoc),e=>e.status===401);
   const imported=await charts.importBackup(aReq,exportDoc);
   assert.deepEqual(imported,{imported:2,skipped:1,total:2});
   assert.equal(db.charts.filter(x=>x.user_id===b.id).length,0);
   assert.equal(db.charts.every(x=>x.user_id===a.id&&x.ruleSet!== 'untrusted-v999'),true);
   assert.equal(db.charts.some(x=>x.id==='foreign-user-id'||x.id==='another-fake'),false);
   const again=await charts.importBackup(aReq,exportDoc);
   assert.deepEqual(again,{imported:0,skipped:3,total:2});
   assert.equal((await charts.list(aReq)).charts.length,2);
   assert.equal((await charts.list(bReq)).charts.length,0);
 });
 test('V8.9 malformed imports rejected before any insert; calendar leap validation',async()=>{
   const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth),out=response();
   await auth.register({email:'restore-errors@example.test',password:'strong-password'},req('', '127.0.0.123'),out);
   const session=req(out.cookies[0]),wrap=charts=>({format:'thien-do.saved-charts',version:1,charts});
   for(const payload of [null,{},wrap([]),{format:'other',version:1,charts:[birth]},
     {format:'thien-do.saved-charts',version:99,charts:[birth]},
     wrap([{...birth,label:'Good'},{...birth,label:'Bad',date:'2026-02-30'}]),
     wrap([{...birth,label:'Dương nhuận',leap:true}]),
     wrap(Array.from({length:101},()=>({...birth,label:'X'}))),
     wrap([{...birth,label:'x'.repeat(70000)}])]){
     await assert.rejects(()=>charts.importBackup(session,payload),e=>e.status===400);
     assert.equal(db.charts.length,0);
   }
   const lunar=wrap([{...birth,label:'Ngày âm',calendar:'lunar',date:'2024-02-30'}]);
   const imported=await charts.importBackup(session,lunar);
   assert.equal(imported.imported,1);
   assert.equal(db.charts[0].date,'2024-02-30');
 });
 test('V8.9 import rejects over-capacity atomically and leaves existing chart collection intact',async()=>{
   const db=new DB(),auth=new AuthService(db),charts=new ChartsService(db,auth),out=response();
   const user=(await auth.register({email:'restore-limit@example.test',password:'strong-password'},req('', '127.0.0.124'),out)).user;
   db.charts=Array.from({length:99},(_,i)=>({id:String(i),user_id:user.id,label:`Existing ${i}`,date:'2004-01-01',hour:9,minute:0,calendar:'solar',leap:false,gender:'Nam',ruleSet:'legacy'}));
   const payload={format:'thien-do.saved-charts',version:1,charts:[
     {...birth,label:'New1'},{...birth,label:'New2'}
   ]};
   await assert.rejects(()=>charts.importBackup(req(out.cookies[0]),payload),e=>e.status===409);
   assert.equal(db.charts.length,99);
 });

 test('V10.8 build candidate: separate users behind one Next proxy do not share rate limit',async()=>{
   const db=new DB(),auth=new AuthService(db);
   const sameProxy='127.0.0.1';
   // All Nest incoming sockets share the proxy IP, yet separate accounts must
   // not block each other. Using unknown accounts avoids mutation of the DB.
   for(let i=0;i<14;i++) {
     await assert.rejects(
       ()=>auth.login({email:`proxy-person-${i}@example.test`,password:'bad-password'},req('',sameProxy),response()),
       err=>err.status===401,
     );
   }
   assert.equal(db.users.length,0);
 });
 test('V10.8 build candidate: one identity is throttled without blocking a second identity',async()=>{
   const db=new DB(),auth=new AuthService(db),sameProxy='127.0.0.1';
   for(let i=0;i<12;i++){
     await assert.rejects(
       ()=>auth.login({email:'proxy-repeat@example.test',password:'bad-password'},req('',sameProxy),response()),
       err=>err.status===401,
     );
   }
   await assert.rejects(
     ()=>auth.login({email:'proxy-repeat@example.test',password:'bad-password'},req('',sameProxy),response()),
     err=>err.status===429,
   );
   await assert.rejects(
     ()=>auth.login({email:'proxy-independent@example.test',password:'bad-password'},req('',sameProxy),response()),
     err=>err.status===401,
   );
 });

}
