#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict');
const {hexagramFromBits}=require('../../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../../apps/web/src/features/luc-hao/na-jia.cjs');
const {QUESTION_GUIDES,buildQuestionEvidence}=require('../../apps/web/src/features/luc-hao/question-evidence.cjs');
const {manualContext}=require('../../apps/web/src/features/luc-hao/temporal.cjs');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
let total=0,hidden=0,visible=0;
for(let i=0;i<64;i++){
 const chart=makeNaJiaChart(hexagramFromBits(i.toString(2).padStart(6,'0')));
 for(const [questionId,guide] of Object.entries(QUESTION_GUIDES)){
  const ctx=manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'});
  const x=buildQuestionEvidence(chart,{questionId,confirmedFamily:guide.family,context:ctx});
  a.equal(x.referenceFamily,guide.family);a.equal(x.chosenUsefulGodLine,null);
  a.ok(x.visible.length+x.hidden.length>0);a.equal(x.visible.length*x.hidden.length,0);
  for(const item of [...x.visible,...x.hidden]){
   a.ok(item.day);a.ok(item.month);a.equal(typeof item.xunVoid,'boolean');
   a.equal(typeof item.month.monthBreak,'boolean');a.equal(typeof item.day.clash,'boolean');
   a.equal(item.dayBreak,null);a.equal(item.emergence,null);
  }
  (x.referenceStatus==='VISIBLE'?()=>visible++:()=>hidden++)();total++;
 }
}
a.equal(total,320);a.equal(visible,264);a.equal(hidden,56);
a.equal(gateSchoolExecution('luc-hao-dung-than-evidence').verdict,'RESEARCH_SUBROUTINE_ONLY');
console.log(JSON.stringify({status:'PASS',cases:total,visible,hidden,scope:5,productionAccess:'BLOCKED'}));
