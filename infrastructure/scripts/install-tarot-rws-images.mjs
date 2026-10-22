/** Download original historical Rider–Waite–Smith scans. No tokens or accounts required. */
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=join(repo,'packages/knowledge/src/tarot-rws-78.json');
const root=join(repo,'apps/web/public/tarot/rws-1909');
const state=join(repo,'apps/web/src/features/tarot/tarot-artwork-local.json');
const cardData=JSON.parse(await readFile(manifest,'utf8'));
const prefix={major:'ar',wands:'wa',cups:'cu',swords:'sw',pentacles:'pe'};
const names=cardData.cards.map(c=>`${prefix[c.arcana==='major'?'major':c.suit]}${String(c.number).padStart(2,'0')}.jpg`);
if(names.length!==78||new Set(names).size!==78)throw Error('Danh sách Tarot phải có chính xác 78 mã khác nhau.');
const baseUrl='https://raw.githubusercontent.com/sixseeds/tarot-api/master/cards/';
const pending=join(root,'.download-partial');
await mkdir(pending,{recursive:true});
let downloaded=0,failed=[];
for(const name of names){
 try{
  const target=join(root,name);
  let content;
  try{content=await readFile(target);}catch{}
  if(!content||content.length<1500||content[0]!==255||content[1]!==216){
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await fetch(new URL(name,baseUrl),{signal:AbortSignal.timeout(20000),redirect:'follow'});
     if(!response.ok||!(response.headers.get('content-type')||'').toLowerCase().includes('image/'))throw Error(`HTTP ${response.status}`);
     const raw=new Uint8Array(await response.arrayBuffer());
     if(raw.length<1500||raw.length>3_000_000||raw[0]!==255||raw[1]!==216)throw Error('Ảnh JPEG không hợp lệ.');
     const temp=join(pending,name);await writeFile(temp,raw);await rename(temp,target);content=raw;break;
    }catch(error){if(attempt===2)throw error;await delay(300*(attempt+1));}
   }
  }
  downloaded++;
 }catch(error){failed.push(name+': '+(error?.message||String(error)));}
}
if(failed.length){
 await writeFile(state,JSON.stringify({ready:false,source:'sixseeds/tarot-api',images:78},null,2)+'\n');
 console.error(`Mới có ${downloaded}/78 ảnh. Chưa bật chế độ ảnh offline:`,failed.join('\n'));
 process.exitCode=1;
}else{
 await writeFile(state,JSON.stringify({ready:true,source:'sixseeds/tarot-api',images:78},null,2)+'\n');
 await rm(pending,{recursive:true,force:true});
 console.log('Đã tải và kiểm tra 78/78 ảnh Tarot RWS 1909. Website sử dụng ảnh lưu tại máy.');
}
