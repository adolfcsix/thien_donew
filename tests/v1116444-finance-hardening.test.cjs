'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.join(__dirname,'..');
const policy=require('../apps/api/src/modules/billing/finance-policy.cjs');
class HttpFailure extends Error{}
function loadService(relative){
  const code=fs.readFileSync(path.join(root,relative),'utf8');
  const out=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
  const module={exports:{}};
  const standins={
    '@nestjs/common':{Injectable:()=>target=>target,BadRequestException:HttpFailure,ForbiddenException:HttpFailure,ConflictException:HttpFailure,NotFoundException:HttpFailure,ServiceUnavailableException:HttpFailure,UnauthorizedException:HttpFailure},
    '../../common/database.service':{DatabaseService:class{}},
    '../auth/auth.service':{AuthService:class{}},
    '@thiendo/astrology-engine':{},
    '../charts/charts.service':{ChartsService:class{}},
    './payment-gateway':{PaymentGateway:class{}},
    '../auth/admin-mfa.service':{AdminMfaService:class{}},
    './payment-receipt':{paymentCreation:()=>{},paymentLookup:()=>{}},
    './billing.service':{BillingService:class{}},
    '../../common/identifiers':{assertChartId:value=>value},
    './finance-policy.cjs':policy,
    'node:crypto':require('node:crypto'),
  };
  const fakeRequire=name=>{
    if(Object.hasOwn(standins,name))return standins[name];
    throw new Error('Unexpected dependency in isolated test: '+name);
  };
  new Function('module','exports','require',out)(module,module.exports,fakeRequire);
  return module.exports;
}
const OWNER='11111111-1111-4111-8111-111111111111';
const REQUESTER='22222222-2222-4222-8222-222222222222';
const APPROVER='33333333-3333-4333-8333-333333333333';
test('finance pagination refuses booleans, nulls, repeated arrays and blank strings',()=>{
  assert.deepEqual(policy.filterOrders({limit:'10',offset:'0'}),{status:'',q:'',limit:10,offset:0});
  for(const bad of [null,true,false,[],[2],{},'', ' ', '1.5','0x10','1e2',NaN,Infinity]){
    assert.throws(()=>policy.filterOrders({limit:bad}),String(bad));
    assert.throws(()=>policy.filterOrders({offset:bad}),String(bad));
  }
  assert.equal(policy.filterOrders({limit:1,offset:0}).limit,1);
});
test('finance search treats SQL LIKE metacharacters as literal data; ties sort by ID',async()=>{
  const {FinanceService}=loadService('apps/api/src/modules/billing/finance.service.ts');
  const queries=[];
  const db={query:async(sql,args)=>{queries.push({sql,args});return {rows:[{}]};}};
  const mfa={requireAdmin:async()=>({id:OWNER})};
  const service=new FinanceService(db,mfa,{}, {configured:()=>true});
  await service.finance({}, {q:'abc!%_xyz',status:'paid',offset:'1',limit:'15'});
  assert.equal(queries.length,3);
  const order=queries.find(({sql})=>sql.includes('FROM billing_orders o JOIN users u'));
  assert.ok(order);
  assert.deepEqual(order.args,['paid','%abc!!!%!_xyz%','abc!%_xyz',15,1]);
  assert.match(order.sql,/ILIKE \$2 ESCAPE '!'/);
  assert.match(order.sql,/ORDER BY o\.created_at DESC,o\.id DESC/);
});
test('completed refund cannot reuse another order’s banking reference',async()=>{
  const {FinanceService}=loadService('apps/api/src/modules/billing/finance.service.ts');
  const calls=[];
  const query=async(sql,args)=>{
    calls.push({sql,args});
    if(sql.startsWith('SELECT role FROM admin_memberships'))return {rows:[{role:'owner'}]};
    if(sql.startsWith('SELECT * FROM billing_orders'))return {rows:[{status:'paid'}]};
    if(sql.startsWith('SELECT * FROM billing_refund_requests'))return {rows:[{status:'approved',requester_id:REQUESTER,approver_id:APPROVER}]};
    if(sql.startsWith('SELECT id FROM billing_orders WHERE refund_reference='))return {rows:[{id:'other-order'}]};
    return {rows:[]};
  };
  const db={transaction:async fn=>fn({query})};
  const mfa={requireAdmin:async()=>({id:OWNER}),assertWriteInTransaction:async()=>{}};
  const service=new FinanceService(db,mfa,{},{});
  await assert.rejects(service.completeRefund({},'refund-order',{reference:'BANK-REF-456',confirmedExternally:true}),/Mã tham chiếu hoàn tiền đã được dùng/);
  assert.ok(calls.some(({sql})=>sql.startsWith('SELECT id FROM billing_orders WHERE refund_reference=')));
  assert.equal(calls.filter(({sql})=>sql.startsWith('UPDATE billing_orders')).length,0);
  assert.equal(calls.filter(({sql})=>sql.startsWith('UPDATE billing_refund_requests')).length,0);
});
test('Pro settlement starts from PostgreSQL clock, not API host clock',async()=>{
  const {BillingService}=loadService('apps/api/src/modules/billing/billing.service.ts');
  const dbTime=new Date('2026-10-18T00:00:00.000Z');
  let granted=null;
  const query=async(sql,args)=>{
    if(sql.startsWith('SELECT * FROM billing_orders WHERE order_code='))return {rows:[{id:'order-1',order_code:123,amount_vnd:50000,payment_link_id:'link-1',status:'pending',features:['premium-report'],user_id:OWNER,days:30}]};
    if(sql.startsWith('SELECT order_id FROM billing_events'))return {rows:[]};
    if(sql.includes('GREATEST(clock_timestamp()'))return {rows:[{startAt:dbTime}]};
    if(sql.startsWith('INSERT INTO pro_entitlements'))granted=args;
    return {rows:[]};
  };
  const service=new BillingService({transaction:async fn=>fn({query})},{},{},{},{});
  const original=Date.now;
  try{
    Date.now=()=>Date.parse('2027-01-01T00:00:00.000Z');
    await service.settle({orderCode:123,amount:50000,paymentLinkId:'link-1',reference:'bank-ref-1'});
  }finally{Date.now=original;}
  assert.ok(granted,'entitlement must be granted');
  assert.equal(granted[4].toISOString(),dbTime.toISOString());
  assert.equal(+granted[5]-+granted[4],30*86400000);
});
