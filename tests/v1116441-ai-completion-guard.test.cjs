'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {assertAiUsageTransition,sameAiGenerationConfig}=require('../apps/api/src/modules/huyen-giai/ai-usage-transition.cjs');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('A14: single consumed reservation is required before acknowledging a Gemini result',()=>{
  assert.doesNotThrow(()=>assertAiUsageTransition({rowCount:1}));
  for(const rowCount of [0,2,-1,null,undefined,'1']){
    assert.throws(()=>assertAiUsageTransition({rowCount}),/AI_RESERVATION_NOT_ACTIVE/);
  }
  assert.throws(()=>assertAiUsageTransition(null),/AI_RESERVATION_NOT_ACTIVE/);
});

test('A14: both user and admin completions are guarded after UPDATE and before returning results',()=>{
  const user=read('apps/api/src/modules/huyen-giai/huyen-giai.service.ts');
  const admin=read('apps/api/src/modules/admin-insights/admin-insight-ai.service.ts');
  assert.match(user,/const finalized=await client\.query\(`UPDATE ai_usage SET status='completed'/);
  const update=user.indexOf('const finalized=await client.query(`UPDATE ai_usage');
  const guard=user.indexOf('assertAiUsageTransition(finalized)',update);
  const insert=user.indexOf('INSERT INTO ai_messages',update);
  assert.ok(update>=0 && update<guard && guard<insert,'No user AI message must be persisted after a no-op reservation update');
  const adminUpdate=admin.indexOf('const finalized = await this.db.query("UPDATE ai_usage');
  const adminGuard=admin.indexOf('assertAiUsageTransition(finalized)',adminUpdate);
  const adminReturn=admin.indexOf('return {summary:answer.summary',adminUpdate);
  assert.ok(adminUpdate>=0 && adminUpdate<adminGuard && adminGuard<adminReturn,'No admin AI answer after a no-op reservation update');
});

test('A14: quota transaction and Gemini API calls still use bounded budgets and 25s timeout',()=>{
 const admin=read('apps/api/src/modules/admin-insights/admin-insight-ai.service.ts');
 const user=read('apps/api/src/modules/huyen-giai/huyen-giai.service.ts');
 for(const source of [admin,user]){
   assert.match(source,/FOR UPDATE/);
   assert.match(source,/status='reserved'/);
   assert.match(source,/AbortSignal\.timeout\(25000\)/);
 }
});

test('A14: changed model, prompt, token limit or pricing cancels an outdated Gemini request before reservation',()=>{
 const conf={model:'gemini-3.8-flash',prompt_version:'huyen-giai-v1',max_output_tokens:1024,input_price_microusd_per_million:100,output_price_microusd_per_million:200};
 assert.equal(sameAiGenerationConfig(conf,{...conf,input_price_microusd_per_million:'100'}),true);
 for (const [key,next] of [['model','gemini-3.5-flash-lite'],['prompt_version','huyen-giai-v1-study'],['max_output_tokens',4096],['input_price_microusd_per_million',300],['output_price_microusd_per_million',500]]) {
   assert.equal(sameAiGenerationConfig(conf,{...conf,[key]:next}),false,key);
 }
 assert.equal(sameAiGenerationConfig(conf,null),false);
 const user=read('apps/api/src/modules/huyen-giai/huyen-giai.service.ts');
 assert.match(user,/if\(!sameAiGenerationConfig\(conf,locked\)\)throw new ConflictException/);
});

// Exercise the actual AdminInsightAiService methods with a controlled provider/DB (not real PostgreSQL).
test('A14: admin Gemini cannot return success when reserved usage was reclaimed before finalization',async()=>{
  const ts=require('./helpers-typeloader.cjs');
  const svcSource=read('apps/api/src/modules/admin-insights/admin-insight-ai.service.ts');
  const mod={exports:{}};
  const common={Injectable:()=>target=>target,ServiceUnavailableException:class ServiceUnavailableException extends Error{},
    ConflictException:class ConflictException extends Error{},HttpException:class HttpException extends Error{},HttpStatus:{TOO_MANY_REQUESTS:429}};
  const compiled=ts.transpileModule(svcSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
  const mockRequire=(name)=>{
    if(name==='@nestjs/common')return common;
    if(name==='node:crypto')return require('node:crypto');
    if(name.includes('huyen-giai-contract.cjs'))return require('../apps/api/src/modules/huyen-giai/huyen-giai-contract.cjs');
    if(name.includes('ai-usage-transition.cjs'))return require('../apps/api/src/modules/huyen-giai/ai-usage-transition.cjs');
    throw Error('Unexpected dependency: '+name);
  };
  new Function('module','exports','require',compiled)(mod,mod.exports,mockRequire);
  const calls=[];
  const db={
    transaction:async f=>f({query:async sql=>{
      calls.push(sql);
      if(sql.includes('SELECT * FROM ai_runtime_config'))return {rows:[{enabled:true,model:'gemini-3.8-flash',max_output_tokens:1024,daily_global_calls:100,daily_user_calls:50,daily_budget_microusd:'1000000',input_price_microusd_per_million:1,output_price_microusd_per_million:1}]};
      if(sql.includes('AS user_calls'))return {rows:[{calls:'0',user_calls:'0',spent:'0'}]};
      return {rowCount:1,rows:[]};
    }}),
    query:async sql=>{calls.push(sql);if(sql.includes("status='completed'"))return {rowCount:0,rows:[]};return {rowCount:0,rows:[]};}
  };
  const prevKey=process.env.GEMINI_API_KEY,prevFetch=global.fetch;
  try{
    process.env.GEMINI_API_KEY='controlled-test-only-not-real';
    global.fetch=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({summary:'Có ba bài trong kỳ.',findings:[{text:'Đã ghi nhận ba bài.',evidenceIds:['forum.threads']}]})}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:50}})});
    const service=new mod.exports.AdminInsightAiService(db);
    await assert.rejects(()=>service.explain('10000000-0000-4000-8000-000000000001',[{id:'forum.threads',label:'Bài diễn đàn',value:3,source:'SQL'}]),/Chưa nhận được phân tích Gemini hợp lệ/);
    assert.ok(calls.some(sql=>sql.includes("status='completed'")),'Finalization attempt must be made');
    assert.ok(calls.some(sql=>sql.includes("status='failed'")),'Failure receipt must be attempted');
  }finally{
    if(prevKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=prevKey;
    global.fetch=prevFetch;
  }
});
