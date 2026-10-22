'use strict';
/** Source-attested HKO minor solar terms (Jie) to the published minute in HKT (UTC+8).
 * This is a READ-ONLY independent evidence layer, not the V11.94 secondary Jie table,
 * not a calculation of Da Yun or Year/Month pillars and NOT an exact-second ephemeris.
 */
const {parseInstant}=require('./da-liu-ren-zhongqi.cjs');
const {JIE_TERMS}=require('./bazi-jie-reference.cjs');
const LEDGER=require('./reference/hko-jie-primary-minute-2013-2016.json');
const DATA_SHA256='163031c8798d492238fd5be43550ae84124e0b31f91ac0ed20f170b6a6c75daa';
const TABLE_VERSION='HKO-PRIMARY-12JIE-2013-2016-V11.149.7';
const YEARS=Object.freeze([2013,2014,2015,2016]);
const COVERAGE=Object.freeze({years:YEARS,records:48,precision:'minute',timezone:'Asia/Hong_Kong',
  researchOnly:true,canCalculateYearMonthPillars:false,canCalculateDaYun:false});
const pad=v=>String(v).padStart(2,'0');
function auditPrimaryMinuteLedger(data){
 const errors=[];
 if(!data||data.tableVersion!==TABLE_VERSION||data.referenceTimezone!=='Asia/Hong_Kong'||data.utcOffsetMinutes!==480||
 data.publishedPrecision!=='minute'||data.boundaryGuardSeconds!==60||data.researchOnly!==true||
 data.allowAutomaticPillarPromotion!==false)errors.push('Metadata mismatch');
 if(!Array.isArray(data?.records)||data.records.length!==48)errors.push('Expected exactly 48 source-attested Jie instants');
 let prev=-Infinity;
 const seen=new Set();
 for(let i=0;i<(data?.records||[]).length;i++){
  const row=data.records[i],year=2013+Math.floor(i/12),month=(i%12)+1;
  const local=row?.localHkt;
  if(row?.year!==year||row?.month!==month||typeof local!=='string'||
     !new RegExp('^'+year+'-'+pad(month)+'-\\d{2}T\\d{2}:\\d{2}:00\\+08:00$').test(local||'')){
     errors.push('Malformed event '+i);continue;
  }
  const at=Date.parse(local);
  if(!Number.isFinite(at)||new Date(at+8*3600e3).toISOString().slice(0,10)!==local.slice(0,10)||
  at<=prev||(prev!==-Infinity&&(at-prev<20*864e5||at-prev>40*864e5)))errors.push('Invalid chronology '+i);
  if(seen.has(local))errors.push('Repeated instant '+i);
  seen.add(local);prev=at;
 }
 for(const y of YEARS){if(data?.sources?.[y]!==`https://www.hko.gov.hk/en/gts/astron${y}/Solar_Term_${y}.htm`)errors.push('Missing primary HKO source '+y);}
 return Object.freeze({status:errors.length?'BLOCKED':'SOURCE_TRANSCRIPTION_PASS',errors:Object.freeze(errors),records:data?.records?.length||0,
  years:YEARS,precision:'minute',independentChartFixtures:0,automaticallyPromotedPillars:0});
}
const AUDIT=auditPrimaryMinuteLedger(LEDGER);
if(AUDIT.errors.length)throw Error('Invalid official HKO Jie ledger: '+AUDIT.errors.join('; '));
const EVENTS=Object.freeze(LEDGER.records.map((row,i)=>Object.freeze({
  year:row.year,term:JIE_TERMS[i%12],month:row.month,monthIndex:(i%12+11)%12,
  solarLongitudeDegrees:(285+30*(i%12))%360,localHkt:row.localHkt,
  epochMs:Date.parse(row.localHkt),instantUtc:new Date(row.localHkt).toISOString(),
  sourceUrl:LEDGER.sources[row.year]
})));
const bounds={min:EVENTS[0].epochMs,max:Date.parse('2017-01-01T00:00:00+08:00')};
function resolvePrimaryHkoJie({instantIso}={}){
 const at=parseInstant(instantIso);
 const common={sourceId:TABLE_VERSION,instantUtc:new Date(at).toISOString(),publishedPrecision:'minute',
  timezone:'Asia/Hong_Kong',researchOnly:true,canCalculateYearMonthPillars:false,canCalculateDaYun:false};
 if(at<bounds.min-60e3||at>=bounds.max)return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:null});
 let lo=0,hi=EVENTS.length;
 while(lo<hi){const m=(lo+hi)>>>1;if(EVENTS[m].epochMs<=at)lo=m+1;else hi=m;}
 const prev=EVENTS[lo-1]||null,next=EVENTS[lo]||null;
 const boundary=[prev,next].find(x=>x&&Math.abs(x.epochMs-at)<=60000)||null;
 const expose=x=>x&&Object.freeze({year:x.year,term:x.term,month:x.month,monthIndex:x.monthIndex,
   solarLongitudeDegrees:x.solarLongitudeDegrees,localHkt:x.localHkt,instantUtc:x.instantUtc,sourceUrl:x.sourceUrl});
 if(boundary)return Object.freeze({...common,status:'BOUNDARY_REVIEW',active:null,next:expose(next),boundary:expose(boundary),
  note:'Thời điểm HKO được công bố đến phút. Sinh sát ±60 giây cần đối chiếu thiên văn chính xác hơn.'});
 if(!prev)return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:expose(next)});
 return Object.freeze({...common,status:'RESOLVED_RESEARCH_ONLY',active:expose(prev),next:expose(next),
  note:'Đối chiếu Tiết từ nguồn HKO đến phút, không tự thay đổi trụ hoặc Đại vận đã lưu.'});
}
module.exports=Object.freeze({TABLE_VERSION,YEARS,COVERAGE,DATA_SHA256,EVENTS,AUDIT,auditPrimaryMinuteLedger,resolvePrimaryHkoJie});
