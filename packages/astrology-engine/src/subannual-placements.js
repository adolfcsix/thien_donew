'use strict';
/**
 * V11.22: optional RESEARCH convention for branch-only subannual periods.
 * This module calculates neither flowing stars nor good/bad predictions.
 * Convention: Lưu Đẩu Quân starts at annual Thái Tuế, walks BACKWARD
 * to natal lunar month, then FORWARD to natal birth-hour branch.
 * The resulting branch is lunar month 1; monthly, daily, hourly branches
 * are advanced clockwise one house per respective interval.
 * Leap-month policy is EXPLICIT: same index as corresponding regular month.
 * Alternative schools and leap-month treatment are not certified.
 */
const Lunar=require('./lunar.js');
const ID = 'subannual-dau-quan-branch-reference-v1';
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
function mod(value){return ((value%12)+12)%12;}
function asBranch(index, houses){
 const branchIndex=mod(index);
 const house=houses.find(item=>item.branchIndex===branchIndex);
 if(!house) throw new TypeError('Không tìm thấy cung cho địa chi cần đối chiếu');
 return {branchIndex,branch:BRANCHES[branchIndex],palace:house.palace};
}
function assertChart(chart){
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12||new Set(chart.houses.map(h=>h.branchIndex)).size!==12||
   chart.houses.some(h=>!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||typeof h.palace!=='string')||
   !Number.isInteger(chart.lunar?.year)||!Number.isInteger(chart.lunar?.month)||chart.lunar.month<1||chart.lunar.month>12||
   !Number.isInteger(chart.hour)||chart.hour<0||chart.hour>23) throw new TypeError('Dữ liệu lá số chưa hợp lệ để tính mốc nghiên cứu');
}
function calculateSubannualBranches(chart,{year,month,leap=false,day,hour}){
 assertChart(chart);
 if(!Number.isInteger(year)||year<chart.lunar.year||year>2100||year<1900) throw new RangeError('Năm xem nằm ngoài phạm vi hỗ trợ');
 if(!Number.isInteger(month)||month<1||month>12||typeof leap!=='boolean'||!Number.isInteger(day)||day<1||day>30||
    !Number.isInteger(hour)||hour<0||hour>23) throw new RangeError('Mốc tháng/ngày/giờ không hợp lệ');
 // Reject phantom leap months, nonexistent lunar days and out-of-bounds conversion.
 Lunar.lunarToSolar(year,month,day,leap);
 const annualBranch=mod(year-4); // Dần=2 for 2022; Tý=0 for 2020
 const natalHourBranch=Math.floor(((chart.hour+1)%24)/2);
 const selectedHourBranch=Math.floor(((hour+1)%24)/2);
 const dauQuan=mod(annualBranch-(chart.lunar.month-1)+natalHourBranch);
 const lunarMonthBranch=mod(dauQuan+(month-1));
 const lunarDayBranch=mod(lunarMonthBranch+(day-1));
 const lunarHourBranch=mod(lunarDayBranch+selectedHourBranch);
 return {
  ruleSet:ID,status:'research-only',
  convention:'Đẩu Quân theo Lưu Thái Tuế, tháng sinh và giờ sinh; thuận 1 cung cho mỗi tháng/ngày/giờ',
  leapPolicy:'repeat-regular-month',
  monthIsLeap:leap,
  annualThaiTue:asBranch(annualBranch,chart.houses),
  dauQuan:asBranch(dauQuan,chart.houses),
  luuNguyet:asBranch(lunarMonthBranch,chart.houses),
  luuNhat:asBranch(lunarDayBranch,chart.houses),
  luuThoi:asBranch(lunarHourBranch,chart.houses),
  coverage:{monthlyPalace:true,dailyPalace:true,hourlyPalace:true,monthlyStars:false,dailyStars:false,hourlyStars:false,independentExpertReview:false},
  caution:'Đây là phép đối chiếu vị trí cung theo một quy ước nghiên cứu. Tháng nhuận lặp vị trí tháng thường. Chưa an sao lưu riêng hoặc kết luận cát/hung.'
 };
}
module.exports=Object.freeze({ID,calculateSubannualBranches});
