'use strict';
/** Versioned advanced snapshots. Legacy generation and entropy stay with RWS core. */
const E=require('./tarot-rws.cjs'),registry=require('../../knowledge/src/tarot-spread-methods-v11125.json');
const clone=x=>JSON.parse(JSON.stringify(x));
const METHODS=new Map(registry.layouts.map(l=>[l.id,l]));
const SPREADS={one:'one-reflective-v2',three:'three-reflective-v2','celtic-cross':'celtic-waite-reflective-v1',custom:'custom-v1'};
const validObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(s,max,label)=>{if(typeof s!=='string'||s.length>max*2||!s.trim()||s.trim().length>max)throw Error(`${label} phải có 1–${max} ký tự.`);return s.trim();};
function getSpreadRegistry(){return clone(registry);}
function makeCustomLayout(positions,name='Bố cục tự chọn'){return validateLayout({id:'custom-v1',version:1,name,positions},'custom');}
function validateLayout(raw,spread){
 if(!validObject(raw)||raw.id!==SPREADS[spread]||raw.version!==1||!Array.isArray(raw.positions))throw Error('Bố cục hoặc phiên bản bố cục không được hỗ trợ.');
 if(spread!=='custom'){
  const canonical=METHODS.get(raw.id);
  if(raw.name!==canonical.name||raw.positions.length!==canonical.positions.length||raw.positions.some((p,i)=>!validObject(p)||Object.keys(canonical.positions[i]).some(k=>p[k]!==canonical.positions[i][k])))throw Error('Vị trí của bố cục chuẩn bị thay đổi; cần đúng phương pháp đã lưu.');
  return clone(canonical);
 }
 if(raw.positions.length<1||raw.positions.length>16)throw Error('Bố cục tự chọn cần 1–16 vị trí.');
 const ids=new Set(),labels=new Set(),cells=new Set();
 const positions=raw.positions.map(p=>{
  if(!validObject(p)||typeof p.id!=='string'||!/^p(?:[1-9]|1[0-6])$/.test(p.id)||ids.has(p.id)||!Object.hasOwn(registry.roles,p.role)||!Number.isInteger(p.x)||p.x<0||p.x>4||!Number.isInteger(p.y)||p.y<0||p.y>7||p.rotation!==0)throw Error('Mã, vai trò hoặc tọa độ vị trí tự chọn không hợp lệ.');
  const label=text(p.label,60,'Nhãn vị trí'),prompt=text(p.prompt,160,'Câu hỏi vị trí'),key=`${p.x}:${p.y}`;
  if(labels.has(label.toLocaleLowerCase('vi'))||cells.has(key))throw Error('Nhãn hoặc ô bố cục tự chọn bị trùng.');
  ids.add(p.id);labels.add(label.toLocaleLowerCase('vi'));cells.add(key);
  return {id:p.id,label,role:p.role,prompt,x:p.x,y:p.y,rotation:0};
 });
 return {id:'custom-v1',version:1,name:text(raw.name,60,'Tên bố cục'),positions};
}
function validateAdvancedSnapshot(raw){
 if(!validObject(raw)||raw.version!==2||raw.deck!==E.METHODS.deck)throw Error('Phiên bản trải nâng cao hoặc bộ bài không được hỗ trợ.');
 if(new TextEncoder().encode(JSON.stringify(raw)).byteLength>12288)throw Error('Hồ sơ Tarot nâng cao vượt giới hạn 12 KB.');
 if(!Object.hasOwn(SPREADS,raw.spread)||typeof raw.includeReversed!=='boolean'||!registry.contexts.includes(raw.context))throw Error('Kiểu trải, bối cảnh hoặc tùy chọn chiều không hợp lệ.');
 if(!validObject(raw.method)||Object.keys(registry.method).some(k=>raw.method[k]!==registry.method[k]))throw Error('Phiên bản phương pháp hoặc tri thức chưa được hỗ trợ; không tự nâng cấp hồ sơ.');
 if(typeof raw.question!=='string'||raw.question.length>480||raw.question.trim().length>240)throw Error('Câu hỏi dài tối đa 240 ký tự.');
 const layout=validateLayout(raw.layout,raw.spread);
 if(!Array.isArray(raw.draw)||raw.draw.length!==layout.positions.length)throw Error('Số lá không khớp số vị trí trong bố cục.');
 const seen=new Set(),ids=new Set(E.CARDS.map(c=>c.id));
 const draw=raw.draw.map(item=>{if(!validObject(item)||!ids.has(item.id)||typeof item.reversed!=='boolean'||(!raw.includeReversed&&item.reversed)||seen.has(item.id))throw Error('Lá bài trùng, chưa biết hoặc chiều lá không hợp lệ.');seen.add(item.id);return {id:item.id,reversed:item.reversed};});
 return {version:2,deck:E.METHODS.deck,spread:raw.spread,includeReversed:raw.includeReversed,question:raw.question.trim(),draw,method:clone(registry.method),context:raw.context,layout};
}
function newAdvancedSpread({spread='three',includeReversed=false,question='',context='general',layout}={},randomBytes){
 if(!Object.hasOwn(SPREADS,spread))throw Error('Kiểu trải nâng cao không hợp lệ.');
 const selected=spread==='custom'?validateLayout(layout,spread):clone(METHODS.get(SPREADS[spread]));
 // Validate before requesting entropy; invalid parameters never consume a draw.
 const draft={version:2,deck:E.METHODS.deck,spread,includeReversed,question,context,method:registry.method,layout:selected,draw:E.CARDS.slice(0,selected.positions.length).map(c=>({id:c.id,reversed:false}))};
 validateAdvancedSnapshot(draft);
 const ids=E.CARDS.map(c=>c.id),draw=[];
 for(let i=0;i<selected.positions.length;i++){const ix=i+E.secureIndex(78-i,randomBytes);[ids[i],ids[ix]]=[ids[ix],ids[i]];draw.push({id:ids[i],reversed:includeReversed&&E.secureIndex(2,randomBytes)===1});}
 return validateAdvancedSnapshot({...draft,draw});
}
function describeTarotMethod(snapshot){const s=E.validateSpreadSnapshot(snapshot);return s.version===2?{...s.method,layoutId:s.layout.id,layoutVersion:s.layout.version,name:s.layout.name,context:s.context,legacy:false}: {id:registry.legacy.method,version:1,knowledgeEdition:registry.legacy.baseKnowledgeEdition,name:s.spread==='one'?'Một lá · cũ':'Ba lá · cũ',context:null,legacy:true,notice:registry.legacy.notice};}
module.exports={getSpreadRegistry,makeCustomLayout,validateAdvancedSnapshot,newAdvancedSpread,describeTarotMethod};
