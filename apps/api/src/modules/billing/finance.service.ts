import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import type {Request} from 'express';
import {DatabaseService} from '../../common/database.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {BillingService} from './billing.service';
import {PaymentGateway} from './payment-gateway';
import {assertChartId} from '../../common/identifiers';
import policy = require('./finance-policy.cjs');

/** Financial writes require verified owner MFA and database-transaction step-up. */
@Injectable()
export class FinanceService {
 constructor(private readonly db:DatabaseService,private readonly mfa:AdminMfaService,private readonly billing:BillingService,private readonly gateway:PaymentGateway){}
 private async owner(req:Request){return this.mfa.requireAdmin(req,true,true);}
 private async safeWrite<T>(req:Request,action:string,target:string,details:unknown,work:(client:import('pg').PoolClient,actor:string)=>Promise<T>):Promise<T>{
  const actor=await this.owner(req);
  return this.db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(20261015,161)');
   // Match admin membership writers before locking the session and actor row.
   await client.query('SELECT pg_advisory_xact_lock(20261014,13)');
   await this.mfa.assertWriteInTransaction(client,req,actor.id,true);
   const membership=await client.query("SELECT role FROM admin_memberships WHERE user_id=$1 FOR UPDATE",[actor.id]);
   if(membership.rows[0]?.role!=='owner')throw new ForbiddenException();
   const result=await work(client,actor.id);
   await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,action,target,JSON.stringify(details)]);
   return result;
  });
 }
 async bankPublic(){const row=(await this.db.query(`SELECT bank_bin AS "bankBin",account_number AS "accountNumber",account_name AS "accountName",instructions,enabled FROM billing_bank_config WHERE id=1`)).rows[0];return {enabled:row?.enabled===true,bank:row?.enabled?{bankBin:row.bankBin,accountNumber:row.accountNumber,accountName:row.accountName,instructions:row.instructions}:null,note:'Chuyển khoản thủ công KHÔNG tự xác nhận thanh toán hoặc cấp quyền Pro. PayOS là kênh tự động duy nhất.'};}
 async bankAdmin(req:Request){await this.mfa.requireAdmin(req);const row=(await this.db.query(`SELECT enabled,bank_bin AS "bankBin",account_number AS "accountNumber",account_name AS "accountName",instructions,updated_at AS "updatedAt" FROM billing_bank_config WHERE id=1`)).rows[0];return {config:row,payOSConfigured:this.gateway.configured(),credentialsNeverReturned:true};}
 async bankUpdate(req:Request,raw:unknown){let b:ReturnType<typeof policy.bankSettings>;try{b=policy.bankSettings(raw);}catch{throw new BadRequestException('Thông tin ngân hàng không hợp lệ');}return this.safeWrite(req,'payment.bank-config','billing_bank_config',{enabled:b.enabled,bankBin:b.bankBin,accountLast4:b.accountNumber.slice(-4)},async(client,actor)=>{await client.query('UPDATE billing_bank_config SET enabled=$1,bank_bin=$2,account_number=$3,account_name=$4,instructions=$5,updated_at=clock_timestamp(),updated_by=$6 WHERE id=1',[b.enabled,b.bankBin,b.accountNumber,b.accountName,b.instructions,actor]);return {updated:true};});}
 async quotas(req:Request){await this.mfa.requireAdmin(req);const row=(await this.db.query('SELECT free_daily AS "freeDaily",pro_daily AS "proDaily",updated_at AS "updatedAt" FROM ai_plan_quotas WHERE id=1')).rows[0];return {quotas:row,notice:'Hạn mức theo gói còn chịu trần daily_user_calls của cấu hình Huyền Giải.'};}
 async updateQuotas(req:Request,raw:unknown){let b:ReturnType<typeof policy.quotaLimits>;try{b=policy.quotaLimits(raw);}catch{throw new BadRequestException('Giới hạn AI không hợp lệ');}return this.safeWrite(req,'ai.plan-quota','ai_plan_quotas',b,async client=>{await client.query('UPDATE ai_plan_quotas SET free_daily=$1,pro_daily=$2,updated_at=clock_timestamp() WHERE id=1',[b.freeDaily,b.proDaily]);return {updated:true};});}
 async finance(req:Request,raw:Record<string,unknown>){await this.mfa.requireAdmin(req);let filter:ReturnType<typeof policy.filterOrders>;try{filter=policy.filterOrders(raw);}catch{throw new BadRequestException('Bộ lọc đơn hàng không hợp lệ');}
  const literalSearch=filter.q.replace(/[!%_]/g,char=>'!'+char);
  const [summary,orders,refunds]=await Promise.all([
   this.db.query(`SELECT COUNT(*)::int AS "ordersTotal",COUNT(*) FILTER(WHERE status='paid')::int AS "paidOrders",COUNT(*) FILTER(WHERE status='refunded')::int AS "refundedOrders",COUNT(*) FILTER(WHERE status IN ('creating','pending','failed'))::int AS "openOrders",COALESCE(SUM(amount_vnd) FILTER(WHERE status IN ('paid','refunded')),0)::text AS "grossVnd",COALESCE(SUM(amount_vnd) FILTER(WHERE status='refunded'),0)::text AS "refundedVnd",COALESCE(SUM(amount_vnd) FILTER(WHERE status='paid'),0)::text AS "netVnd" FROM billing_orders`),
   this.db.query(`SELECT o.id,o.order_code AS "orderCode",u.email,o.plan_name AS "planName",o.amount_vnd AS "amountVnd",o.status,o.created_at AS "createdAt",o.paid_at AS "paidAt",o.payment_link_id IS NOT NULL AS "linked" FROM billing_orders o JOIN users u ON u.id=o.user_id WHERE ($1='' OR o.status=$1) AND ($2='' OR u.email ILIKE $2 ESCAPE '!' OR o.id::text=$3) ORDER BY o.created_at DESC,o.id DESC LIMIT $4 OFFSET $5`,[filter.status,literalSearch?'%'+literalSearch+'%':'',filter.q,filter.limit,filter.offset]),
   this.db.query(`SELECT r.order_id AS "orderId",r.status,r.reason,r.requested_at AS "requestedAt",u.email,requester.email AS "requestedBy",approver.email AS "approvedBy" FROM billing_refund_requests r JOIN billing_orders o ON o.id=r.order_id JOIN users u ON u.id=o.user_id LEFT JOIN users requester ON requester.id=r.requester_id LEFT JOIN users approver ON approver.id=r.approver_id ORDER BY r.requested_at DESC LIMIT 100`)
  ]);
  return {summary:summary.rows[0],orders:orders.rows,refunds:refunds.rows,filters:filter,payOSConfigured:this.gateway.configured(),note:'Tổng thu là thống kê đơn đã xác nhận, không thay báo cáo ngân hàng hay chứng từ kế toán.'};
 }
 async reconcile(req:Request,id:string){assertChartId(id);await this.owner(req);if(!this.gateway.configured())throw new ServiceUnavailableException('PayOS chưa cấu hình');return this.billing.reconcileAdmin(req,id);}
 async requestRefund(req:Request,id:string,raw:unknown){assertChartId(id);let reason:string;try{reason=policy.refundReason((raw as {reason?:unknown})?.reason);}catch{throw new BadRequestException('Cần lý do từ 10 đến 500 ký tự');}
  return this.safeWrite(req,'payment.refund-request',id,{reason},async(client,actor)=>{
   const order=(await client.query('SELECT status FROM billing_orders WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!order)throw new NotFoundException();if(order.status!=='paid')throw new ConflictException('Chỉ yêu cầu hoàn đơn đã được xác minh thanh toán');
   const inserted=await client.query(`INSERT INTO billing_refund_requests(order_id,reason,requester_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING order_id`,[id,reason,actor]);if(!inserted.rows[0])throw new ConflictException('Đơn đã có hồ sơ hoàn tiền');return {requested:true,status:'requested'};
  });
 }
 async approveRefund(req:Request,id:string,raw:unknown){assertChartId(id);const decision=(raw as {approve?:unknown})?.approve;if(typeof decision!=='boolean')throw new BadRequestException('Cần quyết định duyệt hoặc từ chối');
  return this.safeWrite(req,decision?'payment.refund-approve':'payment.refund-reject',id,{approve:decision},async(client,actor)=>{
   const existing=(await client.query('SELECT * FROM billing_refund_requests WHERE order_id=$1 FOR UPDATE',[id])).rows[0];if(!existing)throw new NotFoundException();if(!policy.canApproveRefund(existing.requester_id,actor,existing.status))throw new ForbiddenException('Người phê duyệt phải là Admin khác với người đề nghị, và hồ sơ đang chờ');
   const status=decision?'approved':'rejected';await client.query('UPDATE billing_refund_requests SET status=$1,approver_id=$2,approved_at=clock_timestamp() WHERE order_id=$3',[status,actor,id]);return {status};
  });
 }
 async completeRefund(req:Request,id:string,raw:unknown){assertChartId(id);const v=raw as {reference?:unknown;confirmedExternally?:unknown}|null;let reference:string;try{reference=policy.refundReference(v?.reference);}catch{throw new BadRequestException('Cần mã tham chiếu hoàn tiền ngân hàng hợp lệ');}if(v?.confirmedExternally!==true)throw new BadRequestException('Phải xác nhận đã thực sự hoàn tiền qua ngân hàng/cổng ngoài hệ thống');
  return this.safeWrite(req,'payment.refund-completed',id,{reference,manualExternalAttestation:true},async(client,actor)=>{
   const order=(await client.query('SELECT * FROM billing_orders WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!order)throw new NotFoundException();if(order.status!=='paid')throw new ConflictException('Đơn không ở trạng thái đã thanh toán');
   const request=(await client.query('SELECT * FROM billing_refund_requests WHERE order_id=$1 FOR UPDATE',[id])).rows[0];if(!policy.canCompleteRefund(request))throw new ConflictException('Cần chủ hệ thống thứ hai duyệt trước khi xác nhận đã hoàn tiền');
   const duplicate=await client.query('SELECT id FROM billing_orders WHERE refund_reference=$1 AND id<>$2 LIMIT 1',[reference,id]);
   if(duplicate.rows[0])throw new ConflictException('Mã tham chiếu hoàn tiền đã được dùng cho đơn khác');
   await client.query(`UPDATE billing_refund_requests SET status='completed',refund_reference=$1,completed_by=$2,completed_at=clock_timestamp() WHERE order_id=$3`,[reference,actor,id]);
   await client.query(`UPDATE billing_orders SET status='refunded',refund_reference=$1,refunded_at=clock_timestamp() WHERE id=$2`,[reference,id]);
   await client.query('UPDATE pro_entitlements SET revoked_at=clock_timestamp() WHERE order_id=$1 AND revoked_at IS NULL',[id]);
   return {status:'completed',note:'Đã ghi nhận xác nhận hoàn tiền ngoài hệ thống; không khẳng định PayOS tự hoàn tiền.'};
  });
 }
}
