'use strict';
/**
 * R52: synthesize three criterion-specific DIFFERENCES from already validated
 * genuine R29/R30 source detectors + R32 local proxy observations.
 * Never interpret proxy agreement as source-school or semantic equivalence.
 * This is a reporting layer, not a chart or pattern engine.
 */
const fs=require('node:fs');
const {SCHEMA,VERSION,classify}=require('./tuvi-r32-cross-engine-evidence-matrix.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const CATEGORIES=Object.freeze([
 'different-ming-branch','local-unknown','both-met-proxy-only',
 'both-not-met-proxy-only','source-only','local-proxy-only'
]);
const PROXY_STATES=Object.freeze(['met','not-met','unknown']);
const DEFINITIONS=Object.freeze([
 Object.freeze({id:'dinh-ban-01',sourceTitle:'生不逢时',scope:'natal',
  sourceFile:'patterns-dingpin.ts',sourceParts:Object.freeze([
   'Liêm Trinh at source Mệnh','source-defined Void at Mệnh']),
  blocker:'Chưa chứng minh Không Vong nguồn tương đương Tuần/Triệt nội bộ tại Mệnh.'}),
 Object.freeze({id:'dinh-ban-02',sourceTitle:'禄逢两杀',scope:'natal',
  sourceFile:'patterns-dingpin.ts',sourceParts:Object.freeze([
   'Lộc Tồn or Hóa Lộc at source Mệnh','source-defined Void at Mệnh',
   'Địa Không AND Địa Kiếp at source Mệnh']),
  blocker:'Chưa chứng minh ngữ nghĩa Không Vong và phép an sao/phái giữa hai engine; mẫu dương/âm nguồn không phải verdict Thiên Đồ.'}),
 Object.freeze({id:'dinh-tap-03',sourceTitle:'禄衰马困',scope:'major-period',
  sourceFile:'patterns-dingza.ts',sourceParts:Object.freeze([
   'Thất Sát in source đại hạn tam phương tứ chính',
   'Lộc Tồn natal palace contains source Void',
   'Thiên Mã natal palace contains source Void']),
  blocker:'Chưa đối chiếu đầy đủ sao theo trường phái, Không Vong và tam phương của từng đại hạn với local; không áp proxy natal làm chứng cứ đại hạn.'})
]);
function tally(values){
 const counts=Object.fromEntries(CATEGORIES.map(name=>[name,0]));
 for(const x of values){
  if(!Object.hasOwn(counts,x))throw new TypeError('R52 invalid comparison category');
  counts[x]++;
 }
 return Object.freeze(counts);
}
function isBranch(x){return Number.isInteger(x)&&x>=0&&x<12;}
function summarizeR52CriterionGaps(matrix){
 if(!matrix||matrix.schema!==SCHEMA||matrix.sourceCommit!==SOURCE_COMMIT||
    matrix.sourceIztroVersion!==VERSION||matrix.referenceRuntimeVerified!==true||
    matrix.syntheticOnly!==true||matrix.total!==67||matrix.checked!==67||
    matrix.failures!==0||matrix.sampleOrigins?.r29!==65||
    matrix.sampleOrigins?.r30!==2||matrix.localPatternVerdictsVerified!==false||
    matrix.semanticEquivalenceVerified!==false||matrix.sourceSchoolParityVerified!==false||
    !Array.isArray(matrix.records)||matrix.records.length!==67||
    !Array.isArray(matrix.errors)||matrix.errors.length!==0)
  throw new Error('R52 requires a complete genuine pinned-source R32 comparison');
 const ids=new Set(),provenance={r29:0,r30:0},sourcePositive=[],sourceNegative=[];
 const matches=Object.fromEntries(IDS.map(id=>[id,[]])),periods=[];
 const perCase=[];
 for(const record of matrix.records){
  if(!record||typeof record.id!=='string'||!record.id||ids.has(record.id)||
    !['r29','r30'].includes(record.origin)||
    !['Nam','Nữ'].includes(record.gender)||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.solarDate)||
    !isBranch(record.sourceMing)||!isBranch(record.localMing)||
    record.mingAligned!==(record.sourceMing===record.localMing)||
    record.sourceCriterionVerifiedForLocalChart!==false||
    record.localPatternVerdictVerified!==false||
    record.semanticEquivalenceVerified!==false||!record.evidence)
   throw new Error('R52 malformed record or falsely promoted verdict');
  ids.add(record.id);provenance[record.origin]++;
  const categories={};
  for(const id of IDS.slice(0,2)){
   const item=record.evidence[id];
   if(!item||typeof item.sourceHit!=='boolean'||
      !PROXY_STATES.includes(item.localProxy)||
      item.category!==classify(item.sourceHit,item.localProxy,record.mingAligned))
    throw new Error('R52 source/predicate proxy mismatch: '+record.id+' '+id);
   matches[id].push(item.category);
   categories[id]=item.category;
  }
  const third=record.evidence['dinh-tap-03'];
  if(!third||!Number.isInteger(third.sourceHitPeriods)||
     third.sourceHitPeriods<0||third.sourceHitPeriods>12||
     !Array.isArray(third.periodComparisons)||
     third.periodComparisons.length!==12)
   throw new Error('R52 source major-period evidence incomplete: '+record.id);
  const periodBranches=new Set();let sourceHitCount=0;
  for(const period of third.periodComparisons){
   if(!period||!isBranch(period.branch)||periodBranches.has(period.branch)||
      typeof period.sourceHit!=='boolean'||
      !PROXY_STATES.includes(period.localProxy)||
      period.category!==classify(period.sourceHit,period.localProxy,record.mingAligned))
    throw new Error('R52 per-period mismatch: '+record.id);
   periodBranches.add(period.branch);
   if(period.sourceHit)sourceHitCount++;
   periods.push(period.category);
   matches['dinh-tap-03'].push(period.category);
  }
  if(sourceHitCount!==third.sourceHitPeriods)
   throw new Error('R52 source detector period hits not reproduced: '+record.id);
  if(record.origin==='r30'){
   if(!['positive','negative'].includes(record.kind))
    throw new Error('R52 expected genuine R30 positive/negative pair');
   (record.kind==='positive'?sourcePositive:sourceNegative).push({
    id:record.id,sourceHit:record.evidence['dinh-ban-02'].sourceHit});
  }
  perCase.push(Object.freeze({
   id:record.id,origin:record.origin,sourceMing:record.sourceMing,
   localMing:record.localMing,mingAligned:record.mingAligned,
   natalCategories:Object.freeze(categories),
   sourceDingZa03HitPeriods:third.sourceHitPeriods,
   disagreementOnly:true,semanticEquivalenceVerified:false,
   localPatternVerdictVerified:false
  }));
 }
 if(provenance.r29!==65||provenance.r30!==2||
    sourcePositive.length!==1||sourceNegative.length!==1||
    sourcePositive[0].sourceHit!==true||sourceNegative[0].sourceHit!==false||
    periods.length!==67*12)
  throw new Error('R52 origin, control or major-period source evidence not credible');
 const rules=Object.freeze(DEFINITIONS.map(spec=>{
  const categories=tally(matches[spec.id]);
  const total=Object.values(categories).reduce((a,b)=>a+b,0);
  if(total!==(spec.scope==='natal'?67:67*12))
   throw new Error('R52 malformed criterion denominator');
  return Object.freeze({
   ...spec,sourceUrl:'https://github.com/Renhuai123/ziwei-doushu/blob/'+
    SOURCE_COMMIT+'/lib/ziwei/'+spec.sourceFile,
   units:spec.scope==='natal'?'charts':'major-periods',
   compared:total,categoryCounts:categories,
   sourceRuleExecuted:true,localProxyDiagnosticOnly:true,
   sourceCriterionVerifiedForLocalChart:false,expertReviewed:false,
   readyForMapping:false
  });
 }));
 return Object.freeze({
  schema:'thiendo-r52-pinned-source-criterion-disagreements-v1',
  sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  genuineReferenceRuntime:true,syntheticCasesOnly:true,
  sourceChartCount:67,sourceMajorPeriodComparisons:804,
  sampleOrigins:Object.freeze(provenance),rarePositiveNegativeControlsVerified:true,
  criteria:rules,caseIndex:Object.freeze(perCase),
  sourceCriterionVerified:false,sourceSchoolParityVerified:false,
  semanticEquivalenceVerified:false,expertReviewed:false,
  catalogTotal:49,mappedConditionResearch:31,unmapped:18,
  mayIncreaseMapping:false,mayDeclarePattern:false,
  disclaimer:'Đồng thuận hoặc sai khác của proxy không xác minh tương đương học thuật Không Vong nguồn với Tuần/Triệt nội bộ. 31/49 giữ nguyên.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw new Error('R52 requires genuine R32 report path');
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const report=summarizeR52CriterionGaps(input);
 fs.writeFileSync('.r52-source-criterion-disagreement.json',JSON.stringify(report,null,2)+'\n','utf8');
 console.log('R52: '+report.sourceChartCount+' genuine source cases, '+
  report.sourceMajorPeriodComparisons+' major-period comparisons, '+
  report.criteria.length+' blocked criteria; 31/49 mapping unchanged');
}
module.exports=Object.freeze({IDS,CATEGORIES,PROXY_STATES,DEFINITIONS,tally,summarizeR52CriterionGaps});
