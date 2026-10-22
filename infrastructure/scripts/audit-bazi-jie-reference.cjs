#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const B=require('../../packages/astrology-engine/src/bazi-jie-reference.cjs');
const {parseInstant}=require('../../packages/astrology-engine/src/da-liu-ren-zhongqi.cjs');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
const mod=(x,m)=>((x%m)+m)%m;
let resolved=0,boundary=0,unsupported=0,clockConsistent=0;
assert.equal(B.EVENTS.length,36);
for (let i=0;i<B.EVENTS.length;i++){
 const event=B.EVENTS[i],t=event.epochMs;
 assert.equal(event.monthIndex,mod(i%12-1,12));
 for(const second of [-59,0,59]){
  const x=B.resolveJieAt({instantIso:new Date(t+second*1000).toISOString()});
  assert.equal(x.status,'BOUNDARY_REVIEW');boundary++;
 }
 for(const second of [-120,120]){
  const x=B.resolveJieAt({instantIso:new Date(t+second*1000).toISOString()});
  if(i===0&&second<0){assert.equal(x.status,'OUT_OF_COVERAGE');unsupported++;continue;}
  assert.equal(x.status,'RESOLVED');
  if(second>0)assert.equal(x.active.term,event.term);
  else assert.equal(x.active.term,B.EVENTS[i-1].term);
  resolved++;
 }
 const after=new Date(t+10*60000);
 const utc=after.toISOString();
 const hkt=new Date(after.getTime()+480*60000);
 const vn=new Date(after.getTime()+420*60000);
 function input(local,tz){return {date:local.toISOString().slice(0,10),hour:local.getUTCHours(),minute:local.getUTCMinutes(),utcOffsetMinutes:tz,longitudeDeg:tz/4};}
 const a=B.evaluateWithReferenceJie(input(hkt,480)),b=B.evaluateWithReferenceJie(input(vn,420));
 assert.equal(a.actualUtc,utc);
 assert.equal(b.actualUtc,utc);
 assert.equal(a.status==='PROVISIONAL'||a.status==='CLOCK_REVIEW',true);
 assert.equal(a.pillars.year.name,b.pillars.year.name);
 assert.equal(a.pillars.month.name,b.pillars.month.name);
 assert.equal(a.pillars.month.branchIndex,mod(event.monthIndex+2,12));
 assert.equal(a.pillars.year.stemIndex%2,a.pillars.year.branchIndex%2);
 assert.equal(a.pillars.month.stemIndex%2,a.pillars.month.branchIndex%2);
 clockConsistent++;
}
assert.equal(B.resolveJieAt({instantIso:'2024-07-01T00:00:00Z'}).status,'OUT_OF_COVERAGE');
assert.equal(B.resolveJieAt({instantIso:'2028-02-04T00:00:00Z'}).status,'OUT_OF_COVERAGE');
assert.equal(B.evaluateWithReferenceJie({date:'2024-07-01',hour:12,minute:0,utcOffsetMinutes:420,longitudeDeg:105}).pillars.year,null);
assert.equal(gateSchoolExecution('bat-tu-tiet-khi').verdict,'RESEARCH_SUBROUTINE_ONLY');
console.log(JSON.stringify({status:'PASS',researchOnly:true,events:36,minuteBoundaryReviews:boundary,resolvedNeighbors:resolved,outOfCoverageNeighbors:unsupported,UTCzoneParityChecks:clockConsistent,noProductionPromotion:true}));
