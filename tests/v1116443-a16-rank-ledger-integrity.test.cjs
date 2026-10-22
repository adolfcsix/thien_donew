'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'apps/api/src/modules/tinh-canh/tinh-canh.service.ts');
const source=fs.readFileSync(file,'utf8');
function loadService(){
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 class ApiError extends Error{constructor(message){super(message);this.status=400;}}
 class Forbidden extends ApiError{}
 class Conflict extends ApiError{}
 class Missing extends ApiError{}
 const nest={Injectable:()=>cls=>cls,BadRequestException:ApiError,ForbiddenException:Forbidden,ConflictException:Conflict,NotFoundException:Missing,HttpException:ApiError,HttpStatus:{TOO_MANY_REQUESTS:429}};
 const exported={exports:{}};
 const customRequire=id=>{
  if(id==='@nestjs/common')return nest;
  if(id.includes('tinh-canh-ranks.cjs'))return require('../packages/knowledge/src/tinh-canh-ranks.cjs');
  if(id.includes('specialty-badges.cjs'))return require('../packages/knowledge/src/specialty-badges.cjs');
  throw Error('Unexpected dependency '+id);
 };
 vm.runInNewContext('(function(exports,require,module){'+code+'\n})',{console}, {filename:file})(exported.exports,customRequire,exported);
 return {Service:exported.exports.TinhCanhService,ApiError};
}
const {Service,ApiError}=loadService();
const target='11111111-1111-4111-8111-111111111111';
const admin='22222222-2222-4222-8222-222222222222';
const sourceId='33333333-3333-4333-8333-333333333333';
const mfa={requireAdmin:async()=>({id:admin}),assertWriteInTransaction:async()=>{}};
test('A16: leaderboard strictly rejects noncanonical offsets and malformed filter types before DB access',async()=>{
 let reads=0;
 const service=new Service({query:async()=>{reads++;return {rows:[]}}},null,mfa);
 for(const q of [{offset:null},{offset:[]},{offset:['0']},{offset:''},{offset:'-1'},{offset:'1e2'},{offset:'01'},{offset:'251'},{direction:['luan-gia']},{direction:{}},{subject:['tarot']},{subject:42}]){
  await assert.rejects(service.leaderboard(q),ApiError,'invalid: '+JSON.stringify(q));
 }
 assert.equal(reads,0,'malformed queries must not reach SQL');
 const empty=await service.leaderboard({offset:'0',subject:'tarot',direction:'luan-gia'});
 assert.equal(empty.entries.length,0);assert.equal(reads,1);
});
test('A16: recipient row is locked before daily award quota check, and row absence fails closed',async()=>{
 const statements=[];
 let recipientExists=true,dailyCount=9;
 const conn={query:async(sql,params)=>{
  statements.push(sql);
  if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
  if(sql.includes('tinh_van_rate_limits'))return {rows:[{count:1}]};
  if(sql.includes('SELECT id FROM users WHERE id=$1 FOR UPDATE'))return {rows:recipientExists?[{id:target}]:[]};
  if(sql.includes('account_blocks')||sql.includes('forum_suspensions'))return {rows:[]};
  if(sql.includes('SELECT count(*)::text AS n FROM tinh_van_awards'))return {rows:[{n:String(dailyCount)}]};
  if(sql.includes('FROM study_entries'))return {rows:[{discipline:'tarot'}]};
  if(sql.includes('INSERT INTO tinh_van_awards'))return {rows:[{id:'7'}]};
  if(sql.includes('INSERT INTO admin_audit'))return {rows:[]};
  throw Error('Unexpected SQL: '+sql);
 }};
 const service=new Service({transaction:async fn=>fn(conn)},null,mfa);
 const input={userId:target,sourceId,kind:'learning-reviewed'};
 const result=await service.award({},input);assert.equal(result.points,8);
 const lock=statements.findIndex(s=>s.includes('SELECT id FROM users WHERE id=$1 FOR UPDATE'));
 const count=statements.findIndex(s=>s.includes('SELECT count(*)::text AS n FROM tinh_van_awards'));
 assert.ok(lock>=0&&count>lock,'recipient lock must precede quota SELECT');
 dailyCount=10;statements.length=0;
 await assert.rejects(service.award({},input),e=>e.status===400&&/10 minh chứng/.test(e.message));
 assert.ok(!statements.some(s=>s.includes('INSERT INTO tinh_van_awards')),'quota reject must occur before insert');
 recipientExists=false;statements.length=0;
 await assert.rejects(service.award({},input),e=>/không tồn tại/.test(e.message));
 assert.ok(!statements.some(s=>s.includes('SELECT count(*)::text AS n FROM tinh_van_awards')),'missing recipient must reject before quota');
});
test('A16: medal artwork has 18 levels, user visibility guard and animation pause',()=>{
 const ranks=require('../packages/knowledge/src/tinh-canh-ranks.cjs').ranks;
 assert.equal(ranks.length,18);assert.equal(new Set(ranks.map(x=>x.badge)).size,18);
 const motion=fs.readFileSync(path.join(root,'apps/web/src/lib/visible-motion.ts'),'utf8');
 const css=fs.readFileSync(path.join(root,'apps/web/src/components/tinh-canh-medal.module.css'),'utf8');
 assert.match(motion,/visibilitychange/);assert.match(motion,/IntersectionObserver/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/data-paused="true"/);
 assert.match(source,/public_rank=false/);
});
