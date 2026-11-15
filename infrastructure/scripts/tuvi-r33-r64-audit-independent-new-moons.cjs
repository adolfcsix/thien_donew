'use strict';
/** Independent UT-minute reference comparison. No chart or school promotion. */
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const Lunar=require('../../packages/astrology-engine/src/lunar.js');
const {auditR63,auditMonthTrace,METHODS}=require('./tuvi-r33-r63-audit-lunar-rounding.cjs');
const {LOCKED}=require('./tuvi-r33-r59-evaluate-lunar-boundary-internals.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const URL='https://eclipse.gsfc.nasa.gov/phase/phases1901.html';
const DIGEST='81cfcedd33f6748fcbee9f7aea1887e2d856052a01787c6f9940fb352f504fe0';
const FIXTURE=path.join(__dirname,'../../tests/fixtures/tuvi-r64-nasa-new-moons-1988-1990.json');
const SCHEMA='thiendo-r64-independent-ut-minute-new-moon-audit-v1';
const check=(ok,msg)=>{if(!ok)throw Error('R64: '+msg);};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function validateReference(f){
 check(f?.schema==='thiendo-r64-nasa-new-moons-1988-1990-v1'&&
  f.source?.provider==='NASA GSFC'&&f.source.url===URL&&f.source.timescale==='UT'&&
  f.source.precisionSeconds===60&&f.source.recordsSha256===DIGEST&&
  Array.isArray(f.cases)&&f.cases.length===37&&digest(f.cases)===DIGEST,'independent reference altered');
 return true;
}
function extractNasaNewMoons(html){
 check(typeof html==='string'&&html.includes('Universal Time (UT)')&&html.includes('New Moon'),'NASA table header');
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 let year=null;const events=[];
 for(const line of html.split(/\r?\n/)){
  const y=/^ (\d{4}) /.exec(line);if(y)year=Number(y[1]);
  if(![1988,1989,1990].includes(year))continue;
  // Fixed-width FIRST phase column only: later quarters never become new moons.
  const m=/^(?:        | 19\d{2}   )([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2})/.exec(line);
  if(!m)continue;
  const month=months.indexOf(m[1])+1;check(month>0,'unknown month');
  const id=year+'-'+String(month).padStart(2,'0')+'-'+m[2].padStart(2,'0');
  events.push({id,utMinute:id+'T'+m[3]+':00Z'});
 }
 check(events.length===37&&digest(events)===DIGEST,'NASA selected rows disagree with pinned reference');
 return events;
}
function compareReference(row,lib,event){
 const trace=auditMonthTrace(row,lib),ut=Date.parse(event.utMinute);
 check(Number.isFinite(ut),'invalid UT minute');
 const referenceJD=ut/86400000+2440587.5;
 const observedJD=trace.unshifted+lib.j2000;
 // A wrong-lunation pairing is an integrity error; timing differences within
 // the selected lunation remain measured data, including outliers.
 check(Math.abs(observedJD-referenceJD)<2,'wrong lunation paired with reference');
 const referenceDay=hours=>Math.floor(referenceJD+0.5+hours/24);
 const offset7=new Date(ut+7*3600000),local=Lunar.solarToLunar(
  offset7.getUTCFullYear(),offset7.getUTCMonth()+1,offset7.getUTCDate());
 const errorSeconds=(observedJD-referenceJD)*86400;
 const midnightMarginSeconds=Math.min(...[7,8].map(hours=>{
  const seconds=((ut/1000+hours*3600)%86400+86400)%86400;
  return Math.min(seconds,86400-seconds);
 }));
 return {library:lib.name,id:event.id,errorSeconds,
  within120SecondComparisonWindow:Math.abs(errorSeconds)<=120,
  nasaDayAt7:referenceDay(7),nasaDayAt8:referenceDay(8),
  observedDayAt7:trace.dayAt7,observedDayAt8:trace.dayAt8,
  sourceCivilDayMatchesNasa8:trace.dayAt8===referenceDay(8),
  projectedSevenHourDayMatchesNasa7:trace.dayAt7===referenceDay(7),
  localDayOneAtNasa7:local.day===1,midnightMarginSeconds,
  civilProjectionStableAtPublishedMinutePrecision:midnightMarginSeconds>61,
  splitCivilDate:referenceDay(7)!==referenceDay(8)};
}
function auditR64(probe,reference,r63,r59,r58){
 validateReference(reference);auditR63(r63,r59,r58);
 check(probe?.schema==='thiendo-r64-source-lunar-rounding-trace-v1'&&
  probe.provenance?.repository==='Renhuai123/ziwei-doushu'&&probe.provenance.commit===SOURCE_COMMIT&&
  probe.provenance.sourceExecuted===true&&probe.provenance.syntheticOnly===true&&
  JSON.stringify(probe.provenance.lockedDependencies)===JSON.stringify(LOCKED)&&
  Array.isArray(probe.libraries)&&probe.libraries.length===2,'pinned source provenance');
 const rows=[];
 for(let i=0;i<2;i++){
  const lib=probe.libraries[i],base=r63.libraries[i];
  check(lib?.name===base.name&&METHODS.every(k=>lib.fingerprints?.[k]===base.fingerprints[k])&&
   Array.isArray(lib.rows)&&lib.rows.length===37,'library methods or count');
  const byId=new Map(lib.rows.map(row=>[row.id,row]));check(byId.size===37,'duplicate event');
  for(const event of reference.cases){const row=byId.get(event.id);check(row,'missing event');
   rows.push(compareReference(row,lib,event));}
 }
 return Object.freeze({schema:SCHEMA,sourceCommit:SOURCE_COMMIT,referenceUrl:URL,
  referenceRecordsSha256:DIGEST,referenceTimescale:'UT minute table; numerical civil projection',
  independentReferenceEvents:37,comparedSourceTraces:74,
  comparisonToleranceSeconds:120,maximumAbsoluteDifferenceSeconds:Math.max(...rows.map(r=>Math.abs(r.errorSeconds))),
  withinComparisonWindow:rows.filter(r=>r.within120SecondComparisonWindow).length,
  sourceCivilDayMatches:rows.filter(r=>r.sourceCivilDayMatchesNasa8).length,
  sevenHourCivilDayMatches:rows.filter(r=>r.projectedSevenHourDayMatchesNasa7).length,
  localDayOneMatches:rows.filter(r=>r.localDayOneAtNasa7).length,
  independentMinuteReferenceComparisonExecuted:true,
  fullEphemerisAccuracyVerified:false,sourceCalendarPolicyFullyVerified:false,
  rootCauseVerified:false,semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  expertReviewed:false,mayChangeChartRules:false,mayEnableCalendarSchoolMode:false,
  mappedResearch:31,referenceTotal:49,mayIncreaseMapping:false,
  rows:Object.freeze(rows.map(Object.freeze))});
}
if(require.main===module){
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 if(process.argv[2]==='--verify-nasa-html'){
  extractNasaNewMoons(fs.readFileSync(process.argv[3],'utf8'));console.log('R64: official NASA 37-event extraction matches pinned digest');
 }else{
  check(process.argv.length===3,'requires executed R64 source JSON');
  const out=auditR64(read(process.argv[2]),read(FIXTURE),read('.r63-source-lunar-rounding-trace.json'),
   read('.r59-source-lunar-boundary-internals.json'),read('.r58-pinned-timezone-calendar-matrix.json'));
  fs.writeFileSync('.r64-independent-new-moon-audit.json',JSON.stringify(out,null,2)+'\n');
  console.log('R64: '+out.comparedSourceTraces+' source traces / 37 independent NASA UT minutes; '+
   out.withinComparisonWindow+' within 120s, max '+out.maximumAbsoluteDifferenceSeconds.toFixed(3)+'s; 31/49 unchanged');
 }
}
module.exports=Object.freeze({SCHEMA,FIXTURE,DIGEST,validateReference,extractNasaNewMoons,compareReference,auditR64});
