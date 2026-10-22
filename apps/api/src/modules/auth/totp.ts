/** RFC 6238 SHA-1 / 30s / 6 digits, interoperable with authenticator apps. */
import { createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buffer:Buffer):string {
 let acc=0,bits=0,result='';
 for(const n of buffer){acc=(acc<<8)|n;bits+=8;while(bits>=5){result+=BASE32[(acc >>> (bits-=5))&31];}}
 if(bits>0) result+=BASE32[(acc << (5-bits))&31];
 return result;
}
export function base32Decode(value:string):Buffer {
 if(!/^[A-Z2-7]{32}$/.test(value)) throw Error('Invalid TOTP secret');
 let acc=0,bits=0;const result:number[]=[];
 for(const char of value){acc=(acc<<5)|BASE32.indexOf(char);bits+=5;if(bits>=8){result.push((acc >>> (bits-=8))&255);}}
 return Buffer.from(result);
}
export function randomTotpSecret():string {return base32Encode(randomBytes(20));}
export function totpCode(secret:string,step:number):string {
 if(!Number.isSafeInteger(step)||step<0)throw Error('Invalid TOTP step');
 const count=Buffer.alloc(8);count.writeBigUInt64BE(BigInt(step));
 const hash=createHmac('sha1',base32Decode(secret)).update(count).digest();
 const offset=hash[hash.length-1]&15;
 return String((hash.readUInt32BE(offset)&0x7fffffff)%1_000_000).padStart(6,'0');
}
export function matchTotpStep(secret:string,code:unknown,when=Date.now()):number|null {
 if(typeof code!=='string'||!/^[0-9]{6}$/.test(code))return null;
 const step=Math.floor(when/30000);
 for(const candidate of [step-1,step,step+1]){
  if(candidate<0)continue;
  const actual=totpCode(secret,candidate);
  if(timingSafeEqual(Buffer.from(actual),Buffer.from(code)))return candidate;
 }
 return null;
}
function encryptionKey():Buffer {
 const raw=process.env.ADMIN_MFA_ENCRYPTION_KEY;
 if(!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw))throw Error('ADMIN_MFA_ENCRYPTION_KEY must be 32 random bytes in base64');
 const key=Buffer.from(raw,'base64');
 if(key.length!==32)throw Error('ADMIN_MFA_ENCRYPTION_KEY invalid length');
 return key;
}
export function mfaEncryptionReady():boolean {try{encryptionKey();return true;}catch{return false;}}
export function encryptTotpSecret(secret:string,userId:string):string {
 base32Decode(secret);
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),nonce);
 cipher.setAAD(Buffer.from('thiendo:admin-mfa:'+userId));
 const value=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return 'v1:'+Buffer.concat([nonce,cipher.getAuthTag(),value]).toString('base64');
}
export function decryptTotpSecret(encoded:string,userId:string):string {
 if(!encoded.startsWith('v1:'))throw Error('Unsupported MFA ciphertext');
 const data=Buffer.from(encoded.slice(3),'base64');
 if(data.length<29)throw Error('Corrupt MFA ciphertext');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),data.subarray(0,12));
 decipher.setAAD(Buffer.from('thiendo:admin-mfa:'+userId));
 decipher.setAuthTag(data.subarray(12,28));
 const secret=Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8');
 base32Decode(secret);return secret;
}
