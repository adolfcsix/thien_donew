#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const Pattern=require('../../packages/astrology-engine/src/bazi-pattern-evidence.cjs');
const Jie=require('../../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Legacy=require('../../packages/astrology-engine/src/bazi.js');
const School=require('../../packages/knowledge/src/phase2-school-methods.cjs');
let allowed=0,blocked=0,detected=0,contradictions=0;
for(const ev of Jie.EVENTS){
 for(const seconds of [-180,-120,-60,0,60,120,180]){
  const utc=ev.epochMs+seconds*1000;
  // Input only to minutes, offset +420, first event can be before coverage.
  const t=new Date(utc+420*60000);
  const input={date:t.toISOString().slice(0,10),hour:t.getUTCHours(),minute:t.getUTCMinutes(),utcOffsetMinutes:420,longitudeDeg:105};
  const r=Pattern.evaluatePatternEvidence(input);
  if(Math.abs(seconds)<=60||utc<Jie.EVENTS[0].epochMs-60000){assert.equal(r.status,'BLOCKED');blocked++;continue;}
  assert.ok(['PROVISIONAL','REVIEW_REQUIRED'].includes(r.status));allowed++;
  assert.equal(r.exposure.length,Legacy.HIDDEN_STEM_INDICES[Legacy.BRANCHES.indexOf(r.monthBranch)].length);
  assert.equal(r.decision.pattern,null);assert.equal(r.decision.formation,null);assert.equal(r.decision.breakage,null);
  assert.equal(r.decision.usefulGod,null);assert.equal(r.decision.dayMasterStrength,null);
  for(const group of r.branchGroups){
   assert.equal(group.branches.length,3);assert.equal(new Set(group.branches).size,3);
   assert.equal(new Set(group.pillars).size,3);assert.equal(group.transformed,false);
   if(group.status==='CONFLICT_REVIEW'){assert.ok(group.clashEvidence.length);contradictions++;}
   detected++;
  }
 }
}
assert.equal(Pattern.SEASONAL_MEETINGS.length,4);
for(const record of Pattern.SEASONAL_MEETINGS){assert.equal(record.branches.length,3);assert.notEqual(record.branches.includes(12),true);}
assert.equal(School.gateSchoolExecution('bat-tu-bien-cach').verdict,'RESEARCH_SUBROUTINE_ONLY');
assert.equal(School.gateSchoolExecution('bat-tu-do-tho').verdict,'BLOCKED');
console.log('V11.96 pattern evidence audit:',JSON.stringify({status:'PASS',researchOnly:true,checks:allowed+blocked,resolved:allowed,blocked,observedCompleteSymbolGroups:detected,conflictEvents:contradictions,confirmedTransformations:0,confirmedPatterns:0}));
