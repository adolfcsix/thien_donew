'use strict';
/** V11.94: research-only minute-resolution 12 節 reference and exact-year/month Pillar mapping.
 * IMPORTANT: values transcribed from cited secondary tables that compare to HKO,
 * NOT per-second high precision ephemeris nor certified original HKO transcript.
 * No change to legacy BaZi calculation or public production API.
 */
const table=require('./reference/hko-jie-2025-2027.json');
const BaZi=require('./bazi.js');
const clock=require('./bazi-time-research.cjs');
const {parseInstant}=require('./da-liu-ren-zhongqi.cjs');
const SOURCE_ID='HKO-Jie-2025-2027-minute-v1';
const JIE_TERMS=Object.freeze(['Tiểu Hàn','Lập Xuân','Kinh Trập','Thanh Minh','Lập Hạ','Mang Chủng','Tiểu Thử','Lập Thu','Bạch Lộ','Hàn Lộ','Lập Đông','Đại Tuyết']);
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const ELEMENTS=Object.freeze(['Mộc','Mộc','Hỏa','Hỏa','Thổ','Thổ','Kim','Kim','Thủy','Thủy']);
const mod=(n,m)=>((n%m)+m)%m;
function makePillar(stemIndex,branchIndex,dayStemIndex){
 const p={stem:STEMS[stemIndex],branch:BRANCHES[branchIndex],stemIndex,branchIndex,
   name:`${STEMS[stemIndex]} ${BRANCHES[branchIndex]}`,element:ELEMENTS[stemIndex],
   polarity:stemIndex%2===0?'Dương':'Âm',tenGod:BaZi.tenGod(dayStemIndex,stemIndex),
   hiddenStems:BaZi.hiddenStems(branchIndex,dayStemIndex)};
 return Object.freeze(p);
}
function loadEvents(){
 if(table.tableVersion!==SOURCE_ID||table.referenceTimezone!=='Asia/Hong_Kong'||
    table.referenceUtcOffsetMinutes!==480||table.publishedPrecision!=='minute'||
    table.boundaryGuardSeconds!==60||table.records?.length!==36||table.sources?.length!==3)throw Error('Invalid Jie reference metadata');
 let before=-Infinity;
 const items=table.records.map((row,i)=>{
  const year=2025+Math.floor(i/12),term=JIE_TERMS[i%12];
  if(row.year!==year||row.term!==term||row.monthIndex!==mod(i%12-1,12)||
    row.solarLongitudeDegrees!==mod(285+30*(i%12),360)||
    !row.localHkt.startsWith(`${year}-`)||!row.localHkt.endsWith('+08:00')||
    !/T\d{2}:\d{2}:00\+08:00$/.test(row.localHkt))throw Error('Invalid Jie event sequence '+i);
  const at=parseInstant(row.localHkt);
  if(at<=before||(i>0 && (at-before<20*864e5||at-before>40*864e5)))throw Error('Jie chronology failure '+i);
  before=at;
  return Object.freeze({...row,epochMs:at,instantUtc:new Date(at).toISOString()});
 });
 if(parseInstant(table.validFromInclusive)!==items[0].epochMs||
    parseInstant(table.validUntilExclusive)<=items.at(-1).epochMs||
    parseInstant(table.validUntilExclusive)>Date.UTC(2028,0,1))throw Error('Invalid Jie coverage bounds');
 if(table.sources.some((s,i)=>s.year!==2025+i||!s.url.startsWith('https://')||!s.officialHkoYearIndex.startsWith('https://')))
    throw Error('Missing independent source provenance');
 return Object.freeze(items);
}
const EVENTS=loadEvents();
const COVERAGE=Object.freeze({fromInclusive:table.validFromInclusive,untilExclusive:table.validUntilExclusive,
 sourceId:SOURCE_ID,years:Object.freeze(table.years),guardSeconds:60,publishedPrecision:'minute',
 provenance:'secondary transcription cross-referenced with HKO year almanacs; original source line-by-line validation pending'});
