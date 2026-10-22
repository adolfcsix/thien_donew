'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const M=require('../packages/astrology-engine/src/taiyi-annual-research.cjs');
const {gateSchoolExecution,getSchool}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const calc=y=>M.annualTaiyiResearch({methodId:M.METHOD_ID,traditionalYear:y,calendarBoundaryResolved:true});
test('724 reference year matches the explicit accumulated-years count in primary volume I',()=>{
 assert.equal(M.ANCHOR.year,724);assert.equal(M.ANCHOR.accumulatedYears,1937281);
 const v=calc(724).result;
 assert.deepEqual([v.accumulatedYears,v.yearIn360Cycle,v.yearIn72Cycle,v.yearIn24Cycle,v.taiyiPalace,v.yearInPalace],[1937281,121,49,1,1,1]);
});
test('Independent arithmetic fixture for 2026 derives accumulative count and position',()=>{
 const v=calc(2026).result;
 assert.equal(v.accumulatedYears,1938583);
 assert.deepEqual([v.jiIndexOneBased,v.yearIn60Ji,v.yearIn72Cycle,v.taiyiPalace,v.yearInPalace],[6,43,55,3,1]);
});
test('Each palace lasts exactly three successive annual counts',()=>{
 const observed=[];for(let y=724;y<748;y++)observed.push(calc(y).result.taiyiPalace);
 assert.deepEqual(observed,M.PALACE_RING.flatMap(p=>[p,p,p]));
});
test('60-year ji advance matches documented one-palace vs six-palace reference',()=>{
 assert.equal(calc(724).result.taiyiPalace,1);
 assert.equal(calc(784).result.taiyiPalace,6);
});
test('360-year grand cycle and 72-year remainder preserve annual position',()=>{
 for(let y=724;y<984;y+=13){
  assert.equal(calc(y).result.taiyiPalace,calc(y+72).result.taiyiPalace);
  assert.equal(calc(y).result.taiyiPalace,calc(y+360).result.taiyiPalace);
  assert.equal(calc(y).result.yearIn360Cycle,calc(y+360).result.yearIn360Cycle);
  assert.notEqual(calc(y).result.accumulatedYears,calc(y+360).result.accumulatedYears);
 }
});
for(const start of [1,724,1899,2026,9990]){
 test(`No palace 5 and bounded modular counters for all available years from ${start}`,()=>{
  for(let y=start;y<=Math.min(start+9,9999);y++){
   const v=calc(y);const r=v.result;
   assert.equal(v.status,'deterministic-subroutine-only');
   assert.ok(M.PALACE_RING.includes(r.taiyiPalace));
   assert.ok(r.yearIn360Cycle>=1&&r.yearIn360Cycle<=360);
   assert.ok(r.jiIndexOneBased>=1&&r.jiIndexOneBased<=6);
   assert.ok(r.yearIn60Ji>=1&&r.yearIn60Ji<=60);
   assert.ok(r.yearIn72Cycle>=1&&r.yearIn72Cycle<=72);
   assert.ok(r.yearIn24Cycle>=1&&r.yearIn24Cycle<=24);
   assert.ok(r.yearInPalace>=1&&r.yearInPalace<=3);
  }
 });
}
test('Calendar-boundary ambiguity blocks computation instead of guessing a solar date',()=>{
 const blocked=M.annualTaiyiResearch({methodId:M.METHOD_ID,traditionalYear:2026,calendarBoundaryResolved:false});
 assert.equal(blocked.status,'boundary-unresolved');assert.equal(blocked.result,null);
 assert.equal(M.annualTaiyiResearch({methodId:M.METHOD_ID,calendarBoundaryResolved:false}).result,null);
});
test('Strict year and method validation refuses invented epochs and implicit dates',()=>{
 for(const y of [0,-1,NaN,Infinity,2026.5,'2026',new Date(),null,10000,Number.MAX_SAFE_INTEGER]){
  assert.throws(()=>M.annualCountForYear(y),RangeError);
  assert.throws(()=>calc(y),RangeError);
 }
 for(const bad of [undefined,null,[],3,'2026',Object.create(null)])assert.throws(()=>M.annualTaiyiResearch(bad),TypeError);
 for(const bad of [{methodId:M.METHOD_ID,traditionalYear:2026,calendarBoundaryResolved:true,epoch:0},
  {methodId:M.METHOD_ID,traditionalYear:2026,calendarBoundaryResolved:true,date:'2026-01-01'},
  {methodId:M.METHOD_ID,traditionalYear:2026,calendarBoundaryResolved:true,utcOffset:7}])assert.throws(()=>M.annualTaiyiResearch(bad),TypeError);
 assert.throws(()=>M.annualTaiyiResearch({methodId:'other-school',traditionalYear:2026,calendarBoundaryResolved:true}),RangeError);
});
test('Engine module returns frozen isolated research output without predictions or complete chart',()=>{
 const v=calc(2026);
 assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.result)&&Object.isFrozen(v.limitations));
 assert.ok(Object.isFrozen(M.PALACE_RING)&&Object.isFrozen(M.ANCHOR));
 assert.equal(Object.hasOwn(v,'prediction'),false);
 assert.equal(Object.hasOwn(v,'fullChart'),false);
 assert.ok(v.limitations.includes('no-generals-or-interpreted-chart'));
});
test('School registry authorizes only isolated subroutine; production/legacy remain untouched',()=>{
 const s=getSchool('thai-at-foundation');
 assert.equal(s.status,'deterministic-subroutine-only');
 assert.equal(s.engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution(s.id).verdict,'RESEARCH_SUBROUTINE_ONLY');
 for(const file of ['packages/astrology-engine/src/tuvi.js','apps/api/src/app.module.ts']){
  const body=readFileSync(resolve(__dirname,'..',file),'utf8');
  assert.doesNotMatch(body,/taiyi-annual-research/);
 }
});
