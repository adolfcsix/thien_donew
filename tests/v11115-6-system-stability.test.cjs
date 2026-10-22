'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const ts=require('./helpers-typeloader.cjs');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps/web/src/lib/api.ts'),'utf8');
function loadApi(fetch){
 const timers=[];
 const mod={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','fetch','setTimeout','clearTimeout','AbortController',code)(mod,mod.exports,fetch,(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t},t=>t.cleared=true,AbortController);
 return {...mod.exports,timers};
}
const response=raw=>async()=>({ok:true,status:200,json:async()=>raw});
for(const raw of [null,[],false,'ok',17]) test(`successful API response rejects non-object JSON ${JSON.stringify(raw)}`,async()=>{
 const a=loadApi(response(raw));await assert.rejects(a.api('/api/study'),/Phản hồi máy chủ không hợp lệ/);
});
test('invalid JSON on HTTP 200 cannot pretend a study save succeeded',async()=>{
 const a=loadApi(async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('private proxy HTML')}}));
 await assert.rejects(a.studyApi.create({}),/Phản hồi máy chủ không hợp lệ/);
});
test('invalid error JSON preserves HTTP status without leaking response body',async()=>{
 const a=loadApi(async()=>({ok:false,status:502,json:async()=>{throw new SyntaxError('private upstream')}}));
 await assert.rejects(a.api('/api/study'),/^Error: HTTP 502$/);
});
for(const user of [undefined,{}, {id:'u'}, [], {id:17,email:'e'}]) test(`invalid session identity ${JSON.stringify(user)} is rejected`,async()=>{
 const a=loadApi(response({user}));await assert.rejects(a.accountApi.me(),/Phản hồi máy chủ không hợp lệ/);
 assert.equal(a.timers[0].cleared,true);
});
test('explicit expired session and valid session remain authoritative',async()=>{
 assert.deepEqual(await loadApi(response({user:null})).accountApi.me(),{user:null});
 const data={user:{id:'u',email:'a@b.c',hasAvatar:true}};
 assert.deepEqual(await loadApi(response(data)).accountApi.me(),data);
});
for(const method of ['logout','logoutAll','removeAvatar','confirmPasswordReset']) test(`${method} rejects unconfirmed mutations`,async()=>{
 const a=loadApi(response({}));await assert.rejects(a.accountApi[method](),/Phản hồi máy chủ không hợp lệ/);
});
test('avatar upload rejects malformed success and releases deadline',async()=>{
 const a=loadApi(response({}));await assert.rejects(a.accountApi.uploadAvatar(new Blob(['x'])),/Phản hồi máy chủ không hợp lệ/);
 assert.equal(a.timers[0].cleared,true);
});
test('Google disabled config can retain configured client ID while secrets are missing',async()=>{
 const data={enabled:false,clientId:'configured-client'};
 assert.deepEqual(await loadApi(response(data)).accountApi.googleConfig(),data);
});
test('auth deadline still applies when caller supplies its own signal',async()=>{
 const caller=new AbortController();let signal;
 const a=loadApi(async(_url,opts)=>{signal=opts.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('abort'),{name:'AbortError'})),{once:true}))});
 const request=a.api('/api/auth/me',{signal:caller.signal});a.timers[0].fn();
 await assert.rejects(request,/quá thời gian chờ/);assert.equal(caller.signal.aborted,false);assert.equal(a.timers[0].cleared,true);
});
test('caller cancellation while parsing JSON remains AbortError, never successful empty payload',async()=>{
 const caller=new AbortController();let parsing;
 const started=new Promise(resolve=>parsing=resolve);
 const a=loadApi(async(_url,opts)=>({ok:true,json:()=>{parsing();return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('cancelled'),{name:'AbortError'})),{once:true}))}}));
 const request=a.api('/api/charts',{signal:caller.signal});await started;caller.abort();
 await assert.rejects(request,{name:'AbortError'});assert.equal(a.timers.length,0);
});
test('caller auth cancellation preserves AbortError and removes listener',async()=>{
 const caller=new AbortController();let added=0,removed=0;
 const add=caller.signal.addEventListener.bind(caller.signal),remove=caller.signal.removeEventListener.bind(caller.signal);
 caller.signal.addEventListener=(...args)=>{added++;return add(...args)};
 caller.signal.removeEventListener=(...args)=>{removed++;return remove(...args)};
 const a=loadApi(async(_url,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('cancelled'),{name:'AbortError'})),{once:true})));
 const request=a.api('/api/auth/me',{signal:caller.signal});caller.abort();
 await assert.rejects(request,{name:'AbortError'});assert.equal(added,1);assert.equal(removed,1);assert.equal(a.timers[0].cleared,true);
});
function loadDatabase(pool){
 const messages=[];
 const code=ts.transpileModule(fs.readFileSync(path.join(root,'apps/api/src/common/database.service.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const mod={exports:{}};
 new Function('module','exports','require',code)(mod,mod.exports,name=>{
  if(name==='@nestjs/common')return {Injectable:()=>()=>{},Logger:{warn:(...args)=>messages.push(args)}};
  if(name==='pg')return {Pool:class{constructor(){return pool}}};throw Error(name);
 });
 return {db:new mod.exports.DatabaseService(),messages};
}
test('idle PostgreSQL error is consumed; later queries can recover without leaking raw error',async()=>{
 const pool=new EventEmitter();pool.query=async()=>({rows:[{ok:true}]});pool.end=async()=>{};
 const {db,messages}=loadDatabase(pool);
 assert.doesNotThrow(()=>pool.emit('error',new Error('postgresql://private-password SELECT private')));
 assert.equal(messages.length,1);assert.doesNotMatch(JSON.stringify(messages),/private-password|SELECT/);
 assert.deepEqual(await db.query('SELECT 1'),{rows:[{ok:true}]});await db.onModuleDestroy();
});
test('commit failure rolls back and releases client while preserving original failure',async()=>{
 const pool=new EventEmitter(),queries=[],released=[];const failure=new Error('commit failed');
 pool.connect=async()=>({query:async sql=>{queries.push(sql);if(sql==='COMMIT')throw failure;return{}},release:discard=>released.push(discard)});
 const {db}=loadDatabase(pool);await assert.rejects(db.transaction(async()=>42),e=>e===failure);
 assert.deepEqual(queries,['BEGIN','COMMIT','ROLLBACK']);assert.deepEqual(released,[false]);
});
function loadSdk(){
 const timers=[],scripts=[];
 const win={setTimeout:(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t},clearTimeout:t=>t.cleared=true};
 const document={createElement:()=>({remove(){this.removed=true}}),head:{appendChild:script=>scripts.push(script)}};
 const source=fs.readFileSync(path.join(root,'apps/web/src/components/google-auth-button.tsx'),'utf8')+'\nexport {loadGoogleSdk};';
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 new Function('module','exports','require','window','document',code)(mod,mod.exports,()=>({}),win,document);
 return {...mod.exports,timers,scripts,win};
}
test('Google SDK stalled download releases loading and permits a clean retry',async()=>{
 const sdk=loadSdk(),first=sdk.loadGoogleSdk();assert.equal(sdk.loadGoogleSdk(),first);
 assert.equal(sdk.timers[0].ms,15000);sdk.timers[0].fn();
 await assert.rejects(first,/quá thời gian chờ/);assert.equal(sdk.scripts[0].removed,true);
 assert.equal(sdk.scripts[0].onload,null);assert.equal(sdk.timers[0].cleared,true);
 const retry=sdk.loadGoogleSdk();sdk.win.google={accounts:{}};sdk.scripts[1].onload();await retry;
 assert.equal(sdk.timers[1].cleared,true);assert.equal(sdk.scripts[1].removed,undefined);
});
test('Google SDK network rejection clears handlers and timer before retry',async()=>{
 const sdk=loadSdk(),first=sdk.loadGoogleSdk();sdk.scripts[0].onerror();
 await assert.rejects(first,/Không thể kết nối/);assert.equal(sdk.timers[0].cleared,true);
 assert.equal(sdk.scripts[0].onerror,null);const retry=sdk.loadGoogleSdk();sdk.scripts[1].onload();await retry;
});
test('Google SDK already available does not append scripts or create timers',async()=>{
 const sdk=loadSdk();sdk.win.google={accounts:{}};await sdk.loadGoogleSdk();
 assert.equal(sdk.timers.length,0);assert.equal(sdk.scripts.length,0);
});
