'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {SOURCE_COMMIT}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const r36=require('../infrastructure/scripts/tuvi-r36-evaluate-zi-clock.cjs');
const f=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tuvi-r36-zi-clock-policy.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
function contractMirrorOnly(){
 const records=[];
 for(const anchor of f.anchors)for(const hhmm of f.clockTimes)
 for(const mode of f.solarModes)for(const policy of f.policies){
  const [clockHour,clockMinute]=hhmm.split(':').map(Number);
  const longitudeCorrection=mode.longitude===null?0:(mode.longitude-mode.utcOffsetMinutes/4)*4;
  // Unit-only algebraic mirror uses zero equation-of-time. It is NOT the
  // actual reference runtime and cannot satisfy release provenance by itself.
  const total=longitudeCorrection,raw=clockHour*60+clockMinute+total;
  const seconds=Math.round(raw*60),dayOffset=Math.floor(seconds/86400);
  const rest=((seconds%86400)+86400)%86400,normalizedMinutes=rest/60;
  const solar={
   dateValid:true,corrected:mode.longitude!==null,
   longitudeCorrectionMinutes:longitudeCorrection,equationOfTimeMinutes:0,
   totalCorrectionMinutes:total,rawMinutes:raw,normalizedMinutes,
   dayOffset,hour:Math.floor(rest/3600),
   minute:Math.floor((rest%3600)/60),second:rest%60,
   branch:r36.branch(normalizedMinutes)
  };
  const finalDayOffset=r36.expectedZiDayOffset(solar,policy);
  records.push({
   id:[anchor.id,hhmm,mode.id,policy].join(':'),
   anchorId:anchor.id,inputDate:anchor.date,hhmm,clockHour,clockMinute,
   solarMode:mode.id,longitude:mode.longitude,utcOffsetMinutes:mode.utcOffsetMinutes,
   policy,
   source:{...solar,finalDayOffset,effectiveDate:r36.shifted(anchor.date,finalDayOffset)}
  });
 }
 return {
  schema:r36.SCHEMA,
  provenance:{
   repository:'Renhuai123/ziwei-doushu',commit:SOURCE_COMMIT,
   generator:'calculateTrueSolarTime + resolveZiweiDayOffset + shiftGregorianDate',
   sourceExecuted:true,syntheticOnly:true
  },
  records
 };
}
test('r36: freeze 4 anchor dates x 6 clocks x 3 corrections x 4 policies',()=>{
 assert.doesNotThrow(()=>r36.validateFixture(f));
 assert.deepEqual(f.anchors.map(x=>x.date),[
  '2020-05-22','2023-03-21','2024-02-09','2025-01-28']);
 assert.deepEqual(f.policies,['next-day','current-day','all-current','day-cur-time-next']);
 assert.deepEqual(f.clockTimes,['00:00','00:59','01:00','22:59','23:00','23:59']);
 assert.equal(r36.shifted('2024-02-09',1),'2024-02-10');
 assert.equal(r36.shifted('2025-01-28',-1),'2025-01-27');
 for(const change of [
  v=>v.anchors[0].date='2020-05-23',
  v=>v.policies[0]='midnight-only',
  v=>v.clockTimes.pop(),
  v=>v.solarModes[1].longitude=106,
  v=>v.source.commit='HEAD'
 ]){const bad=clone(f);change(bad);assert.throws(()=>r36.validateFixture(bad));}
});
test('r36: source-independent late-Tý truth table covers 23:00 and clock corrections',()=>{
 assert.equal(r36.branch(0),0);
 assert.equal(r36.branch(59.99),0);
 assert.equal(r36.branch(60),1);
 assert.equal(r36.branch(1379.99),11);
 assert.equal(r36.branch(1380),0);
 const s={branch:0,normalizedMinutes:1380,dayOffset:0};
 for(const policy of f.policies){
  assert.equal(r36.expectedZiDayOffset(s,policy),policy==='next-day'?1:0);
 }
 const westCross={branch:0,normalizedMinutes:1380,dayOffset:-1};
 assert.equal(r36.expectedZiDayOffset(westCross,'next-day'),0);
 assert.equal(r36.expectedZiDayOffset(westCross,'current-day'),-1);
 const eastCross={branch:0,normalizedMinutes:15,dayOffset:1};
 for(const policy of f.policies)assert.equal(r36.expectedZiDayOffset(eastCross,policy),1);
});
test('r36: 288 unique controlled source records, strict provenance and shapes',()=>{
 const input=contractMirrorOnly();
 assert.equal(input.records.length,288);
 assert.equal(new Set(input.records.map(r=>r.id)).size,288);
 assert.doesNotThrow(()=>r36.validateSource(input,f));
 for(const change of [
  v=>v.records.pop(),
  v=>v.records[0].id=v.records[1].id,
  v=>v.records[0].clockHour=17,
  v=>v.records[0].source.branch=12,
  v=>v.records[0].source.dayOffset=10,
  v=>v.provenance.sourceExecuted=false,
  v=>v.provenance.commit='unverified'
 ]){const bad=clone(input);change(bad);assert.throws(()=>r36.validateSource(bad,f));}
});
test('r36: independently recompute source minute sums, branch, day and dates',()=>{
 const input=contractMirrorOnly(),before=JSON.stringify(input);
 const report=r36.analyze(input,f);
 assert.equal(report.checked,288);
 assert.equal(report.failures,0);
 assert.equal(report.summary.total,288);
 for(const p of f.policies)assert.equal(report.byPolicy[p].total,72);
 for(const h of f.clockTimes)assert.equal(report.byHour[h].total,48);
 for(const m of f.solarModes)assert.equal(report.byMode[m.id].total,96);
 assert.equal(report.catalogMappedConditionsUnchanged,31);
 assert.equal(JSON.stringify(input),before);
 const changed=clone(input);
 changed.records[0].source.finalDayOffset=1;
 const reportBad=r36.analyze(changed,f);
 assert.equal(reportBad.failures,1);
 assert.ok(reportBad.errors[0].failures.includes('source-late-zi-day-rule'));
 const altered=clone(input);
 altered.records[1].source.rawMinutes+=20;
 assert.equal(r36.analyze(altered,f).failures,1);
});
test('r36: do not claim astronomy, historical timezone or school equivalence',()=>{
 const result=r36.analyze(contractMirrorOnly(),f);
 assert.equal(result.sourceAstronomicalAccuracyVerified,false);
 assert.equal(result.sourceGeographicTimezoneAccuracyVerified,false);
 assert.equal(result.vietnamSchoolSemanticEquivalenceVerified,false);
 assert.equal(result.catalogMappedConditionsUnchanged,31);
 assert.equal(summarizeClassicalCatalog([]).referenceTotal,49);
 assert.match(result.limitation,/not independently measured|no independently measured/);
 const source=fs.readFileSync(path.join(__dirname,
  '../infrastructure/scripts/tuvi-r36-source-zi-clock-probe.ts.template'),'utf8');
 assert.match(source,/calculateTrueSolarTime\(/);
 assert.match(source,/resolveZiweiDayOffset\(/);
 assert.match(source,/shiftGregorianDate\(/);
 assert.match(source,/records.length!==288/);
});
test('r36: source runtime is mandatory in CI, local mock cannot count as source evidence',()=>{
 if(process.env.THIENDO_R36_REQUIRE_GENUINE!=='1')return;
 const evidencePath=path.resolve(__dirname,'../.r36-source-zi-clock-observations.json');
 assert.ok(fs.existsSync(evidencePath),'R36 missing executed source checkout evidence');
 const actual=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
 const report=r36.analyze(actual,f);
 assert.equal(report.checked,288,JSON.stringify(report.errors));
 assert.equal(report.failures,0,JSON.stringify(report.errors));
 assert.equal(report.sourceLateZiPolicyImplementationVerified,true);
 assert.equal(report.sourceCivilDateCorrectionReproduced,true);
 assert.equal(report.sourceGeographicTimezoneAccuracyVerified,false);
 assert.equal(report.catalogMappedConditionsUnchanged,31);
});
