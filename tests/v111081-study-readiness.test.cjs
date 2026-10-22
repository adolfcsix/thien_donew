'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('./helpers-typeloader.cjs');
const root=path.resolve(__dirname,'..');
function controller(db){const source=fs.readFileSync(path.join(root,'apps/api/src/modules/health/health.controller.ts'),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;const mod={exports:{}};const decorators=()=>()=>{};
 vm.runInNewContext('(function(require,module,exports){'+js+'})')(name=>{
  if(name==='@nestjs/common')return {Controller:decorators,Get:decorators,NotFoundException:class extends Error{},ServiceUnavailableException:class extends Error{}};
  if(name==='@thiendo/astrology-engine')return {RULESET:'fixture'};
  if(name.includes('e2e-identity'))return {expectedDisposableDatabase:()=>null};
  if(name.includes('database.service'))return {DatabaseService:class{}};
  throw Error(name);
 },mod,mod.exports);return new mod.exports.HealthController(db);
}
test('API readiness requires study table and JSONB snapshot along with chart schema',async()=>{
 let query='';const api=controller({query:async sql=>{query=sql;return {rows:[{ready:true}]}}});const result=await api.ready();assert.equal(result.ok,true);
 assert.match(query,/to_regclass\('public.study_entries'\)/);assert.match(query,/column_name='snapshot' AND data_type='jsonb'/);
});
test('incomplete schema refuses readiness instead of claiming study save is available',async()=>{
 const api=controller({query:async()=>({rows:[{ready:false}]})});await assert.rejects(()=>api.ready(),/Thư phòng/);
});
test('unavailable PostgreSQL refuses readiness',async()=>{
 const api=controller({query:async()=>{throw Error('connection failed')}});await assert.rejects(()=>api.ready(),/PostgreSQL chưa sẵn sàng/);
});
