#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const R=require('../../packages/astrology-engine/src/bazi-time-research.cjs');
const B=require('../../packages/astrology-engine/src/bazi.js');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
let checked=0, reviewCount=0;
for(const year of [1901,1968,2004,2026,2099])for(const month of [2,5,8,11])for(const hour of [0,1,6,10,18,22,23])for(const minute of [1,30,58]){
 const date=`${year}-${String(month).padStart(2,'0')}-15`;
 for(const tz of [420,480,-300]){
  const longitude=tz/4;
  const civil=R.evaluate({date,hour,minute,utcOffsetMinutes:tz,longitudeDeg:longitude,timeMode:'civil'});
  const mean=R.evaluate({date,hour,minute,utcOffsetMinutes:tz,longitudeDeg:longitude,timeMode:'mean-solar'});
  const apparent=R.evaluate({date,hour,minute,utcOffsetMinutes:tz,longitudeDeg:longitude,timeMode:'apparent-solar'});
  assert.deepEqual(civil.pillars,mean.pillars);
  assert.deepEqual([civil.pillars.year.name,civil.pillars.month.name],[apparent.pillars.year.name,apparent.pillars.month.name]);
  assert.ok(Number.isFinite(apparent.timeCorrection.correctionMinutes));
  assert.equal(apparent.pillars.day.stemIndex%2,apparent.pillars.day.branchIndex%2);
  if(apparent.status==='REVIEW_REQUIRED')reviewCount++;
  checked++;
 }
}
const original=B.calculate({date:'2004-08-15',hour:8,minute:15});
const research=R.evaluate({date:'2004-08-15',hour:8,minute:15,utcOffsetMinutes:420,longitudeDeg:105});
for(const key of ['year','month','day','hour'])assert.equal(original.pillars[key].name,research.pillars[key].name);
assert.equal(gateSchoolExecution('bat-tu-tiet-khi').verdict,'RESEARCH_SUBROUTINE_ONLY');
console.log(JSON.stringify({status:'PASS',researchOnly:true,caseSets:checked,evaluations:checked*3,reviewCases:reviewCount,source:'NOAA approximate EOT + existing BaZi low-precision solar longitude; NOT a certified ephemeris'}));
