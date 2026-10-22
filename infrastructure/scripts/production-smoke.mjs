/** Start the REAL built artifacts, with no manual CJS copy. Never writes data. */
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const freePort=()=>new Promise((yes,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>yes(port));});});
const apiPort=await freePort(),webPort=await freePort(),origin='https://smoke.invalid';
const withDb=process.argv.includes('--with-db');
if(withDb&&!process.env.DATABASE_URL)throw Error('Explicit disposable DATABASE_URL required');
if(withDb){const {expectedDisposableDatabase}=await import('../../apps/api/dist/common/e2e-identity.js');if(!expectedDisposableDatabase({...process.env,NODE_ENV:'test'}))throw Error('Disposable database confirmation required');}
const env={...process.env,NODE_ENV:'production',COOKIE_SECURE:'true',WEB_ORIGIN:origin,API_HOST:'127.0.0.1',API_PORT:String(apiPort),DATABASE_URL:withDb?process.env.DATABASE_URL:'postgresql://audit:audit@127.0.0.1:1/thiendo_smoke',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['GOOGLE_CLIENT_ID','AUTH_OTP_SECRET','AUTH_EMAIL_FROM','RESEND_API_KEY'])delete env[key];
const children=[];const checks=[];
function start(args,cwd,extra={}){const p=spawn(process.execPath,args,{cwd,env:{...env,...extra},stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',b=>{log=(log+b).slice(-4000)});p.stderr.on('data',b=>{log=(log+b).slice(-4000)});p.on('error',()=>{log='Failed to start process'});children.push(p);return {p,log:()=>log};}
async function ready(base,state){for(let i=0;i<100;i++){if(state.p.exitCode!==null)throw Error('Built artifact exited before becoming ready');try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});await r.arrayBuffer();if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Built artifact readiness timeout');}
async function check(name,url,options,status,headers=[]){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});const body=await r.text();if(status>=500&&/ECONNREFUSED|token_hash|SELECT |password_hash/.test(body))throw Error('Internal detail leaked in error response');if(r.status!==status)throw Error(`${name}: expected ${status}, got ${r.status}`);for(const h of headers)if(!r.headers.get(h))throw Error(`${name}: missing ${h}`);checks.push({name,status:r.status,pass:true});}
try {
 const api=start([root+'/apps/api/dist/main.js'],root),ab='http://127.0.0.1:'+apiPort;
 await ready(ab+'/api/health',api);
 await check('anonymous-storage-denied',ab+'/api/study',{},401,['cache-control','x-request-id']);
 await check('untrusted-origin-denied',ab+'/api/charts/calculate',{method:'POST',headers:{origin:'https://bad.invalid','content-type':'application/json'},body:'{}'},403);
 await check('malformed-json-headers',ab+'/api/charts/calculate',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{bad'},400,['cache-control','x-content-type-options','x-request-id']);
 await check('oversized-body-headers',ab+'/api/charts/calculate',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({padding:'a'.repeat(90000)})},413,['cache-control','x-content-type-options']);
 await check('anonymous-calculation-denied',ab+'/api/charts/calculate',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'})},401);
 if(!withDb)await check('sanitized-database-failure',ab+'/api/auth/me',{headers:{cookie:'thiendo_session='+'a'.repeat(64)}},500,['x-request-id','cache-control']);
 if(withDb)await check('postgres-readiness',ab+'/api/health/ready',{},200);
 const standalone=root+'/apps/web/.next/standalone/apps/web/server.js';
 if(!existsSync(standalone))throw Error('Standalone web artifact missing');
 const web=start([standalone],dirname(standalone),{PORT:String(webPort),HOSTNAME:'127.0.0.1'}),wb='http://127.0.0.1:'+webPort;
 await ready(wb+'/',web);
 await check('standalone-web-headers',wb+'/',{},200,['content-security-policy','x-content-type-options','x-frame-options','strict-transport-security']);
 const html=await (await fetch(wb+'/')).text();
 for(const [name,regex] of [['javascript-asset',/<script[^>]+src="([^"]+\.js)"/],['stylesheet-asset',/<link[^>]+href="([^"]+\.css)"/]]){const asset=html.match(regex)?.[1];if(!asset)throw Error('Missing '+name);await check(name,new URL(asset,wb),{},200);}
 console.log(JSON.stringify({status:'PASS',database:withDb?'readiness-only':'not-exercised',checks,scope:'Built API + standalone web; no browser, OAuth or TLS termination'}));
}finally{for(const p of children)p.kill('SIGTERM');await Promise.all(children.map(p=>p.exitCode!==null?Promise.resolve():new Promise(r=>{p.once('exit',r);setTimeout(()=>{p.kill('SIGKILL');r();},3000).unref();})));}
