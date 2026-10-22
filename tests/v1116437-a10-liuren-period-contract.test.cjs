'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const current=require('../packages/astrology-engine/src/da-liu-ren-depth.cjs');
const legacy=require('../packages/astrology-engine/src/da-liu-ren-depth-v11132.cjs');
const branches=require('../packages/astrology-engine/src/da-liu-ren-plates.cjs').BRANCHES;
const input={dayStem:'Giáp',dayBranch:'Tý',monthGeneral:'Hợi',divinationHour:'Mão',dayNight:'hour-mao-shen',manualPeriod:null};
for(const module of [legacy,current]){
 const name=module.RULESET;
 test(`${name}: reject contradictory stored manual day/night with hour-based convention`,()=>{
  const day=module.buildDepth(input);
  assert.equal(day.generals.period,'day');
  for(const manualPeriod of ['night','day']){
   assert.throws(()=>module.buildDepth({...input,manualPeriod}),/conflicts with hour-mao-shen method/);
   assert.throws(()=>module.validateDaLiuRenSnapshot({method:name,...input,manualPeriod}),/conflicts with hour-mao-shen method/);
  }
 });
 test(`${name}: all 12 hour branches use the selected hour-based convention without guessing`,()=>{
  for(const [idx,hour] of branches.entries()){
   const result=module.buildDepth({...input,divinationHour:hour});
   assert.equal(result.generals.period,idx>=3&&idx<=8?'day':'night');
   assert.equal(result.generals.status,'computed');
  }
 });
 test(`${name}: manual mode still accepts independently specified day, night and unknown periods`,()=>{
  for(const period of ['day','night',null]){
   const report=module.buildDepth({...input,dayNight:'manual',manualPeriod:period});
   assert.equal(report.generals.period,period);
   assert.equal(report.generals.status,period?'computed':'missing-day-night');
  }
 });
}
