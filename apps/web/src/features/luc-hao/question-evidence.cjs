/**
 * Thiên Đồ V11.98 / Lục Hào research-only question and time evidence ledger.
 * A topic is a study reference, NOT a chosen useful god or divination result.
 * The researcher must explicitly confirm the matching six-relative category.
 * Calendar evidence is manually supplied; astronomical validation remains separate.
 */
'use strict';
const {hiddenRelativeEvidence}=require('./hidden-relative.cjs');
const RULE='jingfang-question-relative-evidence-v11.98';
// Deliberately *narrow*, unambiguous subjects only; no NLP keyword inference.
// Health, marriage, legal disputes, another person's affairs and broad "career"
// need role/subject/school choices and are deliberately not mapped here.
const QUESTION_GUIDES=Object.freeze({
 'money-owned-assets':Object.freeze({family:'Thê Tài',scope:'Tiền bạc, tài sản của người hỏi',citation:'bo-shi-zheng-zong-six-relatives'}),
 'documents-contracts':Object.freeze({family:'Phụ Mẫu',scope:'Văn thư, giấy tờ, hợp đồng',citation:'bo-shi-zheng-zong-six-relatives'}),
 'office-position':Object.freeze({family:'Quan Quỷ',scope:'Quan chức, chức vụ, công danh',citation:'bo-shi-zheng-zong-six-relatives'}),
 'children-descendants':Object.freeze({family:'Tử Tôn',scope:'Con cái, hậu bối',citation:'bo-shi-zheng-zong-six-relatives'}),
 'siblings-peers':Object.freeze({family:'Huynh Đệ',scope:'Anh chị em, người đồng bối',citation:'bo-shi-zheng-zong-six-relatives'}),
});
const NOTES=Object.freeze([
 'Bảng câu hỏi chỉ gợi ý họ Lục Thân theo phạm vi hẹp, phải được người nghiên cứu xác nhận; không chọn một hào Dụng Thần.',
 'Nguyệt Phá là quan hệ lục xung giữa chi hào với Nguyệt Kiến đã cung cấp, không phải phán quyết vô dụng hay hung cát.',
 'Nhật xung và Tuần Không là hai phép kiểm riêng; nhật xung không tự chứng minh nhật phá hay ám động.',
 'Phi/Phục sinh khắc, hào động do người nhập và dấu hiệu Nhật/Nguyệt không đủ để quyết định xuất phục, ứng kỳ, vượng suy.',
 'Tháng tính gần đúng theo ngày dân dụng bị chặn, không được xem là đã xác minh đúng giờ giao Jie.',
]);
function getQuestionGuide(questionId){
 if(typeof questionId!=='string'||!Object.hasOwn(QUESTION_GUIDES,questionId))throw new RangeError('Phạm vi câu hỏi chưa đủ điều kiện lấy một Lục Thân tham khảo.');
 return Object.freeze({id:questionId,...QUESTION_GUIDES[questionId],requiresExplicitConfirmation:true});
}
function parseMovements(movingPositions){
 if(!Array.isArray(movingPositions)||movingPositions.length>6||movingPositions.some(p=>!Number.isInteger(p)||p<1||p>6)||new Set(movingPositions).size!==movingPositions.length)
  throw new RangeError('Các vị trí hào động tự khai phải là số nguyên 1..6, không lặp.');
 return Object.freeze([...movingPositions].sort((a,b)=>a-b));
}
function freezeEvidence(line,clock,movingPositions,{flyingClock=null,relationPair=null}={}){
 const month=clock.month;
 const day=clock.day;
 const monthBreak=month?month.opposed:null;
 const dayClash=day?day.relation.includes('lục xung'):null;
 const declaredMoving=movingPositions.includes(line.position);
 return Object.freeze({position:line.position,stemBranch:line.stemBranch,relative:line.family,element:line.element,
  isDeclaredMoving:declaredMoving,day:day?Object.freeze({branch:day.branch,relations:day.relation,elementFromDay:day.elementFromDay,clash:dayClash}):null,
  month:month?Object.freeze({branch:month.branch,relations:month.relation,elementFromMonth:month.elementFromMonth,monthBreak}):null,
  xunVoid:clock.void,
  flying:relationPair?Object.freeze({stemBranch:relationPair.flying.stemBranch,element:relationPair.flying.element,
   flyingToHidden:relationPair.flyingToHidden,hiddenToFlying:relationPair.hiddenToFlying,
   movementIsDeclaredForFlying:declaredMoving,
   dayClash:flyingClock?.day?flyingClock.day.relation.includes('lục xung'):null,
   monthBreak:flyingClock?.month?flyingClock.month.opposed:null,
   xunVoid:flyingClock?.void??null}):null,
  emergence:null,dayBreak:null,monthProsperity:null,auspiciousness:null,timing:null,
  needsSchoolAdjudication:Object.freeze(['xuất phục','nhật phá/ám động','tình trạng tuần không','cường nhược tổng thể'])});
}
function buildQuestionEvidence(chart,{questionId,confirmedFamily,context=null,movingPositions=[]}={}){
 const guide=getQuestionGuide(questionId);
 if(confirmedFamily!==guide.family)throw new RangeError('Phải xác nhận đúng Lục Thân tham khảo; câu hỏi khác phạm vi cần phương pháp riêng.');
 const moving=parseMovements(movingPositions);
 const baseline=hiddenRelativeEvidence(chart,confirmedFamily,{context});
 const visible=Object.freeze(baseline.visible.map(v=>freezeEvidence(v.line,v.calendar,moving)));
 const hidden=Object.freeze(baseline.hidden.map(h=>freezeEvidence(h.hidden,h.calendar,moving,{flyingClock:h.flyingCalendar,relationPair:h})));
 const monthVerified=baseline.calendarStatus==='USER_SUPPLIED';
 return Object.freeze({rule:RULE,school:'luc-hao-question-evidence',question:guide,
  referenceFamily:confirmedFamily,relativeSelectionConfirmed:true,chosenUsefulGodLine:null,
  palace:baseline.palace,purePalaceBits:baseline.purePalaceBits,referenceStatus:baseline.status,
  calendarStatus:baseline.calendarStatus,monthOrigin:monthVerified?'USER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED':null,
  movingPositions:moving,visible,hidden,
  decision:Object.freeze({usefulGod:null,emergence:null,prosperity:null,auspiciousness:null,timing:null}),notes:NOTES});
}
module.exports=Object.freeze({RULE,QUESTION_GUIDES,getQuestionGuide,buildQuestionEvidence});
