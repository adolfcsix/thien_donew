'use strict';
/** V11.149.9 release gate: NAOJ 2017–2023 ingress timestamps, HKO calendar-day witnesses,
 * current Tử Vi inventories and unresolved school gates. No algorithm promotion. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const astro=require('../../packages/astrology-engine/src/bazi-jie-naoj-minute-v111499.cjs');
const day=require('../../packages/astrology-engine/src/bazi-jie-hko-days-v111498.cjs');
const hkoMinute=require('../../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const stars=require('../../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
const inventory=require('./audit-star-period-evidence-v111495.cjs');
const FROZEN_SHA256='101b2313926a9c0b20c5305f03571a336a120ef8091ccc71f369a25dda85f03e';
function audit(){
 const file=path.join(root,'packages/astrology-engine/src/reference/naoj-jie-primary-minute-2017-2023.json');
 const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const st=stars.auditWitnesses(),inv=inventory.audit();
 const errors=[...astro.AUDIT.errors,...day.AUDIT.errors,...st.errors,...inv.errors];
 if(digest!==FROZEN_SHA256||astro.DATA_SHA256!==FROZEN_SHA256)errors.push('NAOJ transcript changed without new source review');
 if(astro.EVENTS.length!==84||astro.AUDIT.matchedHkoCalendarDates!==84)errors.push('Incomplete minute evidence / HKO civil date mismatch');
 if(day.EVENTS.length!==84||hkoMinute.EVENTS.length!==48)errors.push('Old independent HKO witness tables changed');
 if(inv.coverage.natalAndCycle!==104||inv.coverage.palaces!==12||inv.coverage.mainStars!==14||
  inv.coverage.annualStars!==12||inv.coverage.annualTransformations!==4)errors.push('Tử Vi star/court/period inventory mismatch');
 if(st.counts.missing!==11||st.counts.aliases!==4||st.counts.automaticNewPlacements!==0||st.counts.independentApproved!==0)
  errors.push('Unreviewed Tử Vi candidates promoted');
 for(const event of astro.EVENTS){
  if(!/^https:\/\/eco\.mtk\.nao\.ac\.jp\/cgi-bin\/koyomi\/cande\/phenomena_sy_en\.cgi\?year=20\d\d$/.test(event.sourceUrl))
   errors.push('Unrecognized NAOJ provenance '+event.year);
  if(!event.hkoDayWitnessUrl.startsWith('https://www.hko.gov.hk/'))errors.push('Missing HKO witness '+event.year);
 }
 return Object.freeze({version:'11.149.9',status:errors.length?'BLOCKED':'CROSS_SOURCE_AUDIT_PASS',
  naoj:{years:astro.YEARS,minuteEvents:astro.EVENTS.length,timeZone:'Asia/Tokyo',hkoDateMatches:astro.AUDIT.matchedHkoCalendarDates,sha256:digest},
  hko:{calendarDayEvents:day.EVENTS.length,existingMinuteEvents:hkoMinute.EVENTS.length},
  tuvi:{nativeNames:inv.coverage.natalAndCycle,mainStars:14,palaces:12,annualStars:12,annualTransformations:4,
   unresolvedStars:st.counts.missing,unresolvedAliases:st.counts.aliases,newlyPlacedUnreviewedStars:0},
  boundaryGuardSeconds:120,newNatalPillarCalculations:0,newDaYunCalculations:0,independentSchoolReviews:0,
  limitations:['NAOJ calculated solar-term timestamp does not certify Bát Tự school-specific birth boundaries',
   'NAOJ timestamps are precise to minute, not exact second; ±2 minute ingress review required',
   'The HKO witness independently checks the calendar date, not the exact minute',
   'Tử Vi 11 disputed names, 4 aliases and unreviewed subannual transit layers remain blocked'],errors});
}
if(require.main===module){const result=audit();console.log(JSON.stringify(result,null,2));
 if(process.argv.includes('--write')){fs.mkdirSync(path.join(root,'docs/reports'),{recursive:true});fs.writeFileSync(path.join(root,'docs/reports/V11_149_9_NAOJ_STAR_AUDIT.json'),JSON.stringify(result,null,2)+'\n');}
 if(result.errors.length)process.exitCode=1;
}
module.exports={audit,FROZEN_SHA256};
