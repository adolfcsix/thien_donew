'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {auditMonthTrace,auditR63}=require('../infrastructure/scripts/tuvi-r33-r63-audit-lunar-rounding.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const lib={j2000:2451545,offsetDays:1/3};
// Artificial arithmetic traces exercise the validator only; never source evidence.
function arithmeticTrace(refined){
 const rounded=1000,firstJulianDay=lib.j2000+rounded;
 const angle=Math.floor((firstJulianDay+14-2451551)/29.5306)*Math.PI*2;
 const shifted=refined?rounded-0.495:rounded;
 const phase=(shifted-lib.offsetDays+0.001)/36525;
 const fastTT=phase*36525,fastShifted=fastTT-0.001+lib.offsetDays;
 const call=(method,input,output,depth)=>({method,input,output,depth});
 const calls=[call('msaLonT2',angle,phase,2),call('dtT',fastTT,0.001,2)];
 if(refined)calls.push(call('msaLonT',angle,phase,2),call('dtT',fastShifted,0.001,2));
 calls.push(call('shuoHigh',angle,shifted,1),call('calcShuo',rounded,rounded,0));
 return {firstJulianDay,rounded,calls};
}
test('R63 arithmetic validator observes fast/refined paths and a civil midnight split',()=>{
 for(const exact of [false,true]){
  const input=arithmeticTrace(exact),before=JSON.stringify(input);
  const out=auditMonthTrace(input,lib);
  assert.equal(out.exact,exact);
  assert.equal(out.dayAt8,input.firstJulianDay);
  assert.equal(out.dayAt7,input.firstJulianDay-(exact?1:0));
  assert.equal(JSON.stringify(input),before);
 }
});
test('R63 rejects missing, reordered, forged phase/delta-T/offset and rounding data',()=>{
 const mutations=[x=>x.calls.pop(),x=>x.calls.reverse(),x=>x.calls[0].input++,
  x=>x.calls[0].output+=0.1,x=>x.calls[1].input++,x=>x.calls[1].output+=0.1,
  x=>x.calls.at(-2).output++,x=>x.calls.at(-1).output++,
  x=>x.calls[0].depth=1,x=>x.calls[0].output=null,x=>x.firstJulianDay++];
 for(const mutate of mutations){const x=arithmeticTrace(true);mutate(x);assert.throws(()=>auditMonthTrace(x,lib));}
 assert.throws(()=>auditMonthTrace(arithmeticTrace(true),{...lib,offsetDays:7/24}));
 assert.throws(()=>auditR63(null,null,null));
});
test('R63 genuine pinned traces agree with R59 and reject tampered provenance/baselines',{
 skip:process.env.THIENDO_R33_REQUIRE_GENUINE!=='1'?'requires isolated pinned-source execution':false
},()=>{
 const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
 const input=read('.r63-source-lunar-rounding-trace.json');
 const r59=read('.r59-source-lunar-boundary-internals.json');
 const r58=read('.r58-pinned-timezone-calendar-matrix.json');
 const before=JSON.stringify([input,r59,r58]);
 const report=auditR63(input,r59,r58);
 assert.equal(report.measuredMonthTraces,10);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.rows[0]));
 const targets=report.rows.filter(r=>r.year===1989&&r.month===7);
 assert.equal(targets.length,2);
 assert.ok(targets.every(r=>r.sourceFirstJulianDay===2447741&&
  r.localFirstJulianDay===2447740&&r.dayAt7===2447740&&r.dayAt8===2447741));
 for(const key of ['mayChangeChartRules','mayEnableCalendarSchoolMode','mayIncreaseMapping',
  'independentEphemerisVerified','sourceCalendarPolicyFullyVerified','semanticEquivalenceVerified',
  'sourceSchoolParityVerified','localChartCalendarErrorVerified','expertReviewed'])assert.equal(report[key],false);
 assert.equal(report.mappedResearch,31);
 assert.deepEqual(report,auditR63(input,r59,r58));
 assert.equal(JSON.stringify([input,r59,r58]),before);
 for(const mutate of [x=>x.provenance.commit='main',x=>x.provenance.sourceExecuted=false,
  x=>x.provenance.lockedDependencies.iztro='3.0',x=>x.libraries.pop(),
  x=>x.libraries[0].rows.pop(),x=>x.libraries[0].rows[1]=x.libraries[0].rows[0],
  x=>x.libraries[0].fingerprints.shuoHigh='0'.repeat(64),
  x=>x.libraries[0].rows[0].calls[1].output++]){
  const forged=clone(input);mutate(forged);assert.throws(()=>auditR63(forged,r59,r58));
 }
 const forgedR59=clone(r59);forgedR59.libraries[0].lunarMonths[0].firstJulianDay++;
 assert.throws(()=>auditR63(input,forgedR59,r58));
});
