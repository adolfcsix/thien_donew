import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {PayOS} from '@payos/node';
@Injectable()
export class PaymentGateway {
 private cached:{keys:string[];client:PayOS}|null=null;
 configured(){return !!(process.env.PAYOS_CLIENT_ID&&process.env.PAYOS_API_KEY&&process.env.PAYOS_CHECKSUM_KEY);}
 private client(){if(!this.configured())throw new ServiceUnavailableException('Thanh toán chưa được cấu hình');const keys=[process.env.PAYOS_CLIENT_ID!,process.env.PAYOS_API_KEY!,process.env.PAYOS_CHECKSUM_KEY!];if(!this.cached||keys.some((key,i)=>key!==this.cached!.keys[i]))this.cached={keys,client:new PayOS({clientId:keys[0],apiKey:keys[1],checksumKey:keys[2],timeout:10000,maxRetries:0})};return this.cached.client;}
 create(data:{orderCode:number;amount:number;description:string;returnUrl:string;cancelUrl:string;expiredAt:number}){return this.client().paymentRequests.create(data);}
 verify(body:unknown){return this.client().webhooks.verify(body as Parameters<PayOS['webhooks']['verify']>[0]);}
 cancel(code:number){return this.client().paymentRequests.cancel(code,'Khách hủy đơn chưa thanh toán');}
 get(code:number){return this.client().paymentRequests.get(code);}
}
