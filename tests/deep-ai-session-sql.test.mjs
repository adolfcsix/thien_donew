/** Isolated SQL + real services, controlled Gemini transport. Not native PostgreSQL or real provider acceptance. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated THIENDO_SQL_TEST_MODULE required');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {AuthService}=require('../apps/api/dist/modules/auth/auth.service.js');
const {ChartsService}=require('../apps/api/dist/modules/charts/charts.service.js');
const {HuyenGiaiService}=require('../apps/api/dist/modules/huyen-giai/huyen-giai.service.js');
let pg,db,auth,charts,service,providerCalls;
const originalFetch=globalThis.fetch,originalKey=process.env.GEMINI_API_KEY;
const digest=s=>createHash('sha256').update(s).digest('hex');
const denied=status=>e=>e.getStatus?.()===status;
const answer={summary:'Luận giải có nguồn chứng cứ rõ ràng.',findings:[{kind:'uncertain',text:'Cần đối chiếu thêm trước khi kết luận.',evidenceIds:['P1']}],missingData:[]};
before(async()=>{
 pg=await PGlite.create();
 for(const file of readdirSync('infrastructure/db').filter(x=>/^\d{3}.*\.sql$/.test(x)).sort())await pg.exec(readFileSync('infrastructure/db/'+file,'utf8'));
 const query=async(c,q,p)=>{const r=await c.query(q,p);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
 db={query:(q,p)=>query(pg,q,p),transaction:fn=>pg.transaction(tx=>fn({query:(q,p)=>query(tx,q,p)}))};
 auth=new AuthService(db);charts=new ChartsService(db,auth);service=new HuyenGiaiService(db,auth,charts,{});
 process.env.GEMINI_API_KEY='isolated-controlled-provider-no-real-key';
 await pg.exec('UPDATE ai_runtime_config SET enabled=true,daily_user_calls=200,daily_global_calls=100000,daily_budget_microusd=10000000000,input_price_microusd_per_million=1,output_price_microusd_per_million=1');
});
after(async()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;await pg?.close();});
async function fixture(){
 const id=randomUUID(),token=randomBytes(32).toString('hex');
 await pg.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[id,id+'@example.invalid','fixture','fixture']);
 await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[digest(token),id]);
 const req={headers:{cookie:'thiendo_session='+token}},saved=await charts.save(req,{label:'Isolated AI session fixture',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
 return {id,token,req,chartId:saved.id,input:{chartId:saved.id,question:'Giải thích cung Mệnh với chứng cứ',mode:'basic',topic:'overview',consent:true}};
}
function provider(action=async()=>{},response={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer)}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:80}}){
 providerCalls=0;globalThis.fetch=async()=>{providerCalls++;await action();return new Response(JSON.stringify(response),{headers:{'content-type':'application/json'}});};
}
async function receipt(user){return (await pg.query('SELECT status,error_code,billed_microusd,reserved_microusd FROM ai_usage WHERE user_id=$1',[user.id])).rows;}
async function noMessage(user){assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE user_id=$1',[user.id])).rows[0].n,0);const rows=await receipt(user);assert.equal(rows.length,1);assert.equal(rows[0].status,'failed');assert.equal(Number(rows[0].reserved_microusd),0);}
test('valid session completes one receipt and history belongs only to its account',async()=>{
 const owner=await fixture(),other=await fixture();provider();const r=await service.generate(owner.req,owner.input);assert.equal(providerCalls,1);assert.equal((await receipt(owner))[0].status,'completed');assert.equal((await service.history(owner.req,r.conversationId)).messages.length,1);await assert.rejects(service.history(other.req,r.conversationId),denied(404));
});
test('another account cannot send the owner chart to the provider',async()=>{
 const owner=await fixture(),other=await fixture();provider();await assert.rejects(service.generate(other.req,owner.input),denied(404));assert.equal(providerCalls,0);assert.deepEqual(await receipt(other),[]);
});
test('logout during provider wait prevents persisting or returning a private answer',async()=>{
 const owner=await fixture();provider(()=>pg.query('DELETE FROM sessions WHERE token_hash=$1',[digest(owner.token)]));await assert.rejects(service.generate(owner.req,owner.input),denied(401));await noMessage(owner);
});
test('expired session during provider wait prevents AI completion',async()=>{
 const owner=await fixture();provider(()=>pg.query("UPDATE sessions SET expires_at=NOW()-INTERVAL '1 minute' WHERE token_hash=$1",[digest(owner.token)]));await assert.rejects(service.generate(owner.req,owner.input),denied(401));await noMessage(owner);
});
test('account blocked during provider wait prevents AI completion',async()=>{
 const owner=await fixture();provider(()=>pg.query("INSERT INTO account_blocks(user_id,reason) VALUES($1,'Isolated test')",[owner.id]));await assert.rejects(service.generate(owner.req,owner.input),denied(401));await noMessage(owner);
});
test('deleted chart during provider wait cannot create a detached stale answer',async()=>{
 const owner=await fixture();provider(()=>pg.query('DELETE FROM charts WHERE id=$1',[owner.chartId]));await assert.rejects(service.generate(owner.req,owner.input),denied(404));await noMessage(owner);
});
test('deleted conversation during provider wait returns a missing-resource error and closes reservation',async()=>{
 const owner=await fixture();provider(()=>pg.query('DELETE FROM ai_conversations WHERE user_id=$1',[owner.id]));await assert.rejects(service.generate(owner.req,owner.input),denied(404));await noMessage(owner);
});
test('provider failure never writes a message and conservatively closes its usage receipt',async()=>{
 const owner=await fixture();providerCalls=0;globalThis.fetch=async()=>{providerCalls++;return new Response('{}',{status:429});};await assert.rejects(service.generate(owner.req,owner.input),denied(503));await noMessage(owner);assert.equal(providerCalls,1);
});

test('long conversations return newest 80 and page older messages without gaps at identical microsecond timestamps',async()=>{
 const owner=await fixture(),conversationId=randomUUID();
 provider();const otherConversation=await service.generate(owner.req,owner.input);
 await pg.query("INSERT INTO ai_conversations(id,user_id,chart_id,mode,topic) VALUES($1,$2,$3,'basic','overview')",[conversationId,owner.id,owner.chartId]);
 for(let n=1;n<=165;n++){
  const usageId=randomUUID(),messageId='00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
  await pg.query("INSERT INTO ai_usage(id,user_id,conversation_id,model,status,reserved_microusd) VALUES($1,$2,$3,'controlled','completed',0)",[usageId,owner.id,conversationId]);
  await pg.query("INSERT INTO ai_messages(id,conversation_id,user_id,usage_id,question,response,engine_revision,facts_sha256,created_at) VALUES($1,$2,$3,$4,$5,$6,'fixture',$7,'2026-10-01T12:00:00.123456Z')",[messageId,conversationId,owner.id,usageId,'Question '+n,JSON.stringify(answer),'a'.repeat(64)]);
 }
 const first=await service.history(owner.req,conversationId);assert.equal(first.messages.length,80);assert.equal(first.messages[0].question,'Question 86');assert.equal(first.messages.at(-1).question,'Question 165');assert.equal(first.nextBefore,first.messages[0].id);
 const second=await service.history(owner.req,conversationId,first.nextBefore);assert.equal(second.messages[0].question,'Question 6');assert.equal(second.messages.at(-1).question,'Question 85');
 const third=await service.history(owner.req,conversationId,second.nextBefore);assert.equal(third.messages.length,5);assert.equal(third.messages[0].question,'Question 1');assert.equal(third.nextBefore,null);
 const all=[...third.messages,...second.messages,...first.messages];assert.equal(new Set(all.map(m=>m.id)).size,165);
 const other=await fixture();await assert.rejects(service.history(other.req,conversationId,first.nextBefore),denied(404));await assert.rejects(service.history(owner.req,conversationId,'invalid'),denied(400));
 // A cursor from a different owned conversation cannot be used as an unscoped timestamp oracle.
 await assert.rejects(service.history(owner.req,conversationId,otherConversation.answerId),denied(404));
});

test('session revoked after selecting input is rejected before reserving budget or contacting provider',async()=>{
 const owner=await fixture();provider();
 const selected={get:async(...args)=>{const value=await charts.get(...args);await pg.query('DELETE FROM sessions WHERE token_hash=$1',[digest(owner.token)]);return value;}};
 const guarded=new HuyenGiaiService(db,auth,selected,{});await assert.rejects(guarded.generate(owner.req,owner.input),denied(401));assert.equal(providerCalls,0);assert.deepEqual(await receipt(owner),[]);
});
test('chart removed after selection is rejected before reserving budget or contacting provider',async()=>{
 const owner=await fixture();provider();
 const selected={get:async(...args)=>{const value=await charts.get(...args);await pg.query('DELETE FROM charts WHERE id=$1',[owner.chartId]);return value;}};
 const guarded=new HuyenGiaiService(db,auth,selected,{});await assert.rejects(guarded.generate(owner.req,owner.input),denied(404));assert.equal(providerCalls,0);assert.deepEqual(await receipt(owner),[]);
});
