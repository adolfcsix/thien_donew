'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {generateKeyPairSync,sign,randomUUID}=require('node:crypto');
const {execFileSync}=require('node:child_process');
function loadTypescript(){try{return require('typescript')}catch{};const dir=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim();return require(path.join(dir,'typescript'));}
const ts=loadTypescript();
const root=path.join(__dirname,'..');
const Nest={};
for(const name of ['Injectable','Controller','Get','Post','Delete','Patch','Body','Req','Res','Param','HttpCode'])Nest[name]=()=>()=>{};
for(const [name,status] of Object.entries({BadRequestException:400,UnauthorizedException:401,ConflictException:409,ServiceUnavailableException:503}))Nest[name]=class extends Error{constructor(msg){super(msg);this.status=status;}};
Nest.HttpException=class extends Error{constructor(msg,status){super(msg);this.status=status;}};
Nest.HttpStatus={TOO_MANY_REQUESTS:429,CREATED:201};
const origLoad=Module._load,oldExt=require.extensions['.ts'];
Module._load=function(id,...args){if(id==='@nestjs/common')return Nest;return origLoad.call(this,id,...args)};
require.extensions['.ts']=function(mod,file){const source=fs.readFileSync(file,'utf8');const output=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,esModuleInterop:true}});if(output.diagnostics?.length)throw Error('TS transpile: '+file);mod._compile(output.outputText,file)};
const {AuthService}=require(path.join(root,'apps/api/src/modules/auth/auth.service.ts'));
const {GoogleAuthService}=require(path.join(root,'apps/api/src/modules/auth/google-auth.service.ts'));
const {ProfileService,validateAvatar}=require(path.join(root,'apps/api/src/modules/auth/profile.service.ts'));
const {PasswordRecoveryService}=require(path.join(root,'apps/api/src/modules/auth/password-recovery.service.ts'));
Module._load=origLoad;require.extensions['.ts']=oldExt;
const oldEnv={GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,AUTH_OTP_SECRET:process.env.AUTH_OTP_SECRET,RESEND_API_KEY:process.env.RESEND_API_KEY,AUTH_EMAIL_FROM:process.env.AUTH_EMAIL_FROM};
process.env.GOOGLE_CLIENT_ID='fake-client.apps.googleusercontent.com';process.env.AUTH_OTP_SECRET='0123456789abcdef'.repeat(4);process.env.RESEND_API_KEY='test-no-network';process.env.AUTH_EMAIL_FROM='Thiên Đồ <no-reply@thiendo.example>';
const keypair=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=keypair.publicKey.export({format:'jwk'});jwk.kid='test-key-115';jwk.alg='RS256';jwk.use='sig';
const tokens=[];
const originalFetch=global.fetch;
global.fetch=async function(url,opts){
 if(String(url).includes('googleapis.com/oauth2'))return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{'cache-control':'max-age=300'}});
 if(String(url)==='https://api.resend.com/emails') {tokens.push(JSON.parse(opts.body));return new Response(JSON.stringify({id:'email-test'}),{status:200});}
 throw Error('Unexpected external fetch '+url);
};
process.on('exit',()=>{global.fetch=originalFetch;for(const [key,val] of Object.entries(oldEnv)){if(val===undefined)delete process.env[key];else process.env[key]=val;}});
function jwt(nonce, overrides={}) {
 const now=Math.floor(Date.now()/1000);
 const head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:jwk.kid})).toString('base64url');
 const body=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:process.env.GOOGLE_CLIENT_ID,iat:now,exp:now+300,sub:'111222333444555666777',email:'google@example.test',name:'Tài khoản Google',email_verified:true,nonce,...overrides})).toString('base64url');
 const raw=`${head}.${body}`;return `${raw}.${sign('RSA-SHA256',Buffer.from(raw),keypair.privateKey).toString('base64url')}`;
}
const mockResponse=()=>({cookies:[],cleared:[],headers:{},cookie(name,value){this.cookies.push([name,value])},clearCookie(name){this.cleared.push(name)},setHeader(key,val){this.headers[key]=val},send(b){this.sent=b;return this}});
function reqWith(cookie=''){return {headers:{cookie}}}
class DB {
 constructor(){this.nonces=new Map();this.users=[];this.sessions=[];this.challenges=[];this.resets=[];this.trusted=[];this.queries=[];this.failSession=false;}
 async query(sql,params=[]){this.queries.push(sql);const users=this.users,sessions=this.sessions,challenges=this.challenges,resets=this.resets;let rows=[];
  if(/SELECT user_id FROM (?:account_blocks|admin_memberships)|SELECT id FROM billing_orders/.test(sql))return {rows:[],rowCount:0};
  if(/INSERT INTO auth_google_nonces/.test(sql)){this.nonces.set(params[0],true);return {rows:[],rowCount:1};}
  if(/DELETE FROM auth_google_nonces/.test(sql)){const exists=this.nonces.delete(params[0]);return {rows:exists?[{nonce_hash:params[0]}]:[],rowCount:exists?1:0};}
  if(/pg_advisory_xact_lock/.test(sql))return {rows:[{}],rowCount:1};
  if(/SELECT u.id,u.email/.test(sql)&&/FROM sessions/.test(sql)) {const session=sessions.find(s=>s.token_hash===params[0]); const user=users.find(u=>u.id===session?.user_id);rows=user?[{id:user.id,email:user.email,displayName:user.display_name,hasAvatar:!!user.avatar_data,hasPassword:user.password_hash?.length===128,hasGoogle:!!user.google_sub}]:[];}
  else if(/SELECT id FROM users WHERE id=\$1 AND password_hash=\$2/.test(sql))rows=users.filter(x=>x.id===params[0]&&x.password_hash===params[1]).map(x=>({id:x.id}));
  else if(/SELECT id FROM users WHERE id=\$1.*FOR (?:UPDATE|KEY SHARE)/.test(sql))rows=users.filter(x=>x.id===params[0]).map(x=>({id:x.id}));
  else if(/SELECT id,email FROM users WHERE google_sub/.test(sql))rows=users.filter(u=>u.google_sub===params[0]).map(u=>({id:u.id,email:u.email}));
  else if(/SELECT id,google_sub FROM users WHERE email/.test(sql))rows=users.filter(u=>u.email===params[0]).map(u=>({id:u.id,google_sub:u.google_sub||null}));
  else if(/SELECT COUNT\(\*\) FILTER/.test(sql)){const all=challenges.filter(c=>c.google_sub===params[0]); rows=[{minute:String(all.length),quarter:String(all.length),daily:String(all.length)}]}
  else if(/INSERT INTO auth_email_challenges/.test(sql)){const [id,email,google_sub,display_name,link_user_id,code_hash,purpose]=params;challenges.push({id,email,google_sub,display_name,link_user_id,code_hash,purpose,attempts:0,valid:true,used_at:null});}
  else if(/DELETE FROM auth_email_challenges/.test(sql)){this.challenges=challenges.filter(x=>x.id!==params[0]);}
  else if(/FROM auth_email_challenges WHERE id=\$1 FOR UPDATE/.test(sql))rows=challenges.filter(x=>x.id===params[0]);
  else if(/^UPDATE auth_email_challenges SET attempts=attempts\+1/.test(sql)){const target=challenges.find(x=>x.id===params[0]);target.attempts++;}
  else if(/^UPDATE auth_email_challenges SET used_at=NOW\(\)/.test(sql)){challenges.find(x=>x.id===params[0]).valid=false;}
  else if(/INSERT INTO account_security_events/.test(sql))return {rows:[],rowCount:1};
  else if(/DELETE FROM admin_trusted_devices WHERE user_id=\$1/.test(sql)){this.trusted=this.trusted.filter(x=>x.user_id!==params[0]);}
  else if(/DELETE FROM admin_session_assurance/.test(sql))return {rows:[],rowCount:0};
  else if(/UPDATE users SET email_verified_at=COALESCE/.test(sql)){const row=users.find(u=>u.id===params[0]);if(row)row.email_verified_at=new Date();}
  else if(/INSERT INTO users\(/.test(sql)){if(sql.includes('google_sub')){const [id,email,password_hash,salt,google_sub,display_name]=params;users.push({id,email,password_hash,salt,google_sub,display_name})}else{const [id,email,password_hash,salt]=params;users.push({id,email,password_hash,salt})}}
  else if(/UPDATE users SET google_sub/.test(sql)){users.find(x=>x.id===params[1]).google_sub=params[0]}
  else if(/INSERT INTO sessions\(/.test(sql)){if(this.failSession){this.failSession=false;throw Error('Failed session commit');}sessions.push({token_hash:params[0],user_id:params[1]})}
  else if(/DELETE FROM sessions WHERE token_hash/.test(sql)){this.sessions=this.sessions.filter(x=>x.token_hash!==params[0])}
  else if(/SELECT id FROM users WHERE email/.test(sql)){rows=users.filter(x=>x.email===params[0]&&(!sql.includes('length(password_hash)=128')||x.password_hash.length===128)).map(x=>({id:x.id}))}
  else if(/SELECT id,email,password_hash,salt FROM users/.test(sql)){rows=users.filter(x=>x.email===params[0])}
  else if(/SELECT password_hash,salt FROM users WHERE id/.test(sql)){rows=users.filter(x=>x.id===params[0])}
  else if(/UPDATE users SET password_hash/.test(sql)){const u=users.find(x=>x.id===params[2]&&(params.length===3||x.password_hash===params[3]));if(u){u.password_hash=params[0];u.salt=params[1];return {rows:[],rowCount:1}}return {rows:[],rowCount:0}}
  else if(/DELETE FROM sessions WHERE user_id/.test(sql)){this.sessions=this.sessions.filter(x=>params.length===1?x.user_id!==params[0]:!(x.user_id===params[0]&&x.token_hash!==params[1]));}
  else if(/UPDATE users SET display_name/.test(sql)){users.find(x=>x.id===params[1]).display_name=params[0]}
  else if(/UPDATE users SET avatar_data=/.test(sql)){Object.assign(users.find(x=>x.id===params[2]),{avatar_data:params[0],avatar_mime:params[1]})}
  else if(/UPDATE users SET avatar_data=NULL/.test(sql)){Object.assign(users.find(x=>x.id===params[0]),{avatar_data:null,avatar_mime:null})}
  else if(/SELECT id FROM users WHERE id=\$1 AND google_sub/.test(sql)){rows=users.filter(x=>x.id===params[0]&&x.google_sub===params[1]).map(x=>({id:x.id}))}
  else if(/DELETE FROM users WHERE id/.test(sql)){const target=users.find(x=>x.id===params[0]&&(params.length===1||x.password_hash===params[1]));if(!target)return {rows:[],rowCount:0};this.users=this.users.filter(x=>x.id!==target.id);this.sessions=this.sessions.filter(x=>x.user_id!==target.id);this.challenges=this.challenges.filter(x=>x.link_user_id!==target.id);return {rows:[],rowCount:1};}
  else if(/SELECT user_id FROM password_reset_challenges WHERE id/.test(sql))rows=resets.filter(x=>x.id===params[0]).map(x=>({user_id:x.user_id}));
  else if(/FROM password_reset_challenges WHERE user_id/.test(sql)){const all=resets.filter(x=>x.user_id===params[0]);rows=[{minute:String(all.length),quarter:String(all.length),daily:String(all.length)}]}
  else if(/INSERT INTO password_reset_challenges/.test(sql)){const [id,user_id,code_hash]=params;resets.push({id,user_id,code_hash,attempts:0,valid:true});}
  else if(/FROM password_reset_challenges WHERE id=\$1 FOR UPDATE/.test(sql)){rows=resets.filter(x=>x.id===params[0]);}
  else if(/UPDATE password_reset_challenges SET attempts/.test(sql)){resets.find(x=>x.id===params[0]).attempts++;}
  else if(/UPDATE password_reset_challenges SET used_at/.test(sql)){for(const ch of resets.filter(x=>sql.includes('WHERE user_id')?x.user_id===params[0]:x.id===params[0]))ch.valid=false;}
  else if(/DELETE FROM password_reset_challenges/.test(sql)){this.resets=this.resets.filter(x=>x.id!==params[0]);}
  else if(/SELECT avatar_data,avatar_mime/.test(sql)){rows=users.filter(x=>x.id===params[0]).map(x=>({avatar_data:x.avatar_data,avatar_mime:x.avatar_mime}))}
  else throw Error('Unexpected DB query '+sql);
  return {rows,rowCount:rows.length};
 }
 async transaction(task) {const snap=structuredClone({users:this.users,sessions:this.sessions,challenges:this.challenges,resets:this.resets,trusted:this.trusted});try{return await task({query:this.query.bind(this)})}catch(e){this.users=snap.users;this.sessions=snap.sessions;this.challenges=snap.challenges;this.resets=snap.resets;this.trusted=snap.trusted;throw e}}
}
function context(){const db=new DB(),auth=new AuthService(db),google=new GoogleAuthService(db,auth),profile=new ProfileService(db,auth),recovery=new PasswordRecoveryService(db);return {db,auth,google,profile,recovery}}
async function startGoogle(ctx, identity={}){
 const res=mockResponse();const {nonce}=await ctx.google.nonce(res);
 const cookie=res.cookies.map(([key,value])=>`${key}=${value}`).join('; ');
 const started=await ctx.google.start({credential:jwt(nonce,identity)},reqWith(cookie),res);
 return {started,cookie:res.cookies,code:tokens.at(-1).text.match(/\d{6}/)[0]};
}
test('Google config refuses to enable itself without real secrets',async()=>{
 const {google}=context();const prev=process.env.AUTH_OTP_SECRET; delete process.env.AUTH_OTP_SECRET;
 try{assert.equal(google.config().enabled,false);await assert.rejects(()=>google.nonce(mockResponse()),{status:503})}finally{process.env.AUTH_OTP_SECRET=prev}
});
test('Google ID token must match nonce, signature, client ID and verified email',async()=>{
 const ctx=context();
 for(const bad of [{nonce:'bad'}, {aud:'other-client'}, {email_verified:false},{exp:1}]) {
  const r=mockResponse();const {nonce}=await ctx.google.nonce(r);const cookie=r.cookies.map(x=>x.join('=')).join('; ');
  await assert.rejects(()=>ctx.google.start({credential:jwt(nonce,bad)},reqWith(cookie),mockResponse()),{status:401});
 }
 assert.equal(ctx.db.challenges.length,0);assert.equal(tokens.length,0);
});
test('Google sign-in sends real email challenge, no user/session exists until valid OTP',async()=>{
 const ctx=context();const {started,code}=await startGoogle(ctx);
 assert.equal(ctx.db.users.length,0);assert.equal(ctx.db.sessions.length,0);
 assert.equal(started.email,'google@example.test');
 const bad=await ctx.google.verify({challengeId:started.challengeId,code:'999999'===code?'888888':'999999'},reqWith(),mockResponse()).catch(e=>e);
 assert.equal(bad.status,401);assert.equal(ctx.db.challenges[0].attempts,1);
 const res=mockResponse();const result=await ctx.google.verify({challengeId:started.challengeId,code},reqWith(),res);
 assert.equal(result.user.email,started.email);assert.equal(ctx.db.users.length,1);assert.equal(ctx.db.sessions.length,1);
 assert.equal(ctx.db.users[0].google_sub,'111222333444555666777');
 assert.ok(res.cookies.some(c=>c[0]==='thiendo_session'));
 await assert.rejects(()=>ctx.google.verify({challengeId:started.challengeId,code},reqWith(),mockResponse()),{status:401});
 assert.equal(ctx.db.sessions.length,1,'OTP replay cannot create another session');
});
test('Google OTP cannot leave a user when session persistence fails',async()=>{
 const ctx=context();const {started,code}=await startGoogle(ctx);
 ctx.db.failSession=true;
 await assert.rejects(()=>ctx.google.verify({challengeId:started.challengeId,code},reqWith(),mockResponse()),/Failed session commit/);
 assert.equal(ctx.db.users.length,0);assert.equal(ctx.db.sessions.length,0);assert.equal(ctx.db.challenges[0].valid,true);
});
test('Google cannot auto-merge a local account by matching an email',async()=>{
 const ctx=context();const existing=mockResponse();await ctx.auth.register({email:'google@example.test',password:'my-strong-pass-123'},reqWith(),existing);
 const googleRes=mockResponse();const {nonce}=await ctx.google.nonce(googleRes);
 const cookie=googleRes.cookies.map(x=>x.join('=')).join('; ');
 await assert.rejects(()=>ctx.google.start({credential:jwt(nonce)},reqWith(cookie),googleRes),{status:409});
 assert.equal(ctx.db.challenges.length,0);
});
test('Local account can change password after proving old password; other sessions revoked',async()=>{
 const ctx=context();const res=mockResponse();await ctx.auth.register({email:'local@example.test',password:'strong-initial-123'},reqWith(),res);
 const cookie=res.cookies.map(x=>x.join('=')).join('; ');
 await assert.rejects(()=>ctx.auth.changePassword(reqWith(cookie),{currentPassword:'bad',newPassword:'strong-next-123'}),{status:401});
 const done=await ctx.auth.changePassword(reqWith(cookie),{currentPassword:'strong-initial-123',newPassword:'strong-next-123'});
 assert.equal(done.updated,true);
 await assert.rejects(()=>ctx.auth.login({email:'local@example.test',password:'strong-initial-123'},reqWith(),mockResponse()),{status:401});
 const login=await ctx.auth.login({email:'local@example.test',password:'strong-next-123'},reqWith(),mockResponse());assert.equal(login.user.email,'local@example.test');
});
test('Profile name and avatar validation enforces private owner scope and safe signatures',async()=>{
 const ctx=context();const res=mockResponse();await ctx.auth.register({email:'profile@example.test',password:'some-password-123'},reqWith(),res);
 const cookie=res.cookies.map(x=>x.join('=')).join('; ');
 await assert.rejects(()=>ctx.profile.update(reqWith(cookie),{displayName:'<script>'}),{status:400});
 await ctx.profile.update(reqWith(cookie),{displayName:'Thiên  Đồ'});
 assert.equal(ctx.db.users[0].display_name,'Thiên Đồ');
 assert.throws(()=>validateAvatar(Buffer.from('<svg><script>alert(1)</script></svg>'),'image/svg+xml'),{status:400});
 const pic=Buffer.from(JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/avatar-valid-hex.json'),'utf8')).JPEG,'hex');
 assert.equal(validateAvatar(pic,'image/jpeg'),'image/jpeg');
 const guest=await ctx.profile.uploadAvatar({...reqWith(),body:pic,headers:{cookie:'','content-type':'image/jpeg'}}).catch(e=>e);
 assert.equal(guest.status,401);
 const sent=await ctx.profile.uploadAvatar({...reqWith(cookie),body:pic,headers:{cookie,'content-type':'image/jpeg'}});
 assert.equal(sent.updated,true);
 const response=mockResponse();await ctx.profile.avatar(reqWith(cookie),response);
 assert.equal(response.headers['Content-Type'],'image/jpeg');
 assert.equal(response.sent.length,pic.length);
});


test('Logout-all remains atomic when the audit event cannot be written',async()=>{
 const ctx=context(), res=mockResponse();
 await ctx.auth.register({email:'all-atomic@example.test',password:'a-strong-password-123'},reqWith(),res);
 const cookie=res.cookies.map(x=>x.join('=')).join('; '), remaining=ctx.db.sessions.length;
 const original=ctx.db.query.bind(ctx.db);
 ctx.db.query=async (sql,params=[])=>{
   if(sql.includes('INSERT INTO account_security_events')&&params[1]==='sessions.all.revoked')throw Error('AUDIT_UNAVAILABLE');
   return original(sql,params);
 };
 const current=mockResponse();
 await assert.rejects(()=>ctx.auth.logoutAll(reqWith(cookie),current),/AUDIT_UNAVAILABLE/);
 assert.equal(ctx.db.sessions.length,remaining,'session deletion must roll back with event');
 assert.equal(current.cookies.length,0,'cookie must remain until commit succeeds');
});
test('Google-only account can securely self-delete after fresh Google + Gmail OTP, preserving no sessions',async()=>{
 const ctx=context();let x=await startGoogle(ctx);const res=mockResponse();await ctx.google.verify({challengeId:x.started.challengeId,code:x.code},reqWith(),res);
 const browserCookie=res.cookies.map(a=>a.join('=')).join('; ');
 // Clear the cooldown in this in-memory DB; production enforces a full minute per Google identity.
 ctx.db.challenges=[];
 const challengeResponse=mockResponse();const {nonce}=await ctx.google.nonce(challengeResponse);
 const nonceCookie=challengeResponse.cookies.map(a=>a.join('=')).join('; ');
 const deleted=await ctx.google.start({credential:jwt(nonce),purpose:'delete'},reqWith(`${browserCookie}; ${nonceCookie}`),challengeResponse);
 assert.equal(deleted.purpose,'delete');const deleteCode=tokens.at(-1).text.match(/\d{6}/)[0];
 await assert.rejects(()=>ctx.google.verify({challengeId:deleted.challengeId,code:'123456'===deleteCode?'222222':'123456'},reqWith(browserCookie),mockResponse()),{status:401});
 const result=await ctx.google.verify({challengeId:deleted.challengeId,code:deleteCode},reqWith(browserCookie),mockResponse());
 assert.equal(result.deleted,true);assert.equal(ctx.db.users.length,0);assert.equal(ctx.db.sessions.length,0);
});
test('Password recovery hides unknown accounts and allows a one-use reset, revoking existing sessions',async()=>{
 const ctx=context();const session=mockResponse();await ctx.auth.register({email:'reset@example.test',password:'the-original-password'},reqWith(),session);
 const unknown=await ctx.recovery.request({email:'missing@example.test'});
 assert.equal(unknown.requested,true);assert.equal(ctx.db.resets.length,0);
 const started=await ctx.recovery.request({email:'reset@example.test'});
 assert.equal(started.requested,true);assert.equal(ctx.db.resets.length,1);
 const code=tokens.at(-1).text.match(/\d{6}/)[0];
 await assert.rejects(()=>ctx.recovery.reset({challengeId:started.challengeId,code:'999999'===code?'888888':'999999',newPassword:'brand-new-password'}),{status:401});
 assert.equal(ctx.db.resets[0].attempts,1);
 const result=await ctx.recovery.reset({challengeId:started.challengeId,code,newPassword:'brand-new-password'});
 assert.equal(result.updated,true);assert.equal(ctx.db.sessions.length,0);
 await assert.rejects(()=>ctx.recovery.reset({challengeId:started.challengeId,code,newPassword:'brand-new-password'}),{status:401});
 await assert.rejects(()=>ctx.auth.login({email:'reset@example.test',password:'the-original-password'},reqWith(),mockResponse()),{status:401});
 assert.equal((await ctx.auth.login({email:'reset@example.test',password:'brand-new-password'},reqWith(),mockResponse())).user.email,'reset@example.test');
});
test('Google OTP enforces five guesses and database cooldown before issuing another code',async()=>{
 const ctx=context();const first=await startGoogle(ctx);
 await assert.rejects(()=>startGoogle(ctx),{status:429});
 for(let n=0;n<5;n++){
   const wrong=first.code==='999999'?'888888':'999999';
   await assert.rejects(()=>ctx.google.verify({challengeId:first.started.challengeId,code:wrong},reqWith(),mockResponse()),{status:401});
 }
 await assert.rejects(()=>ctx.google.verify({challengeId:first.started.challengeId,code:first.code},reqWith(),mockResponse()),{status:401});
 assert.equal(ctx.db.users.length,0);assert.equal(ctx.db.sessions.length,0);
});
test('Existing password account links Google only after authenticated ownership and Gmail OTP',async()=>{
 const ctx=context(),res=mockResponse();
 await ctx.auth.register({email:'google@example.test',password:'strong-original-password'},reqWith(),res);
 const cookie=res.cookies.map(a=>a.join('=')).join('; ');
 const gRes=mockResponse();const {nonce}=await ctx.google.nonce(gRes),googleCookie=gRes.cookies.map(a=>a.join('=')).join('; ');
 const start=await ctx.google.start({credential:jwt(nonce)},reqWith(`${cookie}; ${googleCookie}`),gRes);
 assert.equal(ctx.db.users[0].google_sub,undefined,'not linked until valid OTP');
 const code=tokens.at(-1).text.match(/\d{6}/)[0];
 const finish=await ctx.google.verify({challengeId:start.challengeId,code},reqWith(cookie),mockResponse());
 assert.equal(finish.user.id,ctx.db.users[0].id);
 assert.equal(ctx.db.users[0].google_sub,'111222333444555666777');
});
test('Logout-all revokes every session belonging to user but not other accounts',async()=>{
 const ctx=context(),first=mockResponse(),second=mockResponse(),other=mockResponse();
 await ctx.auth.register({email:'one@example.test',password:'passphrase-one-123'},reqWith(),first);
 await ctx.auth.login({email:'one@example.test',password:'passphrase-one-123'},reqWith(),second);
 await ctx.auth.register({email:'other@example.test',password:'passphrase-other-123'},reqWith(),other);
 assert.equal(ctx.db.sessions.length,3);
 const cookie=first.cookies.map(a=>a.join('=')).join('; ');
 const done=await ctx.auth.logoutAll(reqWith(cookie),mockResponse());
 assert.equal(done.revoked,true);assert.equal(ctx.db.sessions.length,1);
 assert.equal(ctx.db.sessions[0].user_id,ctx.db.users.find(u=>u.email==='other@example.test').id);
});

test('V11.115.7 successful recovery consumes every outstanding code for the same account',async()=>{
 const ctx=context();await ctx.auth.register({email:'reset-siblings@example.test',password:'OriginalPassword123!'},reqWith(),mockResponse());
 const started=await ctx.recovery.request({email:'reset-siblings@example.test'}),code=tokens.at(-1).text.match(/\d{6}/)[0];
 const siblingId=randomUUID(),siblingCode='123456',userId=ctx.db.users[0].id;
 const {createHmac}=require('node:crypto');
 ctx.db.resets.push({id:siblingId,user_id:userId,code_hash:createHmac('sha256',process.env.AUTH_OTP_SECRET).update(`thiendo:reset:${siblingId}:${siblingCode}`).digest('hex'),attempts:0,valid:true});
 await ctx.recovery.reset({challengeId:started.challengeId,code,newPassword:'FreshPassword123!'});
 assert.ok(ctx.db.resets.every(ch=>!ch.valid));
 await assert.rejects(()=>ctx.recovery.reset({challengeId:siblingId,code:siblingCode,newPassword:'StaleCodePassword123!'}),{status:401});
});
test('V11.115.7 authenticated password change invalidates previously issued recovery codes',async()=>{
 const ctx=context(),res=mockResponse();await ctx.auth.register({email:'change-invalidates-reset@example.test',password:'OriginalPassword123!'},reqWith(),res);
 const started=await ctx.recovery.request({email:'change-invalidates-reset@example.test'}),code=tokens.at(-1).text.match(/\d{6}/)[0];
 const cookie=res.cookies.map(x=>x.join('=')).join('; ');
 await ctx.auth.changePassword(reqWith(cookie),{currentPassword:'OriginalPassword123!',newPassword:'FreshPassword123!'});
 await assert.rejects(()=>ctx.recovery.reset({challengeId:started.challengeId,code,newPassword:'StaleCodePassword123!'}),{status:401});
});
test('V11.115.7 delayed login cannot create a session after its credential snapshot changed',async()=>{
 const ctx=context();await ctx.auth.register({email:'delayed-login@example.test',password:'OriginalPassword123!'},reqWith(),mockResponse());
 const original=ctx.db.transaction.bind(ctx.db),before=ctx.db.sessions.length;
 ctx.db.transaction=async work=>{ctx.db.users[0].password_hash='f'.repeat(128);return original(work)};
 const res=mockResponse();
 await assert.rejects(()=>ctx.auth.login({email:'delayed-login@example.test',password:'OriginalPassword123!'},reqWith(),res),{status:401});
 assert.equal(res.cookies.length,0);assert.equal(ctx.db.sessions.length,before);
});
test('V11.115.7 delete proof becomes invalid if password changes while password verification runs',async()=>{
 const ctx=context(),res=mockResponse();await ctx.auth.register({email:'delete-race@example.test',password:'OriginalPassword123!'},reqWith(),res);
 const cookie=res.cookies.map(x=>x.join('=')).join('; '),original=ctx.db.query.bind(ctx.db);
 ctx.db.query=async(sql,params)=>{if(sql.startsWith('DELETE FROM users WHERE id'))ctx.db.users[0].password_hash='f'.repeat(128);return original(sql,params)};
 const deleted=mockResponse();await assert.rejects(()=>ctx.auth.deleteAccount(reqWith(cookie),deleted,{password:'OriginalPassword123!'}),{status:401});
 assert.equal(ctx.db.users.length,1);assert.equal(deleted.cookies.length,0);
});
test('V11.115.7 session lookup inside a transaction uses its existing client',async()=>{
 const {createHash}=require('node:crypto');const token='a'.repeat(64),user={id:randomUUID(),email:'transaction@example.test'};
 const auth=new AuthService({query:()=>{throw Error('Unexpected second pool connection')}});
 const result=await auth.me(reqWith('thiendo_session='+token),{query:async(sql,params)=>{
  assert.match(sql,/FROM sessions/);assert.deepEqual(params,[createHash('sha256').update(token).digest('hex')]);return {rows:[user]};
 }});
 assert.deepEqual(result,user);
});
