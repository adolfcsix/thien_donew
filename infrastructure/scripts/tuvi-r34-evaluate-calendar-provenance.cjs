'use strict';
/**
 * R34 calendar provenance matrix. Observations from an executable, pinned
 * source checkout are compared to local engine output WITHOUT rewriting
 * either. All four NASA UT instants are independent civil-boundary anchors.
 */
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalVoidSemanticGates}=require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');
const FIXTURE=path.join(__dirname,'../../tests/fixtures/tuvi-r34-nasa-boundaries.json');
const SCHEMA='thiendo-r34-pinned-source-calendar-boundaries-v1';
const REPORT='thiendo-r34-calendar-provenance-matrix-v1';
const VERSION='2.6.1';
const LIMITATION='Sai khác lịch âm trên cùng ngày dương lịch chỉ là quan sát theo hệ lịch. Sóc gần nửa đêm không xác minh tương đương trường phái, không chứng minh một engine sai và không cho phép sửa phép an sao hoặc mở cách cục.';
const expectedFromDay=(stamp,offset)=>{
 const d=new Date(stamp.slice(0,10)+'T12:00:00Z');
 if(!Number.isInteger(offset)||!Number.isFinite(d.getTime()))throw Error('Bad civil date');
 d.setUTCDate(d.getUTCDate()+offset);
 return d.toISOString().slice(0,10);
};
const dayAtOffset=(instant,hours)=>{
 const ms=Date.parse(instant);
 if(!Number.isFinite(ms)||!Number.isInteger(hours)||hours<-12||hours>14)
  throw Error('Bad new moon instant or UTC offset');
 return new Date(ms+hours*3600000).toISOString().slice(0,10);
};
const isBranch=n=>Number.isInteger(n)&&n>=0&&n<12;
const inRange=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
function validateFixture(f){
 if(!f||f.schema!=='thiendo-r34-nasa-ut-new-moon-boundaries-v1'||
  f.source?.url!=='https://eclipse.gsfc.nasa.gov/phase/phases1901.html'||
  f.source?.provider!=='NASA GSFC'||
  f.source?.timescale!=='UT rounded to nearest minute'||
  f.civilOffsets?.vietnamHours!==7||f.civilOffsets?.chineseReferenceHours!==8||
  !eq(f.offsetsDays,[2,14,22])||!eq(f.genders,['Nam','Nữ'])||
  !eq(f.clockHours,[0,12])||!Array.isArray(f.cases)||f.cases.length!==4)
  throw Error('R34 independent NASA input altered');
 const expected={
  '1984-05':'1984-05-30T16:48:00Z',
  '1986-12':'1986-12-01T16:43:00Z',
  '1989-08':'1989-08-01T16:06:00Z',
  '1996-07':'1996-07-15T16:15:00Z'
 };
 if(new Set(f.cases.map(x=>x.id)).size!==4)throw Error('Duplicate NASA event');
 for(const item of f.cases){
  if(!Object.hasOwn(expected,item.id)||item.utcNewMoon!==expected[item.id])
   throw Error('NASA recorded ephemeris date/time changed');
  if(dayAtOffset(item.utcNewMoon,7)===dayAtOffset(item.utcNewMoon,8))
   throw Error('NASA case no longer crosses local midnight');
 }
 return true;
}
function validateSource(o,f){
 validateFixture(f);
 if(!o||o.schema!==SCHEMA||o.provenance?.repository!=='Renhuai123/ziwei-doushu'||
  o.provenance.commit!==SOURCE_COMMIT||
  o.provenance.iztroVersion!==VERSION||
  o.provenance.generator!=='generateChart'||o.provenance.sourceExecuted!==true||
  o.provenance.syntheticOnly!==true||
  o.provenance.nasaSource!==f.source.url||
  !Array.isArray(o.records)||o.records.length!==48||
  new Set(o.records.map(r=>r?.id)).size!==48)
  throw Error('R34 source observations missing or unpinned');
 const byId=new Map(o.records.map(x=>[x.id,x]));
 for(const event of f.cases)for(const days of f.offsetsDays)
 for(const gender of f.genders)for(const clockHour of f.clockHours){
  const id=[event.id,days,gender,clockHour].join('-');
  const rec=byId.get(id);
  if(!rec||rec.eventId!==event.id||rec.offsetDays!==days||
   rec.gender!==gender||rec.clockHour!==clockHour||
   rec.solarDate!==expectedFromDay(event.utcNewMoon,days)||
   rec.hourBranch!==Math.floor(((clockHour+1)%24)/2))
   throw Error('R34 source case missing or metadata tampered: '+id);
  const s=rec.source;
  if(!s||!inRange(s.lunarYear,1800,2200)||
   !inRange(s.lunarMonth,-12,12)||s.lunarMonth===0||
   !inRange(s.lunarDay,1,30)||typeof s.isLeapMonth!=='boolean'||
   !inRange(s.yearStem,0,9)||!inRange(s.yearBranch,0,11)||
   ![2,3,4,5,6].includes(s.wuxingJu)||
   !isBranch(s.ziweiPos)||!isBranch(s.mingGongBranch))
   throw Error('R34 source chart fields malformed: '+id);
 }
 return true;
}
function classCalendar(source,local){
 if(source.lunarYear!==local.lunarYear||source.lunarMonth!==local.lunarMonth||
  source.isLeapMonth!==local.isLeapMonth)return 'different-month-or-year';
 if(source.lunarDay===local.lunarDay)return 'same-lunar-day';
 if(local.lunarDay===source.lunarDay+1)return 'local-one-day-ahead';
 if(source.lunarDay===local.lunarDay+1)return 'source-one-day-ahead';
 return 'other-day-difference';
}
function compareCase(record,event){
 const local=Engine.calculate({
  date:record.solarDate,hour:record.clockHour,minute:0,
  gender:record.gender,calendar:'solar'
 });
 const before=JSON.stringify(local);
 const voidAudit=auditClassicalVoidSemanticGates(local);
 if(JSON.stringify(local)!==before||voidAudit.semanticEquivalenceVerified!==false||
  voidAudit.sourceCriterionVerified!==false||
  voidAudit.sourcePlacementVerifiedForCurrentChart!==false)
  throw Error('R34 research-only invariant violated');
 const t={
  lunarYear:local.lunar?.year,lunarMonth:local.lunar?.month,
  lunarDay:local.lunar?.day,isLeapMonth:local.lunar?.leap===true,
  wuxingJu:local.cuc?.number,
  ziweiPos:['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'].indexOf(local.ziWei),
  mingGongBranch:['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'].indexOf(local.menh)
 };
 if(!inRange(t.lunarYear,1800,2200)||!inRange(t.lunarMonth,1,12)||
  !inRange(t.lunarDay,1,30)||![2,3,4,5,6].includes(t.wuxingJu)||
  !isBranch(t.ziweiPos)||!isBranch(t.mingGongBranch))
  throw Error('R34 local chart missing research fields');
 const source=record.source;
 const status=classCalendar(source,t);
 const predictedVietDate=dayAtOffset(event.utcNewMoon,7);
 const predictedChinaDate=dayAtOffset(event.utcNewMoon,8);
 const calendarCompatible=status==='local-one-day-ahead'&&
  predictedVietDate<predictedChinaDate;
 return Object.freeze({
  id:record.id,eventId:record.eventId,offsetDays:record.offsetDays,
  solarDate:record.solarDate,gender:record.gender,clockHour:record.clockHour,
  source:Object.freeze({...source}),local:Object.freeze(t),
  newMoonUT:event.utcNewMoon,
  civilDateUTC7:predictedVietDate,
  civilDateUTC8:predictedChinaDate,
  civilDateOffsetHours:1,
  calendarClass:status,compatibleWithBoundary:calendarCompatible,
  cucAligned:source.wuxingJu===t.wuxingJu,
  ziweiAligned:source.ziweiPos===t.ziweiPos,
  mingAligned:source.mingGongBranch===t.mingGongBranch,
  metadata:Object.freeze({
   sourceCalendar:'pinned iztro/lunar-javascript source',
   localCalendar:'Thiên Đồ Việt Nam UTC+7, lunar.js',
   independentPhaseTimeStandard:'NASA UT minute',
   demonstratedAstronomicalBoundary:true,
   sourceCalendarTimezoneExplicitlyVerified:false,
   semanticEquivalenceVerified:false,sourceCriterionVerifiedForLocalChart:false
  })
 });
}
function analyzeBoundaryMatrix(input,fixture){
 validateSource(input,fixture);
 const byId=new Map(fixture.cases.map(e=>[e.id,e]));
 const records=[],errors=[];
 for(const item of input.records){
  try{records.push(compareCase(item,byId.get(item.eventId)));}
  catch(e){errors.push({id:item.id,reason:String(e?.message||e)});}
 }
 const classes=['same-lunar-day','local-one-day-ahead','source-one-day-ahead','different-month-or-year','other-day-difference'];
 const counts=rs=>Object.freeze({
  records:rs.length,byClass:Object.freeze(Object.fromEntries(classes.map(s=>[
   s,rs.filter(x=>x.calendarClass===s).length
  ]))),
  compatibleWithBoundary:rs.filter(x=>x.compatibleWithBoundary).length,
  matchingCuc:rs.filter(x=>x.cucAligned).length,
  matchingZiWei:rs.filter(x=>x.ziweiAligned).length,
  matchingMenh:rs.filter(x=>x.mingAligned).length
 });
 return Object.freeze({
  schema:REPORT,sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  nasaSource:fixture.source.url,utPrecision:'one minute',
  expected:48,checked:records.length,failures:errors.length,
  counts:counts(records),
  byEvent:Object.freeze(Object.fromEntries(fixture.cases.map(e=>[
   e.id,Object.freeze({utcNewMoon:e.utcNewMoon,
    vietnamCivilDay:dayAtOffset(e.utcNewMoon,7),
    chineseReferenceCivilDay:dayAtOffset(e.utcNewMoon,8),
    ...counts(records.filter(x=>x.eventId===e.id))})
  ]))),
  records,errors,syntheticOnly:true,sourceRuntimeRequired:true,
  verifiedSchoolEquivalence:false,localPatternVerdictsVerified:false,
  catalogMappedConditionsUnchanged:31,limitation:LIMITATION
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R34 requires executed source JSON path');
 const fixture=JSON.parse(fs.readFileSync(FIXTURE,'utf8'));
 const input=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'));
 const report=analyzeBoundaryMatrix(input,fixture);
 fs.writeFileSync('.r34-calendar-provenance-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R34 source/local calendar provenance: '+report.checked+'/48, '+report.failures+' errors; '+JSON.stringify(report.counts.byClass));
 if(report.failures||report.checked!==48)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA,REPORT,VERSION,LIMITATION,validateFixture,
 validateSource,dayAtOffset,expectedFromDay,classCalendar,compareCase,
 analyzeBoundaryMatrix});
