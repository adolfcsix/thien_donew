'use strict';
/** Independent, read-only NAOJ astronomical Jie witness (JST UTC+9, published minute).
 * This table must NEVER change the existing Bazi pillars or Da Yun without separately
 * accepted timezone/birth-boundary and school rules and verified chart fixtures.
 */
const {parseInstant}=require('./da-liu-ren-zhongqi.cjs');
const {JIE_TERMS}=require('./bazi-jie-reference.cjs');
const ledger=require('./reference/naoj-jie-primary-minute-2017-2023.json');
const hko=require('./reference/hko-jie-official-days-2017-2023.json');
const TABLE_VERSION='NAOJ-ASTRONOMICAL-JIE-2017-2023-V11.149.9';
const YEARS=Object.freeze([2017,2018,2019,2020,2021,2022,2023]);
// Reviewed digest of the original ledger bytes. The Node-only release audit
// recomputes and compares it; browser imports must never read the filesystem.
const DATA_SHA256='101b2313926a9c0b20c5305f03571a336a120ef8091ccc71f369a25dda85f03e';
const pad=x=>String(x).padStart(2,'0');
function auditNaOJMinuteLedger(data,calendar=hko){
 const errors=[],months=YEARS.length*12;
 if(data?.tableVersion!==TABLE_VERSION||data?.referenceTimezone!=='Asia/Tokyo'||data?.utcOffsetMinutes!==540||
 data?.publishedPrecision!=='minute'||data?.boundaryGuardSeconds!==120||data?.researchOnly!==true||
 data?.allowAutomaticPillarPromotion!==false)errors.push('NAOJ source metadata / promotion policy mismatch');
 if(!Array.isArray(data?.records)||data.records.length!==months)errors.push('Expected 84 NAOJ minor solar terms');
 if(!Array.isArray(calendar?.records)||calendar.records.length!==months)errors.push('HKO date-only witness must contain 84 records');
 let last=-Infinity;const seen=new Set();
 for(let i=0;i<(data?.records||[]).length;i++){
  const row=data.records[i],year=2017+Math.floor(i/12),month=1+i%12;
  if(row?.year!==year||row?.month!==month||Object.keys(row).sort().join(',')!=='localJst,month,year'||
   !new RegExp(`^${year}-${pad(month)}-\\d{2}T\\d{2}:\\d{2}:00\\+09:00$`).test(row?.localJst||'')){
   errors.push('NAOJ record malformed '+i);continue;
  }
  const at=Date.parse(row.localJst);
  if(!Number.isFinite(at)){errors.push('Invalid NAOJ event datetime '+i);continue;}
  if(at<=last||(last!==-Infinity&&(at-last<20*864e5||at-last>40*864e5)))errors.push('NAOJ chronology invalid '+i);
  const hktDate=new Date(at+8*3600e3).toISOString().slice(0,10);
  const ref=calendar?.records?.[i];
  if(ref?.year!==year||ref?.month!==month||hktDate!==`${year}-${pad(month)}-${pad(ref?.day)}`)
   errors.push(`NAOJ and independent HKO calendar-day mismatch for ${year}-${pad(month)}`);
  if(seen.has(row.localJst))errors.push('Repeated NAOJ instant '+i);
  seen.add(row.localJst);last=at;
 }
 for(const year of YEARS){
  if(data?.sources?.[year]!==`https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=${year}`)
   errors.push('Missing NAOJ official source '+year);
 }
 if(data?.records?.some(r=>r.instantUtc!==undefined||r.localHkt!==undefined||r.second!==undefined))
  errors.push('Source ledger must preserve original JST-minute transcription only');
 return Object.freeze({status:errors.length?'BLOCKED':'CROSS_SOURCE_DAY_MATCH',errors:Object.freeze(errors),records:data?.records?.length||0,
  matchedHkoCalendarDates:months-errors.filter(x=>x.includes('calendar-day mismatch')).length,years:YEARS,
  precision:'minute',independentChartFixtures:0,automaticallyPromotedPillars:0});
}
const AUDIT=auditNaOJMinuteLedger(ledger);
if(AUDIT.errors.length)throw Error('Invalid NAOJ solar terms ledger: '+AUDIT.errors.join('; '));
const EVENTS=Object.freeze(ledger.records.map((row,i)=>{
 const at=Date.parse(row.localJst),hkt=new Date(at+8*3600e3).toISOString().slice(0,19)+'+08:00';
 return Object.freeze({year:row.year,month:row.month,term:JIE_TERMS[i%12],
  solarLongitudeDegrees:(285+30*(i%12))%360,localJst:row.localJst,localHkt:hkt,
  epochMs:at,instantUtc:new Date(at).toISOString(),sourceUrl:ledger.sources[row.year],
  hkoDayWitnessUrl:hko.sources[row.year]});
}));
function resolveNaOJJie({instantIso}={}){
 const t=parseInstant(instantIso);
 const common={sourceId:TABLE_VERSION,instantUtc:new Date(t).toISOString(),publishedPrecision:'minute',
  originalTimezone:'Asia/Tokyo',displayTimezone:'Asia/Hong_Kong',researchOnly:true,
  canCalculateYearMonthPillars:false,canCalculateDaYun:false};
 // Guard the full public timestamp range; do not extrapolate beyond last verified minute.
 if(t<EVENTS[0].epochMs||t>=Date.parse('2024-01-01T00:00:00+09:00'))
  return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:null});
 let lo=0,hi=EVENTS.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(EVENTS[mid].epochMs<=t)lo=mid+1;else hi=mid;}
 const prev=EVENTS[lo-1]||null,next=EVENTS[lo]||null;
 const boundary=[prev,next].find(e=>e&&Math.abs(t-e.epochMs)<=120000)||null;
 const expose=e=>e&&Object.freeze({year:e.year,month:e.month,term:e.term,solarLongitudeDegrees:e.solarLongitudeDegrees,
  localJst:e.localJst,localHkt:e.localHkt,instantUtc:e.instantUtc,sourceUrl:e.sourceUrl,hkoDayWitnessUrl:e.hkoDayWitnessUrl});
 if(boundary)return Object.freeze({...common,status:'BOUNDARY_REVIEW',active:null,next:expose(next),boundary:expose(boundary),
  note:'Sát mốc ±2 phút do NAOJ công bố tới phút; cần đối chiếu thêm phương pháp thiên văn và quy tắc trường phái.'});
 return Object.freeze({...common,status:'RESOLVED_RESEARCH_ONLY',active:expose(prev),next:expose(next),
  note:'Thời điểm Tiết NAOJ theo JST, đã đổi sang HKT và xác minh ngày HKO; chỉ phục vụ nghiên cứu, không tự an trụ hoặc Đại vận.'});
}
module.exports=Object.freeze({TABLE_VERSION,YEARS,DATA_SHA256,AUDIT,EVENTS,auditNaOJMinuteLedger,resolveNaOJJie});
