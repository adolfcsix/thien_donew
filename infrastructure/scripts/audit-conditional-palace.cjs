#!/usr/bin/env node
'use strict';
/** Source-evidence consistency audit. Not a verification of classical prediction. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {buildPalaceConditionalSynthesis,createTwelvePalaceStudy,auditAnnualEvidence}=require('../../packages/interpretation/src/index.cjs');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const stats={charts:0,palaceChecks:0,recordChecks:0,observed:0,partial:0,noData:0,needsReview:0,
  annualAudits:0,annualObserved:0,uniquePalaces:0};
 const errors=[],names=new Set();
 for(const [i,fix] of fixtures.cases.entries()){
  let c;try{c=Engine.calculate(fix.input??fix);}catch(e){errors.push(`${i}: ${e.message}`);continue;}
  const before=JSON.stringify(c);stats.charts++;
  const annualYear=Math.max(2026,c.lunar.year);
  const a=Engine.annualOverview(c,annualYear);
  for(const h of c.houses){
   try{
    const e=auditAnnualEvidence(c,a,h.branchIndex);stats.annualAudits++;
    const raw=buildPalaceConditionalSynthesis(c,h.branchIndex,{annualEvidence:e});
    const pub=createTwelvePalaceStudy(c,h.branchIndex,{annualEvidence:e,includeAnnual:true}).conditionalSynthesis;
    stats.palaceChecks++;names.add(h.palace);
    if(raw.status!=='research-only'||raw.records.length!==4||pub.records.length!==4)
      errors.push(`${i}:${h.palace}: incomplete study`);
    if(JSON.stringify(pub).includes('houses['))errors.push(`${i}:${h.palace}: leaked technical paths`);
    for(const r of raw.records){
     stats.recordChecks++;const statusKey={'observed':'observed','partial':'partial','no-data':'noData','needs-review':'needsReview'}[r.status];
     if(!statusKey){errors.push(`${i}:${h.palace}: bad status`);continue;}
     stats[statusKey]++;
     if(r.status==='observed' && (r.missing.length>0 || r.evidence.length<2))
       errors.push(`${i}:${h.palace}:${r.id}: false observed`);
     if(r.id==='natal-annual'&&r.status==='observed')stats.annualObserved++;
     for(const item of r.evidence){
      if(item.scope==='natal'&&!item.sourcePath?.startsWith('houses['))errors.push(`${i}:${h.palace}:${r.id}: missing natal source`);
      if(item.scope==='annual'&&(item.year!==annualYear||item.branchIndex!==h.branchIndex||item.palace!==h.palace))
       errors.push(`${i}:${h.palace}:${r.id}: leaked other-year evidence`);
     }
    }
   }catch(e){errors.push(`${i}:${h.palace}: ${e.message}`);}
  }
  if(JSON.stringify(c)!==before)errors.push(`${i}: chart mutated`);
 }
 stats.uniquePalaces=names.size;
 if(stats.uniquePalaces!==12)errors.push(`Expected 12 palaces, got ${stats.uniquePalaces}`);
 return {edition:'11.48.0',status:errors.length?'FAIL':'PASS',stats,errors,
  caveat:'Tests data gates against current engine and 22 fixtures, not classical school accuracy or future prediction.'};
}
if(require.main===module){const r=audit();if(process.argv.includes('--write')){
 const out=path.resolve(__dirname,'../../docs/reports/conditional-palace-audit.json');
 fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
 }console.log(JSON.stringify(r,null,2));if(r.errors.length)process.exitCode=1;}
module.exports={audit};
