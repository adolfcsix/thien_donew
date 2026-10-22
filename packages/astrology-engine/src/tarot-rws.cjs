'use strict';
/** Thiên Đồ Tarot: RWS 1909 taxonomy, original editorial prompts, non-predictive reading. */
const catalog=require('../../knowledge/src/tarot-rws-78.json');
const CARDS=Object.freeze(catalog.cards.map(card=>Object.freeze({...card})));
const INDEX=new Map(CARDS.map(card=>[card.id,card]));
const METHODS=Object.freeze({version:1,deck:'rider-waite-smith-1909',supportedSpreads:['one','three'],positionLabels:{one:['Điều cần nhìn rõ'],three:['Bối cảnh','Góc nhìn bổ sung','Hướng hành động']}});
function plainObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function validateSpreadSnapshot(raw){
 if(!plainObject(raw))throw Error('Hồ sơ Tarot không phải đối tượng hợp lệ.');
 if(raw.version===2)return require('./tarot-spreads.cjs').validateAdvancedSnapshot(raw);
 if(raw.version!==1||raw.deck!==METHODS.deck)throw Error('Bộ bài hoặc phiên bản trải bài không được hỗ trợ.');
 if(!METHODS.supportedSpreads.includes(raw.spread))throw Error('Kiểu trải bài không hợp lệ.');
 if(typeof raw.includeReversed!=='boolean')throw Error('Tùy chọn lá ngược không hợp lệ.');
 if(typeof raw.question!=='string'||raw.question.length>480||raw.question.trim().length>240)throw Error('Câu hỏi dài tối đa 240 ký tự.');
 if(!Array.isArray(raw.draw)||raw.draw.length!==(raw.spread==='one'?1:3))throw Error('Sai số lá trong trải bài.');
 const seen=new Set();
 const draw=raw.draw.map(item=>{
  if(!plainObject(item)||typeof item.id!=='string'||!INDEX.has(item.id)||typeof item.reversed!=='boolean'||(!raw.includeReversed&&item.reversed)||seen.has(item.id))throw Error('Lá Tarot trùng, không tồn tại hoặc hướng lá không hợp lệ.');
  seen.add(item.id);return {id:item.id,reversed:item.reversed};
 });
 return {version:1,deck:METHODS.deck,spread:raw.spread,includeReversed:raw.includeReversed,question:raw.question.trim(),draw};
}
function reading(snapshot){
 const s=validateSpreadSnapshot(snapshot);
 return {...s,positions:s.draw.map((item,index)=>{
  const card=INDEX.get(item.id);
  return {index,label:s.version===2?s.layout.positions[index].label:METHODS.positionLabels[s.spread][index],card,orientation:item.reversed?'reversed':'upright',meaning:item.reversed?card.reversed:card.upright,reflection:card.reflection};
 })};
}
// Secure browser + recent Node runtimes; rejection sampling avoids modulo bias.
// Passing an injected generator makes boundary cases and draws independently testable.
function secureIndex(max,randomBytes){
 if(!Number.isSafeInteger(max)||max<1||max>78)throw RangeError('Độ dài bộ bài không hợp lệ.');
 const source=randomBytes||((bytes)=>{
  if(!globalThis.crypto?.getRandomValues)throw Error('Trình duyệt không hỗ trợ nguồn ngẫu nhiên bảo mật.');
  return globalThis.crypto.getRandomValues(new Uint8Array(bytes));
 });
 const limit=256-(256%max);
 for(let n=0;n<1024;n++){
  const out=source(1);
  if(!(out instanceof Uint8Array)||out.length!==1)throw Error('Nguồn ngẫu nhiên không hợp lệ.');
  if(out[0]<limit)return out[0]%max;
 }
 throw Error('Không lấy được số ngẫu nhiên hợp lệ.');
}
function newSpread({spread='one',includeReversed=false,question=''}={},randomBytes){
 const count=spread==='one'?1:spread==='three'?3:0;
 if(!count||typeof includeReversed!=='boolean'||typeof question!=='string')throw Error('Tham số trải bài không hợp lệ.');
 const ids=CARDS.map(c=>c.id),draw=[];
 for(let i=0;i<count;i++){
  const ix=i+secureIndex(ids.length-i,randomBytes);
  [ids[i],ids[ix]]=[ids[ix],ids[i]];
  draw.push({id:ids[i],reversed:includeReversed&&secureIndex(2,randomBytes)===1});
 }
 return validateSpreadSnapshot({version:1,deck:METHODS.deck,spread,includeReversed,question,draw});
}
/** Small, independently portable export, distinct from the account-wide study backup. */
const TAROT_ARCHIVE=Object.freeze({format:'thien-do.tarot-rws-reading',version:1,maxBytes:16384});
function createReadingExport(snapshot,exportedAt=new Date().toISOString()){
 if(typeof exportedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(exportedAt)||!Number.isFinite(Date.parse(exportedAt)))
  throw Error('Thời điểm xuất trải bài không hợp lệ.');
 return {format:TAROT_ARCHIVE.format,version:TAROT_ARCHIVE.version,exportedAt,snapshot:validateSpreadSnapshot(snapshot)};
}
function parseReadingExport(raw){
 if(typeof raw!=='string'||raw.length>TAROT_ARCHIVE.maxBytes||new TextEncoder().encode(raw).byteLength>TAROT_ARCHIVE.maxBytes)throw Error('Tệp trải bài phải là JSON và không quá 16 KB.');
 let archive;
 try{archive=JSON.parse(raw);}catch{throw Error('Tệp trải bài không phải JSON hợp lệ.');}
 if(!plainObject(archive)||archive.format!==TAROT_ARCHIVE.format||archive.version!==TAROT_ARCHIVE.version)
  throw Error('Định dạng hoặc phiên bản tệp Tarot không được hỗ trợ.');
 return validateSpreadSnapshot(archive.snapshot);
}
module.exports={CARDS,METHODS,TAROT_ARCHIVE,secureIndex,newSpread,validateSpreadSnapshot,reading,createReadingExport,parseReadingExport};
