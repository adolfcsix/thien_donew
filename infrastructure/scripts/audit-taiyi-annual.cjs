#!/usr/bin/env node
'use strict';
const {annualTaiyiResearch, METHOD_ID, PALACE_RING}=require('../../packages/astrology-engine/src/taiyi-annual-research.cjs');
const {gateSchoolExecution}=require('../../packages/knowledge/src/phase2-school-methods.cjs');
const problems=[];let runs=0;
for(let year=1;year<=9999;year++){
 const r=annualTaiyiResearch({methodId:METHOD_ID,traditionalYear:year,calendarBoundaryResolved:true}).result;
 runs++;
 const r24=((r.accumulatedYears-1)%24)+1;
 const expectedPalace=PALACE_RING[Math.floor((r24-1)/3)];
 if(r.taiyiPalace!==expectedPalace||r.yearInPalace!==((r24-1)%3)+1||r.taiyiPalace===5)problems.push(`Unexpected palace ${year}`);
 if(year+360<=9999){const later=annualTaiyiResearch({methodId:METHOD_ID,traditionalYear:year+360,calendarBoundaryResolved:true}).result;
  if(later.taiyiPalace!==r.taiyiPalace||later.yearIn360Cycle!==r.yearIn360Cycle)problems.push(`Cycle instability ${year}`);
 }
}
if(gateSchoolExecution('thai-at-foundation').verdict!=='RESEARCH_SUBROUTINE_ONLY')problems.push('Research-school execution gate mismatch');
console.log(JSON.stringify({status:problems.length?'FAIL':'PASS',caseCount:runs,anchor724:1937281,palaces:PALACE_RING,problems:problems.slice(0,5)}));
if(problems.length)process.exitCode=1;
