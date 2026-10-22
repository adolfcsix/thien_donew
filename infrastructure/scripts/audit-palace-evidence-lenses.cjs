#!/usr/bin/env node
'use strict';
/** Research matrix structural audit. Not an expert validation of astrology claims. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {buildPalaceEvidenceLenses}=require('../../packages/interpretation/src/index.cjs');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json');
function audit(){
 const stats={charts:0,palaces:0,lenses:0,observed:0,reviewFlags:0,noData:0,unknownProfile:0};
 const errors=[],names=new Set();
 for(const [i,input] of fixtures.cases.entries()){
  let c;try{c=Engine.calculate(input.input??input);}catch(e){errors.push(`${i}: ${e.message}`);continue;}
  const before=JSON.stringify(c);stats.charts++;
  for(const h of c.houses){
   try{
    const r=buildPalaceEvidenceLenses(c,h.branchIndex);stats.palaces++;
    if(r.status!=='research-only'||r.lenses.length!==4)stats.unknownProfile++;
    names.add(h.palace);
    for(const l of r.lenses){stats.lenses++;stats.observed+=l.observedCount;stats.reviewFlags+=l.problemCount;
     stats.noData+=Number(l.status==='no-data');
     if(l.observedCount!==l.observed.length||l.problemCount!==l.problems.length)errors.push(`${i}:${h.palace}: inconsistent lens counts`);
     for(const item of l.observed){if(!item.sourcePath?.startsWith('houses[')) errors.push(`${i}:${h.palace}: missing source path`);}
    }
   }catch(e){errors.push(`${i}:${h.palace}: ${e.message}`);}
  }
  if(before!==JSON.stringify(c))errors.push(`${i}: chart mutated`);
 }
 if(names.size!==12)errors.push(`Expected 12 distinct palace names, got ${names.size}`);
 if(stats.unknownProfile)errors.push(`Unknown palace profile: ${stats.unknownProfile}`);
 return {version:'11.47.0',status:errors.length?'FAIL':'PASS',stats,errors,
   scope:'Source trace and structural quality of 4 lenses per house; not expert validation or scientific prediction.'};
}
if(require.main===module){
 const result=audit();
 if(process.argv.includes('--write')){
  const out=path.resolve(__dirname,'../../docs/reports/palace-evidence-lenses.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}
module.exports={audit};
