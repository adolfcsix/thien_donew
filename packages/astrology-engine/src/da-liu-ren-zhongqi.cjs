'use strict';
/**
 * V11.89: OFFLINE reference-table resolver of 大六壬 月将 by 12 中气 instants.
 * Source: Hong Kong Observatory 2025-2027 *major* solar terms, published in HKT.
 * These are printed-minute timestamps, NOT second-precision astronomical events.
 * Return 'boundary-needs-verification' near an ingress; do not guess.
 * Deliberately isolated from production Bazi, Qimen, and public APIs.
 */
const table = require('./reference/hko-zhongqi-2025-2027.json');
const { ZHONG_QI, BRANCHES, buildHeavenEarthPlates } = require('./da-liu-ren-plates.cjs');
const YEAR_TERMS=Object.freeze(['Đại Hàn','Vũ Thủy','Xuân Phân','Cốc Vũ','Tiểu Mãn','Hạ Chí','Đại Thử','Xử Thử','Thu Phân','Sương Giáng','Tiểu Tuyết','Đông Chí']);
const SOURCE_ID='HKO-major-solar-terms-2025-2027-v1';
function parseInstant(instantIso) {
  if (typeof instantIso !== 'string') throw new TypeError('instantIso must be an ISO 8601 timestamp with explicit Z or ±hh:mm offset');
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(instantIso);
  if (!m) throw new RangeError('Require YYYY-MM-DDTHH:mm:ss[.sss]Z or ±hh:mm; local times without offset are ambiguous');
  const [,yy,mo,dd,hh,mm,ss,frac,zone,sign,offh,offm]=m;
  const [y,month,d,h,minute,sec]=[yy,mo,dd,hh,mm,ss].map(Number);
  const offset=zone==='Z'?0:(Number(offh)*60+Number(offm))*(sign==='-'?-1:1);
  if (y<100 || month<1 || month>12 || d<1 || d>31 || h>23 || minute>59 || sec>59 ||
      (zone!=='Z'&&(Number(offh)>14||Number(offm)>59||(Number(offh)===14&&Number(offm)>0))))
    throw new RangeError('Invalid date, time or UTC offset');
  const wall=Date.UTC(y,month-1,d,h,minute,sec,Number((frac||'').padEnd(3,'0')));
  const check=new Date(wall);
  if (check.getUTCFullYear()!==y||check.getUTCMonth()!==month-1||check.getUTCDate()!==d)
    throw new RangeError('Invalid Gregorian calendar date');
  const epoch=wall-offset*60000;
  if (!Number.isFinite(epoch)) throw new RangeError('Timestamp outside representable date range');
  return epoch;
}
function assertFields(obj,required) {
  if (!obj || typeof obj!=='object'||Array.isArray(obj) ||
    Object.keys(obj).sort().join(',')!==required.slice().sort().join(','))
    throw new TypeError('Require exactly {'+required.join(', ')+'}; no inferred hour branch or missing offset');
}
// Fail at module load if the curated reference data is corrupt or silently reordered.
function validateReference() {
  if (table.tableVersion!==SOURCE_ID||table.referenceUtcOffsetMinutes!==480||
      table.referenceTimezone!=='Asia/Hong_Kong'||table.boundaryGuardSeconds!==60||
      table.publishedPrecision!=='minute'||table.records.length!==36||table.sources.length!==3)
    throw new Error('Invalid or incomplete HKO zhongqi reference metadata');
  let prior=-Infinity;
  const events=table.records.map((row,index)=>{
    const year=2025+Math.floor(index/12), term=YEAR_TERMS[index%12];
    if(row.year!==year||row.term!==term||row.solarLongitudeDegrees!==(300+30*(index%12))%360||
       monthGeneralAfter(term)===null)throw new Error('HKO term sequence or longitude mismatch '+index);
    if(!row.localHkt.startsWith(String(year)+'-')||!row.localHkt.endsWith('+08:00'))
      throw new Error('HKO event time must carry year and +08:00 offset');
    const epoch=parseInstant(row.localHkt);
    if(epoch<=prior || (index>0 && epoch-prior<20*86400000) || (index>0&&epoch-prior>35*86400000))
      throw new Error('HKO term events out of sequence');
    prior=epoch;
    return Object.freeze({year,term,solarLongitudeDegrees:row.solarLongitudeDegrees,
      localHkt:row.localHkt,instantUtc:new Date(epoch).toISOString(),epochMs:epoch,
      monthGeneral:ZHONG_QI[term]});
  });
  const from=parseInstant(table.validFromInclusive),until=parseInstant(table.validUntilExclusive);
  if(from!==events[0].epochMs||until<=events.at(-1).epochMs||until>Date.UTC(2028,0,2))
    throw new Error('Invalid reference coverage: never extrapolate outside HKO table');
  return Object.freeze(events);
}
function monthGeneralAfter(term) {return Object.hasOwn(ZHONG_QI,term)?ZHONG_QI[term]:null;}
const EVENTS=validateReference();
const COVERAGE=Object.freeze({fromInclusive:table.validFromInclusive,untilExclusive:table.validUntilExclusive,
  source:SOURCE_ID,publishedPrecision:'minute',boundaryGuardSeconds:60,
  years:Object.freeze([2025,2026,2027])});
