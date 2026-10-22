/** Recompute from canonical inputs. Never trust supplied cast/result fields. */
'use strict';
const P=require('@thiendo/astrology-engine/src/mai-hoa-profile.cjs');
const K=require('@thiendo/knowledge/src/mai-hoa-depth-v11129.json');
const C=require('./casting.cjs'),D=require('./deep-reading.cjs'),T=require('./line-trace.cjs');
const {hexagramFromBits}=require('../iching/hexagrams.cjs');
const {compareElements}=require('../wuxing/elements.cjs');
const IDS={Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'};
const BRANCH_ELEMENTS=['Thủy','Thổ','Mộc','Mộc','Thổ','Hỏa','Hỏa','Thổ','Kim','Kim','Thổ','Thủy'];
const LABELS={time:'Năm–tháng–ngày–giờ âm',numbers:'Hai số giản lược','later-heaven':'Hậu Thiên vật tượng','count-hour':'Số vật + giờ','sound-hour':'Hai đợt âm thanh + giờ'};
const build={time:C.castByLunarTime,numbers:C.castByNumbers,'later-heaven':C.castByLaterHeaven,'count-hour':C.castByCountHour,'sound-hour':C.castBySoundHour};
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function seasonal(trigram,branch){
 if(branch===null)return {status:'unresolved',label:'Chưa chọn thời lệnh',element:null,relation:null};
 const element=BRANCH_ELEMENTS[branch-1],relation=compareElements(IDS[element],IDS[trigram.element]);
 const label=relation.kind==='same'?'Được lệnh · vượng':relation.kind==='control'?'Bị hành thời lệnh khắc · suy':'Chưa kết luận vượng/suy';
 return {status:relation.kind==='same'?'旺':relation.kind==='control'?'衰':'unclassified',label,element,relation};
}
function studyMaiHoa(raw){
 const input=P.validateMaiHoaProfile(raw),cast=build[input.mode](input);
 const pure=['111111','000000'].includes(cast.original.bits),fromChanged=pure&&input.nuclearPolicy==='pure-transformed';
 const source=fromChanged?cast.transformed:cast.original;
 const nuclear=hexagramFromBits(source.bits.slice(1,4)+source.bits.slice(2,5));
 const depth=D.makeDeepReading({...cast,nuclear}),trace=T.makeLineTrace(cast);
 const layers=depth.layers.map(l=>({...l,perspective:{same:'Tỷ hòa','generated-by':'Sinh Thể',generate:'Thể sinh ra',control:'Thể khắc ra','controlled-by':'Khắc Thể'}[l.relation.kind],guide:K.relations[l.relation.kind],season:seasonal(l.trigram,input.seasonBranch),basis:l.id.startsWith('nuclear')?`Hỗ lấy từ ${fromChanged?'quẻ biến':'quẻ chủ'}, hào ${l.id==='nuclear-body'?(depth.bodyLocation==='upper'?'3–4–5':'2–3–4'):(depth.bodyLocation==='upper'?'2–3–4':'3–4–5')}`:l.what}));
 // Directed pair ledger: distinguish actual generator/controller from reference direction.
 const nodes=[{id:'body',name:'Thể',trigram:cast.body},...layers.map(l=>({id:l.id,name:l.stage,trigram:l.trigram}))];
 const interactions=[];
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j],relation=compareElements(IDS[a.trigram.element],IDS[b.trigram.element]);
  const reverse=['generated-by','controlled-by'].includes(relation.kind);
  interactions.push({a:a.id,b:b.id,reference:`${a.name} → ${b.name}`,from:reverse?b.name:a.name,to:reverse?a.name:b.name,kind:relation.kind,label:relation.label});
 }
 const upperNumber=C.PRIOR_HEAVEN.find(t=>t.id===cast.upper.id).number,lowerNumber=C.PRIOR_HEAVEN.find(t=>t.id===cast.lower.id).number;
 const timing={method:'main-trigram-sum-v1',classification:'Thiên Đồ · giả thuyết thực hành',count:upperNumber+lowerNumber,formula:`${upperNumber} (${cast.upper.name}) + ${lowerNumber} (${cast.lower.name})`,unit:input.timingUnit,status:input.timingUnit==='unresolved'?'unresolved':'hypothesis',pace:input.pace,paceNote:{unresolved:'Chưa xác định nhịp bối cảnh.',slow:'Chậm: giữ nhãn bối cảnh, không tự nhân thời lượng.',medium:'Vừa: giữ nhãn bối cảnh, không tự đổi đơn vị.',fast:'Nhanh: giữ nhãn bối cảnh, không tự chia thời lượng.'}[input.pace],calendarDate:null,
  branchCandidates:layers.map(l=>({layer:l.stage,element:l.trigram.element,relation:l.perspective,branches:C.BRANCHES.filter((_,i)=>BRANCH_ELEMENTS[i]===l.trigram.element)})),
  limit:'Số là tổng hai số quái chủ đã rút gọn, không phải tổng đầu vào hoặc số thứ tự Văn Vương. Đơn vị phải được chọn theo loại việc; nhịp nhanh/chậm không có hệ số đã xác minh. Chi ứng chỉ là các nhóm hành, không lịch ngày xảy ra sự kiện.'};
 const synthesis={
  status:input.evidence.some(e=>e.kind==='observation'&&e.statement)?'user-observations-only':'needs-observation',
  supporting:layers.filter(l=>['same','generated-by'].includes(l.relation.kind)).map(l=>l.stage),
  pressure:layers.filter(l=>l.relation.kind==='controlled-by').map(l=>l.stage),
  outward:layers.filter(l=>['generate','control'].includes(l.relation.kind)).map(l=>l.stage),
  observed:input.evidence.filter(e=>e.kind==='observation'&&e.statement).map(e=>e.statement),
  assumed:input.evidence.filter(e=>e.kind==='assumption'&&e.statement).map(e=>e.statement),
  counter:input.evidence.filter(e=>e.kind==='counter'&&e.statement).map(e=>e.statement),
  missing:[...(input.question?[]:['Chưa chốt câu hỏi khảo sát.']),...(input.seasonBranch===null?['Chưa có chi thời lệnh đã đối chiếu.']:[]),...(input.timingUnit==='unresolved'?['Chưa chọn đơn vị thời ứng theo loại việc.']:[])],
  conclusion:'Giữ Thể làm mốc xuyên suốt; đọc riêng các lớp nâng đỡ, áp lực và nguồn lực đi ra. Nhãn này chỉ tổng hợp quan hệ tượng số, không cân trọng số chứng cứ hoặc chứng minh kết quả thực tế.'
 };
 const facts=[{id:'arithmetic',status:'calculated',statement:`Thượng: ${cast.arithmetic.base} → ${cast.arithmetic.upperRemainder}; hạ: ${cast.arithmetic.total} → ${cast.arithmetic.lowerRemainder}; động: ${cast.arithmetic.movingSeed} → ${cast.changingLine}`,basis:'Chia 8/6; dư 0 về 8/6'},
  {id:'body',status:'calculated',statement:`Thể ${cast.body.name}, Dụng ${cast.use.name}`,basis:`Hào ${cast.changingLine} thuộc ${cast.changingLine<=3?'hạ':'thượng'} quái; giữ quái không động làm Thể`},
  {id:'nuclear',status:'calculated',statement:`Hỗ ${nuclear.name} · ${nuclear.bits}`,basis:`2–3–4 / 3–4–5 từ ${fromChanged?'quẻ biến':'quẻ chủ'}`},
  {id:'mutation',status:'calculated',statement:`${cast.original.name} → ${cast.transformed.name}`,basis:`Chỉ đảo hào ${cast.changingLine}`},
  {id:'season',status:input.seasonBranch===null?'unresolved':'assumption',statement:input.seasonBranch===null?'Chưa xác minh thời lệnh':`Chi ${C.BRANCHES[input.seasonBranch-1]} · ${BRANCH_ELEMENTS[input.seasonBranch-1]}`,basis:'Chi do người dùng nhập; không tự xác minh lịch'},
  {id:'timing',status:timing.status,statement:`${timing.count} · ${input.timingUnit}`,basis:timing.formula}];
 const counters=[];
 if(pure)counters.push('Quẻ thuần Càn/Khôn có dị bản lấy hỗ từ quẻ biến. Hãy so cả hai trước khi chọn.');
 if(new Set(layers.map(l=>l.relation.kind)).size>1)counters.push('Các lớp có quan hệ khác nhau; không cộng thành điểm may mắn hoặc bỏ qua lớp trái chiều.');
 if(input.evidence.some(e=>e.kind==='counter'))counters.push('Có chứng cứ phản bác do người dùng ghi; cần đối chiếu trước khi chốt giả thuyết.');
 if(!input.evidence.some(e=>e.kind==='observation'&&e.statement))counters.push('Chưa có quan sát thực tế được ghi. Cấu trúc quẻ không thay thế chứng cứ ngoài đời.');
 return freeze({method:input.method,version:input.version,input,methodLabel:LABELS[input.mode],cast,nuclear,nuclearSource:fromChanged?'transformed':'original',pure,bodySeason:seasonal(cast.body,input.seasonBranch),layers,interactions,trace,timing,synthesis,facts,evidence:input.evidence,counters,sources:K.sources,limits:K.limits});
}
function compareNuclearPolicies(raw){const a=studyMaiHoa({...raw,nuclearPolicy:'original'}),b=studyMaiHoa({...raw,nuclearPolicy:'pure-transformed'});return freeze({a:{bits:a.nuclear.bits,name:a.nuclear.name},b:{bits:b.nuclear.bits,name:b.nuclear.name},changed:a.nuclear.bits!==b.nuclear.bits,applicable:a.pure});}
function compareCastingProfiles(raw){
 const p=P.validateMaiHoaProfile(raw),main=studyMaiHoa(p);let alternate;
 if(['numbers','sound-hour'].includes(p.mode))alternate=studyMaiHoa({...p,mode:p.mode==='numbers'?'sound-hour':'numbers',hourBranch:p.hourBranch??1});
 else if(p.mode==='later-heaven')alternate=studyMaiHoa({...p,mode:'numbers',first:p.objectTrigram,second:p.directionTrigram});
 else if(p.mode==='count-hour')alternate=studyMaiHoa({...p,mode:'numbers',first:p.count,second:p.hourBranch});
 else return null;
 return freeze({sameOriginal:main.cast.original.bits===alternate.cast.original.bits,changedLine:main.cast.changingLine!==alternate.cast.changingLine,items:[main,alternate].map(s=>({method:s.methodLabel,original:s.cast.original.name,movingSeed:s.cast.arithmetic.movingSeed,line:s.cast.changingLine,body:s.cast.body.name,use:s.cast.use.name,transformed:s.cast.transformed.name})),note:p.mode==='numbers'?'So thử cộng chi Tý=1; đây là lựa chọn mẫu, không suy ra giờ của sự kiện.':'So cùng số đầu vào và quẻ chủ, không chọn phương pháp theo kết quả mong muốn.'});
}
module.exports={compareCastingProfiles,studyMaiHoa,compareNuclearPolicies,BRANCH_ELEMENTS,LABELS};
