'use strict';
/** R63: bounded arithmetic evidence, never permission to change chart rules. */
const fs=require('node:fs');
const Lunar=require('../../packages/astrology-engine/src/lunar.js');
const {auditR59,LIBRARIES,MONTHS,LOCKED}=require('./tuvi-r33-r59-evaluate-lunar-boundary-internals.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const SCHEMA='thiendo-r63-lunar-rounding-audit-v1';
const SOURCE_SCHEMA='thiendo-r63-source-lunar-rounding-trace-v1';
const METHODS=Object.freeze(['calcShuo','shuoHigh','msaLonT2','msaLonT','dtT']);
const check=(ok,message)=>{if(!ok)throw Error('R63: '+message);};
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function auditMonthTrace(row,lib){
 check(row&&lib&&lib.j2000===2451545&&near(lib.offsetDays,1/3)&&
  Number.isInteger(row.firstJulianDay)&&Number.isInteger(row.rounded)&&
  row.rounded+lib.j2000===row.firstJulianDay,'trace epoch/rounding');
 const calls=row.calls;
 check(Array.isArray(calls)&&calls.every(c=>c&&METHODS.includes(c.method)&&
  Number.isFinite(c.input)&&Number.isFinite(c.output)&&Number.isInteger(c.depth)),'invalid trace values');
 const sequence=calls.map(c=>c.method).join(',');
 const exact=sequence==='msaLonT2,dtT,msaLonT,dtT,shuoHigh,calcShuo';
 check(exact||sequence==='msaLonT2,dtT,shuoHigh,calcShuo','unexpected observed call path');
 const high=calls.at(-2),calc=calls.at(-1),phase=calls[exact?2:0],delta=calls[exact?3:1];
 check(high.depth===1&&calc.depth===0&&calls.slice(0,-2).every(c=>c.depth===2),'trace nesting');
 check(near(calc.input,row.firstJulianDay-lib.j2000)&&calc.output===row.rounded,'calc input/output');
 const angle=Math.floor((calc.input+lib.j2000+14-2451551)/29.5306)*Math.PI*2;
 check(near(high.input,angle)&&near(calls[0].input,angle)&&near(phase.input,angle),'phase argument');
 const fastTT=calls[0].output*36525;
 check(near(calls[1].input,fastTT),'initial delta-T argument');
 const fastShifted=fastTT-calls[1].output+lib.offsetDays;
 const seconds=((fastShifted+0.5)%1)*86400;
 check(exact===(seconds<1800||seconds>86400-1800),'precision branch disagreement');
 if(exact)check(near(delta.input,fastShifted),'refined delta-T argument');
 check(near(high.output,phase.output*36525-delta.output+lib.offsetDays)&&
  Math.floor(high.output+0.5)===calc.output,'phase/offset/rounding chain');
 const unshifted=high.output-lib.offsetDays;
 const dayAt7=Math.floor(unshifted+0.5+7/24)+lib.j2000;
 const dayAt8=Math.floor(unshifted+0.5+8/24)+lib.j2000;
 check(dayAt8===row.firstJulianDay,'eight-hour arithmetic must reproduce source day');
 return {unshifted,dayAt7,dayAt8,exact};
}
function auditR63(probe,r59Probe,r58){
 const baseline=auditR59(r59Probe,r58);
 check(probe?.schema===SOURCE_SCHEMA&&probe.provenance?.repository==='Renhuai123/ziwei-doushu'&&
  probe.provenance.commit===SOURCE_COMMIT&&probe.provenance.sourceExecuted===true&&
  probe.provenance.syntheticOnly===true&&
  JSON.stringify(probe.provenance.lockedDependencies)===JSON.stringify(LOCKED), 'pinned provenance');
 check(Array.isArray(probe.libraries)&&probe.libraries.length===2,'two libraries required');
 const rows=[];
 for(let i=0;i<2;i++){
  const lib=probe.libraries[i],base=baseline.libraries[i];
  check(lib?.name===LIBRARIES[i]&&lib.j2000===2451545&&near(lib.offsetDays,1/3),'library identity/epoch/offset');
  check(METHODS.every(k=>/^[a-f0-9]{64}$/.test(lib.fingerprints?.[k])),'method fingerprints missing');
  check(lib.fingerprints.shuoHigh===base.methodFingerprints.high&&
   lib.fingerprints.calcShuo===base.methodFingerprints.calc,'method changed since independent R59');
  check(Array.isArray(lib.rows)&&lib.rows.length===5,'five month traces required');
  const seen=new Set();
  for(const row of lib.rows){
   const key=row?.year+'-'+row?.month;
   check(MONTHS.includes(key)&&!seen.has(key),'unknown/duplicate month');seen.add(key);
   const expected=base.months.find(m=>m.year===row.year&&m.month===row.month);
   check(row.firstJulianDay===expected.firstJulianDay&&Number.isInteger(row.rounded)&&
    row.rounded+lib.j2000===row.firstJulianDay,'R59 first-day disagreement');
   const {unshifted,dayAt7,dayAt8,exact}=auditMonthTrace(row,lib);
   const local=Lunar.lunarToSolar(row.year,row.month,1,false);
   const localFirst=Lunar.jd(local.day,local.month,local.year);
   rows.push({library:lib.name,year:row.year,month:row.month,
    sourceFirstJulianDay:row.firstJulianDay,localFirstJulianDay:localFirst,
    unshiftedJulianDay:unshifted+lib.j2000,dayAt7,dayAt8,
    sevenHourArithmeticMatchesLocal:dayAt7===localFirst,
    offsetChangesCivilDay:dayAt7!==dayAt8,refinedMethodObserved:exact});
  }
 }
 return freeze({schema:SCHEMA,sourceCommit:SOURCE_COMMIT,sourceExecuted:true,
  measuredMonthTraces:rows.length,rows,sourceRoundingChainVerifiedForSample:true,
  sourceCalendarPolicyFullyVerified:false,independentEphemerisVerified:false,
  localChartCalendarErrorVerified:false,semanticEquivalenceVerified:false,
  sourceSchoolParityVerified:false,expertReviewed:false,mayChangeChartRules:false,
  mayEnableCalendarSchoolMode:false,mayIncreaseMapping:false,mappedResearch:31,referenceTotal:49});
}
if(require.main===module){
 check(process.argv.length===3,'requires genuine source trace JSON');
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 const report=auditR63(read(process.argv[2]),read('.r59-source-lunar-boundary-internals.json'),
  read('.r58-pinned-timezone-calendar-matrix.json'));
 fs.writeFileSync('.r63-lunar-rounding-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log('R63: '+report.measuredMonthTraces+' original source rounding traces; '+
  report.rows.filter(r=>r.offsetChangesCivilDay).length+' civil-day offset differences; 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,SOURCE_SCHEMA,METHODS,auditMonthTrace,auditR63});
