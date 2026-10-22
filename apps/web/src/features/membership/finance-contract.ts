export type Row={id:string;orderCode:string|number;email:string;planName:string;amountVnd:number;status:string;createdAt:string;paidAt:string|null;linked:boolean};
type Refund={orderId:string;status:string;reason:string;requestedAt:string;email:string;requestedBy:string|null;approvedBy:string|null};
type Summary={ordersTotal:number;paidOrders:number;refundedOrders:number;openOrders:number;grossVnd:string;refundedVnd:string;netVnd:string};
export type Finance={summary:Summary;orders:Row[];refunds:Refund[];payOSConfigured:boolean};
export type Bank={enabled:boolean;bankBin:string;accountNumber:string;accountName:string;instructions:string};
export type Quota={freeDaily:number;proDaily:number};
const states=['creating','pending','paid','failed','cancelled','refunded'];
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string';
const nullable=(v:unknown)=>v===null||text(v);
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function invalid():never{throw Error('Dữ liệu tài chính máy chủ chưa hợp lệ. Hãy tải lại để kiểm tra trước khi thao tác.');}
export function financeSnapshot(finance:unknown,bank:unknown,quota:unknown){
 if(!record(finance)||!record(finance.summary)||!Array.isArray(finance.orders)||!Array.isArray(finance.refunds)||typeof finance.payOSConfigured!=='boolean')invalid();
 const summary=finance.summary;
 if(!['ordersTotal','paidOrders','refundedOrders','openOrders'].every(key=>number(summary[key]))||!['grossVnd','refundedVnd','netVnd'].every(key=>text(summary[key])&&/^\d+$/.test(summary[key] as string)))invalid();
 if(!finance.orders.every(v=>record(v)&&text(v.id)&&!!v.id&&text(v.email)&&text(v.planName)&&number(v.amountVnd)&&(number(v.orderCode)||text(v.orderCode)&&/^\d+$/.test(v.orderCode))&&states.includes(v.status as string)&&text(v.createdAt)&&nullable(v.paidAt)&&typeof v.linked==='boolean'))invalid();
 if(!finance.refunds.every(v=>record(v)&&text(v.orderId)&&text(v.reason)&&text(v.email)&&text(v.requestedAt)&&['requested','approved','rejected','completed'].includes(v.status as string)&&nullable(v.requestedBy)&&nullable(v.approvedBy)))invalid();
 if(!record(bank)||!record(bank.config))invalid();const bankConfig=bank.config;
 if(typeof bankConfig.enabled!=='boolean'||!['bankBin','accountNumber','accountName','instructions'].every(key=>text(bankConfig[key])))invalid();
 if(!record(quota)||!record(quota.quotas)||!number(quota.quotas.freeDaily)||!number(quota.quotas.proDaily)||quota.quotas.proDaily>200||quota.quotas.proDaily<quota.quotas.freeDaily)invalid();
 return {finance:finance as Finance,bank:bank.config as Bank,quota:quota.quotas as Quota};
}
export function financeMutation(path:string,value:unknown,body:unknown){
 if(!record(value))invalid();
 if(path.endsWith('/reconcile')){const id=path.split('/').at(-2);if(!record(value.order)||value.order.id!==id||!states.includes(value.order.status as string))invalid();}
 else if(path.endsWith('/refund-request')){if(value.requested!==true||value.status!=='requested')invalid();}
 else if(path.endsWith('/refund-approval')){if(!record(body)||typeof body.approve!=='boolean'||value.status!==(body.approve?'approved':'rejected'))invalid();}
 else if(path.endsWith('/refund-complete')){if(value.status!=='completed')invalid();}
 else if(value.updated!==true)invalid();
}
