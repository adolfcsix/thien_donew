/** Explicit operator command; registers a webhook only when invoked. */
import {PayOS} from '@payos/node';
const {PAYOS_CLIENT_ID:clientId,PAYOS_API_KEY:apiKey,PAYOS_CHECKSUM_KEY:checksumKey,WEB_ORIGIN}=process.env;
if(!clientId||!apiKey||!checksumKey||!WEB_ORIGIN)throw Error('Set server-side payOS credentials and WEB_ORIGIN');
const origin=new URL(WEB_ORIGIN);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('WEB_ORIGIN must be an HTTPS origin');
const client=new PayOS({clientId,apiKey,checksumKey,timeout:10000,maxRetries:0});
try{await client.webhooks.confirm(origin.origin+'/api/billing/webhook/payos');console.log('payOS webhook confirmed. No payment was created.');}catch{console.error('Cannot confirm webhook. Check public HTTPS access and server-side credentials.');process.exitCode=1;}
