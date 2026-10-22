/**
 * V11.97 / Lục Hào – Kinh Phòng Bát Cung: sổ bằng chứng Phi/Phục Thần.
 * Chỉ xem Lục Thân do người học chọn, KHÔNG tự chọn Dụng Thần hay luận cát hung.
 * Chỉ tìm Phục Thần khi Lục Thân vắng trên sáu hào hiện của quẻ chủ.
 * Nguồn Phục Thần: đúng hào cùng vị trí trong quẻ thuần của BẢN CUNG.
 */
'use strict';
const {hexagramFromBits}=require('../iching/hexagrams.cjs');
const {makeNaJiaChart,BRANCH_ELEMENTS}=require('./na-jia.cjs');
const {RELATIVES}=require('./relative-focus.cjs');
const {xunVoid,BRANCHES}=require('./temporal.cjs');
const {relation}=require('./temporal-relations.cjs');
const {compareElements}=require('../wuxing/elements.cjs');
const IDS=Object.freeze({Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'});
const RULE='jing-fang-pure-palace-absent-relative-v11.97';
const NOTES=Object.freeze([
 'Lục Thân được chọn là giả thiết nghiên cứu, không phải Dụng Thần đã được xác định theo câu hỏi.',
 'Chỉ tra Phục Thần khi không có hào hiện cùng Lục Thân; lấy nguyên hào ở cùng vị trí của quẻ thuần bản cung.',
 'Nếu bản cung có nhiều hào phù hợp thì giữ đủ các ứng viên, không chọn một vị trí theo ý muốn.',
 'Sinh khắc Phi–Phục và quan hệ Nhật–Nguyệt là bằng chứng cấu trúc, không tự quyết định xuất phục, vượng suy, ứng kỳ hay cát hung.',
 'Lịch pháp ngày/tháng cần có nguồn và quy ước xác minh; không suy dữ liệu lịch từ máy người dùng.',
]);
const copyLine=line=>Object.freeze({position:line.position,stem:line.stem,branch:line.branch,stemBranch:line.stemBranch,
 element:line.element,family:line.family,role:line.role});
function assertChart(chart){
 if(!chart||!chart.hexagram||!Array.isArray(chart.lines)||chart.lines.length!==6)throw new TypeError('Phải có bảng Nạp Giáp đủ sáu hào.');
 const canonical=makeNaJiaChart(hexagramFromBits(chart.hexagram.bits));
 if(chart.method!==canonical.method || chart.palace?.id!==canonical.palace.id || chart.stage?.id!==canonical.stage.id)throw new TypeError('Bản cung hoặc phái Nạp Giáp không khớp.');
 for(let i=0;i<6;i++)for(const field of ['position','stem','branch','stemBranch','element','family','role'])
  if(chart.lines[i]?.[field]!==canonical.lines[i][field])throw new TypeError(`Hào ${i+1}: Nạp Giáp không khớp bản quy tắc.`);
 return canonical;
}
function checkContext(context){
 if(context==null)return null;
 if(!['user-verified-manual','calendar-utc7-noon-approx'].includes(context.source))throw new TypeError('Nguồn Nhật/Nguyệt không được hỗ trợ.');
 if(!BRANCHES.includes(context.dayBranch)||context.monthBranch!==null&&!BRANCHES.includes(context.monthBranch))throw new TypeError('Địa Chi ngày/tháng không hợp lệ.');
 const actual=xunVoid(context.dayStem,context.dayBranch);
 if(!Array.isArray(context.voidBranches)||actual.voidBranches.join('/')!==context.voidBranches.join('/'))throw new TypeError('Tuần Không mâu thuẫn với Can Chi ngày.');
 if(context.source==='calendar-utc7-noon-approx'&&!context.date)throw new TypeError('Ngữ cảnh ngày dân dụng thiếu nguồn ngày.');
 return context;
}
function clocks(line,context){
 if(!context)return Object.freeze({day:null,month:null,void:null,monthUsable:false});
 const element=IDS[line.element];
 const day=Object.freeze({branch:context.dayBranch,relation:relation(line.branch,context.dayBranch),
  elementFromDay:compareElements(IDS[BRANCH_ELEMENTS[context.dayBranch]],element).kind});
 // A calendar noon approximate month is never silently promoted to precise Jie boundary evidence.
 const monthUsable=Boolean(context.monthBranch)&&context.source==='user-verified-manual';
 const month=monthUsable?Object.freeze({branch:context.monthBranch,relation:relation(line.branch,context.monthBranch),
  elementFromMonth:compareElements(IDS[BRANCH_ELEMENTS[context.monthBranch]],element).kind,
  opposed:relation(line.branch,context.monthBranch).includes('lục xung')}):null;
 return Object.freeze({day,month,void:context.voidBranches.includes(line.branch),monthUsable});
}
function hiddenRelativeEvidence(chart,selected,{context=null}={}){
 const canonical=assertChart(chart);
 if(!RELATIVES.includes(selected))throw new RangeError('Cần chọn đúng một trong năm Lục Thân.');
 const checked=checkContext(context);
 const visible=canonical.lines.filter(l=>l.family===selected).map(line=>Object.freeze({
  line:copyLine(line),calendar:clocks(line,checked),status:'VISIBLE_CANDIDATE'
 }));
 const pureBits=canonical.palace.bits.repeat(2);
 const pureChart=makeNaJiaChart(hexagramFromBits(pureBits));
 if(pureChart.palace.id!==canonical.palace.id||pureChart.stage.id!=='pure')throw new Error('Không thể dựng quẻ thuần của bản cung.');
 const hidden=visible.length?[]:pureChart.lines.filter(l=>l.family===selected).map(l=>{
  const flying=canonical.lines[l.position-1];
  const flyingToHidden=compareElements(IDS[flying.element],IDS[l.element]);
  const hiddenToFlying=compareElements(IDS[l.element],IDS[flying.element]);
  return Object.freeze({position:l.position,hidden:copyLine(l),flying:copyLine(flying),
   flyingToHidden:flyingToHidden.kind,hiddenToFlying:hiddenToFlying.kind,
   calendar:clocks(l,checked),flyingCalendar:clocks(flying,checked),status:'HIDDEN_REFERENCE_ONLY'});
 });
 if(!visible.length&&!hidden.length)throw new Error('Bản cung thuần không chứa Lục Thân yêu cầu: kiểm tra dữ liệu Nạp Giáp.');
 return Object.freeze({rule:RULE,school:'luc-hao-jingfang-hidden-relatives',selected,
  palace:canonical.palace.id,stage:canonical.stage.id,purePalaceBits:pureBits,
  status:visible.length?'VISIBLE':'HIDDEN_REFERENCE',
  visible:Object.freeze(visible),hidden:Object.freeze(hidden),
  calendarStatus:checked?(checked.source==='user-verified-manual'?'USER_SUPPLIED':'CALENDAR_APPROXIMATE'):'NOT_SUPPLIED',
  decision:Object.freeze({usefulGod:null,prosperity:null,auspiciousness:null,timing:null}),notes:NOTES});
}
module.exports=Object.freeze({RULE,hiddenRelativeEvidence});
