/** Download licensed Gearberry 78-card WebP deck for offline usage (CC BY 4.0). */
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const root=join(repo,'apps/web/public/tarot/gearberry-modern');
const flag=join(repo,'apps/web/src/features/tarot/tarot-modern-local.json');
const cards=JSON.parse(await readFile(join(repo,'packages/knowledge/src/tarot-rws-78.json'),'utf8')).cards;
const names=cards.map(card=>{
 const group=card.arcana==='major'?'major':card.suit;
 const n=String(card.number).padStart(2,'0');
 const actual=group==='major'&&n==='08'?'11':group==='major'&&n==='11'?'08':n;
 return `${{major:'m',wands:'w',cups:'c',swords:'s',pentacles:'p'}[group]}${actual}.webp`;
});
if(names.length!==78||new Set(names).size!==78)throw Error('Bộ Gearberry phải đủ 78 mã ảnh duy nhất.');
const source='https://cdn.jsdelivr.net/gh/reginanka/tarot-cards@main/cards/';
const alternate='https://raw.githubusercontent.com/reginanka/tarot-cards/main/cards/';
const state=ready=>JSON.stringify({ready,source:'reginanka/tarot-cards',images:78,license:'CC BY 4.0'},null,2)+'\n';
function webpDimensions(bytes){
 if(bytes.length<2048||bytes.length>12_000_000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')return null;
 const declared=bytes.readUInt32LE(4)+8;
 if(declared!==bytes.length)return null;
 let off=12;
 while(off+8<=bytes.length){
  const type=bytes.toString('ascii',off,off+4),len=bytes.readUInt32LE(off+4),p=off+8;
  if(p+len>bytes.length)return null;
  if(type==='VP8X'&&len>=10)return {width:1+bytes.readUIntLE(p+4,3),height:1+bytes.readUIntLE(p+7,3)};
  if(type==='VP8 '&&len>=10&&bytes[p+3]===0x9d&&bytes[p+4]===0x01&&bytes[p+5]===0x2a)return {width:bytes.readUInt16LE(p+6)&0x3fff,height:bytes.readUInt16LE(p+8)&0x3fff};
  if(type==='VP8L'&&len>=5&&bytes[p]===0x2f)return {width:1+(((bytes[p+2]&0x3f)<<8)|bytes[p+1]),height:1+(((bytes[p+4]&0x0f)<<10)|(bytes[p+3]<<2)|(bytes[p+2]>>6))};
  off=p+len+(len%2);
 }
 return null;
}
function valid(bytes){const dims=webpDimensions(bytes);return !!dims&&dims.width>=700&&dims.height>=1000;}
await mkdir(root,{recursive:true});
const tmp=join(root,'.incomplete');await mkdir(tmp,{recursive:true});
// Do not mark an incomplete or unaudited download as ready.
await writeFile(flag,state(false));
let ok=0;const errors=[];
for(const name of names){
 try{
  let data;try{data=await readFile(join(root,name));}catch{}
  if(!data||!valid(data)){
   for(let attempt=0;attempt<4;attempt++){
    try{
     const url=(attempt%2===0?source:alternate)+name;
     const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
     if(!response.ok)throw Error(`HTTP ${response.status}`);
     const mime=(response.headers.get('content-type')||'').toLowerCase();
     if(mime&&!mime.includes('image/')&&!mime.includes('octet-stream'))throw Error(`Không phải ảnh: ${mime}`);
     data=Buffer.from(await response.arrayBuffer());
     if(!valid(data))throw Error('Dữ liệu WebP hỏng, sai tỷ lệ hoặc độ phân giải quá thấp.');
     await writeFile(join(tmp,name),data);await rename(join(tmp,name),join(root,name));break;
    }catch(error){if(attempt===3)throw error;await delay(350*(attempt+1));}
   }
  }
  ok++;
 }catch(error){errors.push(name+': '+(error?.message||String(error)));}
}
if(errors.length){console.error(`Chỉ tải được ${ok}/78 ảnh. Chưa bật offline.\n${errors.join('\n')}`);process.exitCode=1;}
else{
 await writeFile(flag,state(true));await rm(tmp,{recursive:true,force:true});
 console.log('Đủ 78/78 ảnh WebP Gearberry. Đã bật chế độ lưu nội bộ. Giữ ghi công CC BY 4.0 trên website.');
}
