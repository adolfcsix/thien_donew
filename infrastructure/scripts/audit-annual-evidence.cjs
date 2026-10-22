#!/usr/bin/env node
'use strict';
/** V11.45: deterministic audit. No DB/network, no charts are modified. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {auditAnnualEvidence}=require('../../packages/interpretation/src/annual-evidence-audit.cjs');
const baselines=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const issues=[],stats={fixtures:0,annualOverviews:0,palaceChecks:0,acceptedStars:0,acceptedTransformations:0,rejectedStars:0,rejectedTransformations:0};
 for(let i=0;i<baselines.cases.length;i++){
  let c;try{c=Engine.calculate(baselines.cases[i].input??baselines.cases[i]);}catch(e){issues.push(`fixture ${i}: ${e.message}`);continue;}
  stats.fixtures++;const year=Math.max(c.lunar.year,2026),years=[year,Math.min(2100,year+1)];
  for(const y of years){
   try{
    const annual=Engine.annualOverview(c,y),snapshot=JSON.stringify([c,annual]);stats.annualOverviews++;
    for(const h of c.houses){
     const evidence=auditAnnualEvidence(c,annual,h.branchIndex);stats.palaceChecks++;
     stats.acceptedStars+=evidence.stars.length;stats.acceptedTransformations+=evidence.transformations.length;
     stats.rejectedStars+=evidence.rejectedStars.length;stats.rejectedTransformations+=evidence.rejectedTransformations.length;
     if(evidence.stars.some(s=>s.source!=='annual-only')||evidence.transformations.some(s=>s.source!=='annual-only'))issues.push(`fixture ${i}, year ${y}: mixed layer`);
    }
    if(JSON.stringify([c,annual])!==snapshot)issues.push(`fixture ${i}, year ${y}: mutated`);
   }catch(e){issues.push(`fixture ${i}, year ${y}: ${e.message}`);}
  }
 }
 return {version:'11.45.0',status:issues.length?'FAIL':'PASS',stats,issues,
  limitation:'Structural integrity only; shares the existing astrology-engine, not independent scholarly validation.'};
}
if(require.main===module){
 const result=audit();
 if(process.argv.includes('--write')){
  const filename=path.resolve(__dirname,'../../docs/reports/annual-evidence.json');
  fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;
}
module.exports={audit};
