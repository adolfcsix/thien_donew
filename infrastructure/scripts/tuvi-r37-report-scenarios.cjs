'use strict';
/**
 * R37 controlled report generation: 16 synthetic late-Zi cases.
 * No private birth information, database access or production policy edits.
 */
const fs=require('node:fs');
const path=require('node:path');
const Audit=require('../../packages/astrology-engine/src/tuvi-zi-scenario-audit.cjs');
const dates=['2020-05-22','2023-03-21','2024-02-09','2025-01-28'];
const genders=['Nam','Nữ'],minutes=[0,59];
const records=[];
for(const date of dates)for(const gender of genders)for(const minute of minutes){
 const result=Audit.evaluate({date,hour:23,minute,gender,calendar:'solar'});
 if(!result.eligible||!result.candidateAvailable||!result.comparison||
   result.comparison.coreStarCount!==14||!result.productionPolicyUnchanged||
   result.selectedPolicy!=='current-day'||result.sourceSchoolEquivalenceVerified||
   result.astroTimezoneVerified)throw Error('R37 unsafe or incomplete scenario: '+date);
 records.push({
  id:date+':'+gender+':23:'+String(minute).padStart(2,'0'),
  input:result.input,candidateDate:result.candidateDate,
  changedFields:result.comparison.changedFields,
  changedCoreStars:result.comparison.changedCoreStars,
  sameDay:result.sameDay,nextDay:result.nextDay,
  comparison:result.comparison
 });
}
if(records.length!==16||new Set(records.map(r=>r.id)).size!==16)
 throw Error('R37 requires sixteen unique controlled comparisons');
const report={
 schema:'thiendo-r37-synthetic-late-zi-16-chart-comparison-v1',
 scope:'Read-only Thiên Đồ civil birth day current-vs-next, not source parity',
 engineRuleSet:require('../../packages/astrology-engine/src/tuvi.js').RULESET,
 checked:records.length,expected:16,
 dates,
 changedLunarDay:records.filter(r=>r.changedFields.includes('lunarDay')).length,
 changedZiWei:records.filter(r=>r.changedFields.includes('ziWei')).length,
 changedMenh:records.filter(r=>r.changedFields.includes('menh')).length,
 changedCuc:records.filter(r=>r.changedFields.includes('cuc')).length,
 casesWithChangedCoreStars:records.filter(r=>r.changedCoreStars.length>0).length,
 casesWithUnchangedCoreStars:records.filter(r=>r.changedCoreStars.length===0).length,
 records,
 productionPolicyUnchanged:true,
 currentPolicy:'current-day',
 sourceSchoolEquivalenceVerified:false,astroTimezoneVerified:false,
 catalogMappedConditionsUnchanged:31,
 limitation:Audit.LIMITATION
};
fs.writeFileSync(path.resolve('.r37-zi-scenario-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
 schema:report.schema,checked:report.checked,
 changedLunarDay:report.changedLunarDay,changedZiWei:report.changedZiWei,
 changedMenh:report.changedMenh,changedCuc:report.changedCuc,
 casesWithChangedCoreStars:report.casesWithChangedCoreStars,
 productionPolicyUnchanged:report.productionPolicyUnchanged,
 catalogMappedConditionsUnchanged:report.catalogMappedConditionsUnchanged
}));
