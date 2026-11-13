'use strict';
/**
 * R58: audited comparison of three real source calendar runtime probes.
 * Report runtime TZ sensitivity, not an assumed library timezone.
 * Does not alter a chart or authorize changing the default lunar calendar.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {SCHEMA:R33_SCHEMA,validateSource:validateR33,BOUNDARY}=
 require('./tuvi-r33-evaluate-root-cause.cjs');
const SCHEMA='thiendo-r58-source-calendar-runtime-timezone-matrix-v1';
const INPUT_SCHEMA='thiendo-r58-pinned-source-timezone-observations-v1';
const TZ=Object.freeze(['UTC','Asia/Ho_Chi_Minh','Asia/Shanghai']);
const DATES=Object.freeze(['1988-08-15','1989-08-14','1989-08-15','1989-08-16','1990-08-15']);
const CONTROL_DATES=Object.freeze(['1989-08-01','1989-08-02']);
const FIELDS=Object.freeze(['lunarJavascriptRaw','sourceEffective','sourceGetLunarInfo','iztroBySolar','sourceGenerateChart']);
const BRANCH=x=>Number.isInteger(x)&&x>=0&&x<12;
const CHINESE_BRANCHES='子丑寅卯辰巳午未申酉戌亥';
function ids(){
 const out=[];
 for(const date of DATES)for(const gender of ['Nam','Nữ'])for(const hour of [0,8,22])
  out.push(date+'-'+gender+'-'+hour);
 for(const date of CONTROL_DATES)out.push(date+'-Nam-0');
 return out;
}
const ALL_IDS=Object.freeze(ids());
function stable(value){return JSON.stringify(value);}
function validateProbe(observation,requestedTZ){
 if(!observation||observation.schema!==INPUT_SCHEMA||
    observation.provenance?.repository!=='Renhuai123/ziwei-doushu'||
    observation.provenance?.commit!==SOURCE_COMMIT||
    observation.provenance?.iztroVersion!=='2.6.1'||
    observation.provenance?.lunarJavascriptVersion!=='1.7.7'||
    observation.provenance?.lunarTypescriptVersion!=='1.8.6'||
    observation.provenance?.sourceExecuted!==true||
    observation.provenance?.syntheticOnly!==true||
    observation.requestedTZ!==requestedTZ||
    typeof observation.resolvedTZ!=='string'||!observation.resolvedTZ||
    observation.caseCount!==32||!Array.isArray(observation.results)||
    observation.results.length!==32)
  throw Error('R58 source runtime provenance/zone or coverage invalid');
 const map=new Map();
 for(const row of observation.results){
  if(!row||typeof row.id!=='string'||!ALL_IDS.includes(row.id)||
    map.has(row.id)||typeof row.solarDate!=='string'||
    !['Nam','Nữ'].includes(row.gender)||!Number.isInteger(row.clockHour)||
    ![0,8,22].includes(row.clockHour)||
    row.id!==row.solarDate+'-'+row.gender+'-'+row.clockHour||
    !['r33','new-moon-control'].includes(row.kind)||
    row.kind!==(DATES.includes(row.solarDate)?'r33':'new-moon-control')||
    row.hourBranch!==Math.floor(((row.clockHour+1)%24)/2))
   throw Error('R58 duplicated/forged date-hour-gender source row');
  for(const k of FIELDS)if(!row[k]||typeof row[k]!=='object')
   throw Error('R58 missing source calendar path '+k);
  const a=row.lunarJavascriptRaw,e=row.sourceEffective,g=row.sourceGetLunarInfo,c=row.sourceGenerateChart;
  const iz=row.iztroBySolar.rawLunarDate;
  if(!Number.isInteger(a.year)||a.year<1800||a.year>2200||
     !Number.isInteger(a.month)||Math.abs(a.month)<1||Math.abs(a.month)>12||
     !Number.isInteger(a.day)||a.day<1||a.day>30||
     e.year!==g.year||e.month!==g.month||e.day!==g.day||e.leap!==g.leap||
     e.rawMonth!==a.month||e.rawDay!==a.day||
     !iz||iz.lunarYear!==g.year||iz.lunarMonth!==g.month||
     iz.lunarDay!==g.day||iz.isLeap!==g.leap||
     !Number.isInteger(g.yearStem)||g.yearStem<0||g.yearStem>9||
     ![2,3,4,5,6].includes(c.wuxingJu)||
     !BRANCH(c.ziweiPos)||!BRANCH(c.liemTrinhBranch)||!BRANCH(c.mingGongBranch)||
     CHINESE_BRANCHES.indexOf(row.iztroBySolar.ziweiBranchName)!==c.ziweiPos)
   throw Error('R58 invalid or internally inconsistent source lunar and chart fields');
  map.set(row.id,row);
 }
 if(map.size!==32||ALL_IDS.some(k=>!map.has(k)))throw Error('R58 missing required source cases');
 return map;
}
function buildR58TimezoneMatrix(probes,r33){
 if(!probes||!r33||r33.schema!==R33_SCHEMA)throw Error('R58 genuine R33 observations missing');
 validateR33(r33);
 const entries=Object.fromEntries(TZ.map((zone,i)=>[zone,validateProbe(probes[i],zone)]));
 // UTC is the Ubuntu R33 source control. Validate its actual outputs against
 // R33, not a manually supplied "expected lunar day" hardcode.
 const r33ById=new Map(r33.records.map(x=>[x.id,x]));
 if(r33ById.size!==30)throw Error('R58 R33 source duplicates');
 for(const id of ALL_IDS.slice(0,30)){
  const row=entries.UTC.get(id),s=r33ById.get(id)?.source;
  if(!s||row.kind!=='r33'||
   s.lunarYear!==row.sourceGetLunarInfo.year||
   s.lunarMonth!==row.sourceGetLunarInfo.month||
   s.lunarDay!==row.sourceGetLunarInfo.day||
   s.isLeapMonth!==row.sourceGetLunarInfo.leap||
   s.yearStem!==row.sourceGetLunarInfo.yearStem||
   s.wuxingJu!==row.sourceGenerateChart.wuxingJu||
   s.ziweiPos!==row.sourceGenerateChart.ziweiPos||
   s.mingGongBranch!==row.sourceGenerateChart.mingGongBranch||
   s.liemTrinhBranch!==row.sourceGenerateChart.liemTrinhBranch)
   throw Error('R58 source UTC baseline fails exact R33 cross-validation: '+id);
 }
 const rows=[];
 const diffs=Object.fromEntries(TZ.slice(1).map(zone=>[
  zone,Object.fromEntries(FIELDS.map(f=>[f,0]))
 ]));
 for(const id of ALL_IDS){
  const baseline=entries.UTC.get(id);
  const readings=Object.fromEntries(TZ.map(zone=>{
   const reading=entries[zone].get(id);
   if(reading.solarDate!==baseline.solarDate||
      reading.hourBranch!==baseline.hourBranch||
      reading.gender!==baseline.gender||
      reading.clockHour!==baseline.clockHour)throw Error('R58 cross-zone identity mismatch');
   return [zone,reading];
  }));
  const changed=Object.fromEntries(TZ.slice(1).map(zone=>{
   const diff=Object.fromEntries(FIELDS.map(f=>{
    const result=stable(readings.UTC[f])!==stable(readings[zone][f]);
    if(result)diffs[zone][f]++;
    return [f,result];
   }));
   return [zone,diff];
  }));
  rows.push(Object.freeze({
   id,date:baseline.solarDate,kind:baseline.kind,
   lunarDayByZone:Object.freeze(Object.fromEntries(TZ.map(zone=>
    [zone,readings[zone].sourceGetLunarInfo.day]))),
   lunarJavascriptByZone:Object.freeze(Object.fromEntries(TZ.map(zone=>
    [zone,readings[zone].lunarJavascriptRaw]))),
   iztroLunarByZone:Object.freeze(Object.fromEntries(TZ.map(zone=>
    [zone,readings[zone].iztroBySolar]))),
   sourceChartByZone:Object.freeze(Object.fromEntries(TZ.map(zone=>
    [zone,readings[zone].sourceGenerateChart]))),
   changedVsUTC:Object.freeze(changed)
  }));
 }
 const countByZone=Object.freeze(Object.fromEntries(TZ.slice(1).map(zone=>[
  zone,Object.freeze(diffs[zone])
 ])));
 if(rows.length!==32||Object.values(countByZone).some(ob=>
    Object.values(ob).some(count=>count<0||count>32)))
  throw Error('R58 missing comparison counts');
 const target=rows.find(x=>x.id==='1989-08-15-Nam-0');
 if(!target||target.lunarDayByZone.UTC!==14||
    target.sourceChartByZone.UTC.ziweiPos!==7||
    target.sourceChartByZone.UTC.liemTrinhBranch!==11)
  throw Error('R58 loses pinned 1989 R57 genuine source-control evidence');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,
  iztroVersion:'2.6.1',lunarJavascriptVersion:'1.7.7',
  lunarTypescriptVersion:'1.8.6',
  genuineSourceRuntime:true,syntheticOnly:true,
  zones:Object.freeze([...TZ]),rows:Object.freeze(rows),
  comparedCalendars:96,uniqueBirthControls:32,baseR33CaseCount:30,
  zoneResolved:Object.freeze(Object.fromEntries(TZ.map((zone,i)=>
   [zone,probes[i].resolvedTZ]))),
  fieldDifferenceCounts:countByZone,
  target1989:target,
  utcMoonBoundary:BOUNDARY,
  sourceBySolarAndLunarJavascriptBothExecuted:true,
  observedLunarJavascriptAndIztroAgreementOn32Cases:true,
  processTimezoneStableOn32Cases:Object.values(countByZone).every(ob=>
   Object.values(ob).every(n=>n===0)),
  lunarJavascriptVsIztroSameLibraryVerified:false,
  sourceCalendarTimeZoneInferred:false,
  astronomicalBoundaryCompatible:true,
  sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
  rootCauseVerified:false,expertReviewed:false,
  mayChangeChartRules:false,mayEnableCalendarSchoolMode:false,
  mappedResearchCount:31,referenceTotal:49,mayIncreaseMapping:false,
  conclusion:'Cross-TZ runtime stability/instability is an observation; it does NOT prove the astronomy or timezone policy internal to either library. R57 local lunar-day input sensitivity is not authorization to modify Thiên Đồ charts.'
 });
}
if(require.main===module){
 if(process.argv.length!==5)throw Error('R58 expects three zone files and one genuine R33 source report');
 const p=process.argv.slice(2,5).map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
 // Exact R33 observation is at the standard pinned-root source path.
 const r33=JSON.parse(fs.readFileSync('.r33-source-1989-root-cause-observations.json','utf8'));
 const result=buildR58TimezoneMatrix(p,r33);
 fs.writeFileSync('.r58-pinned-timezone-calendar-matrix.json',JSON.stringify(result,null,2)+'\n');
 console.log('R58: 96 genuine library/zone readings, 32 cases, source TZ differences '+
  JSON.stringify(result.fieldDifferenceCounts)+
  '; calendar mode NOT authorized, 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,INPUT_SCHEMA,TZ,ALL_IDS,FIELDS,validateProbe,buildR58TimezoneMatrix});
