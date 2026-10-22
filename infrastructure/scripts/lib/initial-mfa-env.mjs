import {parseEnv} from 'node:util';

export function isValidMfaKey(key){
 return typeof key==='string'&&/^[A-Za-z0-9+/]{43}=$/.test(key)&&Buffer.from(key,'base64').length===32;
}
/** Only a missing key or one empty placeholder may be initialized. Never rotate. */
export function initialMfaEnv(text,key){
 if(!isValidMfaKey(key))throw Error('Khoa MFA moi khong hop le.');
 const lines=[...text.matchAll(/^[\t ]*(?:export[\t ]+)?ADMIN_MFA_ENCRYPTION_KEY[\t ]*=[^\r\n]*/gm)];
 if(lines.length>1)throw Error('.env co nhieu dong khoa MFA. Hay kiem tra cau hinh, khong ghi de.');
 if(lines.length){
  const line=lines[0];
  const value=parseEnv(line[0]).ADMIN_MFA_ENCRYPTION_KEY;
  if(value!==''||parseEnv(text).ADMIN_MFA_ENCRYPTION_KEY!=='')throw Error('.env da co khoa MFA. Khong ghi de khoa cu.');
  // Preserve the rest of the file byte-for-byte, including Windows line endings.
  return text.slice(0,line.index)+'ADMIN_MFA_ENCRYPTION_KEY='+key+text.slice(line.index+line[0].length);
 }
 if(Object.hasOwn(parseEnv(text),'ADMIN_MFA_ENCRYPTION_KEY'))throw Error('Khong nhan dien duoc dong khoa MFA; khong ghi de.');
 const newline=text.includes('\r\n')?'\r\n':'\n';
 return text+(text.endsWith('\n')||!text?'':newline)+'# Tao mot lan cho Owner local; sao luu .env an toan.'+newline+'ADMIN_MFA_ENCRYPTION_KEY='+key+newline;
}
