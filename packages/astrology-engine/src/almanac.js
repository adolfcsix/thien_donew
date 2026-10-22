/* THIÊN ĐỒ V9.2 — Vietnamese calendar, solar-term approximation, and traditional auspicious hours.
 * Pure deterministic calendar calculations; do not equate with auspicious-day predictions.
 * Delegates astronomical conversion to the existing versioned lunar module.
 */
(function(root){
'use strict';
const Lunar = (typeof module !== 'undefined' && module.exports) ? require('./lunar.js') : root.ThienDoLunar;
const STEMS = Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES = Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const pad = n => String(n).padStart(2, '0');
const mod = (n, m) => ((n % m) + m) % m;
const RULESET = 'almanac-calendar-utc7-v9.2';
const FIXED_EVENTS = Object.freeze({
  '1-1': 'Tết Nguyên đán', '1-15': 'Rằm tháng Giêng',
  '3-10': 'Giỗ Tổ Hùng Vương (âm lịch)', '5-5': 'Tết Đoan Ngọ',
  '7-15': 'Lễ Vu Lan', '8-15': 'Tết Trung Thu',
  '12-23': 'Ông Công Ông Táo'
});

// 24 solar terms in ascending ecliptic longitude, 0° = vernal equinox.
// Daily lookup is at 12:00 Vietnam time (05:00 UTC), NOT an exact ingress time.
const SOLAR_TERMS = Object.freeze([
 'Xuân Phân','Thanh Minh','Cốc Vũ','Lập Hạ','Tiểu Mãn','Mang Chủng',
 'Hạ Chí','Tiểu Thử','Đại Thử','Lập Thu','Xử Thử','Bạch Lộ',
 'Thu Phân','Hàn Lộ','Sương Giáng','Lập Đông','Tiểu Tuyết','Đại Tuyết',
 'Đông Chí','Tiểu Hàn','Đại Hàn','Lập Xuân','Vũ Thủy','Kinh Trập'
]);
// Six traditional auspicious-hour patterns for pairs of day branches (Tý/Ngọ, etc.).
const AUSPICIOUS_HOURS = Object.freeze([
 [0,1,3,6,8,9], [2,3,5,8,10,11], [0,1,4,5,7,10],
 [0,2,3,6,7,9], [2,4,5,8,9,11], [1,4,6,7,10,11]
]);
function solarLongitudeAtNoon(year, month, day) {
  if (!Lunar.validSolar(year,month,day)) throw new RangeError('Ngày không hợp lệ');
  // Meeus low-precision solar apparent ecliptic longitude; ~day-level lookup only.
  const jd = Date.UTC(year,month-1,day,5,0,0)/86400000 + 2440587.5;
  const t = (jd-2451545.0)/36525, r=Math.PI/180;
  const l0 = 280.46646 + 36000.76983*t + 0.0003032*t*t;
  const m = 357.52911 + 35999.05029*t - 0.0001537*t*t;
  const c = (1.914602 - 0.004817*t - 0.000014*t*t)*Math.sin(m*r)
    + (0.019993 - 0.000101*t)*Math.sin(2*m*r) + 0.000289*Math.sin(3*m*r);
  const omega = 125.04 - 1934.136*t;
  return mod(l0+c-0.00569-0.00478*Math.sin(omega*r),360);
}
function solarTermInfo(year,month,day){
  const longitude=solarLongitudeAtNoon(year,month,day);
  const index=Math.floor(longitude/15)%24;
  const offset=longitude%15;
  return {name:SOLAR_TERMS[index], longitudeDeg:Number(longitude.toFixed(2)),
    nearBoundary:offset<1.2 || offset>13.8,
    method:'apparent-sun-longitude-at-12-vn-approx',
    note:'Tên tiết khí ước tính vào 12:00 giờ Việt Nam; ngày chuyển tiết có thể khác trong cùng ngày.'};
}
// Tiết khởi tháng at 315° (Lập Xuân) plus 30° per subsequent month.
// The Can Chi month applies to solar-term year, which differs from lunar year before/around Tet.
function solarMonthCanChi(year,month,day){
  const longitude=solarLongitudeAtNoon(year,month,day);
  const monthIndex=Math.floor(mod(longitude-315,360)/30); // Dần=0, Mão=1, ... Sửu=11
  const branchIndex=mod(monthIndex+2,12);
  const solarYear=month===1 || (month===2 && longitude<315) ? year-1 : year;
  const yearStem=mod(solarYear-4,10);
  const stemIndex=mod((yearStem%5)*2+2+monthIndex,10);
  const boundaryDistance=mod(longitude-315,30);
  return {name:`${STEMS[stemIndex]} ${BRANCHES[branchIndex]}`, solarYear,
    nearBoundary:boundaryDistance<1.2 || boundaryDistance>28.8,
    method:'year-from-lap-xuan-month-from-solar-term-approx'};
}
function auspiciousHours(dayBranchIndex){
  if(!Number.isInteger(dayBranchIndex)||dayBranchIndex<0||dayBranchIndex>11)
    throw new RangeError('Chi ngày phải từ 0 đến 11');
  const allowed=AUSPICIOUS_HOURS[dayBranchIndex%6];
  return allowed.map(i=>({branch:BRANCHES[i],index:i,
    time:i===0?'23:00–01:00 (qua ngày)':`${pad(2*i-1)}:00–${pad(2*i+1)}:00`}));
}

// V9.2: Historical calendar ALMANAC layers: different schools may shift conventions.
// Thập Nhị Trực: month Branch uses the approximate solar-term month (Lập Xuân based).
const TWELVE_TRUC = Object.freeze(['Kiến','Trừ','Mãn','Bình','Định','Chấp','Phá','Nguy','Thành','Thu','Khai','Bế']);
const TWELVE_DAY_SPIRITS = Object.freeze(['Thanh Long','Minh Đường','Thiên Hình','Chu Tước','Kim Quỹ','Kim Đường','Bạch Hổ','Ngọc Đường','Thiên Lao','Huyền Vũ','Tư Mệnh','Câu Trần']);
const GOOD_SPIRITS = Object.freeze([0,1,4,5,7,10]);
// Thanh Long starts on branches Tý, Dần, Thìn, Ngọ, Thân, Tuất for lunar months 1/7, 2/8, ... 6/12.
// This is a LUNAR-month convention, not the solar-term month used for Twelve Truc.
function daySpirit(lunarMonth, dayBranchIndex){
  if(!Number.isInteger(lunarMonth)||lunarMonth<1||lunarMonth>12) throw new RangeError('Tháng âm phải từ 1 đến 12');
  if(!Number.isInteger(dayBranchIndex)||dayBranchIndex<0||dayBranchIndex>11) throw new RangeError('Chi ngày phải từ 0 đến 11');
  const start=mod(2*((lunarMonth-1)%6),12);
  const index=mod(dayBranchIndex-start,12);
  return {name:TWELVE_DAY_SPIRITS[index],status:GOOD_SPIRITS.includes(index)?'hoang-dao':'hac-dao',
    label:GOOD_SPIRITS.includes(index)?'Hoàng đạo':'Hắc đạo',ruleSet:'12-day-spirits-lunar-month-start-v1',
    note:'Theo bảng Thanh Long khởi theo tháng âm; có dị bản giữa các hệ lịch, không phải đánh giá tổng hợp ngày tốt/xấu.'};
}
function twelveTruc(dayBranchIndex, solarMonthBranchIndex){
  if(!Number.isInteger(dayBranchIndex)||dayBranchIndex<0||dayBranchIndex>11||!Number.isInteger(solarMonthBranchIndex)||solarMonthBranchIndex<0||solarMonthBranchIndex>11)
    throw new RangeError('Chi ngày và Chi tháng phải thuộc 0–11');
  const index=mod(dayBranchIndex-solarMonthBranchIndex,12);
  return {name:TWELVE_TRUC[index],index,ruleSet:'12-truc-solar-term-month-v1',
   note:'Tháng theo tiết khí ước tính lúc 12h Việt Nam; ngày sát chuyển tiết cần kiểm chứng giờ thực.'};
}
// 28-day index reference: 2026-10-10 = Liễu, 2026-10-08 = Tỉnh.
// This is the 28-DAY ALMANAC ROTATION, not the real-time astronomical lunar mansion.
// Anchoring to a published reference can disagree with calendars using another epoch/rule.
const TWENTY_EIGHT_TU = Object.freeze(['Giác','Cang','Đê','Phòng','Tâm','Vĩ','Cơ','Đẩu','Ngưu','Nữ','Hư','Nguy','Thất','Bích','Khuê','Lâu','Vị','Mão','Tất','Chủy','Sâm','Tỉnh','Quỷ','Liễu','Tinh','Trương','Dực','Chẩn']);
const TU_ANCHOR = Date.UTC(2026,9,10)/86400000;
function twentyEightTu(year,month,day){
  if(!Lunar.validSolar(year,month,day)) throw new RangeError('Ngày dương không hợp lệ');
  const delta=Date.UTC(year,month-1,day)/86400000-TU_ANCHOR;
  const index=mod(23+delta,28);
  return {name:TWENTY_EIGHT_TU[index],index,group:['Thanh Long','Huyền Vũ','Bạch Hổ','Chu Tước'][Math.floor(index/7)],
   ruleSet:'28-tu-28day-anchored-2026-10-10-v1',referenceDate:'2026-10-10',
   note:'Sao luân phiên theo chu kỳ 28 ngày, mốc Liễu 10/10/2026; đây là lịch pháp tham khảo, KHÔNG phải vị trí thiên văn thực của Mặt Trăng.'};
}
function dayInfo(year, month, day) {
  if (!Lunar.validSolar(year,month,day)) throw new RangeError('Ngày dương phải hợp lệ trong khoảng 1900–2100');
  const lunar = Lunar.solarToLunar(year,month,day);
  const jdn = Lunar.jd(day,month,year);
  const dayCanChi = `${STEMS[mod(jdn+9,10)]} ${BRANCHES[mod(jdn+1,12)]}`;
  const yearCanChi = `${STEMS[mod(lunar.year-4,10)]} ${BRANCHES[mod(lunar.year-4,12)]}`;
  const event = lunar.leap ? null : (FIXED_EVENTS[`${lunar.month}-${lunar.day}`] || null);
  const dayBranchIndex=mod(jdn+1,12);
  const solarTerm=solarTermInfo(year,month,day);
  const monthCanChi=solarMonthCanChi(year,month,day);
  const auspiciousHourList=auspiciousHours(dayBranchIndex);
  const solarBranchIndex=BRANCHES.findIndex(branch=>monthCanChi.name.endsWith(' '+branch));
  const truc=twelveTruc(dayBranchIndex,solarBranchIndex);
  const dayStatus=daySpirit(lunar.month,dayBranchIndex);
  const moonMansion=twentyEightTu(year,month,day);
  return {
    solar:{year,month,day,iso:`${year}-${pad(month)}-${pad(day)}`},
    lunar, dayCanChi, yearCanChi, monthCanChi, solarTerm, auspiciousHours:auspiciousHourList,
    truc, dayStatus, moonMansion, event,
    isFirstDay:lunar.day===1, isFullMoon:lunar.day===15,
    ruleSet:RULESET
  };
}
function monthView(year,month) {
  if (!Number.isInteger(year) || year<1900 || year>2100 || !Number.isInteger(month) || month<1 || month>12)
    throw new RangeError('Tháng dương phải nằm trong 1900–2100, tháng 1–12');
  const count = new Date(Date.UTC(year,month,0)).getUTCDate();
  const mondayStart = mod(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6,7);
  const days=Array.from({length:count},(_,i)=>dayInfo(year,month,i+1));
  // Term markers are daily noon snapshots, not astronomical ingress timestamps.
  const terms=days.filter((entry,index)=>{
    if(index>0) return entry.solarTerm.name!==days[index-1].solarTerm.name;
    if(year===1900 && month===1) return false;
    const earlier=new Date(Date.UTC(year,month-1,0));
    return entry.solarTerm.name!==solarTermInfo(earlier.getUTCFullYear(),earlier.getUTCMonth()+1,earlier.getUTCDate()).name;
  }).map(entry=>({day:entry.solar.day,name:entry.solarTerm.name}));
  return {year,month,startOffset:mondayStart,days,terms,ruleSet:RULESET};
}
function convertLunarToSolar(year,month,day,leap=false) {
  const solar=Lunar.lunarToSolar(year,month,day,leap);
  return dayInfo(solar.year,solar.month,solar.day);
}
const api=Object.freeze({RULESET,dayInfo,monthView,convertLunarToSolar,solarLongitudeAtNoon,solarTermInfo,solarMonthCanChi,auspiciousHours,SOLAR_TERMS,twelveTruc,daySpirit,twentyEightTu,TWELVE_TRUC,TWELVE_DAY_SPIRITS,TWENTY_EIGHT_TU});
if (typeof module !== 'undefined' && module.exports) module.exports=api;
root.ThienDoAlmanac=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
