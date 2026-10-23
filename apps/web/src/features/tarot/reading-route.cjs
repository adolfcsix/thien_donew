'use strict';
/** Balanced display selection; not a new interpretation or draw algorithm. */
function tarotReadingRoute(report,{anchor=-1,limit}={}){
 const positions=report?.positions,pairs=report?.combinations;
 if(!Array.isArray(positions)||!positions.length||positions.length>16||positions.some((p,i)=>p.index!==i)||!Array.isArray(pairs))throw Error('Bài luận Tarot không hợp lệ.');
 const budget=limit??Math.max(6,Math.ceil(positions.length/2));
 if(!Number.isInteger(budget)||budget<1||budget>16||!Number.isInteger(anchor)||anchor< -1||anchor>=positions.length)throw Error('Phạm vi đọc Tarot không hợp lệ.');
 const keys=new Set();for(const p of pairs){if(!Array.isArray(p.indexes)||p.indexes.length!==2||p.indexes.some(i=>!Number.isInteger(i)||i<0||i>=positions.length)||p.indexes[0]===p.indexes[1])throw Error('Liên kết Tarot ngoài phạm vi.');const k=[...p.indexes].sort((a,b)=>a-b).join(':');if(keys.has(k))throw Error('Liên kết Tarot trùng.');keys.add(k);}
 const candidates=pairs.filter(p=>anchor===-1||p.indexes.includes(anchor)),remaining=[...candidates],chosen=[],covered=new Set();
 while(chosen.length<budget&&remaining.length){let best=0,score=-1;remaining.forEach((p,i)=>{const rank=p.indexes.filter(n=>!covered.has(n)).length*100+(p.kind==='curated-pair'?20:p.kind==='same-suit'?5:0);if(rank>score){best=i;score=rank;}});const [p]=remaining.splice(best,1);chosen.push(p);p.indexes.forEach(n=>covered.add(n));}
 return {pairs:chosen.map(p=>({...p,indexes:[...p.indexes],ids:[...p.ids],orientations:[...p.orientations]})),coveredPositions:[...covered].sort((a,b)=>a-b),totalPositions:positions.length,availablePairs:candidates.length,anchor,notice:'Ưu tiên phủ các vị trí khác nhau, rồi cặp có bài đối chiếu biên soạn. Đây là cách chọn phần hiển thị, không chấm độ mạnh hoặc dự báo kết quả.'};
}
module.exports={tarotReadingRoute};
