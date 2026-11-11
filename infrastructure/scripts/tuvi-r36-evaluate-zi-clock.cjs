'use strict';
/** R36: validate 288 real source clock/late-Zi results, no algorithm changes. */
const fs=require('node:fs'),path=require('node:path');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const FIXTURE=path.resolve(__dirname,'../../tests/fixtures/tuvi-r36-zi-clock-policy.json');
const SCHEMA='thiendo-r36-pinned-zi-clock-observations-v1';
const REPORT='thiendo-r36-zi-clock-policy-evidence-v1';
const expectedAnchors={
 'leap-2020-eve':'2020-05-22',
 'leap-2023-eve':'2023-03-21',
 'newyear-2024-eve':'2024-02-09',
 'newyear-2025-eve':'2025-01-28'
};
const expectedTimes=['00:00','00:59','01:00','22:59','23:00','23:59'];
const expectedPolicies=['next-day','current-day','all-current','day-cur-time-next'];
const expectedModes=[
 {id:'uncorrected',longitude:null,utcOffsetMinutes:480},
 {id:'west-105',longitude:105,utcOffsetMinutes:480},
 {id:'east-135',longitude:135,utcOffsetMinutes:480}
];
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const isInt=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
function validateFixture(f){
 if(!f||f.schema!=='thiendo-r36-pinned-source-zi-clock-fixture-v1'||
    f.source?.repository!=='Renhuai123/ziwei-doushu'||f.source?.commit!==SOURCE_COMMIT||
    f.source?.helper!=='lib/ziwei/true-solar-time.ts'||
    !eq(f.clockTimes,expectedTimes)||!eq(f.policies,expectedPolicies)||
    !eq(f.solarModes,expectedModes)||!Array.isArray(f.anchors)||f.anchors.length!==4||
    new Set(f.anchors.map(x=>x?.id)).size!==4)
  throw Error('R36 controlled fixture changed or unpinned');
 for(const anchor of f.anchors){
  if(!Object.hasOwn(expectedAnchors,anchor.id)||anchor.date!==expectedAnchors[anchor.id])
   throw Error('R36 pinned anchor altered');
 }
 return true;
}
function shifted(date,days){
 const d=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date||!isInt(days,-3,3))
  throw Error('R36 date or offset invalid');
 d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
