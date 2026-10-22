#!/usr/bin/env node
'use strict';
/** Replay published learning cases: structural evidence only, never expert assessment. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildCasebook,checkSnapshot,extract,publicFields}=require('./build-worked-examples.cjs');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const published=require('../../packages/knowledge/src/worked-examples.json');
const {cases:definitions}=require('../../packages/knowledge/src/worked-case-definitions.json');
const digest=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
function audit(){
 const errors=[],stats={examples:0,distinctPalaces:0,observed:0,partial:0,noData:0,needsReview:0,
   checks:0,evidenceItems:0,fixtureReplays:0,sourcePathsLeaked:0};
 let expected;
 try {expected=buildCasebook();}catch(e){errors.push('Generator: '+e.message);}
 if(expected&&!checkSnapshot(published).ok)errors.push('Snapshot mismatch: regenerated cases differ from published examples');
 const names=new Set(), ids=new Set();
 for(const [i,example] of published.cases.entries()){
  stats.examples++;names.add(example.palace);
  if(ids.has(example.id))errors.push(`${i}: duplicate ID`);ids.add(example.id);
  if(!definitions.some(d=>d.id===example.id&&d.palace===example.palace&&d.wanted===example.status))errors.push(`${i}: case definition mismatch`);
  if(example.expertReviewed===true||published.expertReviewed!==false)errors.push(`${i}: falsely expert reviewed`);
  if(!['observed','partial','no-data','needs-review'].includes(example.status))errors.push(`${i}: unsupported status`);
  else stats[{'observed':'observed','partial':'partial','no-data':'noData','needs-review':'needsReview'}[example.status]]++;
  const witness={status:example.status,checks:example.checks,evidence:example.evidence,missing:example.missing,matchedPairs:example.matchedPairs,relatedBranches:example.relatedBranches};
  if(digest(witness)!==example.sha256)errors.push(`${i}: fingerprint invalid`);
  if(JSON.stringify(example).includes('houses[')||JSON.stringify(example).includes('sourcePath')){stats.sourcePathsLeaked++;errors.push(`${i}: internal source path leaked`);}
  if(example.status==='observed'&&(example.missing.length||example.checks.some(x=>!x.met)))errors.push(`${i}: unjustified observed`);
  if(example.evidence.some(x=>x.scope!=='natal'))errors.push(`${i}: annual data in natal case`);
  if(example.evidence.some(x=>!Number.isInteger(x.branchIndex)||x.branchIndex<0||x.branchIndex>11))errors.push(`${i}: malformed branch evidence`);
  stats.checks+=example.checks.length;stats.evidenceItems+=example.evidence.length;
  try {
   const chart=Engine.calculate(example.input),before=JSON.stringify(chart),house=chart.houses.find(h=>h.palace===example.palace);
   if(!house||house.branchIndex!==example.branchIndex)errors.push(`${i}: branch mismatch`);
   else {
    const actual=extract(chart,house.branchIndex,example.family,example.recordId);
    if(actual.status!==example.status)errors.push(`${i}: replay status changed`);
    if(JSON.stringify(actual.evidence.map(publicFields))!==JSON.stringify(example.evidence))errors.push(`${i}: replay evidence changed`);
    stats.fixtureReplays++;
   }
   if(JSON.stringify(chart)!==before)errors.push(`${i}: engine chart mutated`);
  }catch(e){errors.push(`${i}: replay failed: ${e.message}`);}
 }
 stats.distinctPalaces=names.size;
 if(stats.examples!==12||stats.distinctPalaces!==12)errors.push(`Expected exactly 12 cases covering all houses`);
 if(!stats.observed||!stats.partial)errors.push('Casebook must teach both complete and incomplete observations');
 return {edition:'11.50.0',status:errors.length?'FAIL':'PASS',stats,errors,
  limit:'Replayable code-generated natal examples; no school-level approval, accuracy guarantee, or predictive validity.'};
}
if(require.main===module){const report=audit();
 if(process.argv.includes('--write'))fs.writeFileSync(path.resolve(__dirname,'../../docs/reports/worked-examples-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;}
module.exports={audit};
