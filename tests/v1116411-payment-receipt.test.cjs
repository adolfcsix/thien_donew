const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function source(file){const mod={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,require);return mod.exports;}
const {paymentLookup,paymentCreation}=source('apps/api/src/modules/billing/payment-receipt.ts');
const expected={orderCode:123,amount:100000,paymentLinkId:'local-link'},valid={id:'local-link',orderCode:123,amount:100000,amountPaid:100000,amountRemaining:0,status:'PAID'};
test('provider lookup binds exact order code, amount and known link',()=>{
 assert.equal(paymentLookup(valid,expected).id,'local-link');
 for(const patch of [{orderCode:124},{orderCode:'123'},{id:'another-link'},{id:''},{amount:100001},{amount:'100000'},{status:'unknown'}])assert.throws(()=>paymentLookup({...valid,...patch},expected));
});
test('paid lookups require exact received money, no negative/unsafe/missing balance',()=>{
 for(const patch of [{amountPaid:99999},{amountPaid:100001},{amountPaid:NaN},{amountRemaining:1},{amountRemaining:-1},{amountRemaining:undefined}])assert.throws(()=>paymentLookup({...valid,...patch},expected));
 assert.equal(paymentLookup({...valid,status:'UNDERPAID',amountPaid:1,amountRemaining:99999},expected).status,'UNDERPAID');
});
test('unlinked recovery still requires a verified lookup with exact local identity',()=>{
 assert.equal(paymentLookup(valid,{orderCode:123,amount:100000,paymentLinkId:null}).id,'local-link');
 assert.throws(()=>paymentLookup({...valid,orderCode:456},{orderCode:123,amount:100000}));
 for(const body of [null,[],{},false])assert.throws(()=>paymentLookup(body,expected));
});
const create={orderCode:123,amount:100000,currency:'VND',status:'PENDING',paymentLinkId:'local-link',checkoutUrl:'https://pay.payos.vn/web/local-link'};
test('creation refuses missing IDs and wrong merchant checkout origins',()=>{
 assert.equal(paymentCreation(create,expected).paymentLinkId,'local-link');
 for(const patch of [{paymentLinkId:undefined},{paymentLinkId:' '},{paymentLinkId:'x'.repeat(129)},{orderCode:124},{currency:'USD'},{checkoutUrl:'https://pay.payos.vn.evil.invalid/a'},{checkoutUrl:'https://evil@pay.payos.vn/a'},{checkoutUrl:'http://pay.payos.vn/a'},{checkoutUrl:'https://pay.payos.vn:444/a'}])assert.throws(()=>paymentCreation({...create,...patch},expected));
});
const {financeSnapshot,financeMutation}=source('apps/web/src/features/membership/finance-contract.ts');
const finance={summary:{ordersTotal:0,paidOrders:0,refundedOrders:0,openOrders:0,grossVnd:'0',refundedVnd:'0',netVnd:'0'},orders:[],refunds:[],payOSConfigured:false},bank={config:{enabled:false,bankBin:'',accountNumber:'',accountName:'',instructions:''}},quota={quotas:{freeDaily:5,proDaily:20}};
test('only a complete finance snapshot authorizes empty lists and zero totals',()=>{
 assert.equal(financeSnapshot(finance,bank,quota).finance.orders.length,0);
 for(const body of [null,{}, {...finance,summary:null},{...finance,orders:[{}]},{...finance,refunds:[{}]},{...finance,summary:{...finance.summary,netVnd:'NaN'}}])assert.throws(()=>financeSnapshot(body,bank,quota));
 assert.throws(()=>financeSnapshot(finance,{config:{}},quota));assert.throws(()=>financeSnapshot(finance,bank,{quotas:{freeDaily:6,proDaily:5}}));
});
test('finance write receipts confirm the same action, order and refund decision',()=>{
 financeMutation('/bank',{updated:true},{});financeMutation('/orders/a/reconcile',{order:{id:'a',status:'pending'}},{});
 financeMutation('/orders/a/refund-approval',{status:'approved'},{approve:true});
 for(const [url,body,input] of [['/bank',{updated:false},{}],['/orders/a/reconcile',{order:{id:'b',status:'paid'}},{}],['/orders/a/refund-request',{requested:false,status:'requested'},{}],['/orders/a/refund-approval',{status:'rejected'},{approve:true}],['/orders/a/refund-complete',{status:'approved'},{}]])assert.throws(()=>financeMutation(url,body,input));
});
