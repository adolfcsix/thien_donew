'use strict';
/**
 * R51: read-only evidence matrix from the genuine R27 evaluated report.
 * Two-branch geometry is not source-star, school, semantic or criterion parity.
 * The R27 evaluator owns chart calculation and ensures no chart mutation.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT,PINNED_IZTRO}=require('./tuvi-r27-evaluate-parity.cjs');

const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const LABELS=Object.freeze(['旬空','副旬','截空','副截']);
const STATES=Object.freeze(['matched','different','unknown']);
function geometry(value){
 if(value===true)return 'matched';
 if(value===false)return 'different';
 if(value===null)return 'unknown';
 throw new TypeError('R51 invalid geometry observation');
}
function makeVoidEvidenceMatrix(report){
 if(!report||report.schema!=='thiendo-r27-runtime-iztro-parity-report-v1'||
    report.sourceCommit!==SOURCE_COMMIT||report.iztroVersion!==PINNED_IZTRO||
    report.sourceRunExecuted!==true||report.syntheticCasesOnly!==true||
    report.caseCount!==65||report.sourceConsistent!==65||report.failures!==0||
    report.namedPlacementEquivalenceVerified!==false||
    report.sourceSchoolParityVerified!==false||report.sourceCriterionVerified!==false||
    !Array.isArray(report.results)||report.results.length!==65||
    !Array.isArray(report.failedCases)||report.failedCases.length!==0)
  throw new Error('R51 requires complete genuine pinned R27 evaluator report');
 const seen=new Set(),rows=[];
 for(const result of report.results){
  if(!result||typeof result.id!=='string'||!result.id||seen.has(result.id)||
    !['Nam','Nữ'].includes(result.gender)||
    !/^\d{4}-\d{2}-\d{2}$/.test(result.solarDate)||
    !result.sourceNames||!result.sourceRawIztroNames||
    result.namedSourceFormulaReproduced!==true||
    result.rawIztroToSourcePlacementReproduced!==true||
    result.sourceFuxunPostprocessingReproduced!==true||
    result.sourceLocalYearStemSame!==true&&result.sourceLocalYearStemSame!==false||
    result.nameEquivalenceVerified!==false||
    result.sourceCriterionVerified!==false)
    throw new Error('R51 source row invalid or falsely promoted');
  seen.add(result.id);
  for(const label of LABELS){
   const branch=result.sourceNames[label];
   if(!Number.isInteger(branch)||branch<0||branch>11)
    throw new Error('R51 source position missing, duplicate or invalid: '+label);
  }
  const triet=geometry(result.localTrietSameTwoBranches);
  const tuan=geometry(result.localTuanSameTwoBranches);
  rows.push(Object.freeze({
   id:result.id,solarDate:result.solarDate,gender:result.gender,
   sourceYearStem:result.sourceYearStem,localYearStem:result.localYearStem,
   yearStemAligned:result.sourceLocalYearStemSame,
   sourceNamedBranches:Object.freeze(Object.fromEntries(
    LABELS.map(name=>[name,result.sourceNames[name]]))),
   sourceDoubleToLocalTrietGeometry:triet,
   sourceXunFuxunToLocalTuanGeometry:tuan,
   sourcePositionVerifiedInPinnedEngine:true,
   localObstructionGeometryObserved:true,
   sourceSchoolParityVerified:false,nameEquivalenceVerified:false,
   semanticEquivalenceVerified:false,sourceCriterionVerified:false,
   mayDeclareClassicalPattern:false
  }));
 }
 const total=rows.length;
 const group=field=>Object.freeze(Object.fromEntries(STATES.map(state=>
  [state,rows.filter(row=>row[field]===state).length])));
 const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const counters=Object.freeze({
  yearStemAligned:rows.filter(x=>x.yearStemAligned).length,
  yearStemDifferent:rows.filter(x=>!x.yearStemAligned).length,
  trietGeometry:group('sourceDoubleToLocalTrietGeometry'),
  tuanGeometry:group('sourceXunFuxunToLocalTuanGeometry')
 });
 if(total!==65||sum(counters.trietGeometry)!==65||sum(counters.tuanGeometry)!==65||
  counters.yearStemAligned+counters.yearStemDifferent!==65)
  throw new Error('R51 incomplete evidence counts');
 return Object.freeze({
  schema:'thiendo-r51-source-local-void-evidence-matrix-v1',
  sourceCommit:SOURCE_COMMIT,iztroVersion:PINNED_IZTRO,
  sampleCount:65,sourceObservationsExecuted:true,syntheticOnly:true,
  counts:counters,rows:Object.freeze(rows),
  blockedCriterionIds:IDS,blockedCriterionCount:3,
  catalogTotal:49,mappedResearchCount:31,unmappedCount:18,
  expertReviewed:false,sourceSchoolParityVerified:false,
  nameEquivalenceVerified:false,semanticEquivalenceVerified:false,
  sourceCriterionVerified:false,mayIncreaseMapping:false,
  mayDeclareClassicalPattern:false,
  notice:'Cặp chi khớp hình học không đồng nghĩa vị trí sao, trường phái, Không Vong = Tuần/Triệt hoặc điều kiện cách cục; 31/49 chỉ là ánh xạ nghiên cứu.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw new Error('R51 requires the genuine R27 report path');
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const output=makeVoidEvidenceMatrix(input);
 fs.writeFileSync('.r51-source-local-void-evidence-matrix.json',JSON.stringify(output,null,2)+'\n');
 console.log('R51: 65/65 pinned source-local void diagnostic rows; '+
  'Triet '+JSON.stringify(output.counts.trietGeometry)+
  '; Tuan '+JSON.stringify(output.counts.tuanGeometry)+
  '; source semantic equivalence UNVERIFIED');
}
module.exports=Object.freeze({IDS,LABELS,STATES,geometry,makeVoidEvidenceMatrix});
