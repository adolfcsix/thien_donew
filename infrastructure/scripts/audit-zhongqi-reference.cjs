#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {EVENTS,YEAR_TERMS,resolveMonthGeneralAt,buildHeavenEarthPlatesAt,COVERAGE}=require('../../packages/astrology-engine/src/da-liu-ren-zhongqi.cjs');
const seasons=require('../../tests/fixtures/v1189-usno-seasons-2026.json');
const issues=[];
try{
 assert.equal(EVENTS.length,36);
 assert.equal(YEAR_TERMS.length,12);
 for(const event of EVENTS){
  const ms=event.epochMs;
  assert.equal(resolveMonthGeneralAt({instantIso:new Date(ms).toISOString()}).status,'boundary-needs-verification');
  const before=resolveMonthGeneralAt({instantIso:new Date(ms-61000).toISOString()});
  const after=resolveMonthGeneralAt({instantIso:new Date(ms+61000).toISOString()});
  if(event!==EVENTS[0]) assert.notEqual(before.monthGeneral,after.monthGeneral);
  assert.equal(after.monthGeneral,event.monthGeneral);
 }
 for(const s of seasons.events){
  const x=EVENTS.find(e=>e.year===2026&&e.term===s.term);
  assert.ok(x&&Math.abs(x.epochMs-Date.parse(s.utc))<=60000,s.term);
 }
 assert.equal(resolveMonthGeneralAt({instantIso:COVERAGE.untilExclusive}).status,'unsupported-date');
 assert.equal(buildHeavenEarthPlatesAt({instantIso:'2026-02-18T23:52:00+08:00',divinationHour:'Ngọ'}).plate,null);
}catch(e){issues.push(e.stack||e.message);}
const result={status:issues.length?'FAIL':'PASS',source:'HKO official 2025/2026/2027 major solar terms',
 events:EVENTS.length,boundaryChecks:EVENTS.length*3,independentSeasons:seasons.events.length,
 guardSeconds:60,coverage:COVERAGE,issues};
console.log('Zhongqi reference audit:',JSON.stringify(result));
if(issues.length)process.exitCode=1;
