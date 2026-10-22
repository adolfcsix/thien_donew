'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const source=readFileSync(join(__dirname,'..','apps/web/src/lib/api.ts'),'utf8');
function typescript(){
  try{return require('typescript');}catch{}
  try {return require(join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));} catch {return null;}
}
const ts=typescript();

// Account and commerce reads/writes have bounded waits; long calculation routes retain their own policy.
test('auth timeout policy never limits astrology/chart or study endpoints',()=>{
  assert.match(source,/const ACCOUNT_TIMEOUT_MS = 20_000/);
  assert.match(source,/path\.startsWith\('\/api\/auth\/'\) \? ACCOUNT_TIMEOUT_MS : commerceDeadline/);
  assert.match(source,/timeout\?\.signal \?\? options\.signal/);
  assert.match(source,/if \(timer !== null\) clearTimeout\(timer\)/);
});
test('avatar upload has a separate deadline, plus cleanup after success or failure',()=>{
  assert.match(source,/const timer = setTimeout\(\(\) => timeout\.abort\(\), 25_000\)/);
  assert.match(source,/body:image,credentials:'include',cache:'no-store',signal:timeout\.signal/);
  assert.match(source,/clearTimeout\(timer\)/);
  assert.match(source,/timeout\.signal\.aborted\) throw new Error\('Tải ảnh lên quá thời gian chờ/);
});

if(!ts){
  test('browser transport behavioral tests require TypeScript',{skip:true},()=>{});
} else {
  function loadApi(fetchStub){
    const timers=[];
    const fakeSetTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false};timers.push(timer);return timer;};
    const fakeClearTimeout=timer=>{timer.cleared=true;};
    const code=ts.transpileModule(source,{fileName:'api.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const mod={exports:{}};
    new Function('module','exports','fetch','setTimeout','clearTimeout','AbortController',code)(
      mod,mod.exports,fetchStub,fakeSetTimeout,fakeClearTimeout,AbortController);
    return {...mod.exports,timers};
  }
  function stalledFetch(_url,opts){
    return new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));
  }
  test('a stalled auth request aborts, surfaces an intelligible error and clears its timer',async()=>{
    const api=loadApi(stalledFetch);
    const request=api.api('/api/auth/login',{method:'POST',body:{email:'a@b.c',password:'x'}});
    assert.equal(api.timers.length,1);
    assert.equal(api.timers[0].ms,20000);
    api.timers[0].fn();
    await assert.rejects(request,/Yêu cầu tài khoản quá thời gian chờ/);
    assert.equal(api.timers[0].cleared,true);
  });
  test('stalled billing and admin requests have a bounded default and release their timers',async()=>{
    for(const path of ['/api/billing/orders','/api/admin/consultation-config','/api/articles']){
      const transport=loadApi(stalledFetch),pending=transport.api(path);
      assert.equal(transport.timers[0].ms,20000);transport.timers[0].fn();
      await assert.rejects(pending,/Yêu cầu dữ liệu quá thời gian chờ/);assert.equal(transport.timers[0].cleared,true);
    }
  });
  test('commerce timeout keeps explicit deadlines and caller cancellation',async()=>{
    const transport=loadApi(stalledFetch),controller=new AbortController();
    const pending=transport.api('/api/billing/orders',{signal:controller.signal,timeoutMs:15000});
    assert.equal(transport.timers[0].ms,15000);controller.abort();await assert.rejects(pending,/aborted/);assert.equal(transport.timers[0].cleared,true);
  });
  test('no transport timeout is added to lengthy chart requests',async()=>{
    const api=loadApi(async()=>({ok:true,json:async()=>({result:'ok'})}));
    assert.deepEqual(await api.api('/api/charts/forecast'),{result:'ok'});
    assert.equal(api.timers.length,0);
  });
  test('auth timeout includes a stalled JSON response body',async()=>{
    const fetchStub=async(_url,opts)=>({ok:true,json:()=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('aborted body')),{once:true}))});
    const api=loadApi(fetchStub);
    const request=api.api('/api/auth/me');
    assert.equal(api.timers.length,1);
    await Promise.resolve();
    api.timers[0].fn();
    await assert.rejects(request,/Yêu cầu tài khoản quá thời gian chờ/);
    assert.equal(api.timers[0].cleared,true);
  });
  test('avatar upload stalled request aborts independently at 25 seconds',async()=>{
    const api=loadApi(stalledFetch);
    const request=api.accountApi.uploadAvatar(new Blob(['bytes'],{type:'image/jpeg'}));
    assert.equal(api.timers.length,1);
    assert.equal(api.timers[0].ms,25000);
    api.timers[0].fn();
    await assert.rejects(request,/Tải ảnh lên quá thời gian chờ/);
    assert.equal(api.timers[0].cleared,true);
  });
}
