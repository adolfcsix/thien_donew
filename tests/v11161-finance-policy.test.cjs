const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const policy=require('../apps/api/src/modules/billing/finance-policy.cjs');
const root=path.resolve(__dirname,'..');
test('Bank details are opt-in and numeric, not secret keys',()=>{
 assert.deepEqual(policy.bankSettings({enabled:true,bankBin:'970422',accountNumber:'001122334455',accountName:'THIEN DO',instructions:''}),{enabled:true,bankBin:'970422',accountNumber:'001122334455',accountName:'THIEN DO',instructions:''});
 for(const value of [{enabled:true},{enabled:true,bankBin:'970422',accountNumber:'123456',accountName:''},{enabled:true,bankBin:'970422<script>',accountNumber:'123456',accountName:'X'},{enabled:true,bankBin:'970422',accountNumber:'123<script>',accountName:'X'}])assert.throws(()=>policy.bankSettings(value));
});
test('Refunds require a meaningful reason and bounded external reference',()=>{
 assert.equal(policy.refundReason('   Hoàn theo chính sách   '),'Hoàn theo chính sách');
 assert.equal(policy.refundReference(' bank/REF.2026-153 '),'bank/REF.2026-153');
 for(const value of ['ngắn',' ',undefined])assert.throws(()=>policy.refundReason(value));
 for(const value of ['<html>x</html>','a','',undefined])assert.throws(()=>policy.refundReference(value));
});
test('Two separate owners must approve each refund request',()=>{
 const a='87c484a2-0c9e-488d-a6b4-6f01814ba814',b='d5f63f62-4205-4e59-889d-d332942a013a';
 assert.equal(policy.canApproveRefund(a,b,'requested'),true);
 assert.equal(policy.canApproveRefund(a,a,'requested'),false);
 assert.equal(policy.canApproveRefund(a,b,'approved'),false);
 assert.equal(policy.canCompleteRefund({status:'approved',requester_id:a,approver_id:b}),true);
 assert.equal(policy.canCompleteRefund({status:'approved',requester_id:a,approver_id:a}),false);
 assert.equal(policy.canCompleteRefund({status:'requested',requester_id:a,approver_id:b}),false);
});
test('Quota is numeric, bounded, and pro cannot be below free',()=>{
 assert.deepEqual(policy.quotaLimits({freeDaily:5,proDaily:20}),{freeDaily:5,proDaily:20});
 for(const value of [{freeDaily:6,proDaily:5},{freeDaily:-1,proDaily:20},{freeDaily:1.5,proDaily:20},{freeDaily:5,proDaily:201},null])assert.throws(()=>policy.quotaLimits(value));
});
test('Filters allow only known statuses and safe page bounds',()=>{
 assert.deepEqual(policy.filterOrders({}),{status:'',q:'',limit:50,offset:0});
 assert.equal(policy.filterOrders({status:'paid',limit:'10',offset:'100'}).limit,10);
 assert.throws(()=>policy.filterOrders({status:"paid' OR TRUE --"}));
 assert.throws(()=>policy.filterOrders({limit:5000}));
 assert.throws(()=>policy.filterOrders({offset:-1}));
});
test('PayOS verified settlement is the only automatic paid-to-Pro transition',()=>{
 const billing=fs.readFileSync(path.join(root,'apps/api/src/modules/billing/billing.service.ts'),'utf8');
 const finance=fs.readFileSync(path.join(root,'apps/api/src/modules/billing/finance.service.ts'),'utf8');
 assert.match(billing,/this\.gateway\.verify\(raw\)/);
 assert.match(billing,/this\.gateway\.get\(Number\(o\.orderCode\)\)/);
 assert.match(billing,/FOR UPDATE/);
 assert.match(billing,/INSERT INTO billing_events/);
 assert.match(billing,/INSERT INTO pro_entitlements/);
 assert.doesNotMatch(finance,/UPDATE billing_orders SET status='paid'/);
 assert.match(finance,/this\.billing\.reconcileAdmin\(req,id\)/);
 assert.doesNotMatch(finance,/this\.billing\.reconcile\(req,id\)/);
 assert.match(billing,/this\.mfa\.assertWriteInTransaction/);
});
test('Legacy one-person refund endpoint cannot revoke benefits',()=>{
 const old=fs.readFileSync(path.join(root,'apps/api/src/modules/billing/admin.service.ts'),'utf8');
 const method=old.slice(old.indexOf(' async recordRefund('),old.indexOf(' async entitlements('));
 assert.match(method,/ConflictException/);
 assert.doesNotMatch(method,/UPDATE billing_orders/);
});
test('V11.161 schema includes disabled new Pro plans and safeguards',()=>{
 const sql=fs.readFileSync(path.join(root,'infrastructure/db/028_billing_reconciliation_policy.sql'),'utf8');
 assert.match(sql,/VALUES \('pro90'/);
 assert.match(sql,/pro365/);
 assert.match(sql,/FALSE/);
 assert.match(sql,/requester_id IS DISTINCT FROM approver_id/);
 assert.match(sql,/refund_reference VARCHAR\(200\) UNIQUE/);
 assert.match(sql,/CHECK\(NOT enabled OR/);
 assert.match(sql,/ai_plan_quotas/);
});
test('AI flow checks active tier inside its quota transaction',()=>{
 const src=fs.readFileSync(path.join(root,'apps/api/src/modules/huyen-giai/huyen-giai.service.ts'),'utf8');
 assert.match(src,/SELECT free_daily,pro_daily,EXISTS\(/);
 assert.match(src,/Math\.min\(locked\.daily_user_calls/);
 assert.match(src,/Number\(row\.user_calls\)>=perUserLimit/);
});
