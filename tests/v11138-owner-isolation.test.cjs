'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs');
const root=path.resolve(__dirname,'..');
class ErrorWithStatus extends Error{constructor(message){super(message);this.status=400;}}
class ConflictException extends ErrorWithStatus{};
class NotFoundException extends ErrorWithStatus{};
function loadService(){
 const file=path.join(root,'apps/api/src/modules/birth-profiles/birth-profiles.service.ts');
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;
 const mod={exports:{}}, fn=vm.runInNewContext('(function(require,module,exports){'+js+'})');
 fn(name=>{
  if(name==='@nestjs/common')return {Injectable:()=>cls=>cls,BadRequestException:ErrorWithStatus,ConflictException,NotFoundException};
  if(name==='node:crypto')return require('node:crypto');
  if(name==='./birth-profile-validation.cjs')return require('../apps/api/src/modules/birth-profiles/birth-profile-validation.cjs');
  if(name==='../../common/identifiers')return {assertChartId:id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('bad id');}};
  throw Error('Unknown module '+name);
 },mod,mod.exports);return mod.exports.BirthProfilesService;
}
const Service=loadService();
const owner={id:'11111111-1111-4111-8111-111111111111'},someoneElse={id:'22222222-2222-4222-8222-222222222222'};
const example={name:'A',date:'2004-01-01',hour:null,minute:null,calendar:'solar',leap:false,gender:null,timeZone:'Asia/Ho_Chi_Minh',birthPlace:'',latitude:null,longitude:null,timeAccuracy:'unknown',notes:''};
test('listing always binds authenticated owner and excludes other user by query',async()=>{
 const calls=[];const svc=new Service({query:async(sql,params)=>{calls.push([sql,params]);return {rows:[]};}},{required:async()=>owner});
 assert.equal((await svc.list({})).profiles.length,0);assert.match(calls[0][0],/WHERE user_id=\$1/);assert.equal(calls[0][1][0],owner.id);
});
test('untrusted row lookup and delete can never read or delete another owner',async()=>{
 const calls=[];const id=someoneElse.id;
 const svc=new Service({query:async(sql,params)=>{calls.push([sql,params]);return {rows:[],rowCount:0};}},{required:async()=>owner});
 await assert.rejects(()=>svc.get({},id),/Không tìm thấy/);
 await assert.rejects(()=>svc.remove({},id),/Không tìm thấy/);
 for(const [sql,params] of calls){assert.match(sql,/user_id=/);assert.ok(params.includes(owner.id));assert.ok(params.includes(id));}
});
test('create enforces quota under account-wide lock before inserting',async()=>{
 const calls=[];const db={transaction:cb=>cb({query:async(sql,params)=>{
  calls.push([sql,params]);if(/COUNT\(\*\)/.test(sql))return {rows:[{n:'100'}]};return {rows:[],rowCount:1};
 }})};const svc=new Service(db,{required:async()=>owner});
 await assert.rejects(()=>svc.create({},example),/Tối đa 100/);
 assert.match(calls[0][0],/pg_advisory_xact_lock/);assert.equal(calls[0][1][0],owner.id);
 assert.equal(calls.some(c=>/INSERT INTO birth_profiles/.test(c[0])),false);
});
test('create stores normalized input, never client ID/owner/results',async()=>{
 const calls=[];const svc=new Service({transaction:cb=>cb({query:async(sql,params)=>{
  calls.push([sql,params]);if(/COUNT\(\*\)/.test(sql))return {rows:[{n:'0'}]};return {rows:[],rowCount:1};
 }})},{required:async()=>owner});
 const result=await svc.create({},example);assert.match(result.id,/^[0-9a-f-]{36}$/);
 const insert=calls.find(([sql])=>/INSERT INTO birth_profiles/.test(sql));assert.ok(insert);assert.equal(insert[1][1],owner.id);assert.equal(insert[1][2],example.name);assert.equal(insert[1][5],null);
});
test('linking a chart requires both ownership and matching date/calendar/time',()=>{
 const source=fs.readFileSync(path.join(root,'apps/api/src/modules/charts/charts.service.ts'),'utf8');
 assert.match(source,/FROM birth_profiles WHERE id=\$1 AND user_id=\$2/);
 for(const key of ['date','hour','minute','calendar','leap','gender','timeZone'])assert.ok(source.includes(`source.${key}!==input.${key}`)||key==='timeZone'&&source.includes("source.timeZone!=='Asia/Ho_Chi_Minh'"),key);
});
