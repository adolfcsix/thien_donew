'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {FIXTURE,validateReference,extractNasaNewMoons,compareReference,auditR64}=
 require('../infrastructure/scripts/tuvi-r33-r64-audit-independent-new-moons.cjs');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const fixture=read(FIXTURE);
test('R64 pins all 37 NASA new-moon minutes and excludes later phase columns',()=>{
 assert.equal(validateReference(fixture),true);
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const lines=fixture.cases.map(e=>{
  const [year,month,day]=e.id.split('-');
  return ' '+year+'   '+months[Number(month)-1]+' '+day+'  '+e.utMinute.slice(11,16)+'     Jan  4  01:40';
 });
 const html='Universal Time (UT) New Moon\n'+lines.join('\n')+
  '\n 1990                     Jan  4  10:40     Jan 11  04:57';
 assert.deepEqual(extractNasaNewMoons(html),fixture.cases);
 assert.throws(()=>extractNasaNewMoons(html.replace('16:06','16:07')));
 assert.throws(()=>extractNasaNewMoons(html+'\n'+lines[0]));
 assert.throws(()=>extractNasaNewMoons('New Moon'));
 for(const change of [x=>x.cases.pop(),x=>x.cases.reverse(),
  x=>x.cases[0].utMinute='1988-01-19T05:27:00Z',x=>x.source.timescale='TT',
  x=>x.source.url='https://example.invalid',x=>x.source.recordsSha256='0'.repeat(64)]){
  const forged=clone(fixture);change(forged);assert.throws(()=>validateReference(forged));
 }
});
test('R64 arithmetic reports timing outliers without converting them into integrity failures',()=>{
 const lib={name:'arithmetic-only',j2000:2451545,offsetDays:1/3};
 const event=fixture.cases.find(e=>e.id==='1989-08-01');
 const relative=Date.parse(event.utMinute)/86400000+2440587.5-lib.j2000;
 const shifted=relative+lib.offsetDays,rounded=Math.floor(shifted+0.5);
 const angle=Math.floor((rounded+lib.j2000+14-2451551)/29.5306)*Math.PI*2;
 const phase=(relative+0.001)/36525,fastTT=phase*36525;
 const call=(method,input,output,depth)=>({method,input,output,depth});
 const row={firstJulianDay:rounded+lib.j2000,rounded,calls:[
  call('msaLonT2',angle,phase,2),call('dtT',fastTT,0.001,2),
  call('msaLonT',angle,phase,2),call('dtT',fastTT-0.001+lib.offsetDays,0.001,2),
  call('shuoHigh',angle,shifted,1),call('calcShuo',rounded,rounded,0)]};
 const before=JSON.stringify(row),normal=compareReference(row,lib,event);
 assert.ok(Math.abs(normal.errorSeconds)<0.001);
 assert.equal(normal.splitCivilDate,true);
 assert.equal(normal.localDayOneAtNasa7,true);
 const outlier=compareReference(row,lib,{...event,utMinute:'1989-08-01T16:11:00Z'});
 assert.equal(outlier.within120SecondComparisonWindow,false);
 assert.ok(Math.abs(outlier.errorSeconds+300)<0.001);
 assert.throws(()=>compareReference(row,lib,{...event,utMinute:'1989-09-01T16:06:00Z'}));
 assert.equal(JSON.stringify(row),before);
 assert.throws(()=>auditR64(null,fixture,null,null,null));
});
test('R64 refuses missing evidence; genuine source comparisons require the pinned-source gate',()=>{
 assert.throws(()=>auditR64(null,fixture,null,null,null));
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const root=path.join(__dirname,'..');
 const source=read(path.join(root,'.r64-source-lunar-rounding-trace.json'));
 const r63=read(path.join(root,'.r63-source-lunar-rounding-trace.json'));
 const r59=read(path.join(root,'.r59-source-lunar-boundary-internals.json'));
 const r58=read(path.join(root,'.r58-pinned-timezone-calendar-matrix.json'));
 const before=JSON.stringify([source,fixture,r63,r59,r58]);
 const report=auditR64(source,fixture,r63,r59,r58);
 assert.equal(report.comparedSourceTraces,74);assert.equal(report.independentReferenceEvents,37);
 assert.equal(report.withinComparisonWindow,74);
 assert.ok(report.maximumAbsoluteDifferenceSeconds<35);
 assert.equal(report.sourceCivilDayMatches,74);assert.equal(report.sevenHourCivilDayMatches,74);
 assert.equal(report.localDayOneMatches,74);
 assert.ok(report.rows.every(r=>r.civilProjectionStableAtPublishedMinutePrecision));
 assert.equal(report.rows.filter(r=>r.splitCivilDate).length,2);
 for(const key of ['fullEphemerisAccuracyVerified','sourceCalendarPolicyFullyVerified','rootCauseVerified',
  'semanticEquivalenceVerified','sourceSchoolParityVerified','expertReviewed','mayChangeChartRules',
  'mayEnableCalendarSchoolMode','mayIncreaseMapping'])assert.equal(report[key],false);
 assert.equal(report.mappedResearch,31);
 assert.ok(Object.isFrozen(report.rows[0]));
 assert.equal(JSON.stringify([source,fixture,r63,r59,r58]),before);
 assert.deepEqual(report,auditR64(source,fixture,r63,r59,r58));
 for(const change of [x=>x.provenance.commit='main',x=>x.provenance.sourceExecuted=false,
  x=>x.libraries.pop(),x=>x.libraries[0].rows.pop(),
  x=>x.libraries[0].rows[1].id=x.libraries[0].rows[0].id,
  x=>x.libraries[0].fingerprints.dtT='0'.repeat(64),x=>x.libraries[0].rows[0].calls[0].output++]){
  const forged=clone(source);change(forged);assert.throws(()=>auditR64(forged,fixture,r63,r59,r58));
 }
});
