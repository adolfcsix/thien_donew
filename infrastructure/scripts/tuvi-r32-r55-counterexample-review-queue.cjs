'use strict';
/**
 * R55: deterministic, evidence-linked counterexample/review queue.
 * Inputs are produced in the same genuine R29/R30/R32/R54 CI job.
 * Never claims a proven root cause or equates source Void with Tuần/Triệt.
 */
const fs=require('node:fs');
const {IDS,CATEGORY,CANDIDATE_CODES}=require('./tuvi-r32-r54-diagnostic-disagreement-triage.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const SCHEMA='thiendo-r55-pinned-counterexample-review-queue-v1';
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<=11;
const lower=(x,y)=>x.localeCompare(y,'en');
const assertNoPromotion=r=>{
 if(r.rootCauseVerified!==false||r.semanticEquivalenceVerified!==false||
    r.sourceSchoolParityVerified!==false||r.mayDeclarePattern!==false||
    r.mayIncreaseMapping!==false)
  throw Error('R55 refuses promoted verdicts');
};
function classifyPriority(obs){
 if(!obs||!CATEGORY.includes(obs.comparisonCategory)||
    typeof obs.sourceRuleHit!=='boolean'||
    !['met','not-met','unknown'].includes(obs.localProxy)||
    !Array.isArray(obs.observableDifferenceCodes)||
    obs.observableDifferenceCodes.some(x=>!CANDIDATE_CODES.includes(x))||
    obs.rootCauseVerified!==false||obs.semanticEquivalenceVerified!==false||
    obs.nameEquivalenceVerified!==false||
    obs.sourceCriterionVerifiedForLocalChart!==false)
  throw Error('R55 invalid source/proxy observation');
 if(obs.comparisonCategory==='source-only'||obs.comparisonCategory==='local-proxy-only')
  return 'conflicting-proxy';
 if(obs.comparisonCategory==='local-unknown')
  return 'missing-local-evidence';
 if(obs.comparisonCategory==='different-ming-branch')
  return 'different-ming-context';
 return 'proxy-agreement-not-proof';
}
function makeR55ReviewQueue(report){
 if(!report||report.schema!=='thiendo-r54-diagnostic-cross-engine-disagreement-triage-v1'||
    report.sourceCommit!==SOURCE_COMMIT||report.iztroVersion!=='2.6.1'||
    report.genuineSourceRuntime!==true||report.syntheticCasesOnly!==true||
    report.sourceCharts!==67||report.periodContexts!==804||
    report.referenceTotal!==49||report.mappedResearch!==31||
    !Array.isArray(report.criteria)||report.criteria.length!==3||
    !Array.isArray(report.cases)||report.cases.length!==67)
  throw Error('R55 requires complete pinned genuine R54 evidence');
 assertNoPromotion(report);
 if(IDS.some((id,i)=>report.criteria[i].id!==id||
    report.criteria[i].compared!==(i===2?804:67)||
    report.criteria[i].readyForMapping!==false||
    report.criteria[i].exactCauseOfDisagreementVerified!==false))
  throw Error('R55 criterion scope or status changed');
 const seen=new Set(),entries=[],origins={r29:0,r30:0};
 for(const caseRow of report.cases){
  if(!caseRow||typeof caseRow.id!=='string'||!caseRow.id||
     seen.has(caseRow.id)||!Object.hasOwn(origins,caseRow.origin)||
     !isBranch(caseRow.sourceMing)||!isBranch(caseRow.localMing)||
     !Array.isArray(caseRow.periods)||caseRow.periods.length!==12||
     !caseRow.natal||!Array.isArray(caseRow.sourceVoidAtMing)||
     !Array.isArray(caseRow.sourceVoidAtLocTon)||
     !Array.isArray(caseRow.sourceVoidAtThienMa))
   throw Error('R55 malformed, missing or repeated genuine source case');
  assertNoPromotion({...caseRow,semanticEquivalenceVerified:false,
   sourceSchoolParityVerified:false,mayIncreaseMapping:false});
  seen.add(caseRow.id);origins[caseRow.origin]++;
  const add=(id,obs,branch)=>{
   if(obs.criterionId!==id||obs.context!==(branch===null?'natal':'major-period')||
      obs.periodBranch!==branch||
      obs.mingBranchAligned!==(caseRow.sourceMing===caseRow.localMing))
    throw Error('R55 criterion observation and case not aligned');
   const priority=classifyPriority(obs);
   entries.push(Object.freeze({
    id:caseRow.id,origin:caseRow.origin,criterionId:id,
    periodBranch:branch,sourceMing:caseRow.sourceMing,
    localMing:caseRow.localMing,sourceHit:obs.sourceRuleHit,
    localProxy:obs.localProxy,category:obs.comparisonCategory,
    priority,observableDifferenceCodes:Object.freeze([...obs.observableDifferenceCodes]),
    namedVoidAtMing:Object.freeze([...caseRow.sourceVoidAtMing]),
    namedVoidAtLocTon:Object.freeze([...caseRow.sourceVoidAtLocTon]),
    namedVoidAtThienMa:Object.freeze([...caseRow.sourceVoidAtThienMa]),
    rootCauseVerified:false,sourceSchoolParityVerified:false,
    semanticEquivalenceVerified:false,readyForMapping:false
   }));
  };
  for(const id of IDS.slice(0,2))add(id,caseRow.natal[id],null);
  const periods=new Set();
  for(const obs of caseRow.periods){
   if(!isBranch(obs.periodBranch)||periods.has(obs.periodBranch))
    throw Error('R55 duplicated or invalid major period branch');
   periods.add(obs.periodBranch);
   add('dinh-tap-03',obs,obs.periodBranch);
  }
 }
 if(origins.r29!==65||origins.r30!==2||seen.size!==67||entries.length!==938)
  throw Error('R55 incomplete 67+804 evidence coverage');
 const sorted=entries.sort((a,b)=>
  lower(a.criterionId,b.criterionId)||
  lower(a.id,b.id)||
  (a.periodBranch??-1)-(b.periodBranch??-1));
 const selected=[],covered=new Set();
 // Include one deterministic sample of every category and every observed code
 // for each criterion, plus both source rare positive/negative controls.
 const keys=e=>[
  'category:'+e.criterionId+':'+e.category,
  ...e.observableDifferenceCodes.map(code=>'code:'+e.criterionId+':'+code),
  ...(e.origin==='r30'?['control:'+e.id+':'+e.criterionId]:[])
 ];
 for(const e of sorted){
  const uncovered=keys(e).filter(k=>!covered.has(k));
  if(!uncovered.length)continue;
  selected.push(Object.freeze({...e,selectionReasons:Object.freeze(uncovered)}));
  keys(e).forEach(k=>covered.add(k));
 }
 const categoryCounts=Object.freeze(Object.fromEntries(IDS.map(id=>[
  id,Object.freeze(Object.fromEntries(CATEGORY.map(cat=>
   [cat,sorted.filter(e=>e.criterionId===id&&e.category===cat).length])))
 ])));
 const issueCounts=Object.freeze(Object.fromEntries(IDS.map(id=>[
  id,Object.freeze(Object.fromEntries(CANDIDATE_CODES.map(code=>
   [code,sorted.filter(e=>e.criterionId===id&&e.observableDifferenceCodes.includes(code)).length])))
 ])));
 const originals=new Map(report.criteria.map(x=>[x.id,x]));
 for(const id of IDS){
  const old=originals.get(id);
  if(JSON.stringify(categoryCounts[id])!==JSON.stringify(old.comparisonCategories)||
     JSON.stringify(issueCounts[id])!==JSON.stringify(old.observedDifferenceCodeCounts))
   throw Error('R55 refuses mismatch against independent R54 counts');
 }
 const controls=selected.filter(x=>x.origin==='r30');
 if(new Set(controls.map(x=>x.id)).size!==2)
  throw Error('R55 missing both source rare control cases');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  genuineSourceRuntime:true,syntheticCasesOnly:true,
  sourceCases:67,totalComparisons:938,majorPeriods:804,
  selectedComparisonCount:selected.length,
  selectedCaseCount:new Set(selected.map(x=>x.id)).size,
  sourceRareControlCaseCount:2,
  categories:categoryCounts,observedCodes:issueCounts,
  selected:Object.freeze(selected),
  selection:'deterministic first-in-ID order by criterion, category, observed difference and both R30 control cases; not a statistically representative population',
  sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
  rootCauseVerified:false,expertReviewed:false,
  sourceCriterionVerifiedForLocalChart:false,
  mappedResearch:31,referenceTotal:49,
  mayIncreaseMapping:false,mayDeclarePattern:false,
  nextEvidence:'Manually inspect differing named source star placements and period context; document rule and calendar provenance before any engine change.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R55 requires R54 source-backed report path');
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const report=makeR55ReviewQueue(input);
 fs.writeFileSync('.r55-pinned-counterexample-review-queue.json',JSON.stringify(report,null,2)+'\n');
 console.log('R55: '+report.totalComparisons+' source/local comparisons, '+
  report.selectedComparisonCount+' deterministic review candidates, '+
  report.sourceRareControlCaseCount+' rare controls; no semantic promotion');
}
module.exports=Object.freeze({SCHEMA,classifyPriority,makeR55ReviewQueue});
