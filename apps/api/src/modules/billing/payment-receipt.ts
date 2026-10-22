import {ServiceUnavailableException} from '@nestjs/common';

type ExpectedPayment={orderCode:number;amount:number;paymentLinkId?:string|null};
const statuses=['PENDING','CANCELLED','UNDERPAID','PAID','EXPIRED','PROCESSING','FAILED'];
const identifier=(value:unknown):value is string=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=128;
const money=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
function invalid():never {throw new ServiceUnavailableException('Phản hồi thanh toán chưa khớp đơn. Dữ liệu được giữ để đối soát; không thanh toán lại.');}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))invalid();return value as Record<string,unknown>;}
function identity(row:Record<string,unknown>,expected:ExpectedPayment,id:unknown){
 if(!Number.isSafeInteger(row.orderCode)||row.orderCode!==expected.orderCode||!money(row.amount)||row.amount!==expected.amount||!identifier(id)||(expected.paymentLinkId&&id!==expected.paymentLinkId))invalid();
}
/** Provider JSON is not made trustworthy by TypeScript declarations. */
export function paymentLookup(value:unknown,expected:ExpectedPayment){
 const row=object(value);identity(row,expected,row.id);
 if(typeof row.status!=='string'||!statuses.includes(row.status)||!money(row.amountPaid)||!money(row.amountRemaining))invalid();
 if(row.status==='PAID'&&(row.amountPaid!==expected.amount||row.amountRemaining!==0))invalid();
 return {id:row.id as string,orderCode:row.orderCode as number,amount:row.amount as number,amountPaid:row.amountPaid,status:row.status};
}
export function paymentCreation(value:unknown,expected:ExpectedPayment){
 const row=object(value);identity(row,expected,row.paymentLinkId);
 if(row.currency!=='VND'||typeof row.status!=='string'||!statuses.includes(row.status)||typeof row.checkoutUrl!=='string')invalid();
 let url:URL;try{url=new URL(row.checkoutUrl);}catch{invalid();}
 if(url.protocol!=='https:'||url.hostname!=='pay.payos.vn'||url.port||url.username||url.password)invalid();
 return {paymentLinkId:row.paymentLinkId as string,checkoutUrl:row.checkoutUrl};
}
