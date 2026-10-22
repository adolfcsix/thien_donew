declare const policy: {
 refundReason(value:unknown):string;
 refundReference(value:unknown):string;
 bankSettings(value:unknown):{enabled:boolean;bankBin:string;accountNumber:string;accountName:string;instructions:string};
 quotaLimits(value:unknown):{freeDaily:number;proDaily:number};
 filterOrders(value:unknown):{status:string;q:string;limit:number;offset:number};
 canApproveRefund(requesterId:unknown,approverId:unknown,status:unknown):boolean;
 canCompleteRefund(row:unknown):boolean;
};
export = policy;
