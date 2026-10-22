'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('./helpers-typeloader.cjs');
const source=fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/api.ts'),'utf8');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
function load(fetch){const timers=[],mod={exports:{}};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','fetch','setTimeout','clearTimeout','AbortController',code)(mod,mod.exports,fetch,(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t},t=>t.cleared=true,AbortController);
 return {...mod.exports,timers};
}
const json=value=>async()=>({ok:true,status:200,json:async()=>value});
for(const [name,invoke,payload] of [
 ['study create',a=>a.studyApi.create({}),{message:'ok'}],['study update',a=>a.studyApi.update(id,{}),{updated:false}],['study delete',a=>a.studyApi.remove(id),{deleted:false}],
 ['chart save',a=>a.chartApi.save({}),{id,verified:false}],['chart delete',a=>a.chartApi.remove(id),{message:'ok'}],
 ['study list',a=>a.studyApi.list(),{entries:[{}]}],['chart list',a=>a.chartApi.list(),{charts:[{}]}],
 ['study detail',a=>a.studyApi.get(id),{entry:{id:other}}],['chart detail',a=>a.chartApi.get(id),{chart:{id},result:{houses:[]},outdated:false}],
 ['receipt identity',a=>a.studyApi.importStatus(id),{importId:other,imported:1,committed:true}],['receipt commit',a=>a.studyApi.importStatus(id),{importId:id,imported:1,committed:false}],
 ['receipt count',a=>a.studyApi.importStatus(id),{importId:id,imported:0,committed:true}],['study import identity',a=>a.studyApi.importBackup([{}],id),{importId:other,imported:1,replayed:false}],
 ['study import count',a=>a.studyApi.importBackup([{}],id),{importId:id,imported:2,replayed:false}],['chart import totals',a=>a.chartApi.importBackup({charts:[{}]}),{imported:1,skipped:1,total:1}],
 ['chart import negative',a=>a.chartApi.importBackup({charts:[{}]}),{imported:-1,skipped:2,total:1}],
])test(`malformed successful ${name} cannot be treated as confirmation`,async()=>{
 const a=load(json(payload));await assert.rejects(invoke(a),/Phản hồi máy chủ không hợp lệ/);assert.ok(a.timers.every(t=>t.cleared));
});
test('empty valid storage lists and confirmed mutations remain accepted',async()=>{
 assert.deepEqual(await load(json({entries:[]})).studyApi.list(),{entries:[]});assert.deepEqual(await load(json({charts:[]})).chartApi.list(),{charts:[]});
 assert.deepEqual(await load(json({id})).studyApi.create({}),{id});assert.deepEqual(await load(json({updated:true})).studyApi.update(id,{}),{updated:true});
 assert.deepEqual(await load(json({importId:id,imported:1,replayed:true})).studyApi.importBackup([{}],id),{importId:id,imported:1,replayed:true});
});
test('storage CRUD has a 30-second deadline even with caller cancellation',async()=>{
 const caller=new AbortController(),a=load(async(_url,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})),{once:true})));
 const request=a.studyApi.list(caller.signal);assert.equal(a.timers[0].ms,30000);a.timers[0].fn();await assert.rejects(request,/Yêu cầu dữ liệu quá thời gian chờ/);assert.equal(caller.signal.aborted,false);assert.equal(a.timers[0].cleared,true);
});
test('import deadline is 60 seconds and warns that the server may already have committed',async()=>{
 const a=load(async(_url,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('abort')),{once:true})));
 const request=a.studyApi.importBackup([{}],id);assert.equal(a.timers[0].ms,60000);a.timers[0].fn();await assert.rejects(request,/máy chủ có thể đã hoàn tất/);assert.equal(a.timers[0].cleared,true);
});
test('long-running generic calculations remain outside storage deadlines',async()=>{
 const a=load(json({result:'calculated'}));assert.deepEqual(await a.api('/api/charts/forecast'),{result:'calculated'});assert.equal(a.timers.length,0);
});
test('invalid deadlines fail before fetch is attempted',async()=>{
 let calls=0;const a=load(async()=>{calls++;return json({ok:true})()});
 for(const timeoutMs of [0,-1,Infinity,NaN,120001])await assert.rejects(a.api('/api/study',{timeoutMs}),RangeError);assert.equal(calls,0);
});
test('receipt identifiers are compared canonically for valid uppercase UUID input',async()=>{
 const lower='abcdefab-abcd-4abc-8abc-abcdefabcdef',upper=lower.toUpperCase(),data={importId:lower,imported:1,committed:true};
 assert.deepEqual(await load(json(data)).studyApi.importStatus(upper),data);
});