/** ISO instant MUST include offset. A boundary minute is an uncertainty window, not exact ingress. */
function resolveJieAt({instantIso}={}){
 const t=parseInstant(instantIso);
 const common={sourceId:SOURCE_ID,instantUtc:new Date(t).toISOString(),publishedPrecision:'minute',researchOnly:true};
 // Allow a pre-first-event guard; otherwise never infer a prior Jie.
 if(t<EVENTS[0].epochMs-60000||t>=parseInstant(table.validUntilExclusive))
    return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:null});
 let lo=0,hi=EVENTS.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(EVENTS[mid].epochMs<=t)lo=mid+1;else hi=mid;}
 const prev=EVENTS[lo-1]||null,next=EVENTS[lo]||null;
 const near=[prev,next].find(ev=>ev&&Math.abs(ev.epochMs-t)<=60000);
 const commonEvent=ev=>ev&&Object.freeze({year:ev.year,term:ev.term,monthIndex:ev.monthIndex,
   solarLongitudeDegrees:ev.solarLongitudeDegrees,localHkt:ev.localHkt,instantUtc:ev.instantUtc});
 if(near){
  const i=EVENTS.indexOf(near);
  return Object.freeze({...common,status:'BOUNDARY_REVIEW',active:null,
    boundary:commonEvent(near),before:commonEvent(EVENTS[i-1]||null),after:commonEvent(near),
    note:'Published-minute Jie time ±60 seconds needs high-precision astronomical cross-check'});
 }
 if(!prev)return Object.freeze({...common,status:'OUT_OF_COVERAGE',active:null,next:commonEvent(next)});
 return Object.freeze({...common,status:'RESOLVED',active:commonEvent(prev),next:commonEvent(next)});
}
/** Recompute ONLY year/month pillars from calendar Jie. Day/hour delegated to V11.93's clock modes.
 * A missing/uncertain reference NEVER falls back to approximate year/month output.
 */
function evaluateWithReferenceJie(input){
 const valid=clock.assertInput(input);
 const base=clock.evaluate(input);
 const resolution=resolveJieAt({instantIso:new Date(valid.utcMs).toISOString()});
 const day=base.pillars.day,hour=base.pillars.hour;
 const {year:legacyYear,month:legacyMonth}=base.pillars;
 if(resolution.status!=='RESOLVED')return Object.freeze({ruleSet:'bazi-hko-jie-calendar-research-v11.94',researchOnly:true,
    status:resolution.status,referenceJie:resolution,yearMonthPillars:null,
    pillars:Object.freeze({year:null,month:null,day,hour}),dayMaster:base.dayMaster,
    relations:null,comparisonWithLegacy:null,clockStatus:base.boundaryCheck.withinFiveMinutes?'REVIEW_REQUIRED':'PROVISIONAL',
    note:'Trụ năm/tháng bị bỏ trống: không tự suy từ nội suy kinh độ Mặt Trời hoặc dữ liệu ngoài phạm vi; ngày/giờ vẫn tạm tính theo V11.93.'});
 const {year,monthIndex}=resolution.active;
 const solarYear=monthIndex===11?year-1:year;
 const yearStem=mod(solarYear-4,10),yearBranch=mod(solarYear-4,12);
 const monthStem=mod((yearStem%5)*2+2+monthIndex,10);
 const yearP=makePillar(yearStem,yearBranch,day.stemIndex);
 const monthP=makePillar(monthStem,mod(monthIndex+2,12),day.stemIndex);
 const pillars=Object.freeze({year:yearP,month:monthP,day,hour});
 const differs=Object.freeze(['year','month'].filter(k=>pillars[k].name!==base.pillars[k].name));
 return Object.freeze({ruleSet:'bazi-hko-jie-calendar-research-v11.94',researchOnly:true,
   status:base.boundaryCheck.withinFiveMinutes?'CLOCK_REVIEW':'PROVISIONAL',
   clockStatus:base.boundaryCheck.withinFiveMinutes?'REVIEW_REQUIRED':'PROVISIONAL',referenceJie:resolution,yearMonthPillars:Object.freeze({year:yearP,month:monthP}),
   pillars,dayMaster:base.dayMaster,relations:BaZi.detectRelations(pillars),
   comparisonWithLegacy:Object.freeze({legacyPillars:Object.freeze({year:legacyYear.name,month:legacyMonth.name}),
    differs,legacyNearJie:base.boundaryCheck.nearJie}),
   solarYear,monthIndex,actualUtc:base.timestamps.utc,
   note:'Minute-resolution reference only: 2025–2027; time-zone input supplied by researcher. V11.93 day/hour only. Not a verified ephemeris or production chart.'});
}
module.exports=Object.freeze({SOURCE_ID,JIE_TERMS,EVENTS,COVERAGE,resolveJieAt,evaluateWithReferenceJie});
