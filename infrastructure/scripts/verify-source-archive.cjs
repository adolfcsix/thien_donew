'use strict';
const fs=require('node:fs'),{inflateRawSync,crc32}=require('node:zlib'),{createHash}=require('node:crypto');
/** Verify the final directory AND each payload. A prefix of valid entries is never a complete ZIP. */
function verifySourceArchive(buffer,{required=[]}={}){
 if(!Buffer.isBuffer(buffer)||buffer.length<22)throw Error('Incomplete ZIP');
 let end=-1;
 for(let p=buffer.length-22;p>=Math.max(0,buffer.length-65557);p--){
  if(buffer.readUInt32LE(p)===0x06054b50&&p+22+buffer.readUInt16LE(p+20)===buffer.length){end=p;break;}
 }
 if(end<0)throw Error('Missing final ZIP directory');
 const count=buffer.readUInt16LE(end+10),size=buffer.readUInt32LE(end+12),start=buffer.readUInt32LE(end+16);
 if(buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6)||buffer.readUInt16LE(end+8)!==count||!count||count>10000||start+size!==end)throw Error('Unsupported or incomplete ZIP directory');
 const names=new Set();let at=start,total=0;
 for(let i=0;i<count;i++){
  if(at+46>end||buffer.readUInt32LE(at)!==0x02014b50)throw Error('Invalid ZIP entry');
  const flags=buffer.readUInt16LE(at+8),method=buffer.readUInt16LE(at+10),crc=buffer.readUInt32LE(at+16),packed=buffer.readUInt32LE(at+20),bytes=buffer.readUInt32LE(at+24);
  const n=buffer.readUInt16LE(at+28),extra=buffer.readUInt16LE(at+30),comment=buffer.readUInt16LE(at+32),local=buffer.readUInt32LE(at+42);
  if(at+46+n+extra+comment>end||flags&~0x800||![0,8].includes(method)||bytes>128*1024*1024||total+bytes>1024*1024*1024||local+30>start)throw Error('Unsupported ZIP bounds');
  const nameBytes=buffer.subarray(at+46,at+46+n),name=nameBytes.toString('utf8');
  if(!name||name.startsWith('/')||name.includes('\\')||name.includes('\0')||name.split('/').includes('..')||names.has(name))throw Error('Unsafe or duplicate ZIP path');
  if(buffer.readUInt32LE(local)!==0x04034b50||buffer.readUInt16LE(local+6)!==flags||buffer.readUInt16LE(local+8)!==method||buffer.readUInt32LE(local+14)!==crc||buffer.readUInt32LE(local+18)!==packed||buffer.readUInt32LE(local+22)!==bytes||buffer.readUInt16LE(local+26)!==n)throw Error('ZIP local header mismatch');
  if(!buffer.subarray(local+30,local+30+n).equals(nameBytes))throw Error('ZIP name mismatch');
  const from=local+30+n+buffer.readUInt16LE(local+28),to=from+packed;if(to>start)throw Error('Truncated ZIP payload');
  const raw=method===8?inflateRawSync(buffer.subarray(from,to),{maxOutputLength:Math.max(1,bytes)}):buffer.subarray(from,to);
  if(raw.length!==bytes||crc32(raw)!==crc)throw Error('ZIP payload checksum mismatch');
  total+=bytes;names.add(name);at+=46+n+extra+comment;
 }
 if(at!==end)throw Error('ZIP directory size mismatch');
 for(const name of required)if(!names.has(name))throw Error('Missing required source: '+name);
 return {entries:count,bytes:buffer.length,uncompressedBytes:total,sha256:createHash('sha256').update(buffer).digest('hex')};
}
module.exports={verifySourceArchive};
if(require.main===module){const file=process.argv[2];if(!file)throw Error('Pass a source ZIP path');console.log(JSON.stringify(verifySourceArchive(fs.readFileSync(file),{required:['thien-do/package.json','thien-do/package-lock.json','thien-do/.env.example','thien-do/.env.e2e.example']}),null,2));}
