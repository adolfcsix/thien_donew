'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const file=path.join(__dirname,'../apps/web/src/lib/api.ts');
function typescript(){try{return require('typescript');}catch{return require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}}
const ts=typescript();
const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const compiled=new Module(file,module);compiled.filename=file;compiled.paths=Module._nodeModulePaths(path.dirname(file));compiled._compile(js,file);
const {api}=compiled.exports;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
async function mocked(path,body,response,method='GET'){
 const original=globalThis.fetch;
 globalThis.fetch=async (url,opts)=>{
  assert.equal(url,path);assert.equal(opts.method,method);assert.equal(opts.credentials,'include');
  return new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{return await api(path,{method, ...(body===undefined?{}:{body})});}
 finally{globalThis.fetch=original;}
}
test('session response must prove identity instead of treating HTTP 200 as logged in',async()=>{
 assert.deepEqual(await mocked('/api/auth/me',undefined,{user:null}),{user:null});
 await assert.rejects(mocked('/api/auth/me',undefined,{user:{id:A}}),/Phản hồi máy chủ không hợp lệ/);
 assert.deepEqual(await mocked('/api/auth/me',undefined,{user:{id:A,email:'x@example.test'}}),{user:{id:A,email:'x@example.test'}});
});
test('saved chart success requires verified receipt and UUID',async()=>{
 const draft={label:'Kiểm tra',date:'2001-01-01',hour:10,minute:0,calendar:'solar',leap:false,gender:'Nam'};
 await assert.rejects(mocked('/api/charts',draft,{id:A,verified:false},'POST'),/Phản hồi máy chủ không hợp lệ/);
 await assert.rejects(mocked('/api/charts',draft,{id:'not-a-uuid',verified:true},'POST'),/Phản hồi máy chủ không hợp lệ/);
 assert.deepEqual(await mocked('/api/charts',draft,{id:A,verified:true},'POST'),{id:A,verified:true});
});
test('study import cannot clear retry state on mismatched request receipt',async()=>{
 const body={format:'thien-do.study-export',version:1,importId:A,entries:[{discipline:'general',title:'X',notes:'',summary:'Y',snapshot:{},tags:[],pinned:false}]};
 await assert.rejects(mocked('/api/study/import',body,{importId:B,imported:1,replayed:false},'POST'),/Phản hồi máy chủ không hợp lệ/);
 await assert.rejects(mocked('/api/study/import',body,{importId:A,imported:0,replayed:false},'POST'),/Phản hồi máy chủ không hợp lệ/);
 assert.deepEqual(await mocked('/api/study/import',body,{importId:A,imported:1,replayed:false},'POST'),{importId:A,imported:1,replayed:false});
});
test('user-scoped study read rejects a foreign ID in an otherwise valid-looking response',async()=>{
 const entry={id:B,discipline:'general',title:'Private',summary:'',notes:'',tags:[],snapshot:{},pinned:false,birthProfileId:null,createdAt:'2026-10-18T00:00:00Z',updatedAt:'2026-10-18T00:00:00Z'};
 await assert.rejects(mocked('/api/study/'+A,undefined,{entry}),/Phản hồi máy chủ không hợp lệ/);
 assert.deepEqual(await mocked('/api/study/'+B,undefined,{entry}),{entry});
});
