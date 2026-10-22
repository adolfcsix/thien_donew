/* THIÊN ĐỒ V9.3 — Explainable TRỰC-based activity lookup.
 * This is a small transparent traditional reference table, NOT evidence that
 * outcomes can be predicted, and NOT a substitute for practical planning.
 * Does not score 28 Tú due to disputed rules and the V9.2 date anchor.
 */
(function(root){
'use strict';
const Almanac = (typeof module!=='undefined'&&module.exports) ? require('./almanac.js') : root.ThienDoAlmanac;
const RULESET='good-days-12-truc-purpose-v9.3.0';
const PURPOSES=Object.freeze({
 'cuoi-hoi':Object.freeze({label:'Cưới hỏi',favorable:['Kiến','Mãn','Bình','Định','Thành','Khai'],caution:['Phá','Nguy','Bế']}),
 'khai-truong':Object.freeze({label:'Khai trương',favorable:['Kiến','Định','Thành','Khai'],caution:['Phá','Nguy','Bế']}),
 'xuat-hanh':Object.freeze({label:'Xuất hành',favorable:['Kiến','Mãn','Thành','Khai'],caution:['Phá','Nguy','Bế']}),
 'dong-tho':Object.freeze({label:'Động thổ',favorable:['Mãn','Thành'],caution:['Phá','Nguy','Bế']})
});
function evaluateDay(day, purpose){
 const rules=PURPOSES[purpose];
 if(!rules)throw new RangeError('Mục đích tra cứu không được hỗ trợ');
 if(!day || !day.solar || !day.truc || !day.dayStatus || !day.moonMansion || !day.monthCanChi)
   throw new TypeError('Ngày cần có dữ liệu lịch pháp V9.2');
 const truc=day.truc.name;
 const grade=rules.favorable.includes(truc)?'thuận-theo-trực':rules.caution.includes(truc)?'cân-nhắc-theo-trực':'trung-tính-theo-trực';
 const statusName=day.dayStatus.label;
 const mixed=grade==='thuận-theo-trực'&&day.dayStatus.status==='hac-dao' || grade==='cân-nhắc-theo-trực'&&day.dayStatus.status==='hoang-dao';
 return {
   date:day.solar.iso, purpose, purposeLabel:rules.label, grade,
   gradeLabel:grade==='thuận-theo-trực'?'Thuận theo Trực':grade==='cân-nhắc-theo-trực'?'Nên cân nhắc':'Trung tính',
   sourceTruc:truc,daySpirit:day.dayStatus.name,daySpiritLabel:statusName,
   lunar:day.lunar,moonMansion:day.moonMansion.name,nearBoundary:Boolean(day.monthCanChi.nearBoundary||day.solarTerm.nearBoundary),
   mixed,
   reasons:[`Trực ${truc}: ${grade==='thuận-theo-trực'?'thuộc nhóm được xem là thuận':grade==='cân-nhắc-theo-trực'?'thuộc nhóm thường kiêng':'không có khuyến nghị riêng'} cho ${rules.label.toLowerCase()} trong bảng tra cứu V9.3.`,
     `Thần trực nhật ${day.dayStatus.name}: ${statusName.toLowerCase()}, một hệ phân loại độc lập${mixed?' và đang cho tín hiệu khác với Trực':''}.`,
     `Sao ${day.moonMansion.name} (28 Tú): chỉ hiển thị đối chiếu, không tham gia xếp nhóm.`,
     ...(day.monthCanChi.nearBoundary||day.solarTerm.nearBoundary?['Gần chuyển tiết: Trực theo tháng tiết khí có thể thay đổi trong ngày; cần tra thời điểm chính xác.']:[])],
   ruleSet:RULESET, disclaimer:'Chỉ phản ánh cách xếp Trực trong một bảng quy tắc dân gian; không phải dự báo, kết luận ngày tốt/xấu tuyệt đối hoặc bảo đảm sự kiện thành công.'
 };
}
function searchMonth(year,month,purpose){
 if(!PURPOSES[purpose])throw new RangeError('Mục đích tra cứu không được hỗ trợ');
 const calendar=Almanac.monthView(year,month);
 const days=calendar.days.map(day=>evaluateDay(day,purpose));
 return {year,month,purpose,purposeLabel:PURPOSES[purpose].label,ruleSet:RULESET,
  days,summary:{favorable:days.filter(d=>d.grade==='thuận-theo-trực').length,
  neutral:days.filter(d=>d.grade==='trung-tính-theo-trực').length,
  caution:days.filter(d=>d.grade==='cân-nhắc-theo-trực').length},
  note:'Các nhóm chỉ dựa trên 12 Trực. Hoàng/Hắc đạo và 28 Tú được công bố riêng, không trộn điểm và không cam kết kết quả.'};
}
// V9.4: Multi-month lookup keeps classification separate from evidence.
const FILTERS=Object.freeze(['all','favorable','neutral','caution','mixed','boundary']);
const GRADE_FILTER=Object.freeze({favorable:'thuận-theo-trực',neutral:'trung-tính-theo-trực',caution:'cân-nhắc-theo-trực'});
function searchRange(year,month,months,purpose,filter='all'){
 if(!Number.isInteger(months)||months<1||months>6)throw new RangeError('Khoảng tra cứu phải từ 1 đến 6 tháng');
 if(!Number.isInteger(year)||!Number.isInteger(month)||year<1900||year>2100||month<1||month>12)
  throw new RangeError('Tháng bắt đầu phải trong 1900–2100');
 if((year-1900)*12+month-1+months>(2100-1900+1)*12)throw new RangeError('Khoảng tra cứu vượt giới hạn 2100');
 if(!FILTERS.includes(filter))throw new RangeError('Bộ lọc không hợp lệ');
 if(!PURPOSES[purpose])throw new RangeError('Mục đích tra cứu không được hỗ trợ');
 const start=(year-1900)*12+month-1;
 const slices=Array.from({length:months},(_,i)=>{const ordinal=start+i;
  return searchMonth(1900+Math.floor(ordinal/12),ordinal%12+1,purpose);});
 const allDays=slices.flatMap(x=>x.days);
 const days=allDays.filter(d=>filter==='all'||(GRADE_FILTER[filter]?d.grade===GRADE_FILTER[filter]:filter==='mixed'?d.mixed:d.nearBoundary));
 const summary={favorable:allDays.filter(d=>d.grade===GRADE_FILTER.favorable).length,
  neutral:allDays.filter(d=>d.grade===GRADE_FILTER.neutral).length,
  caution:allDays.filter(d=>d.grade===GRADE_FILTER.caution).length,
  mixed:allDays.filter(d=>d.mixed).length,boundary:allDays.filter(d=>d.nearBoundary).length};
 return {year,month,months,purpose,purposeLabel:PURPOSES[purpose].label,filter,ruleSet:RULESET,
  monthsCovered:slices.map(x=>({year:x.year,month:x.month})),allDays,days,total:allDays.length,matches:days.length,
  summary,note:'Kết quả tra cứu theo bảng 12 Trực; các tín hiệu khác hiển thị độc lập. Không xếp hạng ngày tốt tuyệt đối.'};
}
function compareDays(searchResult,dates){
 if(!searchResult||!Array.isArray(searchResult.allDays))throw new TypeError('Cần dữ liệu tra cứu hợp lệ');
 if(!Array.isArray(dates)||dates.length<1||dates.length>3||new Set(dates).size!==dates.length)
  throw new RangeError('Chọn 1–3 ngày khác nhau để đối chiếu');
 return dates.map(iso=>{const d=searchResult.allDays.find(x=>x.date===iso);
  if(!d)throw new RangeError('Ngày đối chiếu nằm ngoài khoảng tra cứu');
  return {date:d.date,grade:d.grade,gradeLabel:d.gradeLabel,truc:d.sourceTruc,spirit:d.daySpirit,
    daySpiritLabel:d.daySpiritLabel,moonMansion:d.moonMansion,mixed:d.mixed,nearBoundary:d.nearBoundary,
    ruleSet:d.ruleSet};
 });
}
const api=Object.freeze({RULESET,PURPOSES,FILTERS,evaluateDay,searchMonth,searchRange,compareDays});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ThienDoGoodDays=api;
})(typeof globalThis!=='undefined'?globalThis:this);
