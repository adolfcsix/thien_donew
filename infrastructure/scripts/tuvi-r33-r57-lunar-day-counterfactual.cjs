'use strict';
/**
 * R57 — source-lunar-day input counterfactual using the UNMODIFIED Thiên Đồ
 * engine, solely to isolate whether differing lunar-day inputs can explain
 * observed Zi Wei / Liêm Trinh branch placements in the local rule set.
 * It does NOT calculate a user's chart or assert source-school parity.
 */
const fs=require('node:fs');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {
 validateSource,analyzeRootCause,REPORT:ROOT_REPORT,
 DATES,HOURS,GENDERS,BOUNDARY
}=require('./tuvi-r33-evaluate-root-cause.cjs');

const SCHEMA='thiendo-r57-pinned-lunar-day-counterfactual-v1';
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const TARGET='1989-08-15-Nam-0';
const mod=x=>(x%12+12)%12;
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const noPromotion={
 rootCauseVerified:false,sourceSchoolParityVerified:false,
 semanticEquivalenceVerified:false,mayChangeChartRules:false,
 mayIncreaseMapping:false
};
function uniqueMainStar(chart,name){
 const found=chart.houses.filter(h=>h.stars?.includes(name));
 if(found.length!==1||!isBranch(found[0].branchIndex)||
    found[0].stars.filter(s=>s===name).length!==1)
  throw Error('R57 local main star missing/duplicated: '+name);
 return found[0].branchIndex;
}
function localPoint(chart){
 const ziwei=BRANCHES.indexOf(chart.ziWei);
 const ming=BRANCHES.indexOf(chart.menh);
 const liemTrinh=uniqueMainStar(chart,'Liêm Trinh');
 if(!isBranch(ziwei)||!isBranch(ming)||liemTrinh!==mod(ziwei-8)||
    ![2,3,4,5,6].includes(chart.cuc?.number))
  throw Error('R57 local Liêm Trinh/anchor rule inconsistent');
 return Object.freeze({
  lunarYear:chart.lunar?.year,lunarMonth:chart.lunar?.month,
  lunarDay:chart.lunar?.day,isLeapMonth:chart.lunar?.leap===true,
  wuxingJu:chart.cuc.number,mingGongBranch:ming,
  ziweiPos:ziwei,liemTrinhBranch:liemTrinh
 });
}
function counterfactualForRecord(record,directRecord){
 const s=record.source,l=directRecord.local;
 const localChart=Engine.calculate({
  date:record.solarDate,hour:record.clockHour,minute:0,
  gender:record.gender,calendar:'solar'
 });
 const before=JSON.stringify(localChart),p=localPoint(localChart);
 if(l.lunarYear!==p.lunarYear||l.lunarMonth!==p.lunarMonth||
    l.lunarDay!==p.lunarDay||l.isLeapMonth!==p.isLeapMonth||
    l.wuxingJu!==p.wuxingJu||l.mingGongBranch!==p.mingGongBranch||
    l.ziweiPos!==p.ziweiPos||l.liemTrinhBranch!==p.liemTrinhBranch)
  throw Error('R57 local direct observation diverges from R33');
 if(!isBranch(s.ziweiPos)||!isBranch(s.liemTrinhBranch)||
    s.liemTrinhBranch!==mod(s.ziweiPos-8)){
  // Different source offset is recorded, never forced to be the local rule.
  if(!isBranch(s.ziweiPos)||!isBranch(s.liemTrinhBranch))
   throw Error('R57 missing source star location');
 }
 const originalLunarMatches=s.lunarYear===p.lunarYear&&
  s.lunarMonth===p.lunarMonth&&s.lunarDay===p.lunarDay&&
  s.isLeapMonth===p.isLeapMonth;
 const dayOnlyDifferent=s.lunarYear===p.lunarYear&&
  s.lunarMonth===p.lunarMonth&&s.isLeapMonth===p.isLeapMonth&&
  s.lunarDay!==p.lunarDay;
 // This is a local what-if calculation with the source-reported lunar date.
 // The returned SOLAR date may differ from the actual birth date. It must
 // never overwrite the original chart.
 const lunarDate=[s.lunarYear,String(s.lunarMonth).padStart(2,'0'),
  String(s.lunarDay).padStart(2,'0')].join('-');
 let shifted=null,unavailableReason=null;
 try{
  const alternative=Engine.calculate({
   date:lunarDate,hour:record.clockHour,minute:0,
   gender:record.gender,calendar:'lunar',leap:s.isLeapMonth
  });
  shifted=localPoint(alternative);
  if(shifted.lunarYear!==s.lunarYear||shifted.lunarMonth!==s.lunarMonth||
     shifted.lunarDay!==s.lunarDay||
     shifted.isLeapMonth!==s.isLeapMonth)
   throw Error('R57 source lunar counterfactual did not preserve requested date');
 }catch(error){
  unavailableReason=String(error?.message||error);
 }
 if(JSON.stringify(localChart)!==before)
  throw Error('R57 source-lunar counterfactual mutated original chart');
 const comparison=Object.freeze({
  directLunarDayDiffers:s.lunarDay!==p.lunarDay,
  directZiweiDiffers:s.ziweiPos!==p.ziweiPos,
  directLiemTrinhDiffers:s.liemTrinhBranch!==p.liemTrinhBranch,
  sourceLiêmTrinhObeysLocalAnchorOffset:s.liemTrinhBranch===mod(s.ziweiPos-8),
  counterfactualComputed:shifted!==null,
  counterfactualMatchesSourceZiwei:shifted?shifted.ziweiPos===s.ziweiPos:null,
  counterfactualMatchesSourceLiemTrinh:shifted?shifted.liemTrinhBranch===s.liemTrinhBranch:null,
  counterfactualPreservesSourceMing:shifted?shifted.mingGongBranch===s.mingGongBranch:null,
  counterfactualPreservesSourceCuc:shifted?shifted.wuxingJu===s.wuxingJu:null
 });
 const suitableContext=dayOnlyDifferent&&
  s.wuxingJu===p.wuxingJu&&
  s.mingGongBranch===p.mingGongBranch;
 const resultClass=!shifted?'counterfactual-unavailable':
  !suitableContext?'context-or-calendar-not-isolated':
  shifted.liemTrinhBranch===s.liemTrinhBranch&&
  shifted.ziweiPos===s.ziweiPos?
   'source-lunar-input-reproduces-source-anchor-and-liem-in-local-model':
   'source-lunar-input-does-not-reproduce-both-branches';
 return Object.freeze({
  id:record.id,solarDate:record.solarDate,gender:record.gender,
  clockHour:record.clockHour,sourceHourBranch:record.hourBranch,
  source:Object.freeze({
   lunarYear:s.lunarYear,lunarMonth:s.lunarMonth,lunarDay:s.lunarDay,
   isLeapMonth:s.isLeapMonth,mingGongBranch:s.mingGongBranch,
   wuxingJu:s.wuxingJu,ziweiPos:s.ziweiPos,
   liemTrinhBranch:s.liemTrinhBranch,yearStem:s.yearStem
  }),
  originalLocal:p,
  inputToCounterfactual:Object.freeze({
   calendar:'lunar',date:lunarDate,leap:s.isLeapMonth,
   hour:record.clockHour,gender:record.gender,
   sameInstantAsOriginalBirth:false
  }),
  localCounterfactual:shifted,unavailableReason,
  comparison,originalLunarMatches,dayOnlyDifferent,
  resultClass,astronomicalBoundaryClass:directRecord.calendarBoundary.status,
  ...noPromotion
 });
}
function auditR57(input){
 validateSource(input);
 const parent=analyzeRootCause(input);
 if(parent.schema!==ROOT_REPORT||parent.compared!==30||
    parent.failures!==0||parent.semanticEquivalenceVerified!==false||
    parent.localPatternVerdictsVerified!==false||parent.engineChanged!==false)
  throw Error('R57 must use full genuine R33 comparison');
 const m=new Map(parent.records.map(x=>[x.id,x]));
 const rows=input.records.map(rec=>{
  const prior=m.get(rec.id);
  if(!prior)throw Error('R57 R33 record missing: '+rec.id);
  return counterfactualForRecord(rec,prior);
 });
 if(rows.length!==30||new Set(rows.map(x=>x.id)).size!==30)
  throw Error('R57 incomplete genuine calendar-control matrix');
 const target=rows.find(x=>x.id===TARGET);
 if(!target||target.gender!=='Nam'||target.solarDate!=='1989-08-15'||
    target.clockHour!==0||target.sourceHourBranch!==0)
  throw Error('R57 targeted source case missing');
 const categories=[...new Set(rows.map(x=>x.resultClass))].sort();
 const tally=Object.freeze(Object.fromEntries(categories.map(k=>
  [k,rows.filter(r=>r.resultClass===k).length])));
 const dates=Object.freeze(Object.fromEntries(DATES.map(d=>[d,Object.freeze({
  cases:rows.filter(x=>x.solarDate===d).length,
  sourceLunarDayDifferent:rows.filter(x=>x.solarDate===d&&x.dayOnlyDifferent).length,
  counterfactualComputed:rows.filter(x=>x.solarDate===d&&x.comparison.counterfactualComputed).length,
  localReproductions:rows.filter(x=>x.solarDate===d&&
   x.resultClass==='source-lunar-input-reproduces-source-anchor-and-liem-in-local-model').length
 })])));
 if(Object.values(dates).some(x=>x.cases!==6)||
    Object.values(tally).reduce((s,n)=>s+n,0)!==30)
  throw Error('R57 date strata/denominators inconsistent');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  genuineSourceRequired:true,syntheticCasesOnly:true,
  caseCount:30,sourceReferenceDateWindow:Object.freeze([...DATES]),
  hours:Object.freeze([...HOURS]),genders:Object.freeze([...GENDERS]),
  astronomicalBoundary:BOUNDARY,
  originalR33LunarDayDifferences:parent.differences.lunarDay,
  originalR33ZiweiDifferences:parent.differences.ziweiPos,
  originalR33CucDifferences:parent.differences.wuxingJu,
  classCounts:tally,dateStrata:dates,targetCase:target,
  rows:Object.freeze(rows),
  mappedResearchCount:31,referenceTotal:49,
  ...noPromotion,
  sourceCalendarTimezoneVerified:false,
  conclusion:'If a source lunar input reproduces placements within the UNMODIFIED local model, it proves only input sensitivity, not the correct school or an authorized algorithm change.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R57 requires genuine R33 source observations');
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const r=auditR57(input);
 fs.writeFileSync('.r57-source-lunar-day-counterfactual.json',JSON.stringify(r,null,2)+'\n','utf8');
 console.log('R57: '+r.caseCount+'/30 chart scenarios; target '+r.targetCase.resultClass+
  '; calendar evidence '+r.originalR33LunarDayDifferences+
  ', ZiWei differences '+r.originalR33ZiweiDifferences+
  '; no engine/school promotion');
}
module.exports=Object.freeze({SCHEMA,TARGET,BRANCHES,uniqueMainStar,localPoint,counterfactualForRecord,auditR57});
