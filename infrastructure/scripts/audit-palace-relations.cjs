#!/usr/bin/env node
'use strict';
/** V11.49 structural evidence audit only; it does not validate traditional interpretation. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {buildPalaceRelationalSynthesis,createTwelvePalaceStudy}=require('../../packages/interpretation/src/index.cjs');
const {related}=require('../../packages/interpretation/src/chart-geometry.cjs');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const stats={charts:0,palaces:0,relationChecks:0,observed:0,partial:0,noData:0,needsReview:0,
  tamHop:0,doiCung:0,giapCung:0,flankMatches:0};
 const errors=[],palaces=new Set();
 for(const [i,fixture] of fixtures.cases.entries()){
  let chart;try{chart=Engine.calculate(fixture.input??fixture);}catch(e){errors.push(`${i}: engine error ${e.message}`);continue;}
  const snapshot=JSON.stringify(chart);stats.charts++;
  for(const h of chart.houses){
   try{
    const raw=buildPalaceRelationalSynthesis(chart,h.branchIndex);
    const publicView=createTwelvePalaceStudy(chart,h.branchIndex).relationalSynthesis;
    const rel=related(h.branchIndex),expected={
     'tam-hop':new Set(rel.tamHop),'doi-cung':new Set([rel.doiCung]),
     'giap-cung':new Set([(h.branchIndex+11)%12,(h.branchIndex+1)%12])};
    if(raw.records.length!==3||publicView.records.length!==3||raw.status!=='research-only')errors.push(`${i}:${h.palace}: missing records`);
    if(JSON.stringify(publicView).includes('houses['))errors.push(`${i}:${h.palace}: leaked source paths`);
    stats.palaces++;palaces.add(h.palace);
    for(const row of raw.records){
     stats.relationChecks++;
     const key={'observed':'observed','partial':'partial','no-data':'noData','needs-review':'needsReview'}[row.status];
     if(!key){errors.push(`${i}:${h.palace}: bad status ${row.status}`);continue;}
     stats[key]++;
     if(row.id==='tam-hop')stats.tamHop++;
     if(row.id==='doi-cung')stats.doiCung++;
     if(row.id==='giap-cung'){stats.giapCung++;stats.flankMatches+=row.matchedPairs?.length??0;}
     if(row.status==='observed'&&(row.missing.length||row.checks.some(c=>!c.met)))errors.push(`${i}:${h.palace}:${row.id}: unjustified observed`);
     if(row.status!=='needs-review' &&row.status!=='observed'&&row.checks.every(c=>c.met))errors.push(`${i}:${h.palace}:${row.id}: inconsistent checks`);
     for(const evidence of row.evidence){
      if(evidence.scope!=='natal'||!evidence.sourcePath?.startsWith('houses['))errors.push(`${i}:${h.palace}:${row.id}: untracked/annual evidence`);
      if(evidence.relation!=='tọa cung'&&!expected[row.id]?.has(evidence.branchIndex))errors.push(`${i}:${h.palace}:${row.id}: wrong relation ${evidence.branchIndex}`);
      if(row.id==='giap-cung'&&evidence.relation!=='giáp cung')errors.push(`${i}:${h.palace}: false flank`);
     }
    }
   }catch(e){errors.push(`${i}:${h.palace}: ${e.message}`);}
  }
  if(JSON.stringify(chart)!==snapshot)errors.push(`${i}: chart modified`);
 }
 if(palaces.size!==12)errors.push(`Only ${palaces.size} distinct palaces`);
 if(stats.charts!==22)errors.push(`Expected 22 fixtures but got ${stats.charts}`);
 return {edition:'11.49.0',status:errors.length?'FAIL':'PASS',stats,errors,
  caveat:'Audits source positions, not independent validation of placements, schools, accuracy or predictions.'};
}
if(require.main===module){
 const report=audit();
 if(process.argv.includes('--write'))fs.writeFileSync(path.resolve(__dirname,'../../docs/reports/palace-relation-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;
}
module.exports={audit};
