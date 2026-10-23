const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {spawn}=require('node:child_process');
const {createServer}=require('node:net');
let localBuiltPlan,assertLocalPortFree,startLocalBuiltChildren;
before(async()=>{({localBuiltPlan,assertLocalPortFree,startLocalBuiltChildren}=await import('../infrastructure/scripts/start-local-built.mjs'));});
const root=resolve(__dirname,'..');
async function waitForPair(pair,ms=7000){
 let timer;
 try{return await Promise.race([pair.finished,new Promise((_,reject)=>{timer=setTimeout(()=>{pair.stop(1);reject(Error('launcher did not stop its children'));},ms);})]);}
 finally{clearTimeout(timer);}
}
function fixture(){const dir=mkdtempSync(join(tmpdir(),'thiendo-built-'));for(const n of ['apps/api/dist','apps/web/.next/standalone/apps/web/public/tarot/rws-1909','apps/web/.next/standalone/apps/web/.next/static','infrastructure/scripts'])mkdirSync(join(dir,n),{recursive:true});for(const n of ['apps/api/dist/main.js','apps/web/.next/standalone/apps/web/server.js','apps/web/.next/standalone/apps/web/public/tarot/rws-1909/ar00.jpg'])writeFileSync(join(dir,n),'');writeFileSync(join(dir,'apps/web/.next/standalone/apps/web/.next/routes-manifest.json'),JSON.stringify({rewrites:{afterFiles:[{source:'/api/:path*',destination:'http://127.0.0.1:8080/api/:path*'}]}}));return dir;}
const env={DATABASE_URL:'postgres://qa:unused@127.0.0.1:5432/fixture_test'};
test('compiled local plan separates WEB production optimization from HTTP loopback API and retains security secrets',()=>{const dir=fixture();try{const plan=localBuiltPlan(dir,{...env,ADMIN_MFA_ENCRYPTION_KEY:'fixture-key',AUTH_OTP_SECRET:'fixture-secret'});assert.equal(plan[0].env.API_HOST,'127.0.0.1');assert.equal(plan[0].env.NODE_ENV,'development');assert.equal(plan[0].env.ADMIN_MFA_ENCRYPTION_KEY,'fixture-key');assert.equal(plan[1].env.HOSTNAME,'127.0.0.1');assert.equal(plan[1].env.NODE_ENV,'production');assert.equal(plan[1].env.PORT,'3000');}finally{rmSync(dir,{recursive:true,force:true});}});
test('local launcher rejects production, remote DB, HTTPS cookie and conflicting baked proxy configuration',()=>{const dir=fixture();try{for(const change of [{NODE_ENV:'production'},{DATABASE_URL:'postgres://qa:unused@remote.invalid/db'},{WEB_ORIGIN:'https://example.invalid'},{COOKIE_SECURE:'true'},{API_PORT:'9090'},{API_INTERNAL_URL:'http://remote.invalid'}])assert.throws(()=>localBuiltPlan(dir,{...env,...change}));assert.throws(()=>localBuiltPlan(dir,{}),/DATABASE_URL/);const manifest=join(dir,'apps/web/.next/standalone/apps/web/.next/routes-manifest.json');writeFileSync(manifest,JSON.stringify({rewrites:{afterFiles:[{source:'/api/:path*',destination:'https://remote.invalid/api/:path*'}]}}));assert.throws(()=>localBuiltPlan(dir,env),/Proxy trong bản build/);writeFileSync(manifest,'invalid');assert.throws(()=>localBuiltPlan(dir,env),/routes manifest/);rmSync(join(dir,'apps/web/.next/standalone/apps/web/public'),{recursive:true});assert.throws(()=>localBuiltPlan(dir,env),/npm run build/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('port conflict reports a bounded actionable error and never kills the existing listener',async()=>{const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await assert.rejects(assertLocalPortFree(s.address().port),/đang được dùng/);assert.equal(s.listening,true);}finally{await new Promise(r=>s.close(r));}});
test('compiled launcher starts both direct Node children and stops the other when one exits',async()=>{
 const dir=fixture();let pair;
 try{
  const marker=JSON.stringify(join(dir,'api-ready'));
  writeFileSync(join(dir,'apps/api/dist/main.js'),`process.stdout.write('FIXTURE_API_READY'+String.fromCharCode(10),()=>require('node:fs').writeFileSync(${marker},'ready'));setInterval(()=>{},1000);`);
  writeFileSync(join(dir,'apps/web/.next/standalone/apps/web/server.js'),`console.log('FIXTURE_WEB_READY');const fs=require('node:fs');const poll=setInterval(()=>{if(fs.existsSync(${marker})){clearInterval(poll);process.exit(7)}},15);`);
  const out=[],err=[],codes=[];
  pair=startLocalBuiltChildren(localBuiltPlan(dir,env),{
   stdio:['ignore','pipe','pipe'],logger:{error:s=>err.push(s)},onExitCode:c=>codes.push(c),
  });
  for(const child of pair.children){
   child.stdout.on('data',b=>out.push(String(b)));
   child.stderr.on('data',b=>err.push(String(b)));
  }
  const code=await waitForPair(pair);
  assert.equal(code,7);
  assert.deepEqual(codes,[7]);
  assert.match(out.join(''),/FIXTURE_API_READY/);
  assert.match(out.join(''),/FIXTURE_WEB_READY/);
  assert.match(err.join(''),/dừng tiến trình còn lại/);
  assert.ok(pair.children.every(c=>c.exitCode!==null||c.signalCode!==null),'all child processes were stopped');
 }finally{pair?.stop(1);rmSync(dir,{recursive:true,force:true});}
});

test('local launcher force-kills a child that ignores graceful SIGTERM, without orphaning it',async()=>{
 const dir=fixture();let pair;
 try{
  const marker=JSON.stringify(join(dir,'api-handler-ready'));
  writeFileSync(join(dir,'apps/api/dist/main.js'),`process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(${marker},'ready');console.log('API_IGNORE_TERM');setInterval(()=>{},1000);`);
  writeFileSync(join(dir,'apps/web/.next/standalone/apps/web/server.js'),`console.log('WEB_FAILS');const fs=require('node:fs');const poll=setInterval(()=>{if(fs.existsSync(${marker})){clearInterval(poll);process.exit(9)}},15);`);
  pair=startLocalBuiltChildren(localBuiltPlan(dir,env),{stdio:'ignore',graceMs:80,onExitCode:()=>{}});
  const code=await waitForPair(pair);
  assert.equal(code,9);
  assert.equal(pair.children[0].signalCode,'SIGKILL');
  assert.equal(pair.children[1].exitCode,9);
 }finally{pair?.stop(1);rmSync(dir,{recursive:true,force:true});}
});

test('local launch canonicalizes the same optional origin slash as API without allowing paths or foreign origins',()=>{const dir=fixture();try{for(const origin of ['http://localhost:3000','http://127.0.0.1:3000'])for(const suffix of ['','/']){const plan=localBuiltPlan(dir,{...env,WEB_ORIGIN:origin+suffix});assert.equal(plan[0].env.WEB_ORIGIN,origin);assert.equal(plan[1].env.WEB_ORIGIN,origin);}for(const invalid of ['http://localhost:3000//','http://localhost:3000/path','http://localhost:3000/?x=1','http://localhost:3000/#x','http://localhost:3000.evil.invalid/','http://user:pass@localhost:3000/'])assert.throws(()=>localBuiltPlan(dir,{...env,WEB_ORIGIN:invalid}),/WEB_ORIGIN/);}finally{rmSync(dir,{recursive:true,force:true});}});
