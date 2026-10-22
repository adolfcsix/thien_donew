'use strict';
const E=require('../../astrology-engine/src/tarot-rws.cjs');
const {describeTarotMethod}=require('../../astrology-engine/src/tarot-spreads.cjs');
function sameSemanticLayout(a,b){
 if(a.version!==b.version)return false;
 if(a.version===1)return a.spread===b.spread;
 return a.layout.id===b.layout.id&&a.layout.version===b.layout.version&&JSON.stringify(a.method)===JSON.stringify(b.method)&&JSON.stringify(a.layout.positions)===JSON.stringify(b.layout.positions);
}
function compareTarotSnapshots(raw){
 if(!Array.isArray(raw)||raw.length<2||raw.length>4)throw Error('Chọn 2–4 trải bài để so sánh.');
 const snapshots=raw.map(E.validateSpreadSnapshot),readings=snapshots.map(E.reading),methods=snapshots.map(describeTarotMethod);
 const positionsAligned=snapshots.slice(1).every(s=>sameSemanticLayout(snapshots[0],s));
 const rows=positionsAligned?readings[0].positions.map((p,index)=>({index,label:p.label,cards:readings.map((r,i)=>({readingIndex:i,id:r.positions[index].card.id,name:r.positions[index].card.nameVi,reversed:r.positions[index].orientation==='reversed'}))})):[];
 const presence=new Map();
 for(const [i,s] of snapshots.entries())for(const [position,item] of s.draw.entries()){
  if(!presence.has(item.id))presence.set(item.id,[]);presence.get(item.id).push({readingIndex:i,position,reversed:item.reversed,label:readings[i].positions[position].label});
 }
 const shared=[...presence].filter(([,items])=>items.length>=2).map(([id,occurrences])=>({id,name:E.CARDS.find(c=>c.id===id).nameVi,occurrences,changedOrientation:new Set(occurrences.map(x=>x.reversed)).size>1}));
 return {format:'thien-do.tarot-comparison',version:1,readingCount:snapshots.length,methods,contexts:snapshots.map(s=>s.version===2?s.context:null),positionsAligned,rows,shared,
  summaries:snapshots.map((s,i)=>({index:i,cards:s.draw.length,reversed:s.draw.filter(x=>x.reversed).length,method:methods[i].name})),
  notice:positionsAligned?'So sánh theo vị trí có cùng định nghĩa đã lưu. Cùng lá hoặc đổi chiều chưa xác nhận một diễn tiến ngoài đời.':'Bố cục/phương pháp khác nhau: chỉ đối chiếu sự xuất hiện của lá, không ghép vị trí theo số thứ tự.',
  limit:'Tần suất trong các trải được chọn là số đếm mô tả; không phải xác suất, độ mạnh hoặc dấu hiệu kết quả chắc chắn.'};
}
module.exports={compareTarotSnapshots};
