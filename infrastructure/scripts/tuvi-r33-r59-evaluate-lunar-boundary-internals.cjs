'use strict';
/**
 * R59: source-only readout of the 1989/7 lunar-month civil boundary
 * and the new-moon calculation offset in TWO PINNED dependencies.
 * No mutation, no forced source-calendar parity, no chart rule change.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {SCHEMA:R58_SCHEMA}=require('./tuvi-r33-r58-evaluate-timezone-calendar.cjs');
const SCHEMA='thiendo-r59-pinned-lunar-month-julian-boundary-audit-v1';
const SOURCE_SCHEMA='thiendo-r59-source-lunar-boundary-internal-probe-v1';
const LIBRARIES=Object.freeze(['lunar-javascript','lunar-typescript']);
const MONTHS=Object.freeze(['1988-7','1989-6','1989-7','1989-8','1990-7']);
const DATES=Object.freeze(['1989-08-01','1989-08-02','1989-08-15']);
const LOCKED=Object.freeze({'lunar-javascript':'1.7.7','lunar-typescript':'1.8.6',iztro:'2.6.1'});
const DIGEST=/^[a-f0-9]{64}$/;
const dateOf=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
function auditR59(probe,r58){
 if(!probe||probe.schema!==SOURCE_SCHEMA||
    probe.provenance?.repository!=='Renhuai123/ziwei-doushu'||
    probe.provenance?.commit!==SOURCE_COMMIT||
    probe.provenance?.sourceExecuted!==true||
    probe.provenance?.syntheticOnly!==true||
    JSON.stringify(probe.provenance?.lockedDependencies)!==JSON.stringify(LOCKED)||
    probe.libraryCount!==2||probe.monthCountPerLibrary!==5||
    !Array.isArray(probe.libraries)||probe.libraries.length!==2||
    !r58||r58.schema!==R58_SCHEMA||r58.sourceCommit!==SOURCE_COMMIT||
    r58.genuineSourceRuntime!==true||r58.syntheticOnly!==true||
    r58.uniqueBirthControls!==32||r58.comparedCalendars!==96||
    r58.processTimezoneStableOn32Cases!==true||
    !Array.isArray(r58.rows)||r58.rows.length!==32)
   throw Error('R59 pinned two-library source/runtime provenance or R58 baseline invalid');
 const dated=new Map(r58.rows.map(row=>[row.id,row]));
 if(dated.size!==32)throw Error('R59 duplicated R58 calendar observations');
 const records=[];
 for(let index=0;index<2;index++){
  const p=probe.libraries[index],name=LIBRARIES[index];
  if(!p||p.name!==name||
     !Number.isFinite(p.declaredNewMoonOffsetDays)||
     Math.abs(p.declaredNewMoonOffsetDays-1/3)>1e-12||
     Math.abs(p.declaredOffsetHours-8)>1e-9||
     typeof p.highMethodContainsOffsetSymbol!=='boolean'||
     typeof p.lowMethodContainsOffsetSymbol!=='boolean'||
     !DIGEST.test(p.highMethodFingerprintSha256)||
     !DIGEST.test(p.lowMethodFingerprintSha256)||
     !DIGEST.test(p.calcMethodFingerprintSha256)||
     !Array.isArray(p.lunarMonths)||p.lunarMonths.length!==5||
     !Array.isArray(p.datedControls)||p.datedControls.length!==3)
   throw Error('R59 invalid pinned new-moon runtime / method fingerprint: '+name);
  const months=new Map(),dates=new Map();
  for(const m of p.lunarMonths){
   const key=m?.year+'-'+m?.month;
   if(!MONTHS.includes(key)||months.has(key)||
      !Number.isFinite(m.firstJulianDay)||m.firstIsDayOne!==true||
      !dateOf(m.solarFirstDay)||![29,30].includes(m.dayCount))
     throw Error('R59 missing, duplicated, malformed first lunar Julian day '+key);
   months.set(key,m);
  }
  for(const d of p.datedControls){
   if(!d||!DATES.includes(d.solarDate)||dates.has(d.solarDate)||
      !Number.isInteger(d.lunarYear)||!Number.isInteger(d.lunarMonth)||
      !Number.isInteger(d.lunarDay)||d.lunarDay<1||d.lunarDay>30)
    throw Error('R59 lunar date control invalid');
   const source=dated.get(d.solarDate+'-Nam-0');
   if(!source)throw Error('R59 cannot find genuine R58 date control');
   const expected=name==='lunar-javascript'
    ?source.lunarJavascriptByZone?.UTC
    :source.iztroLunarByZone?.UTC?.rawLunarDate;
   const expectedY=name==='lunar-javascript'?expected?.year:expected?.lunarYear;
   const expectedM=name==='lunar-javascript'?expected?.month:expected?.lunarMonth;
   const expectedD=name==='lunar-javascript'?expected?.day:expected?.lunarDay;
   if(!expected||d.lunarYear!==expectedY||
      d.lunarMonth!==expectedM||d.lunarDay!==expectedD)
    throw Error('R59 date control disagrees with real pinned R58 '+name+' '+d.solarDate);
   dates.set(d.solarDate,d);
  }
  if(months.size!==5||dates.size!==3||
     months.get('1989-7').solarFirstDay!=='1989-08-02'||
     dates.get('1989-08-01').lunarMonth!==6||
     dates.get('1989-08-02').lunarMonth!==7||
     dates.get('1989-08-02').lunarDay!==1||
     dates.get('1989-08-15').lunarDay!==14)
   throw Error('R59 1989 month boundary inconsistent with genuine R58 '+name);
  records.push(Object.freeze({
   name,months:Object.freeze(p.lunarMonths.map(m=>Object.freeze({...m}))),
   controls:Object.freeze(p.datedControls.map(d=>Object.freeze({...d}))),
   newMoonOffsetDays:p.declaredNewMoonOffsetDays,
   newMoonOffsetHours:p.declaredOffsetHours,
   highMethodOffsetSymbolObserved:p.highMethodContainsOffsetSymbol,
   lowMethodOffsetSymbolObserved:p.lowMethodContainsOffsetSymbol,
   methodFingerprints:Object.freeze({
    high:p.highMethodFingerprintSha256,low:p.lowMethodFingerprintSha256,
    calc:p.calcMethodFingerprintSha256
   })
  }));
 }
 const mA=records[0].months.find(x=>x.year===1989&&x.month===7);
 const mB=records[1].months.find(x=>x.year===1989&&x.month===7);
 const sameFirstDate=mA.solarFirstDay===mB.solarFirstDay;
 const sameJulianConvention=mA.firstJulianDay===mB.firstJulianDay;
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,sourceExecuted:true,
  libraries:Object.freeze(records),sourceLibraries:2,
  measuredLunarMonthBoundaries:10,observedCivilDates:6,
  r58SourceCalendarCaseCount:32,
  firstDayOf1989SeventhLunarMonth:'1989-08-02',
  same1989SeventhMonthFirstDate:sameFirstDate,
  same1989SeventhMonthJulianDay:sameJulianConvention,
  newMoonOffsetHoursInLibraryConstants:8,
  sourceNewMoonTimeConventionFullyVerified:false,
  alternativeVietnamCalendarVerified:false,
  localChartCalendarErrorVerified:false,
  rootCauseVerified:false,expertReviewed:false,
  semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  mayEnableCalendarSchoolMode:false,mayChangeChartRules:false,
  mappedResearch:31,referenceTotal:49,mayIncreaseMapping:false,
  interpretation:'Two pinned lunar libraries share the 1989-08-02 month boundary and expose an eight-hour astronomical offset constant. This is source-specific evidence, NOT a verified 1989 lunar conjunction timestamp, full timezone policy, or permission to change Thiên Đồ.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R59 requires real pinned source internals JSON');
 const probe=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const r58=JSON.parse(fs.readFileSync('.r58-pinned-timezone-calendar-matrix.json','utf8'));
 const audit=auditR59(probe,r58);
 fs.writeFileSync('.r59-pinned-lunar-julian-boundary-audit.json',
  JSON.stringify(audit,null,2)+'\n');
 console.log('R59: '+audit.measuredLunarMonthBoundaries+
  ' lunar month boundary readings from 2 genuine source libraries; 1989/7='+
  audit.firstDayOf1989SeventhLunarMonth+'; engine/calendar-policy change NOT authorized');
}
module.exports=Object.freeze({SCHEMA,SOURCE_SCHEMA,LIBRARIES,MONTHS,DATES,LOCKED,auditR59});
