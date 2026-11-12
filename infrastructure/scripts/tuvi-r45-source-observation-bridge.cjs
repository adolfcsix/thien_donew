'use strict';
/**
 * R45: compare R44's source-only fixture to 65 ACTUALLY EXECUTED pinned
 * reference source detector observations produced by the existing R29 probe.
 * This establishes source-internal formula agreement, NEVER Thiên Đồ parity.
 */
const fs=require('node:fs');
const path=require('node:path');
const {validateObservation,independentlyEvaluate}=
 require('./tuvi-r29-evaluate-source-oracle.cjs');
const {evaluatePinnedSourceVoidFixture}=
 require('../../packages/interpretation/src/source-void-formula-fixture.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const SCHEMA='thiendo-r45-pinned-source-fixture-bridge-v1';
const LIMITATION='65 synthetic pinned SOURCE charts only. This does NOT verify real births, Vietnamese/Chinese calendar parity, Thiên Đồ star placements, or source Void equivalence to Tuần/Triệt.';
function asFixture(record){
 if(!record||!Array.isArray(record.palaces)||!Array.isArray(record.daXians))
  throw new TypeError('Incomplete pinned source observation');
 return {
  kind:'source-synthetic-fixture',mingGongBranch:record.mingGongBranch,
  palaces:record.palaces.map(p=>({
   branch:p.branch,
   stars:p.stars.map(s=>{
    if(!s||typeof s.name!=='string')throw new TypeError('Invalid source star');
    const star={name:s.name};
    if(s.siHua!==undefined&&s.siHua!==null&&s.siHua!=='')
     star.siHua=s.siHua;
    return star;
   })
  })),
  periodBranches:record.daXians.map(dx=>dx.palaceBranch)
 };
}
const samePeriods=(a,b)=>{
 const normalize=xs=>xs.map(row=>[row.startAge,row.endAge,row.palaceBranch])
  .sort((x,y)=>x[0]-y[0]);
 return JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
};
const sameBranches=(a,b)=>JSON.stringify(a.slice().sort((x,y)=>x-y))===
 JSON.stringify(b.slice().sort((x,y)=>x-y));
function evaluateSourceObservationBridge(observation,matrix){
 validateObservation(observation,matrix);
 const before=JSON.stringify(observation),matched=[],mismatches=[];
 for(const record of observation.records){
  try{
   const source=independentlyEvaluate(record);
   if(source.dingPin01!==record.detector.dingPin01||
      source.dingPin02!==record.detector.dingPin02||
      !samePeriods(source.dingZa03,record.detector.dingZa03))
    throw new Error('R29 independently evaluated source disagrees with genuine detectors');
   const fixture=evaluatePinnedSourceVoidFixture(asFixture(record));
   if(fixture.sourceCommit!==SOURCE_COMMIT||
      fixture.mayDeclarePattern!==false||fixture.mayIncreaseMapping!==false||
      fixture.parityWithThienDoVerified!==false||
      fixture.sourceEnginePlacementVerified!==false||
      fixture.mappedConditionResearch!==31||fixture.referenceTotal!==49)
    throw new Error('R44 synthetic fixture exceeded source-only authority');
   const result=fixture.items;
   if(result[0].formulaMatched!==record.detector.dingPin01||
      result[1].formulaMatched!==record.detector.dingPin02)
    throw new Error('R44 natal source formula differs from pinned detector');
   const observedBranches=record.detector.dingZa03.map(row=>row.palaceBranch);
   const evaluatedBranches=result[2].periods.filter(row=>row.formulaMatched)
    .map(row=>row.branch);
   if(!sameBranches(observedBranches,evaluatedBranches))
    throw new Error('R44 period source formula differs from pinned detector');
   matched.push(Object.freeze({id:record.id,
    natalOne:result[0].formulaMatched,natalTwo:result[1].formulaMatched,
    majorPeriods:observedBranches.length}));
  }catch(e){
   mismatches.push(Object.freeze({id:record.id,
    reason:String(e&&e.message||e)}));
  }
 }
 if(JSON.stringify(observation)!==before)throw new Error('R45 mutated source observations');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,total:65,matched:matched.length,
  failures:mismatches.length,sourceCasesAreSynthetic:true,
  mappedConditionResearch:31,referenceTotal:49,
  sourceDetectorFormulaAgreementVerified:mismatches.length===0&&matched.length===65,
  sourceEnginePlacementParityWithThienDoVerified:false,
  calendarConventionParityVerified:false,mayDeclarePattern:false,mayIncreaseMapping:false,
  limitation:LIMITATION,items:Object.freeze(matched),mismatches:Object.freeze(mismatches)
 });
}
if(require.main===module){
 const input=process.argv[2];
 if(!input)throw new Error('Actual executed source observation JSON is required');
 const observation=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tests/fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
 const report=evaluateSourceObservationBridge(observation,matrix);
 fs.writeFileSync('.r45-source-fixture-bridge-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R45 pinned source fixture bridge: '+report.matched+'/'+report.total+
  ' source-detector agreement; '+report.failures+' mismatches; local parity UNVERIFIED');
 if(report.failures||report.matched!==65)process.exitCode=1;
}
module.exports=Object.freeze({asFixture,evaluateSourceObservationBridge,SCHEMA,LIMITATION});
