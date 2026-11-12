'use strict';
/**
 * R30: check a genuine executed pinned-source positive and clock-hour negative.
 * Independent of any natal verdict or any Thiên Đồ school equivalence.
 * Never accept simulated/handwritten positive observations as CI evidence.
 */
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {independentlyEvaluate,reconcilePinnedR44Fixture}=require('./tuvi-r29-evaluate-source-oracle.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalVoidSemanticGates}=require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');

const SCHEMA='thiendo-r30-source-rare-positive-observation-v1';
const IZTRO='2.6.1';
const MAX_SEARCH=5000;
const VOID=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const LIMITATION='Bộ chạy nguồn chứng minh điều kiện mẫu dương/âm của định nghĩa Định bần 02 trong bản mã tham khảo, không xác nhận tương đương ý nghĩa Tuần/Triệt hoặc kết luận vận mệnh Thiên Đồ.';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validate(observation){
 if(!observation||observation.schema!==SCHEMA||
    !observation.provenance||observation.provenance.repository!=='Renhuai123/ziwei-doushu'||
    observation.provenance.sourceCommit!==SOURCE_COMMIT||
    observation.provenance.iztroVersion!==IZTRO||
    observation.provenance.detector!=='detectDingPin'||
    observation.provenance.sourceGenerator!=='generateChart'||
    observation.provenance.syntheticOnly!==true||
    observation.provenance.deterministicSearch!==true)
  throw Error('R30 observation must come from exact pinned source runtime');
 const s=observation.search;
 if(!s||!Number.isInteger(s.scanned)||s.scanned<1||s.scanned>MAX_SEARCH||
    s.maxSearch!==MAX_SEARCH||!same(s.years,[1984,1999])||
    !same(s.months,[1,12])||!same(s.days,[1,28])||
    !same(s.genders,['male','female'])||
    !same(s.sourceHourBranches,[0,6])||
    s.controlHourShifted!==true||s.positiveFound!==true)
  throw Error('R30 deterministic source search is missing or out of bounds');
 const records=observation.records;
 if(!Array.isArray(records)||records.length!==2||
    records[0]?.id!=='source-positive-1'||records[0]?.role!=='positive'||
    records[1]?.id!=='hour-shift-negative-1'||records[1]?.role!=='negative')
  throw Error('R30 positive and matched negative records are both required');
 const [positive,negative]=records;
 for(const rec of records){
  if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(rec.solarDate)||
     !['Nam','Nữ'].includes(rec.gender)||![0,2,12,14].includes(rec.clockHour)||
     !Number.isInteger(rec.sourceYearStemIndex)||rec.sourceYearStemIndex<0||rec.sourceYearStemIndex>9||
     !Number.isInteger(rec.mingGongBranch)||rec.mingGongBranch<0||rec.mingGongBranch>11||
     rec.sourceHourBranch!==Math.floor(((rec.clockHour+1)%24)/2)||
     typeof rec.detector?.dingPin01!=='boolean'||
     typeof rec.detector?.dingPin02!=='boolean'||!Array.isArray(rec.detector.dingZa03))
   throw Error('R30 source case metadata invalid');
 }
 if(positive.solarDate!==negative.solarDate||positive.gender!==negative.gender||
    ![0,12].includes(positive.clockHour)||negative.clockHour!==positive.clockHour+2||
    positive.detector.dingPin02!==true||negative.detector.dingPin02!==false)
  throw Error('R30 strict source positive and adjacent-hour negative do not match');
 const [year,month,day]=positive.solarDate.split('-').map(Number);
 if(year<1984||year>1999||day<1||day>28||month<1||month>12)
  throw Error('R30 observation outside predetermined synthetic source scan');
}
function auditRealPositive(observation){
 validate(observation);
 const sourceChecks=[],issues=[];
 for(const rec of observation.records){
  try{
   const independent=independentlyEvaluate(rec);
   if(independent.dingPin01!==rec.detector.dingPin01||
      independent.dingPin02!==rec.detector.dingPin02||
      !same(independent.dingZa03,rec.detector.dingZa03))
    throw Error('Actual source detector and independent source predicate disagree');
   // Source-only bridge must agree with the executed detector and independent oracle.
   const r44=reconcilePinnedR44Fixture(rec,independent);
   if(r44.sourceOnly!==true||r44.semanticEquivalenceVerified!==false||
      r44.localPatternVerdictsVerified!==false)
    throw Error('R46 source-only R44 bridge promoted an unverified verdict');
   const stars=rec.palaces.find(p=>p.branch===rec.mingGongBranch)?.stars;
   if(!Array.isArray(stars))throw Error('Missing source Ming palace');
   const has=name=>stars.some(star=>star.name===name);
   const voidAtMing=stars.some(star=>VOID.includes(star.name));
   const luAtMing=stars.some(star=>star.name==='禄存'||star.siHua==='禄');
   const killersBothAtMing=has('地空')&&has('地劫');
   if(rec.role==='positive'&&!(voidAtMing&&luAtMing&&killersBothAtMing))
    throw Error('Positive must have Lộc, source void, and both killer stars at Ming');
   if(rec.role==='negative'&&independent.dingPin02!==false)
    throw Error('Negative must fail full source formula');
   const chart=Engine.calculate({date:rec.solarDate,hour:rec.clockHour,minute:0,
    gender:rec.gender,calendar:'solar'});
   const prior=JSON.stringify(chart);
   const local=auditClassicalVoidSemanticGates(chart);
   if(local.sourceCriterionVerified!==false||local.semanticEquivalenceVerified!==false||
      local.sourcePlacementVerifiedForCurrentChart!==false||local.items.length!==3||
      local.items.some(x=>x.sourceCriterionVerified!==false||x.semanticEquivalenceVerified!==false)||
      JSON.stringify(chart)!==prior)
    throw Error('Local source-equivalence gate was incorrectly promoted or mutated chart');
   sourceChecks.push({
    id:rec.id,role:rec.role,solarDate:rec.solarDate,gender:rec.gender,
    clockHour:rec.clockHour,sourceHourBranch:rec.sourceHourBranch,
    sourceDingPin02:independent.dingPin02,voidAtMing,luAtMing,killersBothAtMing,
    r44SourceFixtureCrosschecked:r44.sourceOnly,
    r44SourcePeriodsMatched:r44.matchedPeriods,
    localMingVoidProxy:local.items[1].checks[0].state,
    localSemanticEquivalenceVerified:false,sourceCriterionVerifiedForLocalChart:false
   });
  }catch(err){issues.push({id:rec?.id||'missing',reason:String(err?.message||err)});}
 }
 return Object.freeze({
  schema:'thiendo-r30-rare-positive-audit-report-v1',
  exactSourceCommit:SOURCE_COMMIT,iztroVersion:IZTRO,
  actualPinnedSourceExecuted:true,syntheticCasesOnly:true,
  searchScanned:observation.search.scanned,
  positiveCount:sourceChecks.filter(x=>x.sourceDingPin02).length,
  negativeCount:sourceChecks.filter(x=>!x.sourceDingPin02).length,
  checked:sourceChecks.length,failures:issues.length,
  r44SourceFixtureCrosschecks:sourceChecks.filter(x=>x.r44SourceFixtureCrosschecked===true).length,
  semanticEquivalenceVerified:false,localPatternVerdictVerified:false,
  limitation:LIMITATION,sourceChecks,issues
 });
}
if(require.main===module){
 const file=process.argv[2];
 if(!file)throw Error('R30 requires real source probe JSON path');
 const source=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
 const report=auditRealPositive(source);
 fs.writeFileSync('.r30-rare-positive-audit-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R30 source positive/negative: '+report.checked+'/2, '+
  report.positiveCount+' true, '+report.negativeCount+' false, '+
  report.failures+' source discrepancies');
 if(report.failures||report.positiveCount!==1||report.negativeCount!==1)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA,IZTRO,MAX_SEARCH,LIMITATION,validate,auditRealPositive});
