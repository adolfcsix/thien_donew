'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Visual=require('../apps/web/src/features/chart/lib/late-zi-compare-model.cjs');
const {locateMovedStar}=require('../apps/web/src/features/chart/lib/late-zi-star-navigation.cjs');
const build=(date,gender='Nam',minute=0)=>{
 const input={date,hour:23,minute,gender,calendar:'solar'};
 const before=Engine.calculate(input);
 const after=Engine.calculate({...input,date:Visual.nextCivilDate(before)});
 return Visual.compareChartScenarios(before,after);
};
test('r41: locate all movement endpoints in paired twelve-palace charts',()=>{
 for(const date of ['2020-05-22','2023-03-21','2024-02-09','2025-01-28'])
 for(const gender of ['Nam','Nữ'])
 for(const minute of [0,59]){
  const report=build(date,gender,minute),before=JSON.stringify(report);
  for(const star of report.movedStars){
   const pos=locateMovedStar(report,star.name);
   assert.ok(Object.isFrozen(pos));
   assert.equal(pos.name,star.name);
   assert.equal(pos.from,star.from);
   assert.equal(pos.to,star.to);
   assert.notEqual(pos.fromIndex,pos.toIndex);
   assert.equal(report.branches[pos.fromIndex].branch,star.from);
   assert.equal(report.branches[pos.toIndex].branch,star.to);
   assert.equal(pos.beforePalace,report.branches[pos.fromIndex].before.palace);
   assert.equal(pos.afterPalace,report.branches[pos.toIndex].after.palace);
  }
  assert.equal(JSON.stringify(report),before);
 }
});
test('r41: zero-movement comparison displays no selected star and no false endpoint',()=>{
 const report=build('2020-05-22');
 assert.equal(report.movedCount,0);
 assert.equal(locateMovedStar(report,'Tử Vi'),null);
 assert.equal(locateMovedStar(report,''),null);
 assert.equal(locateMovedStar(null,'Tử Vi'),null);
});
test('r41: reject corrupted source or hypothetical target coordinates',()=>{
 const report=build('2024-02-09');
 const name=report.movedStars[0].name;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const invalidTarget=copy(report);
 invalidTarget.branches.find(b=>b.branch===invalidTarget.movedStars[0].to).after.mainStars=[];
 assert.throws(()=>locateMovedStar(invalidTarget,name),/tọa độ/);
 const invalidSource=copy(report);
 invalidSource.branches.find(b=>b.branch===invalidSource.movedStars[0].from).movedBefore=[];
 assert.throws(()=>locateMovedStar(invalidSource,name),/tọa độ/);
 assert.equal(locateMovedStar(report,'Sao không tồn tại'),null);
});
