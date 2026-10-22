'use strict';
/**
 * V11.23 — developer-only, deterministic temporal consistency audit.
 * Checks internal invariants against a distinct Gregorian traversal and
 * calendar round trips. It DOES NOT provide independent astronomical,
 * Tử Vi school, or expert validation of the placement convention.
 */
const Lunar = require('../../astrology-engine/src/lunar.js');
const Engine = require('../../astrology-engine/src/tuvi.js');
const {listLunarMonths,getSubannualResearch,getTemporalExplorer,getHourBranch} = require('./temporal-explorer.cjs');
const AUDIT_ID='temporal-consistency-audit-v11.23';
const mod=n=>((n%12)+12)%12;
const dayIndex=iso=>Math.round(Date.parse(`${iso}T00:00:00Z`)/86400000);
const BRANCH_NAMES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
function auditTemporalIntegrity(options={}){
 const startYear=options.startYear??1900;
 const endYear=options.endYear??2100;
 if(!Number.isInteger(startYear)||!Number.isInteger(endYear)||startYear<1900||endYear>2100||startYear>endYear) throw new RangeError('Audit chỉ hỗ trợ năm 1900–2100');
 const issues=[];
 const stats={years:0,lunarMonths:0,leapMonths:0,roundTripDates:0,solarContinuityChecks:0,hourBranches:0,researchCases:0,annualNonMutationChecks:0,partialMonths:0};
 const yearRecords=[];
 const issue=(year,category,detail)=>{issues.push({year,category,detail});};
 let priorLast=null;
 for(let year=startYear;year<=endYear;year++){
  stats.years++;
  let months;
  try{months=listLunarMonths(year);}catch(e){issue(year,'calendar-error',e.message);continue;}
  const yearRecord={year,months:months.length,leapMonths:months.filter(m=>m.leap).length,days:0,partialMonths:months.filter(m=>m.partial).length,firstSolarDate:months[0]?.firstSolarDate??null,lastSolarDate:months.at(-1)?.days.at(-1)?.solarDate??null};
  yearRecords.push(yearRecord);
  if(months.length!==12&&months.length!==13) issue(year,'lunar-month-count',`${months.length} tháng thay vì 12 hoặc 13`);
  if(yearRecord.leapMonths!==months.length-12) issue(year,'leap-month-count',`${yearRecord.leapMonths} tháng nhuận`);
  if(new Set(months.map(m=>m.key)).size!==months.length) issue(year,'duplicate-lunar-month','Trùng khóa tháng âm');
  if(yearRecord.partialMonths && year!==2100) issue(year,'unexpected-partial','Tháng không đủ 29 ngày trước năm 2100');
  let previousDay=null;
  months.forEach((month,i)=>{
   stats.lunarMonths++;
   stats.leapMonths+=Number(month.leap);
   yearRecord.days+=month.days.length;
   if(month.partial) stats.partialMonths++;
   if(month.month<1||month.month>12||month.days.length<1||month.days.length>30) issue(year,'month-range',month.key);
   if(month.partial !== (month.days.length<29)) issue(year,'partial-flag',month.key);
   if(month.firstSolarDate!==month.days[0]?.solarDate) issue(year,'first-day',month.key);
   if(month.leap&&(i===0||months[i-1].month!==month.month||months[i-1].leap))issue(year,'leap-order',month.key);
   month.days.forEach((day,j)=>{
    const actualIndex=dayIndex(day.solarDate);
    if(!Number.isFinite(actualIndex)) {issue(year,'invalid-solar-date',day.solarDate);return;}
    if(day.lunarDay!==j+1)issue(year,'day-sequence',`${month.key}/${day.lunarDay}`);
    if(previousDay!==null){stats.solarContinuityChecks++;if(actualIndex!==previousDay+1)issue(year,'solar-continuity',`${month.key}/${day.lunarDay}: ${actualIndex-previousDay}`);}
    previousDay=actualIndex;
    stats.roundTripDates++;
    try{
     const [y,m,d]=day.solarDate.split('-').map(Number);
     const actual=Lunar.solarToLunar(y,m,d);
     if(actual.year!==year||actual.month!==month.month||actual.leap!==month.leap||actual.day!==day.lunarDay)issue(year,'solar-lunar-roundtrip',day.solarDate);
    }catch(e){issue(year,'roundtrip-error',`${day.solarDate}: ${e.message}`);}
   });
  });
  if(priorLast!==null && months.length && yearRecord.firstSolarDate){
   stats.solarContinuityChecks++;
   if(dayIndex(yearRecord.firstSolarDate)!==priorLast+1)issue(year,'cross-year-continuity',yearRecord.firstSolarDate);
  }
  if(yearRecord.lastSolarDate) priorLast=dayIndex(yearRecord.lastSolarDate);
 }
 for(let hour=0;hour<24;hour++){
  stats.hourBranches++;
  const actual=getHourBranch(hour);
  const independent=hour===23||hour===0?0:Math.floor((hour+1)/2);
  if(actual.branchIndex!==independent||actual.branch!==BRANCH_NAMES[independent])issue(null,'hour-branch',String(hour));
 }
 // 22 pre-existing diverse natal fixtures (not expert-verified reference charts).
 const charts=[];
 for(let natalYear=1990;natalYear<=2011;natalYear++){
  charts.push(Engine.calculate({date:`${natalYear}-08-17`,calendar:'solar',gender:natalYear%2?'Nữ':'Nam',hour:(natalYear%12)*2,minute:0}));
 }
 const years=[2025,2026,2033,2099,2100].filter(y=>y>=startYear&&y<=endYear);
 for(const year of years){
  const months=listLunarMonths(year);
  for(const chart of charts){
   const before=JSON.stringify(chart);
   const candidates=[months[0],months.find(m=>m.leap),months[Math.floor(months.length/2)],months.at(-1)].filter(Boolean);
   for(const month of candidates){
    for(const hour of [0,1,22,23]){
     const day=Math.min(13,month.days.length);
     try{
      const actual=getSubannualResearch(chart,year,month.month,month.leap,day,hour);
      const cal=getTemporalExplorer(chart,year,month.month,month.leap,day,hour);
      stats.researchCases++;
      // Independent integer-offset oracle. Check all five positions, not just one.
      const thaiTue=mod(year-4);
      const birthHour=Math.floor(((chart.hour+1)%24)/2);
      const currentHour=hour===23||hour===0?0:Math.floor((hour+1)/2);
      const dauQuan=mod(thaiTue+birthHour+1-chart.lunar.month);
      const monthly=mod(dauQuan+month.month-1);
      const daily=mod(monthly+day-1);
      const hourly=mod(daily+currentHour);
      const expected=[thaiTue,dauQuan,monthly,daily,hourly];
      const got=[actual.annualThaiTue,actual.dauQuan,actual.luuNguyet,actual.luuNhat,actual.luuThoi];
      if(got.some((b,i)=>b.branchIndex!==expected[i]||b.palace!==chart.houses.find(h=>h.branchIndex===expected[i])?.palace))
       issue(year,'subannual-branch',`${chart.lunar.year}/${month.key}/${day}/${hour}`);
      if(actual.coverage.monthlyStars!==false||actual.coverage.dailyStars!==false||actual.coverage.hourlyStars!==false||actual.coverage.independentExpertReview!==false||actual.status!=='research-only')
       issue(year,'unverified-coverage',`${chart.lunar.year}/${month.key}`);
      if(cal.selected.time.branchIndex!==currentHour||cal.coverage.luuNguyet!==false||cal.coverage.luuNhat!==false||cal.coverage.luuThoi!==false)
       issue(year,'calendar-coverage',`${chart.lunar.year}/${month.key}`);
     }catch(e){issue(year,'research-error',`${chart.lunar.year}/${month.key}: ${e.message}`);}
    }
   }
   stats.annualNonMutationChecks++;
   if(JSON.stringify(chart)!==before)issue(year,'input-mutation',String(chart.lunar.year));
  }
 }
 return {auditId:AUDIT_ID,status:issues.length?'FAIL':'PASS',scope:'internal-consistency-not-independent-domain-review',generatedAt:null,
  stats,yearRecords,issues,limitations:[
   'Kiểm chứng tính nhất quán nội bộ, không phải so khớp bảng thiên văn độc lập.',
   'Đối chiếu nguyên tắc Đẩu Quân theo một quy ước nghiên cứu, chưa có chuyên gia xác nhận.',
   'Không xác minh Lưu nguyệt/Lưu nhật/Lưu thời có sao lưu hay Tứ Hóa riêng.',
   'Không xác nhận đúng tất cả trường phái, thiên văn lịch sử hoặc giờ Tý đổi ngày.',
   'Không kiểm thử React/Next.js, API, PostgreSQL hay triển khai production.'
  ]};
}
module.exports=Object.freeze({AUDIT_ID,auditTemporalIntegrity});
