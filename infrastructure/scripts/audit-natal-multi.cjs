#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {examineNatalMultiStars}=require('../../packages/interpretation/src/natal-multi-star-study.cjs');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const library=require('../../packages/knowledge/src/natal-multi-star-research.json');
const baselines=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const issues=[],counts={'all-observed':0,partial:0,ambiguous:0,insufficient:0};
 const seenGroups=new Set();
 for(const group of library.groups){
  if(seenGroups.has(group.id))issues.push(`duplicate id: ${group.id}`);seenGroups.add(group.id);
  if(group.stars.length<3||group.stars.length>4||new Set(group.stars).size!==group.stars.length)issues.push(`invalid group: ${group.id}`);
 }
 for(let i=0;i<baselines.cases.length;i++){
  const test=baselines.cases[i];
  let chart;
  try{chart=Engine.calculate(test.input??test);}catch(e){issues.push(`chart ${i}: ${e.message}`);continue;}
  const before=JSON.stringify(chart),menh=chart.houses.find(h=>h.palace==='Mệnh');
  const study=examineNatalMultiStars(chart,menh.branchIndex);
  if(study.records.length!==library.groups.length)issues.push(`chart ${i}: coverage changed`);
  for(const group of study.records){
   counts[group.status]++;
   if(group.status==='all-observed'&&group.placements.some(p=>p.status!=='observed'||!p.inFourCourts))issues.push(`chart ${i}: unsupported full match`);
   if(group.status==='ambiguous'&&!group.placements.some(p=>p.status==='ambiguous'))issues.push(`chart ${i}: ungrounded ambiguity`);
  }
  if(JSON.stringify(chart)!==before)issues.push(`chart ${i}: chart mutated`);
 }
 return {edition:library.edition,fixtures:baselines.cases.length,groups:library.groups.length,
   observations:baselines.cases.length*library.groups.length,counts,issues,
   status:issues.length?'FAIL':'PASS',note:'Internal positional consistency only; no independent school or expert verification.'};
}
if(require.main===module){
 const result=audit();
 if(process.argv.includes('--write')){
  const filename=path.resolve(__dirname,'../../docs/reports/natal-multi-audit.json');
  fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;
}
module.exports={audit};
