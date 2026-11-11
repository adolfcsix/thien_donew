'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Audit=require('../packages/astrology-engine/src/tuvi-zi-scenario-audit.cjs');
const Visual=require('../apps/web/src/features/chart/lib/late-zi-compare-model.cjs');
const input=(date,hour=23,minute=0,gender='Nam')=>({date,hour,minute,gender,calendar:'solar'});
const pair=(date,minute=0,gender='Nam')=>{
 const before=Engine.calculate(input(date,23,minute,gender));
 const tomorrow=Visual.nextCivilDate(before);
 return {before,after:Engine.calculate(input(tomorrow,23,minute,gender))};
};
test('r38: UI comparison always retains exact existing civil date and next date',()=>{
 for(const date of ['2020-05-22','2023-03-21','2024-02-09','2025-01-28'])
 for(const gender of ['Nam','Nữ'])for(const minute of [0,59]){
  const {before,after}=pair(date,minute,gender);
  const frozenBefore=JSON.stringify(before),frozenAfter=JSON.stringify(after);
  const report=Visual.compareChartScenarios(before,after);
  const research=Audit.evaluate(input(date,23,minute,gender));
  assert.equal(report.schema,'thiendo-r38-late-zi-visual-compare-v1');
  assert.equal(report.currentDate,date);
  assert.equal(report.alternativeDate,research.candidateDate);
  assert.equal(report.clock,'23:'+String(minute).padStart(2,'0'));
  assert.equal(report.branches.length,12);
  assert.equal(report.fields.length,6);
  assert.equal(report.movedCount,research.comparison.changedCoreStars.length);
  assert.equal(report.fields.find(row=>row.key==='ziwei').changed,
   research.comparison.changedFields.includes('ziWei'));
  assert.equal(report.fields.find(row=>row.key==='menh').changed,
   research.comparison.changedFields.includes('menh'));
  assert.equal(report.fields.find(row=>row.key==='cuc').changed,
   research.comparison.changedFields.includes('cuc'));
  assert.equal(report.movedCount,report.branches.flatMap(b=>b.movedBefore).length);
  for(const row of report.fields)assert.equal(row.changed,row.before!==row.after);
  assert.equal(report.currentSelected,true);
  assert.equal(report.hypotheticalOnly,true);
  assert.equal(report.writeOperations,false);
  assert.equal(report.timezoneVerified,false);
  assert.equal(report.schoolEquivalenceVerified,false);
  assert.equal(JSON.stringify(before),frozenBefore);
  assert.equal(JSON.stringify(after),frozenAfter);
 }
});
test('r38: changing palace and star positions are visually marked in both scenarios',()=>{
 const {before,after}=pair('2024-02-09');
 const r=Visual.compareChartScenarios(before,after);
 assert.equal(r.movedCount,14);
 assert.equal(r.branches.length,12);
 assert.equal(r.affectedBranches,r.branches.filter(x=>x.changed).length);
 assert.deepEqual(r.branches.map(x=>x.branch),Visual.BRANCHES);
 assert.ok(r.branches.some(x=>x.changed));
 for(const branch of r.branches){
  assert.equal(branch.before.mainStars.some(x=>branch.movedBefore.includes(x)),
   branch.movedBefore.length>0);
  assert.equal(branch.after.mainStars.some(x=>branch.movedAfter.includes(x)),
   branch.movedAfter.length>0);
  assert.equal(branch.changed,branch.before.palace!==branch.after.palace||
   branch.before.isThan!==branch.after.isThan||
   branch.before.mainStars.length!==branch.after.mainStars.length||
   branch.before.mainStars.some(s=>!branch.after.mainStars.includes(s)));
 }
});
test('r38: no special treatment needed for a day change without a star placement change',()=>{
 const r=Visual.compareChartScenarios(...Object.values(pair('2020-05-22')));
 assert.equal(r.movedCount,0);
 assert.equal(r.branches.length,12);
 assert.equal(r.fields.find(x=>x.key==='lunar').changed,true);
});
test('r38: reject wrong hour, skipped day, mismatched gender and incomplete charts',()=>{
 const {before,after}=pair('2024-02-09');
 const clone=x=>JSON.parse(JSON.stringify(x));
 const cases=[
  [Object.assign(clone(before),{hour:22}),after],
  [before,Object.assign(clone(after),{minute:59})],
  [before,Object.assign(clone(after),{gender:'Nữ'})],
  [before,Object.assign(clone(after),{solar:{year:2024,month:2,day:11}})],
  [Object.assign(clone(before),{houses:before.houses.slice(1)}),after],
  [before,Object.assign(clone(after),{houses:after.houses.map((h,i)=>i===1?{...h,branchIndex:0}:h)})]
 ];
 for(const [left,right] of cases)assert.throws(()=>Visual.compareChartScenarios(left,right));
 assert.equal(Visual.nextCivilDate(Engine.calculate(input('2100-12-31'))),null);
});
test('r38: no mutation, no writes and no changed production policy after repeated previews',()=>{
 const seeds=['2020-05-22','2023-03-21','2024-02-09','2025-01-28'];
 const before=seeds.map(date=>JSON.stringify(Engine.calculate(input(date))));
 for(let n=0;n<3;n++)for(const date of seeds){
  const charts=pair(date),report=Visual.compareChartScenarios(charts.before,charts.after);
  assert.equal(report.writeOperations,false);
  assert.equal(report.currentSelected,true);
 }
 assert.deepEqual(seeds.map(date=>JSON.stringify(Engine.calculate(input(date)))),before);
});