const EVIDENCE=Object.freeze({sourceId:SOURCE_ID,publisher:'Hong Kong Observatory',
  timezone:'Asia/Hong_Kong',utcOffsetMinutes:480,
  urls:Object.freeze(table.sources.map(x=>x.url)),
  limits:Object.freeze(['Published to minute precision, not an exact second',
    'Date range restricted to reference records (no extrapolation)',
    'Solar terms use 中气, NOT 12 节气 for Bazi month pillar',
    'Hour branch is never inferred: rules differ by locality/solar time',
    'No Four Lessons, Three Transmissions or interpretive predictions'])});
function resolveMonthGeneralAt(input) {
  assertFields(input,['instantIso']);
  const instantMs=parseInstant(input.instantIso);
  const instantUtc=new Date(instantMs).toISOString();
  const common={instantUtc,source:EVIDENCE,coverage:COVERAGE};
  if(instantMs<parseInstant(COVERAGE.fromInclusive)||instantMs>=parseInstant(COVERAGE.untilExclusive))
    return Object.freeze({...common,status:'unsupported-date',monthGeneral:null,term:null,
      reason:'Outside the independently documented 2025–2027 HKO table; no extrapolation'});
  // Binary search for previous official solar term.
  let low=0,high=EVENTS.length;
  while(low<high){const mid=(low+high)>>1;if(EVENTS[mid].epochMs<=instantMs)low=mid+1;else high=mid;}
  const previous=EVENTS[low-1]||null,next=EVENTS[low]||null;
  const guard=60000; // 1 minute each side protects the published-minute rounding interval.
  const near=[previous,next].find(x=>x&&Math.abs(x.epochMs-instantMs)<=guard);
  if(near){
    const beforeIndex=EVENTS.indexOf(near)-1;
    return Object.freeze({...common,status:'boundary-needs-verification',monthGeneral:null,
      term:null,nearTerm:near.term,publishedBoundaryUtc:near.instantUtc,
      candidateBefore:beforeIndex>=0?EVENTS[beforeIndex].monthGeneral:null,
      candidateAfter:near.monthGeneral,
      reason:'Official instant is rounded to a minute; within ±60 seconds requires higher-precision ephemeris'});
  }
  if(!previous)throw new Error('Unreachable coverage state');
  return Object.freeze({...common,status:'reference-resolved-only',term:previous.term,
    monthGeneral:previous.monthGeneral,lastBoundaryUtc:previous.instantUtc,
    nextBoundaryUtc:next?.instantUtc||null,
    reason:'Lookup of independently published HKO minute-resolution reference table; not ephemeris calculation'});
}
function buildHeavenEarthPlatesAt(input) {
  assertFields(input,['instantIso','divinationHour']);
  if (!BRANCHES.includes(input.divinationHour)) throw new RangeError('Invalid manual divinationHour branch');
  const resolved=resolveMonthGeneralAt({instantIso:input.instantIso});
  if(resolved.status!=='reference-resolved-only')return Object.freeze({status:resolved.status,
    plate:null,resolution:resolved,methodId:'dai-luc-nham-yuejiang-reference-2025-2027'});
  const plate=buildHeavenEarthPlates({monthGeneral:resolved.monthGeneral,divinationHour:input.divinationHour});
  return Object.freeze({status:'research-reference-only',plate,resolution:resolved,
    methodId:'dai-luc-nham-yuejiang-reference-2025-2027'});
}
module.exports=Object.freeze({SOURCE_ID,YEAR_TERMS,EVENTS,COVERAGE,EVIDENCE,parseInstant,
  resolveMonthGeneralAt,buildHeavenEarthPlatesAt});
