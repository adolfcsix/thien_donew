'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const R=require('../packages/astrology-engine/src/bazi-time-research.cjs');
const B=require('../packages/astrology-engine/src/bazi.js');
const {gateSchoolExecution,getSchool}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const fixed={date:'2004-08-15',hour:10,minute:30,utcOffsetMinutes:420,longitudeDeg:105};
const calendarKey=key=>r=>r.pillars[key].name;

test('NOAA equation of time shows expected seasonal sign and magnitude',()=>{
 const feb=R.equationOfTimeNoaa(Date.UTC(2026,1,11,12));
 const nov=R.equationOfTimeNoaa(Date.UTC(2026,10,3,12));
 assert.ok(feb < -13 && feb > -16,`February NOAA ${feb}`);
 assert.ok(nov > 15 && nov < 18,`November NOAA ${nov}`);
});
test('Reference meridian exactly matches civil clock for mean solar',()=>{
 const civil=R.evaluate(fixed),mean=R.evaluate({...fixed,timeMode:'mean-solar'});
 assert.deepEqual(civil.pillars,mean.pillars);
 assert.equal(mean.timeCorrection.correctionMinutes,0);
});
test('Longitude correction is exactly four minutes per degree',()=>{
 const r=R.evaluate({...fixed,timeMode:'mean-solar',longitudeDeg:108});
 assert.equal(r.timeCorrection.correctionMinutes,12);
 assert.equal(r.timestamps.effective,'2004-08-15 10:42');
});
test('Longitude is unwrapped at the international date line',()=>{
 const c=R.solarTimeCorrection({utcMs:Date.UTC(2026,0,3),utcOffsetMinutes:-720,longitudeDeg:179,timeMode:'mean-solar'});
 assert.equal(c.unwrappedLongitudeDeg,-181);
 assert.equal(c.correctionMinutes,-4);
});
test('Actual UTC instant controls year and month regardless of local longitude',()=>{
 const a=R.evaluate({...fixed,timeMode:'civil'});
 const b=R.evaluate({...fixed,timeMode:'apparent-solar',longitudeDeg:113});
 assert.equal(calendarKey('year')(a),calendarKey('year')(b));
 assert.equal(calendarKey('month')(a),calendarKey('month')(b));
});
test('Different time zones representing same instant share year/month',()=>{
 const a=R.evaluate({date:'2026-02-03',hour:23,minute:44,utcOffsetMinutes:420,longitudeDeg:105});
 const b=R.evaluate({date:'2026-02-04',hour:0,minute:44,utcOffsetMinutes:480,longitudeDeg:120});
 assert.equal(a.timestamps.utc,b.timestamps.utc);
 assert.equal(calendarKey('year')(a),calendarKey('year')(b));
 assert.equal(calendarKey('month')(a),calendarKey('month')(b));
});
test('Civil UTC+7 retains original engine four pillars when same input',()=>{
 const raw=B.calculate({date:fixed.date,hour:fixed.hour,minute:fixed.minute});
 const research=R.evaluate(fixed);
 for(const k of ['year','month','day','hour'])assert.equal(raw.pillars[k].name,research.pillars[k].name);
});
test('Mean solar can move forward into next day and change day/hour',()=>{
 const input={date:'2004-08-15',hour:23,minute:50,utcOffsetMinutes:420,longitudeDeg:110};
 const a=R.evaluate(input),b=R.evaluate({...input,timeMode:'mean-solar'});
 assert.equal(b.timestamps.effective,'2004-08-16 00:10');
 assert.notEqual(a.pillars.day.name,b.pillars.day.name);
 assert.equal(a.pillars.month.name,b.pillars.month.name);
});
test('Mean solar can move backwards into previous day',()=>{
 const b=R.evaluate({date:'2004-08-15',hour:0,minute:10,utcOffsetMinutes:420,longitudeDeg:100,timeMode:'mean-solar'});
 assert.equal(b.timestamps.effective,'2004-08-14 23:50');
});
test('Late Zi changes date pillar at 23:00 while midnight retains it',()=>{
 const input={date:'2004-08-15',hour:23,minute:30,utcOffsetMinutes:420,longitudeDeg:105};
 const midnight=R.evaluate({...input,dayBoundary:'midnight'});
 const late=R.evaluate({...input,dayBoundary:'late-zi'});
 assert.notEqual(midnight.pillars.day.name,late.pillars.day.name);
 assert.notEqual(midnight.pillars.hour.name,late.pillars.hour.name);
});
test('Midnight clock boundary warning and dual mode matrix',()=>{
 const input={date:'2004-08-15',hour:23,minute:58,utcOffsetMinutes:420,longitudeDeg:105};
 const r=R.evaluate(input);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.boundaryCheck.withinFiveMinutes);
 const c=R.compareConventions(input);
 assert.equal(c.cases.length,6);
 assert.ok(c.differingPillars.includes('day'));
 assert.ok(c.cases.every(x=>Object.hasOwn(x.pillars,'hour')));
});
test('Near Jie is flagged and not silently presented as verified',()=>{
 const sample=R.evaluate({date:'2026-02-04',hour:4,minute:0,utcOffsetMinutes:480,longitudeDeg:120});
 assert.ok(['review-required','provisional'].includes(sample.solarTerm.JieBoundaryStatus));
 assert.equal(sample.researchOnly,true);
 assert.ok(sample.disclaimer.includes('Không phải'));
});
test('Repeated research evaluations are deterministic and do not mutate engine',()=>{
 const input={...fixed,timeMode:'apparent-solar',longitudeDeg:110};
 assert.deepEqual(R.evaluate(input),R.evaluate(input));
 assert.ok(Object.isFrozen(R.evaluate(input)));
});
test('Invalid dates, offsets, longitude and modes fail closed',()=>{
 for(const bad of [
  {...fixed,date:'2026-02-29'}, {...fixed,date:'2100-01-01'},
  {...fixed,hour:24},{...fixed,minute:60},{...fixed,utcOffsetMinutes:undefined},
  {...fixed,utcOffsetMinutes:10000},{...fixed,longitudeDeg:181},
  {...fixed,longitudeDeg:NaN},{...fixed,timeMode:'fictional'},
  {...fixed,dayBoundary:'sunset'},null,{}
 ])assert.throws(()=>R.evaluate(bad));
 assert.throws(()=>R.solarTimeCorrection({utcMs:0,utcOffsetMinutes:420,longitudeDeg:NaN,timeMode:'mean-solar'}));
});
test('Study module has school gate; original production calculator remains unchanged',()=>{
 assert.equal(getSchool('bat-tu-tiet-khi').engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution('bat-tu-tiet-khi').verdict,'RESEARCH_SUBROUTINE_ONLY');
 for(const f of ['packages/astrology-engine/src/bazi.js','apps/api/src/app.module.ts']){
  assert.doesNotMatch(readFileSync(resolve(__dirname,'..',f),'utf8'),/bazi-time-research/);
 }
});
test('A broad calendar/timezone grid yields internally consistent year/month based only on instant',()=>{
 let count=0;
 for(const date of ['2004-02-10','2004-08-15','2026-01-25','2026-11-08'])for(const hour of [0,6,12,18,23])for(const minute of [0,15,45])for(const offset of [420,480,-300]){
  const original=R.evaluate({date,hour,minute,utcOffsetMinutes:offset,longitudeDeg:offset/4});
  const compare=R.evaluate({date,hour,minute,utcOffsetMinutes:offset,longitudeDeg:offset/4+2,timeMode:'mean-solar'});
  assert.equal(original.pillars.year.name,compare.pillars.year.name);
  assert.equal(original.pillars.month.name,compare.pillars.month.name);
  assert.equal(compare.pillars.day.stemIndex%2, compare.pillars.day.branchIndex%2);
  count++;
 }
 assert.equal(count,180);
});
