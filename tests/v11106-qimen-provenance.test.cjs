'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const {analyzeHourSignals}=require('../apps/web/src/features/ky-mon/hour-signals.cjs');
const base=makeBaseFormation({solarTermIndex:3,dayCycleIndex:52,hourCycleIndex:hourForDayBranch(52,5).index});
const plate=buildRotatingHourPlate(base);
for(const field of ['term','dun','ju','yuan','method']){
 test(`reject altered base metadata: ${field}`,()=>{
  const forged={...base,[field]:field==='ju'?9:field==='yuan'?{...base.yuan,index:99}:'altered'};
  assert.throws(()=>analyzeHourSignals(forged,plate),RangeError);
 });
}
for(const field of ['hourName','trueHourStem','hourStemPalace','chiefStar','chiefDoor','chiefStarLanding','chiefDoorLanding','starShift','doorShift','centerEarthStem','spiritDirection','method','status']){
 test(`reject altered hour metadata: ${field}`,()=>{
  assert.throws(()=>analyzeHourSignals(base,{...plate,[field]:'altered'}),RangeError);
 });
}
test('JSON restored input preserves signals without mutation',()=>{
 const restored=JSON.parse(JSON.stringify({base,plate}));
 const before=JSON.stringify(restored);
 assert.deepEqual(analyzeHourSignals(restored.base,restored.plate),analyzeHourSignals(base,plate));
 assert.equal(JSON.stringify(restored),before);
});
