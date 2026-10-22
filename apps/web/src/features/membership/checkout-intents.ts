/** Retry the same uncertain operation; retire its key only after a confirmed terminal order. */
export type CheckoutIntent={requestKey:string;orderId?:string};
export type CheckoutIntents=Record<string,CheckoutIntent>;
export function requestKey(intents:CheckoutIntents,payload:string,create=()=>crypto.randomUUID()):string{
 return (intents[payload]??={requestKey:create()}).requestKey;
}
export function bindOrder(intents:CheckoutIntents,payload:string,orderId:string){if(intents[payload])intents[payload].orderId=orderId;}
export function settleOrders(intents:CheckoutIntents,orders:{id:string;status:string}[]){
 for(const [payload,intent] of Object.entries(intents)){
  if(orders.some(order=>order.id===intent.orderId&&['cancelled','paid','refunded'].includes(order.status)))delete intents[payload];
 }
}
