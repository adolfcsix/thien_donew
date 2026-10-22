'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const calendar=require('../../packages/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs');
const stars=require('../../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
function audit(){
 const day=calendar.auditDayLedger(),starsGate=stars.auditWitnesses();
 const problems=[...day.errors,...starsGate.errors];
 return {version:'11.149.6',status:problems.length?'BLOCKED':'SOURCE_EVIDENCE_PASS',
  calendar:{referenceYears:[2024,2028],verifiedCalendarDates:day.records,verifiedMinuteInstants:0,
   sourceUrls:calendar.SOURCES,legacyMinuteReferenceYears:[2025,2026,2027],
   yearMonthPillarsNewlyEnabled:0},
  stars:{unresolvedNames:starsGate.counts.missing,unresolvedAliases:starsGate.counts.aliases,
   newlyApprovedNames:starsGate.counts.automaticNewPlacements,independentApproved:starsGate.counts.independentApproved,
   unresolvedRecords:starsGate.records.map(r=>({name:r.name,status:r.status,missingGates:r.missingGates}))},
  note:'HKO dates are calendar days; no inferred Jie time, no new astrological algorithm. School gates remain closed.',errors:problems};
}
if(require.main===module){const report=audit();console.log(JSON.stringify(report,null,2));
 if(process.argv.includes('--write')){const out=path.join(root,'docs/reports/V11_149_6_JIE_AND_STARS_WITNESSES.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
 if(report.errors.length)process.exitCode=1;
}
module.exports={audit};
