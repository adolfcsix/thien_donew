'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('./helpers-typeloader.cjs');
const source=fs.readFileSync(path.resolve(__dirname,'../apps/api/src/common/operations.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',code)(name=>{
 if(name==='node:crypto')return require(name);
 if(name==='@nestjs/common')return {Catch:()=>target=>target,HttpException:class HttpException extends Error{getStatus(){return this.status||500}},};
 throw new Error(name);
},mod,mod.exports);
test('safe server categorization distinguishes missing tables/columns, credentials and transport without logging raw SQL',()=>{
 const category=mod.exports.failureCategory;
 assert.equal(category({code:'42P01',message:'SELECT secret'}),'db_schema_incomplete');
 assert.equal(category({code:'42703'}),'db_schema_incomplete');
 assert.equal(category({cause:{code:'ECONNREFUSED'}}),'db_unavailable');
 assert.equal(category({code:'28P01'}),'db_credentials_rejected');
 assert.equal(category({message:'password=secret'}),'internal');
});
test('safe exception filter returns generic 5xx, requestId, and logs only bounded category',()=>{
 const logs=[],original=console.error;
 console.error=x=>logs.push(x);
 try{
  const payload={locals:{requestId:'support-0000-aaaa-eeee'},status(code){this.statusCode=code;return this},json(data){this.data=data;return this}};
  const failure={code:'42P01',message:'secret password or sql'};
  const host={switchToHttp:()=>({getResponse:()=>payload})};
  new mod.exports.SafeExceptionFilter().catch(failure,host);
  assert.equal(payload.statusCode,500);
  assert.equal(payload.data.requestId,'support-0000-aaaa-eeee');
  assert.doesNotMatch(JSON.stringify(payload.data)+logs.join(''),/secret|password|SELECT/);
  assert.equal(JSON.parse(logs[0]).category,'db_schema_incomplete');
 }finally{console.error=original;}
});
