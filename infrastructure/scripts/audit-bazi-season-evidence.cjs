#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const B=require('../../packages/astrology-engine/src/bazi-season-evidence.cjs');
const Jie=require('../../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Legacy=require('../../packages/astrology-engine/src/bazi.js');
let resolved=0,review=0,roots=0;
for(let i=0;i<Jie.EVENTS.length;i++){
 const t=Jie.EVENTS[i].epochMs;
 for(const offset of [-120,-60,0,60,120]){
  const d=new Date(t+offset*1000+420*60000);
  const input={date:d.toISOString().slice(0,10),hour:d.getUTCHours(),minute:d.getUTCMinutes(),utcOffsetMinutes:420,longitudeDeg:105};
  const ledger=B.evaluateSeasonEvidence(input);
  if(Math.abs(offset)<=60){
   // API inputs are minute precision: offset +60 rounds onto next minute; still within ±60s guard.
   assert.equal(ledger.status,'BLOCKED');review++;
  }else if(i===0&&offset<0){assert.equal(ledger.status,'BLOCKED');review++;}
  else{
   assert.ok(['PROVISIONAL','REVIEW_REQUIRED'].includes(ledger.status));
   assert.equal(ledger.hiddenByPillar.length,4);
   assert.equal(ledger.decision.dayMasterStrength,null);
   resolved++;roots+=ledger.supportCounts.distinctRootBranches;
  }
 }
}
let stemPairs=0,hiddenPairs=0;
for(let day=0;day<10;day++){
 for(let target=0;target<10;target++){
  assert.ok(B.RELATIONS[Legacy.tenGod(day,target)]);stemPairs++;
 }
 for(let branch=0;branch<12;branch++){
  const x=Legacy.hiddenStems(branch,day);
  assert.equal(x[0].stemIndex,Legacy.HIDDEN_STEM_INDICES[branch][0]);hiddenPairs++;
 }
}
const result={status:'PASS',researchOnly:true,jieEvents:Jie.EVENTS.length,minuteBoundaryBlocked:review,
 resolvedNeighborEvaluations:resolved,stemPairs,hiddenStemReferences:hiddenPairs,rootOccurrences:roots,
 finalStrengthVerdicts:0,autoSelectedUsefulGods:0};
console.log('V11.95 season and structural evidence audit:',JSON.stringify(result));
