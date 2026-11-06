'use strict';
/** Operation IDs, not authentication tokens. Keep cryptographic entropy on HTTP LAN. */
function createRequestId(source=globalThis.crypto){
 if(typeof source?.randomUUID==='function')return source.randomUUID();
 if(typeof source?.getRandomValues!=='function')throw Error('Trình duyệt chưa hỗ trợ tạo mã yêu cầu an toàn. Hãy dùng trình duyệt mới hoặc HTTPS.');
 const bytes=new Uint8Array(16);source.getRandomValues(bytes);
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
module.exports={createRequestId};
