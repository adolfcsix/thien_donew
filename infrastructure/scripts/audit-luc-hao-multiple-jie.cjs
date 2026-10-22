#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict');
const {hexagramFromBits}=require('../../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../../apps/web/src/features/luc-hao/na-jia.cjs');
const {QUESTION_GUIDES}=require('../../apps/web/src/features/luc-hao/question-evidence.cjs');
const R=require('../../apps/web/src/features/luc-hao/multiple-useful-god-research.cjs');
const {EVENTS}=require('../../packages/astrology-engine/src/bazi-jie-reference.cjs');
const {BRANCHES}=require('../../apps/web/src/features/luc-hao/temporal.cjs');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
let total=0,visible=0,hidden=0,multiple=0,comparisonPairs=0,boundaries=0,monthChecks=0;
for(let i=0;i<64;i++)for(const [id,g] of Object.entries(QUESTION_GUIDES)){
 const c=makeNaJiaChart(hexagramFromBits(i.toString(2).padStart(6,'0')));
 const x=R.analyzeMultiple(c,{questionId:id,confirmedFamily:g.family});
 a.ok(x.candidates.length>0);a.equal(x.decision.usefulGod,null);
 comparisonPairs+=x.conflicts.length;for(const pair of x.conflicts)a.equal(pair.selected,null);
 if(x.multiple)multiple++;
 if(x.candidates[0].candidateKind==='VISIBLE')visible++;else hidden++;
 total++;
}
a.equal(total,320);a.equal(visible,264);a.equal(hidden,56);
for(const ev of EVENTS){
 const b=BRANCHES[(ev.monthIndex+2)%12];
 for(const offset of [-60000,0,60000]){
  const ref=R.monthFromJie({instantIso:new Date(ev.epochMs+offset).toISOString()});
  a.equal(ref.monthBranch,null);a.equal(ref.status,'BOUNDARY_REVIEW');boundaries++;
 }
 const ref=R.monthFromJie({instantIso:new Date(ev.epochMs+120000).toISOString()});
 a.equal(ref.monthBranch,b);a.equal(ref.verified,false);monthChecks++;
}
a.equal(gateSchoolExecution(R.SCHOOL).verdict,'RESEARCH_SUBROUTINE_ONLY');
console.log(JSON.stringify({status:'PASS',cases:total,visible,hidden,multiple,comparisonPairs,jieBoundaryReviews:boundaries,jieMonthChecks:monthChecks,production:'BLOCKED',minuteReference:'SECONDARY_NOT_CERTIFIED'}));
