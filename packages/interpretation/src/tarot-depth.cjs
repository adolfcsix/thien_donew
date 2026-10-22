'use strict';
/** Read-only learning layer; never draws cards or changes the archived snapshot. */
const {CARDS,reading,validateSpreadSnapshot}=require('../../astrology-engine/src/tarot-rws.cjs');
const data=require('../../knowledge/src/tarot-depth-78.json');
// The frozen edition is byte-identical to the canonical deck; do not load a second copy.
const archived=data;
const {getSpreadRegistry,describeTarotMethod}=require('../../astrology-engine/src/tarot-spreads.cjs');
const roleGuides=getSpreadRegistry().roles;
const base=new Map(CARDS.map(c=>[c.id,c])),profiles=new Map(data.cards.map(c=>[c.id,c]));
const archivedProfiles=profiles;
const CONTEXTS=['general','work','relationship','resources'];
function copy(x){return JSON.parse(JSON.stringify(x));}
function getTarotCardDepth(id){if(typeof id!=='string'||!base.has(id))throw new RangeError('Mã lá Tarot không hợp lệ.');return copy({...base.get(id),depth:profiles.get(id)});}
function studyTarotSnapshot(raw,{context='general'}={}){
 if(!CONTEXTS.includes(context))throw new RangeError('Bối cảnh Tarot không hợp lệ.');
 const snapshot=validateSpreadSnapshot(raw),r=reading(snapshot);
 if(snapshot.version===2){if(snapshot.method.knowledgeEdition!==archived.edition)throw Error('Bộ tri thức đã lưu chưa có trong bản này.');context=snapshot.context;}
 const chosenProfiles=snapshot.version===2?archivedProfiles:profiles;
 const chosenData=snapshot.version===2?archived:data;
 const positions=r.positions.map(p=>{
  const depth=chosenProfiles.get(p.card.id),orientation=p.orientation;
  const ctx=depth.contexts.find(c=>c.id===context);
  return {index:p.index,label:p.label,id:p.card.id,name:p.card.nameVi,orientation,
   interpretation:depth[orientation].meaning,alternatives:orientation==='reversed'?[...depth.reversed.alternatives]:[],
   question:depth[orientation].question,context:ctx?copy(ctx):null,
   positionReading:snapshot.version===2?`Ở vị trí “${p.label}”: ${roleGuides[snapshot.layout.positions[p.index].role].guidance} Câu hỏi đã lưu: ${snapshot.layout.positions[p.index].prompt}`:p.index===0?`Ở vị trí “${p.label}”, dùng chủ đề của lá để mô tả điều đang xét, chưa biến nó thành kết quả.`:
    p.index===1?`Ở vị trí “${p.label}”, lá bổ sung một góc nhìn khác với lá đầu; không coi vị trí này luôn là trở ngại.`:
    `Ở vị trí “${p.label}”, dùng chủ đề lá để đặt một bước thử có thể đánh giá; chiều ngược không mặc định yêu cầu làm ngược lại.`,
   symbols:copy(depth.symbols),element:copy(depth.element),number:copy(depth.number),avoid:depth.avoid};
 });
 const combinations=[];
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
  const a=positions[i],b=positions[j],pa=chosenProfiles.get(a.id),pb=chosenProfiles.get(b.id);
  const explicit=pa.companions.find(c=>c.id===b.id)??pb.companions.find(c=>c.id===a.id);
  const sameSuit=base.get(a.id).suit&&base.get(a.id).suit===base.get(b.id).suit;
  const kind=explicit?'curated-pair':sameSuit?'same-suit':'cross-theme';
  combinations.push({indexes:[i,j],ids:[a.id,b.id],orientations:[a.orientation,b.orientation],kind,
   title:`${a.name} ↔ ${b.name}`,
   discussion:explicit?.discussion??(sameSuit?`Hai lá cùng bộ ${base.get(a.id).suit}, nhưng mang hai câu hỏi khác nhau: ${pa.symbols[0].study} và ${pb.symbols[0].study}. Nguyên tố chung không làm chúng đồng nghĩa.`:
    `Đối chiếu ${pa.symbols[0].study} với ${pb.symbols[0].study}, theo hai vị trí thật trong trải. Khác bộ hoặc khác nguyên tố chưa tự xác nhận xung khắc.`),
   orientationNote:`${a.name} ${a.orientation==='upright'?'xuôi':'ngược'} ở “${a.label}”; ${b.name} ${b.orientation==='upright'?'xuôi':'ngược'} ở “${b.label}”. ${a.orientation==='reversed'||b.orientation==='reversed'?'Đọc từng chiều ngược theo các khả năng riêng, không suy cả tổ hợp là xấu.':'Hai lá xuôi vẫn cần điều kiện thực tế, không tự bảo đảm thuận lợi.'}`,
   contextQuestion:context!=='general'?`${a.context.prompt} ${b.context.prompt}`:explicit?.question??`${a.question} ${b.question}`,
   limit:'Đây là phép đối chiếu do Thiên Đồ biên soạn; không phải công thức dự báo cố định.'});
 }
 return {format:'thien-do.tarot-depth',version:1,edition:chosenData.edition,deck:snapshot.deck,context,positions,combinations,...(snapshot.version===2?{savedMethod:describeTarotMethod(snapshot)}:{}),
  method:copy(chosenData.method),sources:copy(chosenData.sources),expertReviewed:false,
  notice:'Học biểu tượng theo chiều lá, vị trí và bối cảnh; đối chiếu hành động và bằng chứng thực tế trước khi kết luận.'};
}
function tarotDepthSearchText(id){const card=getTarotCardDepth(id);return [card.name,card.nameVi,card.upright,card.reversed,...card.depth.symbols.flatMap(s=>[s.image,s.study]),...card.depth.contexts.map(c=>c.prompt),card.depth.element.value??'',card.depth.element.attribution].join(' ');}
module.exports={getTarotCardDepth,studyTarotSnapshot,tarotDepthSearchText};
