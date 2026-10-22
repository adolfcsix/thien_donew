'use strict';
/** HKO Gregorian-Lunar official DATE-ONLY witness for 2017–2023.
 * Never turn a calendar date into a midnight Jie instant or into a month pillar.
 * This stays distinct from the 2013–2016 primary minute records and 2025–2027 secondary table.
 */
const {parseInstant}=require('./da-liu-ren-zhongqi.cjs');
const {JIE_TERMS}=require('./bazi-jie-reference.cjs');
const LEDGER=require('./reference/hko-jie-official-days-2017-2023.json');
const TABLE_VERSION='HKO-OFFICIAL-CALENDAR-12JIE-2017-2023-V11.149.8';
const DATA_SHA256='0ee5d2b02b6af06ccdd88a8f240afd39cbc223491a0458546b644c078541f865';
const YEARS=Object.freeze([2017,2018,2019,2020,2021,2022,2023]);
const pad=x=>String(x).padStart(2,'0');
function auditOfficialDayLedger(data){
 const errors=[];
 if(data?.tableVersion!==TABLE_VERSION||data?.referenceTimezone!=='Asia/Hong_Kong'||
  data?.publishedPrecision!=='calendar-day'||data?.researchOnly!==true||
  data?.allowAutomaticPillarPromotion!==false||JSON.stringify(data?.years)!==JSON.stringify(YEARS))
   errors.push('Invalid metadata or forbidden automatic promotion');
 if(!Array.isArray(data?.records)||data.records.length!==84)errors.push('Expected 84 official 12-Jie dates (2017–2023)');
 let prev=-Infinity;
 for(let i=0;i<(data?.records||[]).length;i++){
  const event=data.records[i],year=2017+Math.floor(i/12),month=i%12+1;
  if(event?.year!==year||event?.month!==month||!Number.isInteger(event?.day)||event.day<1||event.day>10||
   Object.keys(event).sort().join(',')!=='day,month,year'){
    errors.push('Malformed source witness '+i);continue;
  }
  const date=`${year}-${pad(month)}-${pad(event.day)}`,t=Date.parse(date+'T00:00:00+08:00');
  if(!Number.isFinite(t)||t<=prev||(prev!==-Infinity&&(t-prev<20*864e5||t-prev>40*864e5)))
   errors.push('Chronology failed '+i);
  prev=t;
 }
 for(const year of YEARS){
  if(data?.sources?.[year]!==`https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/${year}e.pdf`)
   errors.push('Missing official PDF '+year);
 }
 if(data?.records?.some(row=>['localHkt','instantUtc','epochMs','time','hour','minute'].some(k=>Object.hasOwn(row,k))))
  errors.push('Date-only evidence cannot claim hour/minute/instant');
 return Object.freeze({status:errors.length?'BLOCKED':'DATE_WITNESS_PASS',errors:Object.freeze(errors),
  years:YEARS,records:data?.records?.length||0,precision:'calendar-day',verifiedMinuteTimes:0,
  automaticallyPromotedPillars:0});
}
const AUDIT=auditOfficialDayLedger(LEDGER);
if(AUDIT.errors.length)throw Error('Invalid HKO date witness: '+AUDIT.errors.join('; '));
const EVENTS=Object.freeze(LEDGER.records.map((row,i)=>Object.freeze({
 year:row.year,month:row.month,day:row.day,term:JIE_TERMS[i%12],
 solarLongitudeDegrees:(285+30*(i%12))%360,
 localHktDate:`${row.year}-${pad(row.month)}-${pad(row.day)}`,sourceUrl:LEDGER.sources[row.year]
})));
function resolveOfficialHkoJieDay({instantIso}={}){
 const t=parseInstant(instantIso),date=new Date(t+480*60000).toISOString().slice(0,10);
 const year=Number(date.slice(0,4));
 const common={sourceId:TABLE_VERSION,localHktDate:date,timezone:'Asia/Hong_Kong',
 publishedPrecision:'calendar-day',researchOnly:true,canResolveJieInstant:false,
 canCalculateYearMonthPillars:false,canCalculateDaYun:false};
 if(!YEARS.includes(year))return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:null});
 const events=EVENTS.filter(row=>row.year===year);
 let active=null,next=null;
 for(const e of events){if(e.localHktDate<=date)active=e;else{next=e;break;}}
 const onJieDate=active?.localHktDate===date;
 return Object.freeze({...common,status:onJieDate?'ON_JIE_DATE':'DATE_ONLY_CONTEXT',
  active,next,sourceUrl:LEDGER.sources[year],
  note:onJieDate?'HKO xác nhận ngày Tiết nhưng không có giờ giao tiết: không thể chốt trụ tháng theo phút.':
    'Chỉ có ngày Tiết chính thức; thời điểm giao tiết và trụ tháng/Đại vận chuyên sâu chưa được xác minh.'});
}
module.exports=Object.freeze({TABLE_VERSION,YEARS,DATA_SHA256,EVENTS,AUDIT,
 auditOfficialDayLedger,resolveOfficialHkoJieDay});
