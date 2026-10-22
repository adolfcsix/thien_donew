import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function auditTarotAssets(root=ROOT){
 const errors=[];let data;
 try{data=JSON.parse(readFileSync(resolve(root,'infrastructure/assets/tarot-manifest.json'),'utf8'));}catch{return {status:'FAIL',images:0,errors:['Missing/invalid asset manifest']};}
 const cards=JSON.parse(readFileSync(resolve(root,'packages/knowledge/src/tarot-rws-78.json'),'utf8')).cards;
 if(!Array.isArray(data.records)||data.records.length!==156)return {status:'FAIL',images:0,errors:['Expected two complete 78-card sets']};
 const ids=new Set(),hashes=new Set();
 for(const item of data.records){
  const card=cards.find(c=>c.id===item.id),modern=item.deck==='gearberry-modern';
  if(!card||!['gearberry-modern','rws-1909'].includes(item.deck)){errors.push('Invalid deck/card');continue;}
  const group=card.arcana==='major'?'major':card.suit,n=modern&&group==='major'&&card.number===8?11:modern&&group==='major'&&card.number===11?8:card.number;
  const prefix=(modern?{major:'m',wands:'w',cups:'c',swords:'s',pentacles:'p'}:{major:'ar',wands:'wa',cups:'cu',swords:'sw',pentacles:'pe'})[group];
  const expected=`apps/web/public/tarot/${item.deck}/${prefix}${String(n).padStart(2,'0')}.${modern?'webp':'jpg'}`;
  if(item.path!==expected){errors.push('Incorrect ID mapping: '+item.id);continue;}
  const key=item.deck+':'+item.id;if(ids.has(key))errors.push('Duplicate card: '+key);ids.add(key);
  if(hashes.has(item.sha256))errors.push('Duplicate image: '+key);hashes.add(item.sha256);
  if(!Number.isInteger(item.width)||!Number.isInteger(item.height)||item.width<700||item.height<1000)errors.push('Resolution too low: '+key);
  const thumb=item.thumbnail,thumbPath=`apps/web/public/tarot/thumbnails/${item.deck}/${prefix}${String(n).padStart(2,'0')}.webp`;
  if(!thumb||thumb.path!==thumbPath||thumb.width<198||thumb.height<300)errors.push('Invalid thumbnail: '+key);
  else if(!existsSync(resolve(root,thumb.path)))errors.push('Missing thumbnail: '+key);
  else {const b=readFileSync(resolve(root,thumb.path));if(b.length!==thumb.bytes||createHash('sha256').update(b).digest('hex')!==thumb.sha256)errors.push('Thumbnail hash/size mismatch: '+key);}
  const path=resolve(root,expected);
  if(!existsSync(path)){errors.push('Missing asset: '+expected);continue;}
  const bytes=readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==item.bytes||hash!==item.sha256)errors.push('Asset hash/size mismatch: '+expected);
  if(modern?bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP':bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)errors.push('Invalid image signature: '+expected);
 }
 for(const deck of ['rws-1909','gearberry-modern'])for(const card of cards)if(!ids.has(deck+':'+card.id))errors.push('Missing mapped card: '+deck+':'+card.id);
 for(const file of ['tarot-artwork-local.json','tarot-modern-local.json']){const state=JSON.parse(readFileSync(resolve(root,'apps/web/src/features/tarot',file),'utf8'));if(state.ready!==true||state.images!==78)errors.push('Local state is not enabled: '+file);}
 return {status:errors.length?'FAIL':'PASS',images:data.records.length,errors,scope:'Hash/signature/mapping audit; real image decode and offline rendering are separately tested. Publication rights require operator acceptance.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=auditTarotAssets();console.log(JSON.stringify(r,null,2));if(r.status!=='PASS')process.exitCode=1;}
