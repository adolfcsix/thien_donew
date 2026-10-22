#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const R=require('../../packages/astrology-engine/src/tuvi-phihoa-research.cjs');
const L=require('../../packages/astrology-engine/src/tuhoa.js');
const T=require('../../packages/astrology-engine/src/tuvi.js');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
let checks=0;
for(const [id,profile] of Object.entries(R.PROFILES))for(let s=0;s<10;s++){
 const transformations=R.lookupFour(s,id);
 assert.equal(transformations.length,4);
 assert.equal(new Set(transformations.map(x=>x.star)).size,4);
 if(id==='toan-tap-common')assert.deepEqual(transformations.map(x=>x.star),L.ROWS[s]);
 checks++;
}
for(const input of [
 {date:'2004-08-15',hour:8,minute:30,gender:'Nam'},
 {date:'1990-07-07',hour:23,minute:0,gender:'Nữ'},
 {date:'2024-01-01',hour:15,minute:1,gender:'Nam'},
]){
 const palaces=T.calculate(input).houses;
 for(const id of Object.keys(R.PROFILES))for(let sourceBranchIndex=0;sourceBranchIndex<12;sourceBranchIndex++){
  const r=R.buildFlights({palaces,scope:'palace-stem',sourceBranchIndex,profileId:id});
  assert.ok(r.complete,`Missing star location in ${id} sample ${sourceBranchIndex}`);
  assert.equal(r.flights.length,4);
  checks++;
 }
}
assert.equal(R.compareProfiles('toan-tap-common','toan-thu-research').count,2);
assert.equal(R.compareProfiles('toan-tap-common','trung-chau-research').count,3);
assert.equal(gateSchoolExecution('tu-vi-phi-tinh').verdict,'RESEARCH_SUBROUTINE_ONLY');
console.log(JSON.stringify({status:'PASS',checks,profiles:Object.keys(R.PROFILES).length,tableEntries:120,graphSamples:108,school:'tu-vi-phi-tinh',researchOnly:true}));