function branch(minutes){
 if(minutes>=1380||minutes<60)return 0;
 return Math.floor((minutes-60)/120)+1;
}
function expectedZiDayOffset(solar,policy){
 const late=solar.branch===0&&solar.normalizedMinutes>=1380;
 if(solar.dayOffset<0&&late)
  return policy==='next-day'?solar.dayOffset+1:solar.dayOffset;
 if(solar.dayOffset!==0)return solar.dayOffset;
 return late&&policy==='next-day'?1:0;
}
function validateSource(input,f){
 validateFixture(f);
 if(!input||input.schema!==SCHEMA||
   input.provenance?.repository!=='Renhuai123/ziwei-doushu'||
   input.provenance.commit!==SOURCE_COMMIT||
   input.provenance.generator!=='calculateTrueSolarTime + resolveZiweiDayOffset + shiftGregorianDate'||
   input.provenance.sourceExecuted!==true||
   input.provenance.syntheticOnly!==true||
   !Array.isArray(input.records)||input.records.length!==288||
   new Set(input.records.map(x=>x?.id)).size!==288)
   throw Error('R36 pinned source evidence missing/changed');
 const byId=new Map(input.records.map(r=>[r.id,r]));
 for(const a of f.anchors)for(const hhmm of f.clockTimes)
 for(const mode of f.solarModes)for(const policy of f.policies){
  const id=[a.id,hhmm,mode.id,policy].join(':');
  const r=byId.get(id),[h,m]=hhmm.split(':').map(Number);
  if(!r||r.id!==id||r.anchorId!==a.id||r.inputDate!==a.date||
    r.hhmm!==hhmm||r.clockHour!==h||r.clockMinute!==m||
    r.solarMode!==mode.id||r.longitude!==mode.longitude||
    r.utcOffsetMinutes!==mode.utcOffsetMinutes||r.policy!==policy)
    throw Error('R36 missing or tampered case: '+id);
  const s=r.source;
  if(!s||s.dateValid!==true||s.corrected!==(mode.longitude!==null)||
    !Number.isFinite(s.longitudeCorrectionMinutes)||
    !Number.isFinite(s.equationOfTimeMinutes)||!Number.isFinite(s.totalCorrectionMinutes)||
    !Number.isFinite(s.rawMinutes)||!Number.isFinite(s.normalizedMinutes)||
    s.normalizedMinutes<0||s.normalizedMinutes>=1440||
    !isInt(s.dayOffset,-2,2)||!isInt(s.hour,0,23)||!isInt(s.minute,0,59)||
    !isInt(s.second,0,59)||!isInt(s.branch,0,11)||
    !isInt(s.finalDayOffset,-2,2)||typeof s.effectiveDate!=='string')
    throw Error('R36 source fields malformed: '+id);
 }
 return true;
}
function compare(record){
 const s=record.source,checks=[];
 const close=(a,b,tol=1e-7)=>Math.abs(a-b)<tol;
 const corrected=record.longitude!==null;
 const expectedLongitude=corrected?(record.longitude-record.utcOffsetMinutes/4)*4:0;
 const initialMinutes=record.clockHour*60+record.clockMinute;
 const roundedSeconds=Math.round(s.rawMinutes*60);
 const sourceSecondOfDay=((roundedSeconds%86400)+86400)%86400;
 const calendarDayOffset=Math.floor(roundedSeconds/86400);
 const canonicalMinute=sourceSecondOfDay/60;
 checks.push(['longitude-correction',close(s.longitudeCorrectionMinutes,expectedLongitude)]);
 checks.push(['total-clock-correction',close(s.totalCorrectionMinutes,s.longitudeCorrectionMinutes+s.equationOfTimeMinutes)]);
 checks.push(['clock-minute-sum',close(s.rawMinutes,initialMinutes+s.totalCorrectionMinutes)]);
 checks.push(['rounded-civil-day-offset',s.dayOffset===calendarDayOffset]);
 checks.push(['rounded-normalized-clock',close(s.normalizedMinutes,canonicalMinute)]);
 checks.push(['normalized-branch',s.branch===branch(s.normalizedMinutes)]);
 checks.push(['hour-minute-second',s.hour===Math.floor(sourceSecondOfDay/3600)&&
  s.minute===Math.floor((sourceSecondOfDay%3600)/60)&&s.second===sourceSecondOfDay%60]);
 checks.push(['source-late-zi-day-rule',s.finalDayOffset===expectedZiDayOffset(s,record.policy)]);
 checks.push(['corrected-flag',s.corrected===corrected]);
 checks.push(['effective-civil-date',s.effectiveDate===shifted(record.inputDate,s.finalDayOffset)]);
 if(!corrected){
  checks.push(['no-longitude-no-eot',s.longitudeCorrectionMinutes===0&&s.equationOfTimeMinutes===0]);
 }
 const failures=checks.filter(([,pass])=>!pass).map(([name])=>name);
 return Object.freeze({
  ...record,
  checks:checks.map(([name,pass])=>({name,pass})),
  failures,
  clockLateZi:s.branch===0&&s.normalizedMinutes>=1380,
  sourcePolicyDayAdvanced:s.finalDayOffset>s.dayOffset,
  sourceClockCrossedDate:s.dayOffset!==0,
  independentAstronomicalPrecisionVerified:false,
  historicalTimezoneVerified:false,
  vietnamSchoolEquivalent:false
 });
}
function analyze(input,f){
 validateSource(input,f);
 const records=input.records.map(compare);
 const bad=records.filter(x=>x.failures.length);
 const counts=rs=>({
  total:rs.length,
  lateZi:rs.filter(x=>x.clockLateZi).length,
  advancedByPolicy:rs.filter(x=>x.sourcePolicyDayAdvanced).length,
  crossedCivilDateByCorrection:rs.filter(x=>x.sourceClockCrossedDate).length,
  failed:rs.filter(x=>x.failures.length>0).length
 });
 return Object.freeze({
  schema:REPORT,sourceCommit:SOURCE_COMMIT,checked:records.length,expected:288,
  failures:bad.length,
  summary:counts(records),
  byPolicy:Object.fromEntries(f.policies.map(k=>[k,counts(records.filter(x=>x.policy===k))])),
  byHour:Object.fromEntries(f.clockTimes.map(k=>[k,counts(records.filter(x=>x.hhmm===k))])),
  byMode:Object.fromEntries(f.solarModes.map(k=>[k.id,counts(records.filter(x=>x.solarMode===k.id))])),
  records,errors:bad.map(x=>({id:x.id,failures:x.failures})),
  sourceExecuted:true,syntheticOnly:true,
  sourceLateZiPolicyImplementationVerified:bad.length===0,
  sourceCivilDateCorrectionReproduced:bad.length===0,
  sourceGeographicTimezoneAccuracyVerified:false,
  sourceAstronomicalAccuracyVerified:false,
  vietnamSchoolSemanticEquivalenceVerified:false,
  catalogMappedConditionsUnchanged:31,
  limitation:'288 input/output checks of pinned source implementation; no independently measured astronomical corrections, historical timezone validation, or Vietnamese Tử Vi school parity.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R36 requires genuine source JSON path');
 const report=analyze(JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8')),
  JSON.parse(fs.readFileSync(FIXTURE,'utf8')));
 fs.writeFileSync('.r36-zi-clock-policy-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R36 source policy: '+report.checked+'/288; failures='+report.failures+
  '; day-rule shifts='+report.summary.advancedByPolicy+
  '; date correction crossings='+report.summary.crossedCivilDateByCorrection);
 if(report.failures||report.checked!==288)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA,REPORT,validateFixture,validateSource,shifted,branch,
 expectedZiDayOffset,compare,analyze});
