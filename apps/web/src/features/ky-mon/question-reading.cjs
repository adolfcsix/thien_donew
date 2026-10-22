'use strict';
/** V11.110 · Question-scoped, evidence-only reading of a verified rotating hour plate.
 * Never picks a useful god, predicts an event, scores good/bad, or mutates a board.
 */
const {EIGHT_GATES,NINE_STARS,EIGHT_DEITIES,getPalace,oppositePalace}=require('./luoshu.cjs');
const {STEMS}=require('./formation.cjs');
const {analyzeStructuralSignals}=require('./structural-signals.cjs');
const RELATION_CONTROLS=Object.freeze({'Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim','Kim':'Mộc'});
const RELATION_GENERATES=Object.freeze({'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'});
const TOPICS=Object.freeze([
 Object.freeze({id:'career',name:'Công việc'}),Object.freeze({id:'finance',name:'Tài chính'}),
 Object.freeze({id:'relationship',name:'Quan hệ'}),Object.freeze({id:'health',name:'Sức khỏe'}),
 Object.freeze({id:'travel',name:'Đi lại'}),Object.freeze({id:'study',name:'Học tập'}),
 Object.freeze({id:'other',name:'Chủ đề khác'})
]);
const INDICATORS=Object.freeze([
 ...EIGHT_GATES.map(symbol=>Object.freeze({id:`door:${symbol}`,layer:'door',symbol,name:`${symbol} Môn · Bát Môn`})),
 ...STEMS.map(symbol=>Object.freeze({id:`stem:${symbol}`,layer:'stem',symbol,name:`${symbol} · Thiên Can`})),
 ...NINE_STARS.map(symbol=>Object.freeze({id:`star:${symbol}`,layer:'star',symbol,name:`${symbol} · Cửu Tinh`})),
 ...EIGHT_DEITIES.map(symbol=>Object.freeze({id:`deity:${symbol}`,layer:'deity',symbol,name:`${symbol} · Bát Thần`}))
]);
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function relationOf(from,to){
 if(from===to)return 'same';
 if(RELATION_GENERATES[from]===to)return 'generates';
 if(RELATION_CONTROLS[from]===to)return 'controls';
 if(RELATION_GENERATES[to]===from)return 'generated-by';
 if(RELATION_CONTROLS[to]===from)return 'controlled-by';
 throw new RangeError('Ngũ hành cung không hợp lệ');
}
function palaceRelation(fromNumber,toNumber,role){
 const from=getPalace(fromNumber),to=getPalace(toNumber);
 if(!from||!to||from.number===5||to.number===5)throw new RangeError('Cần hai cung ngoài có ngũ hành đã an');
 const code=relationOf(from.element,to.element);
 const descriptions={
  same:'Đồng hành',generates:'Cung trước sinh cung sau',controls:'Cung trước khắc cung sau',
  'generated-by':'Cung sau sinh cung trước','controlled-by':'Cung sau khắc cung trước'
 };
 return freeze({role,fromPalace:fromNumber,toPalace:toNumber,fromElement:from.element,toElement:to.element,
  code,description:`${from.trigram} ${from.number} (${from.element}) → ${to.trigram} ${to.number} (${to.element}): ${descriptions[code]}.`});
}
function evidence(id,kind,number,text){return freeze({id,kind,palaceNumber:number,text});}
function missing(code,text){return freeze({code,text});}
function locateIndicator(plate,indicator){
 const matches=plate.palaces.filter(p=>p.number!==5 &&
  (indicator.layer==='door'&&p.door===indicator.symbol || indicator.layer==='stem'&&p.heavenStem===indicator.symbol ||
   indicator.layer==='star'&&(p.star===indicator.symbol || indicator.symbol==='Thiên Cầm'&&p.lodgedTianQin) ||
   indicator.layer==='deity'&&p.deity===indicator.symbol));
 return matches.map(p=>p.number);
}
function readQuestionBoard(base,plate,selection){
 // An existing strict, reconstituted-board gate verifies both layers, and rejects forged plates.
 const structural=analyzeStructuralSignals(base,plate);
 if(!selection||typeof selection!=='object')throw new TypeError('Cần lựa chọn câu hỏi và Dụng thần');
 const {topic,indicatorId,referencePalace=null,confirmed=false,questionNote=''}=selection;
 if(typeof topic!=='string'||!TOPICS.some(x=>x.id===topic))throw new RangeError('Chủ đề câu hỏi không hợp lệ');
 if(typeof indicatorId!=='string'||!INDICATORS.some(x=>x.id===indicatorId))throw new RangeError('Dụng thần không nằm trong danh mục');
 if(typeof confirmed!=='boolean')throw new TypeError('Trạng thái xác nhận không hợp lệ');
 if(typeof questionNote!=='string'||questionNote.length>280)throw new RangeError('Câu hỏi tối đa 280 ký tự');
 if(topic==='other'&&!questionNote.trim())throw new RangeError('Chủ đề khác cần mô tả câu hỏi cụ thể');
 if(referencePalace!==null&&(!Number.isInteger(referencePalace)||!getPalace(referencePalace)))throw new RangeError('Cung tham chiếu không hợp lệ');
 const indicator=INDICATORS.find(x=>x.id===indicatorId);
 const chosenTopic=TOPICS.find(x=>x.id===topic);
 const shared={kind:'question-reading-evidence',method:structural.profileId,
  topic:chosenTopic,questionNote:questionNote.trim(),indicator,referencePalace,confirmed,
  outcome:null,score:null,forecast:null};
 if(!confirmed)return freeze({...shared,status:'awaiting-confirmation',usePalace:null,candidates:[],relations:[],
  supportingEvidence:[],counterEvidence:[],contextEvidence:[],missingData:[missing('confirmation','Cần xác nhận chủ đề và Dụng thần trước khi đọc bàn.')],
  note:'Chưa phân tích khi người dùng chưa xác nhận lựa chọn.'});
 const needs=[];const supporting=[];const counter=[];const context=[];const relations=[];
 if(!plate){
  needs.push(missing('hour-plate','Chưa có thời bàn: không thể định vị Dụng thần vào cung Thiên/nhân/thần bàn.'));
  return freeze({...shared,status:'not-computed',usePalace:null,candidates:[],relations,supportingEvidence:supporting,
   counterEvidence:counter,contextEvidence:context,missingData:needs,note:'Chưa đủ dữ kiện lập thời bàn.'});
 }
 const candidates=locateIndicator(plate,indicator);
 if(candidates.length!==1){
  needs.push(missing(candidates.length===0?'indicator-not-represented':'indicator-ambiguous',candidates.length===0?
   `${indicator.name} không có vị trí riêng được biểu diễn trên thời bàn này${indicator.layer==='stem'&&base.plate?.byPalace[5]===indicator.symbol?' (Can nằm ở Địa bàn Trung 5 và chưa có Can ký Thiên bàn)':''}. Không tự gán cung thay thế.`:
   `${indicator.name} xuất hiện tại nhiều cung (${candidates.join(', ')}); chưa chọn một cung duy nhất để đối chiếu.`));
  return freeze({...shared,status:'unlocated',usePalace:null,candidates,relations,supportingEvidence:supporting,
   counterEvidence:counter,contextEvidence:context,missingData:needs,note:'Không suy kết quả từ Dụng thần chưa định vị.'});
 }
 const usePalace=candidates[0],p=getPalace(usePalace),cell=plate.byPalace[usePalace],sign=structural.byPalace[usePalace];
 context.push(evidence('located','direct',usePalace,`Dụng thần ${indicator.name} ở ${p.trigram} ${usePalace} (${p.element}); lấy từ lớp ${indicator.layer} của thời bàn, không lấy Môn/Sao bản vị.`));
 if(indicator.symbol==='Thiên Cầm'&&indicator.layer==='star'){
  context.push(evidence('tian-qin-host','convention',usePalace,'Thiên Cầm được ký cùng Thiên Nhuế; cung đang đọc là cung ký, không phải Thiên Cầm an độc lập.'));
  needs.push(missing('tian-qin-independent','Không có mô hình Thiên Cầm an độc lập để đối chiếu dị bản.'));
 }
 if(referencePalace==null)needs.push(missing('reference','Chưa chọn cung tham chiếu đã xác minh; chỉ đọc được dữ kiện tại cung Dụng thần và đối cung hình học.'));
 else if(referencePalace===5)needs.push(missing('center-reference','Trung 5 không có thời Môn/Sao/Thần riêng; không dùng cung này để chấm hướng quan hệ với Dụng thần.'));
 else {
  const relation=palaceRelation(referencePalace,usePalace,'reference-to-use');relations.push(relation);
  const prefix=`Cung tham chiếu ${referencePalace} → cung Dụng thần ${usePalace}`;
  if(relation.code==='generates')supporting.push(evidence('reference-generates-use','five-elements',usePalace,`${prefix}: ${relation.description} Đây là quan hệ sinh cho phía Dụng thần theo chiều đã chọn.`));
  else if(relation.code==='controls')counter.push(evidence('reference-controls-use','five-elements',usePalace,`${prefix}: ${relation.description} Đây là quan hệ khắc Dụng thần cần đối chiếu.`));
  else context.push(evidence('reference-relation','five-elements',usePalace,`${prefix}: ${relation.description} Không tự xếp thuận/nghịch khi Dụng thần sinh/khắc ra ngoài hoặc hai cung đồng hành.`));
 }
 const opposite=oppositePalace(usePalace);
 if(opposite&&opposite.number!==5){
  const rel=palaceRelation(usePalace,opposite.number,'use-to-opposite');relations.push(rel);
  context.push(evidence('opposite','geometry',opposite.number,`Đối cung của ${p.trigram} ${usePalace} là ${opposite.trigram} ${opposite.number}; ${rel.description} Đây là đối chiếu hình học/ngũ hành, không tự là chứng cứ cát hung.`));
 }
 if(sign.door.status==='present')counter.push(evidence('door-pressure','structural',usePalace,`Môn Bách: ${sign.door.explanation} Dấu Môn khắc cung chỉ cho biết quan hệ cấu trúc, chưa chứng minh kết quả câu hỏi.`));
 else context.push(evidence('door-context','structural',usePalace,`Môn tại cung: ${sign.door.explanation}`));
 if(sign.grave.status==='present')counter.push(evidence('wonder-grave','structural',usePalace,`Tam Kỳ Nhập Mộ: ${sign.grave.explanation} Đây là dấu vị trí theo Diễn Nghĩa, không phải dự báo.`));
 else context.push(evidence('grave-context','structural',usePalace,`Tam Kỳ tại cung: ${sign.grave.explanation}`));
 if(cell.voidAtPalace)context.push(evidence('void','needs-review',usePalace,'Cung này được đánh dấu Tuần Không giờ; V11.110 chưa tổng hợp dấu này thành thuận/nghịch.'));
 needs.push(missing('season-strength','Chưa lượng hóa vượng/suy theo tiết khí, nguyệt lệnh và trường phái đã kiểm chứng cho Dụng thần này.'));
 needs.push(missing('pattern-synthesis','Chưa có kiểm chứng độc lập cho toàn bộ tổ hợp Can–Môn–Sao–Thần, chủ/khách và ứng kỳ; không suy kết cục.'));
 needs.push(missing('time-location','Cần xác nhận mốc giao tiết, quy ước giờ Tý và hiệu chỉnh thời điểm/địa điểm khi liên quan; thời bàn hiện tại không tự chứng nhận độ chính xác thiên văn.'));
 return freeze({...shared,status:'evidence-ready',usePalace,candidates,relations,supportingEvidence:supporting,
  counterEvidence:counter,contextEvidence:context,missingData:needs,
  note:'Thuận/nghịch là nhãn nhóm CHỨNG CỨ QUAN HỆ theo quy tắc hữu hạn, không phải phán đoán tốt/xấu, xác suất hoặc lời khuyên hành động.'});
}
module.exports={TOPICS,INDICATORS,palaceRelation,readQuestionBoard};
