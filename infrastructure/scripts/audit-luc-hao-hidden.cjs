#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {TRIGRAMS,hexagramFromBits}=require('../../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../../apps/web/src/features/luc-hao/na-jia.cjs');
const {hiddenRelativeEvidence}=require('../../apps/web/src/features/luc-hao/hidden-relative.cjs');
const {getSchool,gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
const families=['Phụ Mẫu','Huynh Đệ','Tử Tôn','Thê Tài','Quan Quỷ'];
let hidden=0,visible=0,positionRefs=0;
for(let i=0;i<64;i++){
 const chart=makeNaJiaChart(hexagramFromBits(i.toString(2).padStart(6,'0')));
 const pure=makeNaJiaChart(hexagramFromBits(chart.palace.bits.repeat(2)));
 for(const selected of families){
  const result=hiddenRelativeEvidence(chart,selected);
  assert.equal(result.decision.usefulGod,null);
  if(chart.lines.some(l=>l.family===selected)){
   assert.equal(result.status,'VISIBLE');assert.equal(result.hidden.length,0);visible++;
  }else{
   assert.equal(result.status,'HIDDEN_REFERENCE');assert.equal(result.visible.length,0);assert.ok(result.hidden.length>0);hidden++;
   for(const ref of result.hidden){
    assert.equal(ref.hidden.stemBranch,pure.lines[ref.position-1].stemBranch);
    assert.equal(ref.flying.stemBranch,chart.lines[ref.position-1].stemBranch);
    assert.equal(ref.hidden.family,selected);positionRefs++;
   }
  }
 }
}
assert.equal(hidden+visible,320);
assert.equal(TRIGRAMS.length,8);
assert.equal(getSchool('luc-hao-phuc-than').engineIntegration,'isolated-research-only');
assert.equal(gateSchoolExecution('luc-hao-phuc-than').verdict,'RESEARCH_SUBROUTINE_ONLY');
assert.equal(gateSchoolExecution('luc-hao-jingfang').verdict,'BLOCKED');
console.log(JSON.stringify({status:'PASS',hexagrams:64,families:5,combinations:320,visibleCases:visible,hiddenCases:hidden,hiddenPositionReferences:positionRefs,productionAccess:'BLOCKED'}));
