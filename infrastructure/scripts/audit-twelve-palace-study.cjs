#!/usr/bin/env node
'use strict';
/** V11.46 structural audit. Measures study coverage, not fortune accuracy. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {createTwelvePalaceStudy,auditAnnualEvidence}=require('../../packages/interpretation/src/index.cjs');
const baseline=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const errors=[],names=new Set();
 const stats={charts:0,palaceChecks:0,annualChecks:0,uniquePalaceNames:0,rejectedAnnual:0};
 for(const [i,input] of baseline.cases.entries()){
  let chart;try{chart=Engine.calculate(input.input??input);}catch(e){errors.push(`${i}: ${e.message}`);continue;}
  stats.charts++;
  const snapshot=JSON.stringify(chart);
  for(const house of chart.houses){
   try{
    const study=createTwelvePalaceStudy(chart,house.branchIndex);
    stats.palaceChecks++;names.add(study.palace);
    if(study.status!=='research-only'||study.steps?.length!==3)errors.push(`${i}:${house.branchIndex}: missing study`);
   }catch(e){errors.push(`${i}:${house.branchIndex}: ${e.message}`);}
  }
  const year=Math.max(2026,chart.lunar.year);
  for(const y of [year,Math.min(year+1,2100)]){
   try{
    const annual=Engine.annualOverview(chart,y),annualSnapshot=JSON.stringify(annual);
    for(const house of chart.houses){
     const evidence=auditAnnualEvidence(chart,annual,house.branchIndex);
     const study=createTwelvePalaceStudy(chart,house.branchIndex,{includeAnnual:true,annualEvidence:evidence});
     stats.annualChecks++;stats.rejectedAnnual+=study.annual?.rejected??0;
     if(study.annual?.year!==y)errors.push(`${i}:${y}:${house.branchIndex}: year drift`);
    }
    if(annualSnapshot!==JSON.stringify(annual))errors.push(`${i}:${y}: annual mutation`);
   }catch(e){errors.push(`${i}:${y}: ${e.message}`);}
  }
  if(snapshot!==JSON.stringify(chart))errors.push(`${i}: chart mutation`);
 }
 stats.uniquePalaceNames=names.size;
 if(names.size!==12)errors.push('Missing an editorial profile in the 12-palace corpus');
 return {version:'11.46.0',status:errors.length?'FAIL':'PASS',stats,errors,
  limitation:'Only structural and editorial coverage is tested; not proof of classical school accuracy or scientific prediction.'};
}
if(require.main===module){
 const result=audit();
 if(process.argv.includes('--write')){
  const dest=path.resolve(__dirname,'../../docs/reports/twelve-palace-study.json');
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}
module.exports={audit};
