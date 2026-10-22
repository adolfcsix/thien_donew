'use strict';
/** V11.134 — auditable, independent day/hour selection lenses.
 * No universal aggregate auspiciousness score or unaudited rules from 28 Mansions.
 */
const Almanac=require('./almanac.js');
const GoodDays=require('./good-days.js');
const Bazi=require('./bazi.js');
const RULESET='trach-nhat-independent-purpose-lenses-v11.134';
const BRANCHES=Bazi.BRANCHES;
const mod=(n,m)=>((n%m)+m)%m;
const POLICIES=Object.freeze([
 Object.freeze({id:'thap-nhi-truc',name:'Thập Nhị Trực theo công việc',sourceRuleSet:GoodDays.RULESET}),
 Object.freeze({id:'hoang-hac-dao',name:'Hoàng/Hắc đạo',sourceRuleSet:Almanac.RULESET}),
 Object.freeze({id:'luc-xung-tuoi',name:'Lục Xung với tuổi người chọn',sourceRuleSet:'dia-chi-luc-xung-symbol-v11.134'}),
 Object.freeze({id:'gio-hoang-dao',name:'Giờ hoàng đạo trong ngày',sourceRuleSet:Almanac.RULESET})
]);
function isoParts(date){
 if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))throw new RangeError('Ngày phải là YYYY-MM-DD');
 const parts=date.split('-').map(Number);
 if(!Almanac.dayInfo(parts[0],parts[1],parts[2]))throw new RangeError('Ngày không hợp lệ');
 return parts;
}
function evaluate({date,purpose='khai-truong',ageBranchIndex=null,hour=null}={}){
 const [year,month,day]=isoParts(date);
 if(ageBranchIndex!==null&&(!Number.isInteger(ageBranchIndex)||ageBranchIndex<0||ageBranchIndex>11))throw new RangeError('Chi tuổi phải thuộc 0–11 hoặc bỏ trống');
 if(hour!==null&&(!Number.isInteger(hour)||hour<0||hour>23))throw new RangeError('Giờ phải từ 0–23 hoặc bỏ trống');
 const calendar=Almanac.dayInfo(year,month,day);
 const result=GoodDays.evaluateDay(calendar,purpose);
 const dayBranch=BRANCHES.indexOf(calendar.dayCanChi.split(' ').at(-1));
 if(dayBranch<0)throw new Error('Không đọc được Địa Chi ngày');
 const hourBranch=hour===null?null:mod(Math.floor((hour+1)/2),12);
 const hours=calendar.auspiciousHours.map(x=>Object.freeze({...x}));
 const current=hourBranch===null?null:hours.find(x=>x.index===hourBranch)||null;
 const lens=[
  {policy:'thap-nhi-truc',status:'REFERENTIAL',observation:result.gradeLabel,signal:result.grade,
   basis:[`Trực ${calendar.truc.name}`,`Mục đích: ${result.purposeLabel}`],
   limitation:'Phân nhóm theo Thập Nhị Trực; không kết hợp với các phép Trạch Nhật khác thành kết luận.'},
  {policy:'hoang-hac-dao',status:'REFERENTIAL',observation:calendar.dayStatus.label,
   signal:calendar.dayStatus.status,basis:[`Thần trực: ${calendar.dayStatus.name}`],
   limitation:'Lịch Hoàng/Hắc đạo là một tầng quy ước riêng, không tự xác nhận ngày hợp việc.'},
  {policy:'luc-xung-tuoi',status:ageBranchIndex===null?'NEEDS_INPUT':'REFERENTIAL',
   observation:ageBranchIndex===null?'Chưa chọn Địa Chi tuổi':(mod(dayBranch-ageBranchIndex,12)===6?'Ngày xung Chi tuổi':'Ngày không Lục Xung với Chi tuổi'),
   signal:ageBranchIndex===null?null:mod(dayBranch-ageBranchIndex,12)===6?'SYMBOLIC_CLASH':'NO_SYMBOLIC_CLASH',
   basis:[`Ngày ${calendar.dayCanChi}`,...(ageBranchIndex===null?[]:[`Chi tuổi ${BRANCHES[ageBranchIndex]}`])],
   limitation:'Đây chỉ là quan hệ Lục Xung Chi ngày–Chi tuổi, không thay thế bộ quy tắc tuổi mệnh riêng từng trường phái.'},
  {policy:'gio-hoang-dao',status:hour===null?'NEEDS_INPUT':'REFERENTIAL',
   observation:hour===null?'Chưa chọn giờ':(current?'Giờ thuộc bảng hoàng đạo':'Giờ không thuộc bảng hoàng đạo'),
   signal:hour===null?null:current?'LISTED_HOUR':'NOT_LISTED_HOUR',
   basis:[`Các giờ hoàng đạo: ${hours.map(x=>x.branch).join(', ')}`,...(hour===null?[]:[`Giờ chọn: ${hour}:00 (${BRANCHES[hourBranch]})`])],
   limitation:'Giờ tra theo bảng can chi địa phương; chưa xét giờ chính xác theo việc và quy tắc tuổi/cục.'}
 ].map(x=>Object.freeze({...x,basis:Object.freeze(x.basis)}));
 const boundary=Boolean(calendar.monthCanChi.nearBoundary||calendar.solarTerm.nearBoundary);
 return Object.freeze({ruleSet:RULESET,date,purpose,purposeLabel:result.purposeLabel,dayCanChi:calendar.dayCanChi,
  ageBranchIndex,hour,hourBranch:hourBranch===null?null:BRANCHES[hourBranch],nearBoundary:boundary,
  lenses:Object.freeze(lens),policies:POLICIES,
  visualReference:Object.freeze({moonMansion:calendar.moonMansion.name,ruleSet:calendar.moonMansion.ruleSet,
   evaluated:false,note:'28 Tú chỉ tra cứu, chưa đánh giá bằng bảng cát/hung dị bản.'}),
  warnings:Object.freeze([...(boundary?['Sát thời điểm chuyển tiết; cần xác minh khoảnh khắc nhập tiết trước khi kết luận theo tháng.']:[]),
   'Không suy diễn kết quả thực tế; chọn ngày xây dựng, cưới hỏi hay khai trương còn phụ thuộc luật pháp, thời tiết, công việc và sự đồng thuận.']),
  overallVerdict:null,score:null});
}
module.exports=Object.freeze({RULESET,POLICIES,evaluate});
