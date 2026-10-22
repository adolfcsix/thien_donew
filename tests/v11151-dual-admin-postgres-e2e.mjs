/**
 * Disposable PostgreSQL + actual Nest HTTP security integration.
 * Fails closed unless running in GitHub CI against precisely its seeded test DB.
 * The email provider is NOT simulated: marked verified by SQL only in disposable DB.
 */
import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {Client} from 'pg';
const input=process.env.DATABASE_URL;
const expected='postgresql://thiendo:thiendo_ci_only@127.0.0.1:5432/thiendo_test';
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||input!==expected)throw Error('BLOCKED: V11.151 integration only on exact disposable CI PostgreSQL database');
const run=process.env.GITHUB_RUN_ID;
if(!/^[0-9]{8,16}$/.test(run||''))throw Error('BLOCKED: missing GitHub run ID');
const dbName='thiendo_v151_auth_'+run;
const dbUrl=input.replace(/\/thiendo_test$/, '/'+dbName);
const db=new Client({connectionString:input,connectionTimeoutMillis:10000});
const mfaKey=randomBytes(32).toString('base64');
const otpKey=randomBytes(32).toString('hex');
const port=8187,origin='http://127.0.0.1:3000',apiUrl='http://127.0.0.1:'+port;
const suffix=randomBytes(6).toString('hex');
const accounts=[
 {email:`quynhngan-${suffix}@example.test`,password:`AdminQ_${suffix}_LongSecret!`,handle:'quynhngan297'},
 {email:`mcuong-${suffix}@example.test`,password:`AdminM_${suffix}_LongSecret!`,handle:'mcuong484'},
 {email:`ordinary-${suffix}@example.test`,password:`Member_${suffix}_LongSecret!`,handle:null},
];
let server,created=false,checks=0;
function pass(message){checks++;console.log('PASS security-E2E:',message);}
async function http(route,{method='GET',body,cookie}={}){
 const headers={Origin:origin,'Sec-Fetch-Site':'same-origin'};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(cookie)headers.Cookie=cookie;
 const res=await fetch(apiUrl+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
 const content=await res.json().catch(()=>null);
 const cookieString=res.headers.get('set-cookie')?.match(/thiendo_session=[a-f0-9]{64}/)?.[0]||'';
 return {code:res.status,content,cookie:cookieString};
}
function totp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,acc=0,bytes=[];
 for(const ch of secret){acc=(acc<<5)|alphabet.indexOf(ch);bits+=5;if(bits>=8){bytes.push((acc>>>(bits-=8))&255);}}
 const buf=Buffer.alloc(8);buf.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const digest=createHmac('sha1',Buffer.from(bytes)).update(buf).digest();const offset=digest.at(-1)&15;
 return String((digest.readUInt32BE(offset)&0x7fffffff)%1e6).padStart(6,'0');
}
async function waitApi(){for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('API exited early');try{const r=await fetch(apiUrl+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}await sleep(200);}throw Error('Nest API did not start in 16s');}
async function main(){
 await db.connect();
 await db.query('CREATE DATABASE '+dbName);
 created=true;
 const env={...process.env,DATABASE_URL:dbUrl,ADMIN_MFA_ENCRYPTION_KEY:mfaKey,AUTH_OTP_SECRET:otpKey,API_PORT:String(port),API_HOST:'127.0.0.1',WEB_ORIGIN:origin,NODE_ENV:'test',COOKIE_SECURE:'false'};
 execFileSync(process.execPath,['infrastructure/scripts/migrate.mjs'],{cwd:process.cwd(),env,stdio:'pipe',timeout:45000});
 server=spawn(process.execPath,['apps/api/dist/main.js'],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']});
 let diagnostic='';for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-1500);});
 try{await waitApi();}catch(e){throw Error(e.message+'; '+diagnostic);}
 for(const account of accounts){
  const r=await http('/api/auth/register',{method:'POST',body:{email:account.email,password:account.password}});
  assert.equal(r.code,201,'Registration failed for '+account.handle+': '+JSON.stringify(r.content));
  assert.match(r.cookie,/^thiendo_session=[a-f0-9]{64}$/);
  account.cookie=r.cookie;account.id=r.content.user.id;
  const state=await http('/api/auth/email/status',{cookie:r.cookie});assert.equal(state.content.verified,false);
 }
 pass('Distinct account registration + unverified email status');
 for(const a of accounts.slice(0,2)){
  const before=await http('/api/admin/overview',{cookie:a.cookie});assert.equal(before.code,403);
 }
 assert.equal((await http('/api/admin/overview',{cookie:accounts[2].cookie})).code,403);
 pass('Owners and ordinary user blocked from Admin prior to MFA');
 const testdb=new Client({connectionString:dbUrl});await testdb.connect();
 try{
  // CI-only replacement for SMTP confirmation; must NOT run outside disposable DB.
  for(const a of accounts.slice(0,2))await testdb.query('UPDATE users SET email_verified_at=NOW() WHERE id=$1',[a.id]);
  execFileSync(process.execPath,['infrastructure/scripts/bootstrap-dual-owners.mjs','--quynhngan-email',accounts[0].email,'--mcuong-email',accounts[1].email],{cwd:process.cwd(),env,stdio:'pipe',timeout:12000});
  const two=await testdb.query(`SELECT u.username,u.id FROM admin_memberships a JOIN users u ON u.id=a.user_id WHERE a.role='owner' ORDER BY u.username`);
  assert.deepEqual(two.rows.map(x=>x.username),['mcuong484','quynhngan297']);
  assert.notEqual(two.rows[0].id,two.rows[1].id);
  pass('Two separate owners with immutable dedicated username and user IDs');
  for(const a of accounts.slice(0,2)){
   assert.equal((await http('/api/admin/overview',{cookie:a.cookie})).code,403);
   const status=await http('/api/auth/mfa/status',{cookie:a.cookie});assert.equal(status.code,200);assert.equal(status.content.enabled,false);
   assert.equal(status.content.handle,a.handle);
   const setup=await http('/api/auth/mfa/setup',{method:'POST',cookie:a.cookie,body:{password:a.password}});
   assert.equal(setup.code,200,'MFA setup: '+JSON.stringify(setup.content));assert.match(setup.content.manualKey,/^[A-Z2-7]{32}$/);
   a.mfaSecret=setup.content.manualKey;
   a.confirmCode=totp(a.mfaSecret);
   const confirm=await http('/api/auth/mfa/confirm',{method:'POST',cookie:a.cookie,body:{code:a.confirmCode}});
   assert.equal(confirm.code,200,'MFA confirmation: '+JSON.stringify(confirm.content));assert.equal(confirm.content.verified,true);
   assert.equal((await http('/api/admin/overview',{cookie:a.cookie})).code,200);
  }
  pass('Each owner enrolls unique TOTP secret, verifies session, independently accesses Admin');
  assert.notEqual(accounts[0].mfaSecret,accounts[1].mfaSecret);
  const mfas=await testdb.query('SELECT user_id,secret_encrypted FROM admin_mfa_credentials ORDER BY user_id');
  assert.equal(mfas.rows.length,2);
  for(const row of mfas.rows){assert.ok(row.secret_encrypted.startsWith('v1:'));assert.ok(![accounts[0].mfaSecret,accounts[1].mfaSecret].includes(row.secret_encrypted));}
  pass('TOTP secrets encrypted at rest per account');
  const replay=await http('/api/auth/mfa/verify',{method:'POST',cookie:accounts[0].cookie,body:{code:accounts[0].confirmCode}});
  assert.equal(replay.code,401);
  pass('TOTP code replay blocked');
  const ordinary=accounts[2];
  assert.equal((await http('/api/admin/users',{cookie:ordinary.cookie})).code,403);
  assert.equal((await http('/api/admin/users',{method:'PATCH',cookie:ordinary.cookie,body:{role:'admin'}})).code,404);
  pass('Ordinary user blocked from Admin read and mutation APIs');
  const changed=await http(`/api/admin/users/${ordinary.id}/role`,{method:'PATCH',cookie:accounts[0].cookie,body:{role:'admin'}});
  assert.equal(changed.code,200,'Owner privileged write: '+JSON.stringify(changed.content));
  assert.equal((await http('/api/admin/overview',{cookie:ordinary.cookie})).code,403,'Promoted admin must not bypass MFA');
  pass('Owner step-up grants role; newly promoted admin still blocked pending own MFA');
  const audit=await testdb.query("SELECT actor_id,action FROM admin_audit WHERE action IN ('mfa.enrolled','user.role')");
  assert.equal(new Set(audit.rows.filter(x=>x.action==='mfa.enrolled').map(x=>x.actor_id)).size,2);
  assert.equal(audit.rows.some(x=>x.actor_id===accounts[0].id&&x.action==='user.role'),true);
  pass('Separate owner audit trails and per-user MFA enrollment events');
  const extra=await http('/api/auth/login',{method:'POST',body:{email:accounts[0].email,password:accounts[0].password}});
  assert.equal(extra.code,200);assert.ok(extra.cookie!==accounts[0].cookie);
  assert.equal((await http('/api/admin/overview',{cookie:extra.cookie})).code,403,'Secondary browser has no MFA assurance');
  const sessions=await http('/api/auth/sessions',{cookie:accounts[0].cookie});assert.equal(sessions.code,200);
  assert.ok(sessions.content.sessions.length>=2);
  assert.ok(!JSON.stringify(sessions.content).includes('token_hash'));
  const revoke=await http('/api/auth/logout/others',{method:'POST',cookie:accounts[0].cookie});assert.equal(revoke.code,200);assert.ok(revoke.content.revoked>=1);
  assert.equal((await http('/api/auth/me',{cookie:extra.cookie})).content.user,null);
  assert.equal((await http('/api/admin/overview',{cookie:accounts[0].cookie})).code,200);
  pass('Secondary session MFA isolation + revoke other devices while preserving current');
 }finally{await testdb.end();}
 console.log('V11.151 disposable Postgres/Admin MFA E2E PASS: '+checks+' assertions groups');
}
try{await main();}
catch(e){console.error('FAIL V11.151 admin-security E2E:',e.message);process.exitCode=1;}
finally{
 if(server){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(3000)]);if(server.exitCode===null)server.kill('SIGKILL');}
 if(created)try{await db.query('DROP DATABASE IF EXISTS '+dbName+' WITH (FORCE)');}catch(e){console.error('WARN: cannot drop CI database',e.message);process.exitCode=1;}
 await db.end().catch(()=>{});
}
