'use strict';
/** Official HKO calendar DATE-only witness, not a Jie ingress instant or a replacement
 * for the 2025-2027 minute-resolution research dataset. Never derive pillars from it.
 */
const {parseInstant}=require('./da-liu-ren-zhongqi.cjs');
const Jie=require('./bazi-jie-reference.cjs');
const SOURCE='hko-gregorian-lunar-calendar-day-v11.149.6';
const DAYS=Object.freeze({
  2024:Object.freeze([6,4,5,4,5,5,6,7,7,8,7,6]),
  2028:Object.freeze([6,4,5,4,5,5,6,7,7,8,7,6])
});
const SOURCES=Object.freeze({
  2024:'https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2024e.pdf',
  2028:'https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2028e.pdf'
});
const TERM_DATES=Object.freeze(Object.entries(DAYS).flatMap(([year,arr])=>arr.map((day,i)=>Object.freeze({
 year:Number(year),term:Jie.JIE_TERMS[i],month:i+1,day,localHktDate:`${year}-${String(i+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
 solarLongitudeDegrees:(285+i*30)%360,sourceUrl:SOURCES[year]
}))));
function auditDayLedger(records=TERM_DATES){
 const errors=[];if(!Array.isArray(records)||records.length!==24)errors.push('Expected 24 date-only witnesses');
 const keys=new Set();
 for(const r of records||[]){
  if(!DAYS[r.year]||r.term!==Jie.JIE_TERMS[r.month-1]||r.day!==DAYS[r.year]?.[r.month-1]||
   r.localHktDate!==`${r.year}-${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`||
   r.solarLongitudeDegrees!==(285+(r.month-1)*30)%360||r.sourceUrl!==SOURCES[r.year])errors.push('Invalid calendar-day evidence');
  if(keys.has(r.localHktDate))errors.push('Duplicate Jie calendar date');keys.add(r.localHktDate);
  if(Object.hasOwn(r,'instantUtc')||Object.hasOwn(r,'time')||Object.hasOwn(r,'epochMs'))errors.push('Date-only witness cannot carry invented instant');
 }
 return Object.freeze({errors,records:records?.length||0,years:Object.freeze([2024,2028]),precision:'calendar-day',verifiedMinuteTimes:0});
}
if(auditDayLedger().errors.length)throw Error('Invalid HKO date-only witness ledger');
function resolveJieDayEvidence({instantIso}={}){
 const utc=parseInstant(instantIso);
 // HKO's calendar consistently uses UTC+08:00. Do NOT infer date using machine/browser timezone.
 const date=new Date(utc+8*3600*1000).toISOString().slice(0,10);
 const year=Number(date.slice(0,4)),yearRecords=TERM_DATES.filter(r=>r.year===year);
 const shared={sourceId:SOURCE,localHktDate:date,timezone:'Asia/Hong_Kong',publishedPrecision:'calendar-day',
  researchOnly:true,canResolveJieInstant:false,canCalculateYearMonthPillars:false};
 if(!yearRecords.length)return Object.freeze({...shared,status:'OUT_OF_COVERAGE',active:null,next:null});
 let prior=null,next=null;
 for(const row of yearRecords){if(row.localHktDate<=date)prior=row;else{next=row;break;}}
 const exact=prior?.localHktDate===date;
 return Object.freeze({...shared,status:exact?'ON_JIE_DATE':'DATE_ONLY_CONTEXT',
  active:prior||null,next:next||null,sourceUrl:SOURCES[year],
  note:exact?'Ngày tiết theo lịch HKO, nhưng không có giờ/phút giao tiết: không quyết định trụ tháng.':
       'Chỉ biết ngày các tiết theo lịch HKO, chưa có giờ giao tiết để chốt trụ năm/tháng hay Đại vận.'});
}
module.exports=Object.freeze({SOURCE,SOURCES,TERM_DATES,auditDayLedger,resolveJieDayEvidence});
