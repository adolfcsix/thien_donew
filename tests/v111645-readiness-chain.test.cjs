'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('./helpers-typeloader.cjs'),root=path.resolve(__dirname,'..');
test('readiness requires every current migration and table, not just the old core schema',async()=>{
 const source=fs.readFileSync(path.join(root,'apps/api/src/modules/health/health.controller.ts'),'utf8'),mod={exports:{}};
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const decorator=()=>()=>{};new Function('require','module','exports',compiled)(name=>{
  if(name==='@nestjs/common')return {Controller:decorator,Get:decorator,NotFoundException:class extends Error{},ServiceUnavailableException:class extends Error{}};
  if(name==='@thiendo/astrology-engine')return {RULESET:'fixture'};
  if(name.includes('e2e-identity'))return {expectedDisposableDatabase:()=>null};
  if(name.includes('database.service'))return {DatabaseService:class{}};
  throw Error(name);
 },mod,mod.exports);
 let sql,params;await new mod.exports.HealthController({query:async(text,args)=>{sql=text;params=args;return {rows:[{ready:true}]}}}).ready();
 const files=fs.readdirSync(path.join(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)).sort();assert.deepEqual(params[0],files);
 const tables=[...new Set(files.flatMap(n=>[...fs.readFileSync(path.join(root,'infrastructure/db',n),'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_][a-z0-9_]*)/g)].map(m=>m[1])))].sort();assert.deepEqual(params[1],tables);
 assert.match(sql,/\('sessions','device_label'\)/);assert.match(sql,/\('account_security_events','user_id'\)/);
 assert.match(sql,/unnest\(\$1::text\[\]\).*EXCEPT SELECT name FROM schema_migrations/);assert.match(sql,/unnest\(\$2::text\[\]\).*to_regclass/);
});
