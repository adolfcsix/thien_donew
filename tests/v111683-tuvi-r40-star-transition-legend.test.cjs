'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Visual=require('../apps/web/src/features/chart/lib/late-zi-compare-model.cjs');
const baseline=x=>({date:x,hour:23,minute:0,gender:'Nam',calendar:'solar'});
function compare(day,gender='Nam',minute=0){
 const input={...baseline(day),gender,minute};
 const original=Engine.calculate(input);
 const nextDay=Visual.nextCivilDate(original);
 const alternate=Engine.calculate({...input,date:nextDay});
 const before=JSON.stringify(original),after=JSON.stringify(alternate);
 const report=Visual.compareChartScenarios(original,alternate);
 assert.equal(JSON.stringify(original),before);
 assert.equal(JSON.stringify(alternate),after);
 assert.equal(report.hypotheticalOnly,true);
 assert.equal(report.writeOperations,false);
 assert.equal(report.currentSelected,true);
 return report;
}
test('r40: every moved star has an unambiguous original and hypothetical branch',()=>{
 for(const date of ['2020-05-22','2023-03-21','2024-02-09','2025-01-28'])
 for(const gender of ['Nam','Nữ'])for(const minute of [0,59]){
  const input={...baseline(date),gender,minute};
  const original=Engine.calculate(input);
  const alternate=Engine.calculate({...input,date:Visual.nextCivilDate(original)});
  const result=Visual.compareChartScenarios(original,alternate);
  const allNames=new Set(result.branches.flatMap(b=>b.before.mainStars));
  assert.equal(allNames.size,14);
  assert.equal(result.movedStars.length,result.movedCount);
  assert.equal(new Set(result.movedStars.map(x=>x.name)).size,result.movedCount);
  for(const star of result.movedStars){
   assert.equal(typeof star.name,'string');
   assert.notEqual(star.from,star.to);
   assert.ok(allNames.has(star.name));
   assert.ok(result.branches.find(b=>b.branch===star.from).before.mainStars.includes(star.name));
   assert.ok(result.branches.find(b=>b.branch===star.to).after.mainStars.includes(star.name));
   assert.ok(result.branches.find(b=>b.branch===star.from).movedBefore.includes(star.name));
   assert.ok(result.branches.find(b=>b.branch===star.to).movedAfter.includes(star.name));
  }
 }
});
test('r40: zero-movement case remains valid and explains non-stellar changes',()=>{
 const result=compare('2020-05-22');
 assert.equal(result.movedCount,0);
 assert.deepEqual(result.movedStars,[]);
 assert.equal(result.fields.find(f=>f.key==='lunar').changed,true);
});
test('r40: transition is present only if a star branch actually moves',()=>{
 const report=compare('2024-02-09');
 assert.equal(report.movedCount,14);
 for(const star of report.movedStars)assert.ok(Visual.BRANCHES.includes(star.from)&&Visual.BRANCHES.includes(star.to));
 assert.deepEqual(
  report.movedStars.map(x=>x.name),
  [...report.movedStars].map(x=>x.name).sort((a,b)=>a.localeCompare(b,'vi'))
 );
});
