/** Bounded live negative-security + read-only concurrency smoke; NEVER target production. */
import assert from 'node:assert/strict';
const api=new URL(process.env.API_INTERNAL_URL||'http://127.0.0.1:8080');
const web=new URL(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
for(const u of [api,web])if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Loopback-only HTTP smoke');
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES')throw Error('Disposable CI environment required');
const call=async(base,path,options={})=>{
 const began=performance.now();
 const res=await fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(12000),...options});
 const text=await res.text();
 return {status:res.status,elapsedMs:performance.now()-began,headers:res.headers,body:text.slice(0,3000)};
};
const health=await call(api,'/api/health');assert.equal(health.status,200);
assert.equal(health.headers.get('x-frame-options'),'DENY');
assert.equal(health.headers.get('x-content-type-options'),'nosniff');
const blocked=[
 '/api/books/admin/catalog','/api/portal/admin/documents','/api/forum/moderation/queue',
 '/api/admin/finance','/api/huyen-giai/admin/config','/api/forum/notifications'];
for(const path of blocked){const res=await call(api,path);assert.ok([401,403].includes(res.status),`Private API leaked or broke ${path}: HTTP ${res.status}`);console.log('PASS anonymous denied:',path);}
const csrf=await call(api,'/api/forum/threads',{method:'POST',headers:{origin:'http://cross-site.invalid','sec-fetch-site':'cross-site','content-type':'application/json'},body:JSON.stringify({title:'ATTACK',body:'ATTACK'})});
assert.equal(csrf.status,403,'CSRF-style untrusted origin was not denied');
const missing=await call(api,'/api/books/a-physically-impossible-book-slug-v11164/file');
assert.ok([401,403,404].includes(missing.status),'Book file handler leaked a non-existent object');
const paths=['/','/huong-dan','/phap-ly','/books','/van-kho','/forum','/tinh-canh','/api/health'];
const samples=[],failed=[];
const jobs=[];for(const path of paths)for(let i=0;i<5;i++)jobs.push({path,base:path.startsWith('/api/')?api:web});
let next=0;
await Promise.all(Array.from({length:4},async()=>{for(;;){const index=next++;if(index>=jobs.length)break;const j=jobs[index];try{const result=await call(j.base,j.path);samples.push({path:j.path,...result});if(result.status!==200)failed.push(`${j.path}: HTTP ${result.status}`);}catch(error){failed.push(`${j.path}: ${error.message}`);}}}));
const elapsed=samples.map(x=>x.elapsedMs).sort((a,b)=>a-b);
const p95=elapsed[Math.ceil(elapsed.length*.95)-1];
assert.equal(failed.length,0,'HTTP failures during bounded load: '+failed.join('; '));
assert.ok(p95<8000,`Bounded load p95 exceeded 8s: ${p95.toFixed(0)}ms`);
console.log(`PASS: ${samples.length} requests, concurrency=4, p95=${p95.toFixed(0)}ms; ${blocked.length} private routes denied, CSRF denied, missing file denied`);
console.log('SCOPE: low-volume CI smoke only; does not demonstrate production load capacity or penetration testing.');
