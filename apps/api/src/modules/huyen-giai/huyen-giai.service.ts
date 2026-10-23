import {BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request} from 'express';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {ChartsService} from '../charts/charts.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {assertChartId} from '../../common/identifiers';
import contract = require('./huyen-giai-contract.cjs');
import {assertAiUsageTransition, sameAiGenerationConfig} from './ai-usage-transition.cjs';

type AiConfig = {
  enabled:boolean;model:string;daily_user_calls:number;daily_global_calls:number;max_output_tokens:number;
  daily_budget_microusd:string|number;input_price_microusd_per_million:string|number;
  output_price_microusd_per_million:string|number;prompt_version:string;updated_at:Date;
};
type Usage = { promptTokenCount?:number;candidatesTokenCount?:number;thoughtsTokenCount?:number;totalTokenCount?:number };
const MODELS=['gemini-3.8-flash','gemini-3.5-flash-lite','gemini-3.1-flash-lite'];
const AI_RESPONSE_SCHEMA={type:'OBJECT',required:['summary','findings','missingData'],properties:{summary:{type:'STRING'},findings:{type:'ARRAY',items:{type:'OBJECT',required:['kind','text','evidenceIds'],properties:{kind:{type:'STRING',enum:['supportive','challenging','uncertain']},text:{type:'STRING'},evidenceIds:{type:'ARRAY',items:{type:'STRING'}}}}},missingData:{type:'ARRAY',items:{type:'STRING'}}}};
const DISCLAIMER='Nội dung tham khảo theo hệ thống huyền học, không phải dự đoán chắc chắn hay lời khuyên chuyên môn.';
function safeConfig(config:AiConfig){return {enabled:config.enabled,providerConfigured:Boolean(process.env.GEMINI_API_KEY),model:config.model,dailyUserCalls:config.daily_user_calls,dailyGlobalCalls:config.daily_global_calls,maxOutputTokens:config.max_output_tokens,dailyBudgetMicroUsd:Number(config.daily_budget_microusd),inputPriceMicroUsdPerMillion:Number(config.input_price_microusd_per_million),outputPriceMicroUsdPerMillion:Number(config.output_price_microusd_per_million),promptVersion:config.prompt_version};}
function normalizeCode(error:unknown):string{
  if(error instanceof Error){if(error.message==='INVALID_GENERATION'||error.message==='INVALID_JSON'||error.message==='INVALID_FORMAT'||error.message==='INVALID_FINDINGS'||error.message==='INVALID_UNCERTAINTY'||error.message==='UNSUPPORTED_CITATION')return 'INVALID_MODEL_OUTPUT';if(error.message==='GEMINI_TIMEOUT')return 'UPSTREAM_TIMEOUT';}
  return 'PROVIDER_UNAVAILABLE';
}
function configNumber(value:unknown,min:number,max:number){if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw new BadRequestException('Giá trị hạn mức không hợp lệ');return Number(value);}
function parseInput(raw:unknown){try{return contract.input(raw);}catch(error){throw new BadRequestException((error as Error).message==='CONSENT_REQUIRED'?'Cần đồng ý trước khi gửi dữ liệu chuyên môn tới Gemini':'Yêu cầu luận giải không hợp lệ');}}
@Injectable()
export class HuyenGiaiService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly charts:ChartsService,private readonly mfa:AdminMfaService){}
 private async config():Promise<AiConfig>{const row=(await this.db.query<AiConfig>('SELECT * FROM ai_runtime_config WHERE id=1')).rows[0];if(!row)throw new ServiceUnavailableException('Thiếu cấu hình Thiên Đồ AI');return row;}
 async status(req:Request){const user=await this.auth.required(req);const conf=await this.config();
  const tier=(await this.db.query<{freeDaily:number;proDaily:number;isPro:boolean}>(`SELECT q.free_daily AS "freeDaily",q.pro_daily AS "proDaily",EXISTS(SELECT 1 FROM pro_entitlements e WHERE e.user_id=$1 AND e.revoked_at IS NULL AND e.starts_at<=clock_timestamp() AND (e.expires_at IS NULL OR e.expires_at>clock_timestamp()) AND e.features ? 'premium-report') AS "isPro" FROM ai_plan_quotas q WHERE id=1`,[user.id])).rows[0];
  if(!tier)throw new ServiceUnavailableException('Thiếu hạn mức AI theo gói');
  const effectiveLimit=Math.min(conf.daily_user_calls,tier.isPro?tier.proDaily:tier.freeDaily);
  const used=(await this.db.query<{calls:string}>("SELECT COUNT(*)::text AS calls FROM ai_usage WHERE user_id=$1 AND created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",[user.id])).rows[0];
  return {ai:{enabled:conf.enabled&&!!process.env.GEMINI_API_KEY,model:conf.model,disclaimer:DISCLAIMER,provider:'Google Gemini'},limits:{dailyUserCalls:effectiveLimit,usedToday:Number(used.calls),remainingToday:Math.max(0,effectiveLimit-Number(used.calls)),resetTimeZone:'UTC',plan:tier.isPro?'pro':'free',maxOutputTokens:conf.max_output_tokens},disclosure:['Phương pháp và phiên bản quy tắc','Tên 12 cung và địa chi','Danh mục sao chính/phụ trong từng cung','Tứ Hóa từ engine Thiên Đồ','Câu hỏi bạn chủ động nhập','Tóm tắt câu trả lời trước (nếu hỏi tiếp)'],excluded:['Email và mật khẩu','Tên hiển thị và avatar','Ngày, giờ, nơi sinh gốc','Hồ sơ cá nhân khác','Cookie hoặc mã phiên đăng nhập']};}
 async disclosure(req:Request,chartId:string){await this.auth.required(req);assertChartId(chartId);const chart=await this.charts.get(req,chartId);const pack=contract.factualPack(chart.result);return {factPack:pack.facts,hash:pack.digest,disclaimer:DISCLAIMER};}
 async conversations(req:Request){const user=await this.auth.required(req);const rows=await this.db.query(`SELECT c.id,c.chart_id AS "chartId",c.mode,c.topic,c.created_at AS "createdAt",c.updated_at AS "updatedAt",(SELECT count(*) FROM ai_messages m WHERE m.conversation_id=c.id)::int AS "turns" FROM ai_conversations c WHERE c.user_id=$1 ORDER BY c.updated_at DESC LIMIT 50`,[user.id]);return {conversations:rows.rows};}
 async history(req:Request,id:string,before:unknown=undefined){
  const user=await this.auth.required(req);assertChartId(id);
  if(before!==undefined)assertChartId(before);
  const c=(await this.db.query('SELECT id,chart_id AS "chartId",mode,topic FROM ai_conversations WHERE id=$1 AND user_id=$2',[id,user.id])).rows[0];
  if(!c)throw new NotFoundException('Không tìm thấy cuộc luận giải');
  if(before!==undefined){
   const cursor=await this.db.query('SELECT id FROM ai_messages WHERE id=$3 AND conversation_id=$1 AND user_id=$2',[id,user.id,before]);
   if(!cursor.rows[0])throw new NotFoundException('Mốc lịch sử không còn khả dụng. Hãy mở lại cuộc luận giải');
  }
  // Keep timestamp precision inside SQL. JS Date would lose PostgreSQL microseconds.
  // The UUID tie-breaker prevents gaps/duplicates when several answers share a timestamp.
  const rows=await this.db.query<{id:string;question:string;response:unknown;factsSha256:string;engineRevision:string;createdAt:Date}>(`
   SELECT id,question,response,facts_sha256 AS "factsSha256",engine_revision AS "engineRevision",created_at AS "createdAt"
   FROM ai_messages WHERE conversation_id=$1 AND user_id=$2
   ${before===undefined?'':`AND (created_at,id)<(SELECT created_at,id FROM ai_messages WHERE id=$3 AND conversation_id=$1 AND user_id=$2)`}
   ORDER BY created_at DESC,id DESC LIMIT 81`,before===undefined?[id,user.id]:[id,user.id,before]);
  const messages=rows.rows.slice(0,80).reverse();
  return {conversation:c,messages,nextBefore:rows.rows.length>80?messages[0].id:null,disclaimer:DISCLAIMER};
 }
 async remove(req:Request,id:string){const user=await this.auth.required(req);assertChartId(id);const result=await this.db.query('DELETE FROM ai_conversations WHERE id=$1 AND user_id=$2',[id,user.id]);if(!result.rowCount)throw new NotFoundException();return {deleted:true};}
 async feedback(req:Request,messageId:string,raw:unknown){
  const user=await this.auth.required(req);assertChartId(messageId);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();
  const v=raw as {helpful?:unknown;note?:unknown};
  if(typeof v.helpful!=='boolean'||(v.note!==undefined&&(typeof v.note!=='string'||v.note.length>300)))throw new BadRequestException('Phản hồi không hợp lệ');
  const row=await this.db.query(`INSERT INTO ai_feedback(message_id,user_id,helpful,note)
    SELECT m.id,m.user_id,$3,$4 FROM ai_messages m WHERE m.id=$1 AND m.user_id=$2
    ON CONFLICT(message_id) DO UPDATE SET helpful=$3,note=$4,created_at=clock_timestamp()
    RETURNING message_id`,[messageId,user.id,v.helpful,String(v.note||'')]);
  if(!row.rows.length)throw new NotFoundException();return {saved:true};
 }
 async admin(req:Request){await this.mfa.requireAdmin(req);const config=await this.config();const total=await this.db.query(`SELECT count(*)::int AS calls,COALESCE(sum(billed_microusd),0)::text AS spend,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END)::int AS errors,ROUND(AVG(NULLIF(duration_ms,0)))::int AS "avgLatencyMs" FROM ai_usage WHERE created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);const feedback=await this.db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE helpful)::int AS helpful FROM ai_feedback WHERE created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);return {config:safeConfig(config),metrics:total.rows[0],feedback:feedback.rows[0]};}
 async configure(req:Request,raw:unknown){const user=await this.mfa.requireAdmin(req,true,true);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();const data=raw as Record<string,unknown>;
 if(typeof data.enabled!=='boolean'||typeof data.model!=='string'||!MODELS.includes(data.model))throw new BadRequestException('Cấu hình Gemini không hợp lệ');
 const template=String(data.promptVersion||'');if(!['huyen-giai-v1','huyen-giai-v1-study'].includes(template))throw new BadRequestException('Mẫu luận giải chưa được thẩm định');
 const limit=configNumber(data.dailyUserCalls,0,200),global=configNumber(data.dailyGlobalCalls,0,100000),output=configNumber(data.maxOutputTokens,256,4096),budget=configNumber(data.dailyBudgetMicroUsd,0,10000000000),inPrice=configNumber(data.inputPriceMicroUsdPerMillion,1,100000000),outPrice=configNumber(data.outputPriceMicroUsdPerMillion,1,100000000);
 if(data.enabled&&!process.env.GEMINI_API_KEY)throw new ConflictException('Chưa cấu hình GEMINI_API_KEY tại backend');
 const updated=await this.db.transaction(async client=>{
   await this.mfa.assertWriteInTransaction(client,req,user.id,true);
   const result=await client.query(`UPDATE ai_runtime_config SET enabled=$1,model=$2,daily_user_calls=$3,daily_global_calls=$4,max_output_tokens=$5,daily_budget_microusd=$6,input_price_microusd_per_million=$7,output_price_microusd_per_million=$8,prompt_version=$9,updated_at=clock_timestamp() WHERE id=1 RETURNING *`,[data.enabled,data.model,limit,global,output,budget,inPrice,outPrice,template]);
   await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[user.id,'huyen-giai.config','ai_runtime_config',JSON.stringify({model:data.model,enabled:data.enabled,limit,global,output,budget,template})]);
   return result.rows[0] as AiConfig;
 });return {updated:true,config:safeConfig(updated)};
 }
 async generate(req:Request,raw:unknown){const user=await this.auth.required(req);const input=parseInput(raw);const apiKey=process.env.GEMINI_API_KEY;
 if(!apiKey)throw new ServiceUnavailableException('Thiên Đồ AI chưa được kết nối với Gemini');
 const selected=await this.charts.get(req,input.chartId);const pack=contract.factualPack(selected.result);
 const conf=await this.config();if(!conf.enabled)throw new ServiceUnavailableException('Thiên Đồ AI đang tạm tắt');
 // Bounded recent context only from this owner's same chart AND same factual snapshot.
 const prior=input.conversationId?(await this.db.query<{question:string;response:{summary?:unknown};facts_sha256:string}>(`SELECT m.question,m.response,m.facts_sha256 FROM ai_messages m JOIN ai_conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2 AND c.chart_id=$3 AND m.facts_sha256=$4 ORDER BY m.created_at DESC,m.id DESC LIMIT 6`,[input.conversationId,user.id,input.chartId,pack.digest])).rows:[];
 const context=prior.reverse().map(row=>({question:row.question.slice(0,400),summary:typeof row.response?.summary==='string'?row.response.summary.slice(0,500):''}));
 const prompt=contract.prompt(pack.facts,{...input,promptVersion:conf.prompt_version},context.length?{turns:context}:null);
 const approxInput=Math.ceil(Buffer.byteLength(JSON.stringify(prompt),'utf8')*1.2)+256; // conservative token reservation, not an authoritative usage count
 const reserved=contract.costMicro(approxInput,conf.max_output_tokens,{input_price_microusd_per_million:Number(conf.input_price_microusd_per_million),output_price_microusd_per_million:Number(conf.output_price_microusd_per_million)});
 const usageId=randomUUID();const start=Date.now();let conversationId:string;
 try{
  conversationId=await this.db.transaction(async client=>{
   // Recheck before reserving budget or sending a snapshot to the provider.
   await this.auth.assertSessionInTransaction(client,req,user.id);
   const ownedChart=await client.query('SELECT id FROM charts WHERE id=$1 AND user_id=$2 FOR SHARE',[input.chartId,user.id]);
   if(!ownedChart.rows[0])throw new NotFoundException('Lá số không còn khả dụng. Hãy tải lại dữ liệu');
   const locked=(await client.query<AiConfig>('SELECT * FROM ai_runtime_config WHERE id=1 FOR UPDATE')).rows[0];
   // A runner may die after reserving. Count this as spent but release the inflight guard.
   await client.query("UPDATE ai_usage SET status='failed',billed_microusd=reserved_microusd,reserved_microusd=0,error_code='STALE_RESERVATION',finished_at=clock_timestamp() WHERE user_id=$1 AND status='reserved' AND created_at<clock_timestamp()-INTERVAL '3 minutes'",[user.id]);
   if(!locked?.enabled)throw new ServiceUnavailableException('AI đang tạm tắt');
   if(!sameAiGenerationConfig(conf,locked))throw new ConflictException('Cấu hình AI vừa thay đổi; vui lòng gửi lại yêu cầu');
   const count=await client.query<{user_calls:string;global_calls:string;spent:string}>(`SELECT (count(*) FILTER(WHERE user_id=$1))::text AS user_calls,count(*)::text AS global_calls,COALESCE(sum(CASE WHEN status='reserved' THEN reserved_microusd ELSE billed_microusd END),0)::text AS spent FROM ai_usage WHERE created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,[user.id]);
   const tier=(await client.query<{free_daily:number;pro_daily:number;is_pro:boolean}>(`SELECT free_daily,pro_daily,EXISTS(SELECT 1 FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND (expires_at IS NULL OR expires_at>clock_timestamp()) AND features ? 'premium-report') AS is_pro FROM ai_plan_quotas WHERE id=1`,[user.id])).rows[0];
   if(!tier)throw new ServiceUnavailableException('Chưa cấu hình hạn mức AI theo gói');
   const perUserLimit=Math.min(locked.daily_user_calls,tier.is_pro?tier.pro_daily:tier.free_daily);
   const row=count.rows[0];if(Number(row.user_calls)>=perUserLimit||Number(row.global_calls)>=locked.daily_global_calls)throw new HttpException('Đã hết lượt luận giải trong ngày',HttpStatus.TOO_MANY_REQUESTS);
   if(Number(row.spent)+reserved>Number(locked.daily_budget_microusd))throw new HttpException('Ngân sách AI trong ngày đã đạt giới hạn',HttpStatus.TOO_MANY_REQUESTS);
   const id=input.conversationId||randomUUID();
   if(input.conversationId){const prior=await client.query('SELECT id,mode FROM ai_conversations WHERE id=$1 AND user_id=$2 AND chart_id=$3',[id,user.id,input.chartId]);if(!prior.rows[0])throw new NotFoundException('Cuộc trò chuyện không hợp lệ');if(prior.rows[0].mode!==input.mode)throw new ConflictException('Không thể đổi chế độ giữa cuộc trò chuyện');}
   else {await client.query('INSERT INTO ai_conversations(id,user_id,chart_id,mode,topic) VALUES($1,$2,$3,$4,$5)',[id,user.id,input.chartId,input.mode,input.topic]);}
   await client.query(`INSERT INTO ai_usage(id,user_id,conversation_id,model,status,reserved_microusd) VALUES($1,$2,$3,$4,'reserved',$5)`,[usageId,user.id,id,locked.model,reserved]);
   return id;
  });
 }catch(error){if((error as {code?:string}).code==='23505')throw new ConflictException('Đang có một yêu cầu AI chưa hoàn thành');throw error;}
 try{
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(conf.model)}:generateContent`;
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({...prompt,generationConfig:{temperature:0.2,responseMimeType:'application/json',responseSchema:AI_RESPONSE_SCHEMA,maxOutputTokens:conf.max_output_tokens}}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('GEMINI_UPSTREAM');
  const responseJson:unknown=await response.json();const doc=responseJson as {candidates?:Array<{finishReason?:string;content?:{parts?:Array<{text?:string}>}}>;usageMetadata?:Usage};
  if(!doc.candidates?.[0]||doc.candidates[0].finishReason!=='STOP')throw Error('INVALID_GENERATION');
  const text=doc.candidates[0].content?.parts?.map(x=>x.text||'').join('')||'';
  const output=contract.result(text,pack.validIds);
  const provided=doc.usageMetadata;const promptTokens=provided?.promptTokenCount||0,outputTokens=(provided?.candidatesTokenCount||0)+(provided?.thoughtsTokenCount||0);
  const billed=promptTokens&&outputTokens?Math.max(reserved,contract.costMicro(promptTokens,outputTokens,{input_price_microusd_per_million:Number(conf.input_price_microusd_per_million),output_price_microusd_per_million:Number(conf.output_price_microusd_per_million)})):reserved;
  const answerId=randomUUID();
  await this.db.transaction(async client=>{
   // Provider latency can outlive logout, session expiry, blocking or deletion.
   // Verify the original session and owned context again before acknowledging output.
   await this.auth.assertSessionInTransaction(client,req,user.id);
   const context=await client.query(`SELECT c.id FROM ai_conversations c JOIN charts ch ON ch.id=c.chart_id
     WHERE c.id=$1 AND c.user_id=$2 AND c.chart_id=$3 AND ch.user_id=$2
     FOR SHARE OF c,ch`,[conversationId,user.id,input.chartId]);
   if(!context.rows[0])throw new NotFoundException('Lá số hoặc cuộc luận giải không còn khả dụng. Hãy tải lại dữ liệu');
   const finalized=await client.query(`UPDATE ai_usage SET status='completed',reserved_microusd=0,billed_microusd=$2,prompt_tokens=$3,response_tokens=$4,duration_ms=$5,finished_at=clock_timestamp() WHERE id=$1 AND user_id=$6 AND status='reserved'`,[usageId,billed,promptTokens,outputTokens,Date.now()-start,user.id]);
   assertAiUsageTransition(finalized);
   await client.query(`INSERT INTO ai_messages(id,conversation_id,user_id,usage_id,question,response,engine_revision,facts_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[answerId,conversationId,user.id,usageId,input.question,JSON.stringify(output),String(selected.chart.ruleSet||pack.facts.ruleSet).slice(0,160),pack.digest]);
   await client.query('UPDATE ai_conversations SET updated_at=clock_timestamp() WHERE id=$1 AND user_id=$2',[conversationId,user.id]);
  });
  return {conversationId,answerId,answer:output,disclaimer:DISCLAIMER,factsSha256:pack.digest,usage:{promptTokens,outputTokens,billedMicroUsd:billed},model:conf.model};
 }catch(error){
  const code=error instanceof UnauthorizedException?'SESSION_REVOKED':error instanceof NotFoundException?'CONTEXT_REMOVED':normalizeCode(error);
  try{await this.db.query(`UPDATE ai_usage SET status='failed',reserved_microusd=0,billed_microusd=$2,error_code=$3,duration_ms=$4,finished_at=clock_timestamp() WHERE id=$1 AND user_id=$5 AND status='reserved'`,[usageId,reserved,code,Date.now()-start,user.id]);}catch{ /* preserve upstream failure: next request's unique inflight guard remains fail-closed */ }
  if(error instanceof UnauthorizedException||error instanceof NotFoundException)throw error;
  throw new ServiceUnavailableException('Gemini chưa trả được bản luận giải đã kiểm chứng. Không tự tạo nội dung thay thế; hãy thử lại sau.');
 }
 }
}
