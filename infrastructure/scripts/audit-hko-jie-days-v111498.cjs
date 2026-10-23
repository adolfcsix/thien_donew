'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const hko=require('../../packages/astrology-engine/src/bazi-jie-hko-days-v111498.cjs');
const primary=require('../../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const legacy=require('../../packages/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs');
const star=require('../../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
function audit(){
 const file=path.join(root,'packages/astrology-engine/src/reference/hko-jie-official-days-2017-2023.json');
 const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const st=star.auditWitnesses();
 const errors=[...hko.AUDIT.errors,...st.errors];
 if(hko.DATA_SHA256!==digest)errors.push('HKO day ledger changed without verifying original PDF transcription');
 if(hko.EVENTS.length!==84||hko.YEARS.length!==7)errors.push('Incomplete official HKO calendar-day series');
 if(hko.EVENTS.some(e=>!/^https:\/\/www\.hko\.gov\.hk\/en\/gts\/time\/calendar\/pdf\/files\/20\d\de\.pdf$/.test(e.sourceUrl)))errors.push('Missing HKO official calendar source');
 if(primary.EVENTS.length!==48||legacy.TERM_DATES.length!==24)errors.push('Previously frozen sources unexpectedly changed');
 if(st.counts.automaticNewPlacements!==0||st.counts.independentApproved!==0)errors.push('Disputed Tử Vi stars illegally promoted');
 const out={version:'11.149.8',status:errors.length?'BLOCKED':'SOURCE_WITNESS_PASS',
  calendarDayYears:hko.YEARS,calendarDayWitnesses:hko.EVENTS.length,
  officialMinuteYears:primary.YEARS,officialMinuteWitnesses:primary.EVENTS.length,
  otherOfficialDayYears:[2024,2028],secondaryResearchMinuteYears:[2025,2026,2027],
  sha256:digest,minuteInstantsAdded:0,automaticallyPromotedPillars:0,
  unresolvedTuvistars:st.counts.missing,unresolvedAliases:st.counts.aliases,
  note:'Official dates only: never interpolate hours or compute birth year/month/Da Yun from these 84 dates.',errors};
 return out;
}
if(require.main===module){const r=audit();console.log(JSON.stringify(r,null,2));
 if(process.argv.includes('--write')){fs.mkdirSync(path.join(root,'docs/reports'),{recursive:true});fs.writeFileSync(path.join(root,'docs/reports/V11_149_8_HKO_DAY_SOURCE_AUDIT.json'),JSON.stringify(r,null,2)+'\n');}
 if(r.errors.length)process.exitCode=1;
}
module.exports={audit};
