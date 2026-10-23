/** Next standalone -> Nest controllers/policies -> isolated PGlite. Captured mail and Gemini, never real providers. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {getReadOnlyRouteManifest} from '../infrastructure/scripts/read-only-route-manifest.mjs';
const require=createRequire(import.meta.url),nativeFetch=globalThis.fetch;
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated THIENDO_SQL_TEST_MODULE required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
let pg,api,web,log,origin='http://127.0.0.1:3117',alice,bob,chartId,providerAction,providerCalls=0;
const savedEnv=new Map(),mail=new Map(),password='Isolated!'+randomBytes(16).toString('hex');
const observations=[];
function env(k,v){savedEnv.set(k,process.env[k]);process.env[k]=v;}
async function send(path,{cookie,body,method=body===undefined?'GET':'POST',source=origin}={}){
 const r=await nativeFetch(origin+path,{method,headers:{Origin:source,...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const value=await r.json();observations.push({method,route:path.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi,':id'),status:r.status});return {r,value};
}
async function register(username){const {r,value}=await send('/api/auth/register',{body:{email:username+'@example.invalid',username,password}});assert.equal(r.status,201);const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);assert.match(r.headers.get('set-cookie'),/HttpOnly/i);return {id:value.user.id,cookie,email:username+'@example.invalid'};}
const controlled={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({summary:'Đối chiếu trên chứng cứ của lá số.',findings:[{kind:'uncertain',text:'Cần đối chứng thêm trước khi kết luận.',evidenceIds:['P1']}],missingData:[]})}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:80}};
before(async()=>{
 for(const [k,v]of Object.entries({NODE_ENV:'test',COOKIE_SECURE:'false',WEB_ORIGIN:origin,WEB_ANALYTICS_ENABLED:'false',GEMINI_API_KEY:'isolated-controlled-no-real-key',PAYOS_CLIENT_ID:'',PAYOS_API_KEY:'',PAYOS_CHECKSUM_KEY:'',ADMIN_MFA_ENCRYPTION_KEY:randomBytes(32).toString('base64'),AUTH_OTP_SECRET:randomBytes(32).toString('hex')}))env(k,v);
 pg=await PGlite.create();for(const f of readdirSync('infrastructure/db').filter(n=>/^\d{3}.*\.sql$/.test(n)).sort())await pg.exec(readFileSync('infrastructure/db/'+f,'utf8'));
 const query=async(c,q,p)=>{const r=await c.query(q,p);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
 const db={query:(q,p)=>query(pg,q,p),transaction:fn=>pg.transaction(tx=>fn({query:(q,p)=>query(tx,q,p)}))};
 require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common'),{AppModule}=require('../apps/api/dist/app.module.js'),{DatabaseService}=require('../apps/api/dist/common/database.service.js');
 require('../apps/api/dist/modules/auth/email-code.js').sendVerificationCode=async(email,code)=>mail.set(email,code);
 class IsolatedHttpModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(IsolatedHttpModule);
 api=await NestFactory.create(IsolatedHttpModule,{logger:false,bodyParser:false});
 const {SafeExceptionFilter}=require('../apps/api/dist/common/operations.js'),{isTrustedMutation}=require('../apps/api/dist/common/origin-policy.js');
 api.useGlobalFilters(new SafeExceptionFilter());api.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');if(['POST','PATCH','PUT','DELETE'].includes(req.method)&&!isTrustedMutation(req.headers.origin,req.headers['sec-fetch-site'],origin))return res.status(403).json({message:'Origin denied'});next();});api.use(require('express').json({limit:'80kb'}));await api.listen(8080,'127.0.0.1');
 globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://generativelanguage.googleapis.com/')){providerCalls++;if(providerAction)await providerAction();return new Response(JSON.stringify(controlled),{headers:{'content-type':'application/json'}});}return nativeFetch(url,options);};
 log=openSync('verification/deep-audit/http-web.log','w');web=spawn(process.execPath,['apps/web/.next/standalone/apps/web/server.js'],{env:{...process.env,PORT:'3117',HOSTNAME:'127.0.0.1'},stdio:['ignore',log,log]});
 let ready=false;for(let i=0;i<80;i++){if(web.exitCode!==null)break;try{const r=await nativeFetch(origin,{signal:AbortSignal.timeout(1000)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true,'Standalone web must start; no fallback to a mock HTTP route');
 await pg.exec('UPDATE ai_runtime_config SET enabled=true,daily_budget_microusd=10000000000,input_price_microusd_per_million=1,output_price_microusd_per_million=1');
});
after(async()=>{globalThis.fetch=nativeFetch;if(web?.exitCode===null){web.kill('SIGTERM');await Promise.race([new Promise(r=>web.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(web.exitCode===null)web.kill('SIGKILL');}if(log!==undefined)closeSync(log);await api?.close();await pg?.close();for(const [k,v]of savedEnv){if(v===undefined)delete process.env[k];else process.env[k]=v;}writeFileSync('verification/deep-audit/http-results.json',JSON.stringify({scope:'Next standalone -> Nest -> PGlite; controlled Gemini and captured mail; not browser/native PostgreSQL/provider acceptance',requests:observations.length,endpoints:new Set(observations.map(x=>x.method+' '+x.route)).size,observations},null,2));});
test('first-party registration sets a private session cookie; foreign mutation origin is rejected',async()=>{
 const denied=await send('/api/auth/register',{source:'https://attacker.invalid',body:{email:'blocked@example.invalid',username:'blocked_http',password}});assert.equal(denied.r.status,403);
 alice=await register('deep_alice');bob=await register('deep_bob');const me=await send('/api/auth/me',alice);assert.equal(me.r.status,200);assert.equal(me.value.user.id,alice.id);
});
test('HTTP chart and AI history ownership survive the Next/Nest proxy boundary',async()=>{
 const saved=await send('/api/charts',{cookie:alice.cookie,body:{label:'Isolated HTTP chart',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'}});assert.equal(saved.r.status,201);chartId=saved.value.id;
 assert.equal((await send('/api/charts/'+chartId,{cookie:bob.cookie})).r.status,404);assert.equal((await send('/api/charts')).r.status,401);
 const made=await send('/api/huyen-giai/generate',{cookie:alice.cookie,body:{chartId,question:'Giải thích cung Mệnh với chứng cứ',consent:true}});assert.equal(made.r.status,201);assert.ok(made.value.answerId);
 const history=await send('/api/huyen-giai/conversations/'+made.value.conversationId,alice);assert.equal(history.r.status,200);assert.equal(history.value.messages.length,1);assert.equal(history.value.nextBefore,null);
 assert.equal((await send('/api/huyen-giai/conversations/'+made.value.conversationId,bob)).r.status,404);
});
async function establishMfa(account,role,caps){
 await pg.query('INSERT INTO admin_memberships(user_id,role) VALUES($1,$2)',[account.id,role]);if(caps)await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2)',[account.id,JSON.stringify(caps)]);
 assert.equal((await send('/api/admin/console/session',account)).r.status,403);
 const sent=await send('/api/auth/email/send',{cookie:account.cookie,body:{}});assert.equal(sent.r.status,200);assert.ok(mail.get(account.email));assert.equal((await send('/api/auth/email/verify',{cookie:account.cookie,body:{challengeId:sent.value.challengeId,code:mail.get(account.email)}})).r.status,200);
 const setup=await send('/api/auth/mfa/setup',{cookie:account.cookie,body:{password}});assert.equal(setup.r.status,200);
 const {totpCode}=require('../apps/api/dist/modules/auth/totp.js');const confirm=await send('/api/auth/mfa/confirm',{cookie:account.cookie,body:{code:totpCode(setup.value.manualKey,Math.floor(Date.now()/30000))}});assert.equal(confirm.r.status,200);
}
test('owner requires email verification and TOTP before entering the actual admin endpoints',async()=>{
 await establishMfa(bob,'owner');const own=await send('/api/admin/console/session',bob);assert.equal(own.r.status,200);assert.equal(own.value.identity.role,'owner');assert.equal((await send('/api/admin/insights/dashboard?days=1',bob)).r.status,200);assert.equal((await send('/api/admin/console/session',alice)).r.status,403);
});
test('restricted admin cannot fetch member/finance facts through console or AI chat',async()=>{
 const reader=await register('deep_reader');await establishMfa(reader,'admin',['overview.read']);const dashboard=await send('/api/admin/insights/dashboard?days=1',reader);assert.equal(dashboard.r.status,200);assert.equal(dashboard.value.metrics.some(m=>m.id==='users.total'||m.id==='revenue.gross'),false);
 assert.equal((await send('/api/admin/console/members?page=1',reader)).r.status,403);const beforeCalls=providerCalls;assert.equal((await send('/api/admin/insights/ask',{cookie:reader.cookie,body:{question:'Doanh thu hôm nay',explain:true}})).r.status,403);assert.equal(providerCalls,beforeCalls);
});
test('logout while provider is processing yields HTTP 401 and no new private AI message',async()=>{
 const count=(await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE user_id=$1',[alice.id])).rows[0].n;
 providerAction=async()=>{assert.equal((await send('/api/auth/logout',{cookie:alice.cookie,body:{}})).r.status,200);};
 const generated=await send('/api/huyen-giai/generate',{cookie:alice.cookie,body:{chartId,question:'Giải thích thêm theo chứng cứ',consent:true}});providerAction=null;assert.equal(generated.r.status,401);assert.equal((await send('/api/auth/me',alice)).value.user,null);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE user_id=$1',[alice.id])).rows[0].n,count);const usage=(await pg.query("SELECT status,error_code FROM ai_usage WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[alice.id])).rows[0];assert.equal(usage.status,'failed');assert.equal(usage.error_code,'SESSION_REVOKED');
});

test('guest SSR manifest matches standalone app including Bazi account gate',async()=>{for(const route of getReadOnlyRouteManifest()){const r=await nativeFetch(origin+route.path,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,route.path);assert.match(r.headers.get('content-type'),/text\/html/);const html=await r.text();assert.ok(html.includes('<html')&&html.includes(route.marker),route.path);}});

test('shared login rejects role injection, rotates cookies and chooses member area on the backend',async()=>{
 const made=await send('/api/auth/register',{body:{email:'routing_http@example.invalid',username:'routing_http',password,role:'owner',isAdmin:true,destination:'/admin'}});assert.equal(made.r.status,201);assert.equal(made.value.destination,'/chart');const oldCookie=made.r.headers.get('set-cookie').split(';')[0];
 const logged=await send('/api/auth/login',{cookie:oldCookie,body:{email:'routing_http',password,remember:false,role:'owner',isAdmin:true}});assert.equal(logged.r.status,200);assert.equal(logged.value.destination,'/chart');const cookie=logged.r.headers.get('set-cookie').split(';')[0];assert.notEqual(cookie,oldCookie);assert.match(logged.r.headers.get('set-cookie'),/HttpOnly/);assert.match(logged.r.headers.get('set-cookie'),/SameSite=Lax/);
 assert.equal((await send('/api/auth/me',{cookie:oldCookie})).value.user,null);assert.equal((await send('/api/auth/destination',{cookie})).value.destination,'/chart');assert.equal((await send('/api/admin/console/session',{cookie:cookie+'; role=owner; isAdmin=true'})).r.status,403);assert.equal((await send('/api/auth/destination')).r.status,401);
 assert.equal((await send('/api/admin/console/team/'+made.value.user.id,{cookie,method:'PATCH',body:{role:'admin',expectedRole:'member',expectedRevision:0,capabilities:['overview.read'],reason:'Isolated role injection'}})).r.status,403);
 assert.equal((await pg.query('SELECT COUNT(*)::int n FROM admin_memberships WHERE user_id=$1',[made.value.user.id])).rows[0].n,0);
 assert.equal((await send('/api/admin/console/session',{cookie:'thiendo_session='+'a'.repeat(64)+'; role=owner'})).r.status,401);
 assert.equal((await send('/api/auth/login',{source:'https://attacker.invalid',body:{email:'routing_http',password}})).r.status,403);
});
test('a fresh administrator password login routes to admin but cannot reuse previous-session MFA',async()=>{
 assert.equal((await send('/api/admin/console/session',bob)).r.status,200);const logged=await send('/api/auth/login',{cookie:bob.cookie,body:{email:bob.email,password,role:'user'}});assert.equal(logged.r.status,200);assert.equal(logged.value.destination,'/admin');const cookie=logged.r.headers.get('set-cookie').split(';')[0];assert.equal((await send('/api/auth/destination',{cookie})).value.destination,'/admin');assert.equal((await send('/api/admin/console/session',{cookie})).r.status,403);assert.equal((await send('/api/admin/console/session',bob)).r.status,401);
});
