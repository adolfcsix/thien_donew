#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {diagnoseNatalStarPairs}=require('../../packages/interpretation/src/natal-pair-relations.cjs');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const pairs=require('../../packages/knowledge/src/natal-pair-research.json');
const cases=require('../../packages/star-audit/fixtures/chart-baselines.json');
// Keep report generation deterministic; no mutation of the actual chart.
function audit(){
 const counts={matched:0,ambiguous:0,unmatched:0,relations:{'dong-cung':0,'tam-hop':0,'doi-cung':0,'giap-cung':0}};
 const issues=[];
 for(let idx=0;idx<cases.cases.length;idx++){
  const sample=cases.cases[idx];
  let chart;
  try{chart=Engine.calculate(sample.input??sample);}catch(err){issues.push(`fixture ${idx}: ${err.message}`);continue;}
  const anchor=chart.houses.find(h=>h.palace==='Mệnh');
  const before=JSON.stringify(chart);
  const study=diagnoseNatalStarPairs(chart,anchor.branchIndex);
  if(study.assessed!==pairs.pairs.length)issues.push(`fixture ${idx}: number of pairs changed`);
  if(JSON.stringify(chart)!==before)issues.push(`fixture ${idx}: chart mutation`);
  for(const record of study.records){
   if(record.status==='matched'){
    counts.matched++;
    counts.relations[record.relation]++;
    if(record.placements.some(p=>p.status!=='observed'))issues.push(`fixture ${idx}: unmatched evidence in matched pair`);
   } else if(record.status==='ambiguous')counts.ambiguous++;
   else counts.unmatched++;
  }
 }
 return {edition:pairs.edition,fixtures:cases.cases.length,pairProfiles:pairs.pairs.length,observations:cases.cases.length*pairs.pairs.length,counts,issues,status:issues.length?'FAIL':'PASS',note:'Position-only internal audit, not independent expert review.'};
}
if(require.main===module){
 const data=audit();
 if(process.argv.includes('--write')){
  const dest=path.resolve(__dirname,'../../docs/reports/natal-pair-audit.json');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(data,null,2)+'\n');
 }
 process.stdout.write(JSON.stringify(data,null,2)+'\n');
 if(data.issues.length)process.exitCode=1;
}
module.exports={audit};
