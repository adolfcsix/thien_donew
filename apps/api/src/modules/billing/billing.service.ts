import {Injectable,BadRequestException,ForbiddenException,NotFoundException,ConflictException,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import type {Request} from 'express';
import {randomUUID} from 'node:crypto';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import Engine = require('@thiendo/astrology-engine');
import {ChartsService} from '../charts/charts.service';
import {PaymentGateway} from './payment-gateway';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {paymentCreation,paymentLookup} from './payment-receipt';
import type {PoolClient} from 'pg';
import {assertChartId} from '../../common/identifiers';
type ReconciliationOrder={id:string;userId:string;orderCode:string|number;amountVnd:number;status:string;paymentLinkId:string|null};
const FEATURES=['premium-report','multi-chart-report'];
function object(body:unknown){if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');return body as Record<string,unknown>;}
function text(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new BadRequestException('Nội dung không hợp lệ');return value.trim();}
function integer(value:unknown,min:number,max:number){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new BadRequestException('Giá trị không hợp lệ');return value;}
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
@Injectable()
export class BillingService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly gateway:PaymentGateway,private readonly charts:ChartsService,private readonly mfa:AdminMfaService){}
 async consultationCatalog(){return {checkoutEnabled:this.gateway.configured(),plans:(await this.db.query(`SELECT p.id,p.name,p.price_vnd AS "priceVnd",p.enabled,c.advisor,c.scope,c.response_hours AS "responseHours",c.question_limit AS "questionLimit" FROM billing_plans p JOIN consultation_config c ON c.plan_id=p.id ORDER BY p.id`)).rows};}
 async consultations(req:Request){const user=await this.auth.required(req);return {requests:(await this.db.query(`SELECT o.id,o.plan_name AS "planName",o.amount_vnd AS "amountVnd",o.status,o.checkout_url AS "checkoutUrl",o.expires_at AS "expiresAt",o.paid_at AS "paidAt",c.question,c.advisor,c.scope,c.response_hours AS "responseHours",c.question_limit AS "questionLimit",c.service_status AS "serviceStatus",CASE WHEN o.status='paid' THEN 'https://zalo.me/'||c.zalo_phone ELSE NULL END AS "contactUrl" FROM consultation_requests c JOIN billing_orders o ON o.id=c.order_id WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[user.id])).rows};}
 async plans(){const result=await this.db.query(`SELECT id,name,price_vnd AS "priceVnd",days,features,enabled FROM billing_plans WHERE NOT (features ? 'private-consultation') ORDER BY id`);return {plans:result.rows,checkoutEnabled:this.gateway.configured(),featureCatalog:FEATURES};}
 async access(req:Request){const user=await this.auth.required(req);const result=await this.db.query<{role:string|null;features:string[];expiresAt:Date|null}>(`WITH active AS MATERIALIZED (SELECT features,expires_at FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND expires_at>clock_timestamp()) SELECT (SELECT role FROM admin_memberships WHERE user_id=$1) AS role,COALESCE((SELECT jsonb_agg(DISTINCT f.value) FROM active CROSS JOIN LATERAL jsonb_array_elements_text(active.features) AS f(value)),'[]'::jsonb) AS features,(SELECT MAX(expires_at) FROM active) AS "expiresAt"`,[user.id]);const row=result.rows[0];return {isAdmin:!!row.role,isOwner:row.role==='owner',features:row.features,expiresAt:row.expiresAt};}
 async orders(req:Request){const user=await this.auth.required(req);const result=await this.db.query('SELECT id,plan_name AS "planName",amount_vnd AS "amountVnd",status,checkout_url AS "checkoutUrl",created_at AS "createdAt",paid_at AS "paidAt",expires_at AS "expiresAt" FROM billing_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id]);return {orders:result.rows};}
 async order(req:Request,id:string){assertChartId(id);const user=await this.auth.required(req);const result=await this.db.query('SELECT id,order_code AS "orderCode",plan_name AS "planName",amount_vnd AS "amountVnd",status,checkout_url AS "checkoutUrl",expires_at AS "expiresAt" FROM billing_orders WHERE id=$1 AND user_id=$2',[id,user.id]);if(!result.rows[0])throw new NotFoundException();return {order:result.rows[0]};}
 async createOrder(req:Request,raw:unknown){const user=await this.auth.required(req),body=object(raw),key=assertChartId(body.requestKey),planId=text(body.planId,32);
 if(!this.gateway.configured())throw new ServiceUnavailableException('Chưa bật thanh toán');
 const row=await this.db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['checkout:'+user.id]);
  const old=await client.query('SELECT * FROM billing_orders WHERE user_id=$1 AND request_key=$2',[user.id,key]);if(old.rows[0]){if(old.rows[0].plan_id!==planId)throw new ConflictException('Mã yêu cầu đã dùng cho gói khác');if(old.rows[0].features.includes('private-consultation')){const saved=(await client.query('SELECT chart_id,question FROM consultation_requests WHERE order_id=$1',[old.rows[0].id])).rows[0];if(saved?.chart_id!==body.chartId||saved?.question!==text(body.question,2000))throw new ConflictException('Mã yêu cầu đã dùng cho nội dung khác');}return {order:old.rows[0],fresh:false};}
  const count=await client.query<{n:string}>("SELECT COUNT(*)::text AS n FROM billing_orders WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[user.id]);if(Number(count.rows[0].n)>=10)throw new ConflictException('Đã tạo nhiều đơn, hãy dùng lại đơn đang chờ');
  const plan=await client.query('SELECT * FROM billing_plans WHERE id=$1 FOR SHARE',[planId]);const p=plan.rows[0];if(!p||!p.enabled||p.price_vnd<1)throw new ConflictException('Gói chưa mở bán');
  let consultation:any=null;
  if(p.features.includes('private-consultation')){const config=await client.query('SELECT * FROM consultation_config WHERE plan_id=$1 FOR SHARE',[planId]);consultation=config.rows[0];if(!consultation?.advisor||!/^0[0-9]{9}$/.test(consultation.zalo_phone)||!consultation.scope)throw new ConflictException('Gói tư vấn chưa đủ thông tin');text(body.question,2000);const chartId=assertChartId(body.chartId);const chart=(await client.query('SELECT label,birth_date AS date,hour,minute,calendar,leap,gender,rule_set AS "ruleSet" FROM charts WHERE id=$1 AND user_id=$2 FOR SHARE',[chartId,user.id])).rows[0];if(!chart)throw new NotFoundException('Không tìm thấy lá số của bạn');consultation.chart=chart;}
  const result=await client.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,'creating',$8,clock_timestamp()+INTERVAL '30 minutes') RETURNING *",[randomUUID(),user.id,p.id,p.name,p.price_vnd,p.days,JSON.stringify(p.features),key]);if(consultation)await client.query('INSERT INTO consultation_requests(order_id,chart_id,question,advisor,zalo_phone,scope,response_hours,question_limit,chart_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[result.rows[0].id,body.chartId,text(body.question,2000),consultation.advisor,consultation.zalo_phone,consultation.scope,consultation.response_hours,consultation.question_limit,JSON.stringify(consultation.chart)]);return {order:result.rows[0],fresh:true};
 });
 if(row.fresh){const o=row.order;try{
  const origin=new URL(process.env.WEB_ORIGIN||'http://localhost:3000').origin;
  const link=await this.gateway.create({orderCode:Number(o.order_code),amount:o.amount_vnd,description:'THIENDO '+o.order_code,returnUrl:origin+(o.features.includes('private-consultation')?'/consultation':'/membership')+'?order='+o.id,cancelUrl:origin+(o.features.includes('private-consultation')?'/consultation':'/membership')+'?order='+o.id,expiredAt:Math.floor(+new Date(o.expires_at)/1000)});
  paymentCreation(link,{orderCode:Number(o.order_code),amount:o.amount_vnd});
  await this.db.query("UPDATE billing_orders SET payment_link_id=$1,checkout_url=$2,status=CASE WHEN status='creating' THEN 'pending' ELSE status END WHERE id=$3 AND (payment_link_id IS NULL OR payment_link_id=$1)",[link.paymentLinkId,link.checkoutUrl,o.id]);
 }catch{await this.db.query("UPDATE billing_orders SET status='failed' WHERE id=$1 AND status='creating'",[o.id]);throw new ServiceUnavailableException('Chưa nhận được link thanh toán. Đơn được giữ để đối soát; không thanh toán nhiều lần');}}
 return this.order(req,row.order.id);
 }
 private async settle(data:{orderCode:number;amount:number;paymentLinkId:string;reference:string},options:{authorize?:(client:PoolClient)=>Promise<void>;verifiedLookup?:boolean}={}){
 if(!Number.isSafeInteger(data.orderCode)||!Number.isSafeInteger(data.amount)||typeof data.reference!=='string'||!data.reference||data.reference.length>200||typeof data.paymentLinkId!=='string'||!data.paymentLinkId||data.paymentLinkId.length>128)throw new BadRequestException('Giao dịch không hợp lệ');
 return this.db.transaction(async client=>{
  await options.authorize?.(client);
  const result=await client.query('SELECT * FROM billing_orders WHERE order_code=$1 FOR UPDATE',[data.orderCode]);const o=result.rows[0];if(!o)return {received:true,ignored:true};
  if(!o.payment_link_id){
   if(!options.verifiedLookup)throw new ServiceUnavailableException('Đơn chưa có liên kết đã xác nhận; cần đối soát');
   if(data.amount!==o.amount_vnd)throw new BadRequestException('Giao dịch không khớp đơn');
   await client.query('UPDATE billing_orders SET payment_link_id=$1 WHERE id=$2',[data.paymentLinkId,o.id]);o.payment_link_id=data.paymentLinkId;
  }
  if(data.amount!==o.amount_vnd||(o.payment_link_id&&o.payment_link_id!==data.paymentLinkId))throw new BadRequestException('Giao dịch không khớp đơn');
  const event=await client.query('SELECT order_id FROM billing_events WHERE reference=$1',[data.reference]);if(event.rows[0]){if(event.rows[0].order_id!==o.id)throw new ConflictException('Giao dịch đã gắn đơn khác');return {received:true,replayed:true};}
  await client.query('INSERT INTO billing_events(reference,order_id) VALUES($1,$2)',[data.reference,o.id]);
  if(o.status==='paid'||o.status==='refunded')return {received:true,replayed:true};
  if(!o.features.includes('private-consultation')){
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['pro:'+o.user_id]);
  // All entitlement dates use the PostgreSQL clock (as do access checks),
  // avoiding temporary loss of Pro caused by drift on an API host.
  const latest=await client.query<{startAt:Date}>(`SELECT GREATEST(clock_timestamp(),COALESCE(MAX(expires_at),clock_timestamp())) AS "startAt" FROM pro_entitlements WHERE user_id=$1 AND revoked_at IS NULL`,[o.user_id]);
  const start=latest.rows[0].startAt;
  await client.query('INSERT INTO pro_entitlements(id,user_id,order_id,features,starts_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),o.user_id,o.id,JSON.stringify(o.features),start,new Date(+start+o.days*86400000)]);
  }
  await client.query("UPDATE billing_orders SET status='paid',paid_at=clock_timestamp(),payment_link_id=$1 WHERE id=$2",[data.paymentLinkId,o.id]);
  await client.query("INSERT INTO admin_audit(action,target,details) VALUES('payment.confirmed',$1,$2)",[o.id,JSON.stringify({provider:'payos',amount:o.amount_vnd})]);return {received:true};
 });
 }
 async webhook(raw:unknown){let data;try{data=await this.gateway.verify(raw);}catch{throw new ForbiddenException('Chữ ký không hợp lệ');}if(data.currency!=='VND')throw new BadRequestException('Sai loại tiền');if(data.code!=='00')return {received:true,ignored:true};return this.settle({orderCode:data.orderCode,amount:data.amount,paymentLinkId:data.paymentLinkId,reference:data.reference});}
 private async lookup(id:string){
  assertChartId(id);const row=(await this.db.query<ReconciliationOrder>('SELECT id,user_id AS "userId",order_code AS "orderCode",amount_vnd AS "amountVnd",status,payment_link_id AS "paymentLinkId" FROM billing_orders WHERE id=$1',[id])).rows[0];
  if(!row)throw new NotFoundException();return row;
 }
 private async reconcileSnapshot(o:ReconciliationOrder,authorize:(client:PoolClient)=>Promise<void>){
  const data=paymentLookup(await this.gateway.get(Number(o.orderCode)),{orderCode:Number(o.orderCode),amount:Number(o.amountVnd),paymentLinkId:o.paymentLinkId});
  if(data.status==='PAID')await this.settle({orderCode:data.orderCode,amount:data.amountPaid,paymentLinkId:data.id,reference:'reconcile:'+data.id},{authorize,verifiedLookup:true});
  else await this.db.transaction(authorize);
 }
 async reconcile(req:Request,id:string){
  await this.order(req,id);const o=await this.lookup(id);
  await this.reconcileSnapshot(o,async client=>{if((await this.auth.me(req,client))?.id!==o.userId)throw new UnauthorizedException('Phiên đối soát đã hết hạn');});
  return this.order(req,id);
 }
 /** Explicit administrator path; customer order access remains owner-scoped. */
 async reconcileAdmin(req:Request,id:string){
  const actor=await this.mfa.requireAdmin(req,true,true),o=await this.lookup(id);
  await this.reconcileSnapshot(o,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(20261014,13)');
   await this.mfa.assertWriteInTransaction(client,req,actor.id,true);
   await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,'payment.provider-reconcile',id,JSON.stringify({before:o.status,source:'verified-provider-lookup'})]);
  });
  // Revalidate before disclosing the final receipt as well.
  await this.mfa.requireAdmin(req,true,true);return {order:await this.lookup(id)};
 }
 async cancel(req:Request,id:string){
  const {order:o}=await this.order(req,id);if(o.status==='paid'||o.status==='refunded')throw new ConflictException('Đơn đã trả tiền không thể hủy');
  const stored=await this.lookup(id);const result=paymentLookup(await this.gateway.cancel(Number(o.orderCode)),{orderCode:Number(o.orderCode),amount:Number(o.amountVnd),paymentLinkId:stored.paymentLinkId});
  if(result.status!=='CANCELLED'||result.amountPaid!==0)throw new ConflictException('Cổng thanh toán chưa xác nhận hủy đơn chưa nhận tiền');
  await this.db.query("UPDATE billing_orders SET status='cancelled' WHERE id=$1 AND status IN ('creating','pending','failed')",[id]);return this.order(req,id);
 }
 async report(req:Request,raw:unknown){const body=object(raw),ids=body.chartIds;if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length)throw new BadRequestException('Chọn 1–5 lá số');const access=await this.access(req),feature=ids.length===1?'premium-report':'multi-chart-report';if(access.isAdmin)await this.mfa.requireAdmin(req);else if(!access.features.includes(feature)){const policy=(await this.db.query("SELECT enabled FROM premium_sections WHERE path='/pro/research'")).rows[0];if(policy?.enabled!==false)throw new ForbiddenException('Tính năng này cần quyền Pro');}
 const year=integer(body.year??new Date().getFullYear(),1900,2100),span=integer(body.span??3,1,5);if(year+span-1>2100)throw new BadRequestException('Khoảng năm vượt phạm vi');
 const reports=[];for(const id of ids){assertChartId(id);const data=await this.charts.get(req,id);if(year<data.result.solar.year)throw new BadRequestException('Năm đối chiếu phải từ năm sinh');
 const periods=Array.from({length:span},(_,i)=>{const y=year+i,a=Engine.annualOverview(data.result,y);return `<h3>Vận năm ${y} · Tuổi mụ ${escape(a.ageMu)}</h3><table><thead><tr><th>Cung</th><th>Sao lưu</th><th>Lưu Tứ Hóa</th></tr></thead><tbody>${data.result.houses.map((h:any)=>`<tr><td>${escape(h.palace)} · ${escape(h.branch)}</td><td>${escape((a.luuStars?.items||[]).filter((v:any)=>v.branch===h.branchIndex).map((v:any)=>v.name).join(' · '))}</td><td>${escape((a.luuTuHoa?.items||[]).filter((v:any)=>v.branch===h.branchIndex).map((v:any)=>v.name+' → '+v.star).join(' · '))}</td></tr>`).join('')}</tbody></table>`;}).join('');
 reports.push(`<section><h2>${escape(data.chart.label)}</h2><p>Phương pháp tính trong báo cáo: ${escape(data.result.ruleSet)}.${data.outdated?` Hồ sơ lưu theo ${escape(data.chart.ruleSet)}; bản báo cáo được tính lại theo quy tắc hiện hành, không tái tạo engine cũ.`:''} Bảng đối chiếu cấu trúc; không phải dự đoán chắc chắn.</p><div class="grid">${data.result.houses.map((h:any)=>`<article><h3>${escape(h.palace)} · ${escape(h.branch)}</h3><p>${escape([...(h.stars||[]),...(h.auxiliaryStars||[]),...Object.values(h.cycleStars||{}).flat(),...(h.tuHoa||[]).map((t:any)=>t.name+' → '+t.star)].join(' · '))}</p></article>`).join('')}</div>${periods}</section>`);}
 return {html:`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Thiên Đồ · Báo cáo nghiên cứu</title><style>@page{size:A4;margin:16mm}body{font:14px Georgia,serif;color:#173f36;margin:24px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ccd8cc;padding:8px;font-size:12px}article{border:1px solid #c7d3cb;padding:10px;break-inside:avoid}section{break-before:page}h1,h2{font-weight:500}button{padding:10px}@media print{button{display:none}}</style><h1>THIÊN ĐỒ · THƯ PHÒNG NGHIÊN CỨU</h1><p>${ids.length===1?'Hồ sơ cá nhân':'Đối chiếu '+ids.length+' lá số'} · Xuất từ dữ liệu thuộc tài khoản của bạn. Đối chiếu ${year}–${year+span-1}. Nội dung phản ánh quy tắc hiện dùng; chưa phải thẩm định độc lập mọi trường phái. Dùng chức năng In (Ctrl+P) để lưu PDF.</p>${reports.join('')}</html>`};
 }
}
export {FEATURES,object,text,integer};
