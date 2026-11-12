'use strict';
/**
 * R56: independently cross-link chosen R55 counterexamples to the precise
 * pinned-source predicate atoms, calendar context, named-star locations,
 * and local diagnostic coordinates from R32/R53/R54.
 *
 * Audit-only. No local star-rule corrections, no source-school or semantic
 * parity claim, no classical verdict for users.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {SCHEMA:R55_SCHEMA,makeR55ReviewQueue}=require('./tuvi-r32-r55-counterexample-review-queue.cjs');
const {IDS,STAR_RELEVANCE}=require('./tuvi-r32-r54-diagnostic-disagreement-triage.cjs');
const SCHEMA='thiendo-r56-pinned-source-predicate-traces-v1';
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const checked=(condition,message)=>{if(!condition)throw Error('R56: '+message);};
const same=(a,b)=>assert.deepStrictEqual(a,b);
const copy=x=>JSON.parse(JSON.stringify(x));
const sourceRule=(atom,id,periodBranch)=>{
 const s=atom.sourceAtoms;
 if(id==='dinh-ban-01'){
  const checks={liemTrinhAtMing:s.liemTrinhAtMing,
   namedSourceVoidAtMing:s.mingVoidNamedStars.length>0};
  checked(Object.values(checks).every(x=>typeof x==='boolean'),'source ban01 checks');
  return {checks,hit:checks.liemTrinhAtMing&&checks.namedSourceVoidAtMing};
 }
 if(id==='dinh-ban-02'){
  const checks={locOrHuaLocAtMing:s.locOrHuaLocAtMing,
   namedSourceVoidAtMing:s.mingVoidNamedStars.length>0,
   diaKhongAtMing:s.diaKhongAtMing,diaKiepAtMing:s.diaKiepAtMing};
  checked(Object.values(checks).every(x=>typeof x==='boolean'),'source ban02 checks');
  return {checks,hit:Object.values(checks).every(Boolean)};
 }
 checked(id==='dinh-tap-03'&&isBranch(periodBranch),'source period scope');
 const period=s.majorPeriods.find(x=>x.palaceBranch===periodBranch);
 checked(period&&s.majorPeriods.length===12,'R53 period missing');
 const checks={sat7InPeriodSanFang:period.sat7InPeriodSanFang,
  locTonOnSourceVoid:s.locTonVoidNamedStars.length>0,
  thienMaOnSourceVoid:s.thienMaVoidNamedStars.length>0};
 checked(Object.values(checks).every(x=>typeof x==='boolean'),'source tap03 checks');
 const hit=Object.values(checks).every(Boolean);
 checked(hit===period.sourceRuleHit,'source period atom mismatch');
 return {checks,hit,ageRange:{startAge:period.startAge,endAge:period.endAge}};
};
const canonicalCoordinates=(r,id)=>{
 const statuses={},positions={};
 for(const name of STAR_RELEVANCE[id]){
  const coord=name==='hua-loc'?r.hua:r.placement?.[name];
  checked(coord&&['matched','different','unknown'].includes(coord.status) &&
    (coord.sourceBranch===null||isBranch(coord.sourceBranch))&&
    (coord.localBranch===null||isBranch(coord.localBranch)),
   'missing named source/local coordinates: '+name);
  statuses[name]=coord.status;
  positions[name]={sourceBranch:coord.sourceBranch,localBranch:coord.localBranch,
   comparison:coord.status};
 }
 return {statuses,positions};
};
function buildR56PredicateTraces(r32,r53,r54,r55){
 checked(r32?.schema==='thiendo-r32-cross-engine-evidence-report-v1'&&
  r32.sourceCommit===SOURCE_COMMIT&&r32.sourceIztroVersion==='2.6.1'&&
  r32.total===67&&r32.checked===67&&r32.failures===0&&
  r32.referenceRuntimeVerified===true&&r32.syntheticOnly===true&&
  r32.sourceSchoolParityVerified===false&&
  r32.semanticEquivalenceVerified===false&&
  r32.localPatternVerdictsVerified===false&&
  Array.isArray(r32.records)&&r32.records.length===67,'bad genuine R32 input');
 checked(r53?.schema==='thiendo-r53-pinned-source-void-atom-breakdown-v1'&&
  r53.sourceCommit===SOURCE_COMMIT&&r53.sourceCases===67&&
  r53.sourceMajorPeriods===804&&r53.semanticEquivalenceVerified===false&&
  r53.sourceSchoolParityVerified===false&&r53.mayDeclarePattern===false&&
  Array.isArray(r53.cases)&&r53.cases.length===67,'bad genuine R53 input');
 checked(r54?.schema==='thiendo-r54-diagnostic-cross-engine-disagreement-triage-v1'&&
  r54.sourceCommit===SOURCE_COMMIT&&r54.sourceCharts===67&&
  r54.periodContexts===804&&r54.mappedResearch===31&&
  r54.referenceTotal===49&&r54.rootCauseVerified===false&&
  r54.semanticEquivalenceVerified===false&&r54.mayIncreaseMapping===false&&
  Array.isArray(r54.cases)&&r54.cases.length===67,'bad genuine R54 input');
 checked(r55?.schema===R55_SCHEMA&&r55.sourceCommit===SOURCE_COMMIT&&
  r55.sourceCases===67&&r55.totalComparisons===938&&
  r55.majorPeriods===804&&r55.sourceRareControlCaseCount===2&&
  r55.rootCauseVerified===false&&r55.semanticEquivalenceVerified===false&&
  r55.mayIncreaseMapping===false&&Array.isArray(r55.selected)&&
  r55.selected.length===r55.selectedComparisonCount,'bad genuine R55 input');
 // Recalculate the queue from independently validated R54, preventing a
 // forged or hand-picked selected list from being substituted in CI.
 same(r55,copy(makeR55ReviewQueue(r54)));
 const by=(records,kind)=>{
  const m=new Map(records.map(x=>[x.id,x]));
  checked(m.size===67,'duplicate '+kind+' case');
  return m;
 };
 const by32=by(r32.records,'R32'),by53=by(r53.cases,'R53');
 const by54=by(r54.cases,'R54');
 same([...by32.keys()].sort(),[...by53.keys()].sort());
 same([...by32.keys()].sort(),[...by54.keys()].sort());
 const traces=[];
 const unique=new Set(),reviewByCriterion=Object.fromEntries(IDS.map(id=>[id,0]));
 for(const selection of r55.selected){
  const key=selection.id+'|'+selection.criterionId+'|'+String(selection.periodBranch);
  checked(!unique.has(key)&&IDS.includes(selection.criterionId),'duplicate selected proof');
  unique.add(key);
  const row=by32.get(selection.id),atom=by53.get(selection.id),r54case=by54.get(selection.id);
  checked(row&&atom&&r54case&&row.origin===selection.origin&&
   atom.origin===row.origin&&r54case.origin===row.origin,'source provenance mismatch');
  checked(isBranch(row.sourceMing)&&isBranch(row.localMing)&&
   selection.sourceMing===row.sourceMing&&selection.localMing===row.localMing&&
   atom.sourceMingBranch===row.sourceMing&&atom.localMingBranch===row.localMing,
   'source/local Mệnh mismatch');
  checked(selection.readyForMapping===false&&selection.rootCauseVerified===false&&
   selection.semanticEquivalenceVerified===false&&
   selection.sourceSchoolParityVerified===false,'R55 selected verdict escalated');
  const id=selection.criterionId;
  const isPeriod=id==='dinh-tap-03';
  checked(isPeriod?isBranch(selection.periodBranch):selection.periodBranch===null,
   'source criterion period scope');
  const evidence=isPeriod?
   row.evidence[id].periodComparisons.find(p=>p.branch===selection.periodBranch):
   row.evidence[id];
  const r54obs=isPeriod?
   r54case.periods.find(p=>p.periodBranch===selection.periodBranch):
   r54case.natal[id];
  checked(evidence&&r54obs,'R32/R54 evidence absent');
  const {checks,hit,ageRange}=sourceRule(atom,id,selection.periodBranch);
  const sourceHit=isPeriod?evidence.sourceHit:evidence.sourceHit;
  checked(hit===sourceHit&&hit===selection.sourceHit,'source checks contradict detector');
  checked(evidence.localProxy===selection.localProxy&&
   evidence.category===selection.category&&
   r54obs.sourceRuleHit===hit&&r54obs.localProxy===selection.localProxy&&
   r54obs.comparisonCategory===selection.category,'proxy comparison evidence mismatch');
  same(r54obs.observableDifferenceCodes,selection.observableDifferenceCodes);
  checked(Array.isArray(selection.selectionReasons)&&selection.selectionReasons.length>0,
   'missing provenance of selection');
  const coords=canonicalCoordinates(row,id);
  same(coords.statuses,r54obs.relevantNamedStarBranchStatuses);
  checked(row.voidCoordinates?.semanticEquivalenceVerified===false,'void semantic guard');
  checked(['matched','different','unknown'].includes(row.voidCoordinates.status)&&
    r54obs.voidUnionGeometryStatus===row.voidCoordinates.status,'void geometry mismatch');
  const voidBranches=row.voidCoordinates;
  const voidSource=voidBranches.sourceNamedBranches;
  checked(voidSource&&Object.keys(voidSource).length===4&&
    Object.values(voidSource).every(isBranch),'source void names absent');
  const diagnostic=[],requiredReview=[];
  if(selection.category==='source-only'||selection.category==='local-proxy-only')
   diagnostic.push('source-proxy-verdict-disagreement');
  if(selection.category==='different-ming-branch')
   diagnostic.push('ming-context-incompatible');
  for(const [name,p] of Object.entries(coords.positions))
   if(p.comparison==='different')diagnostic.push('star-branch-different:'+name);
  if(voidBranches.status==='different')diagnostic.push('void-union-branches-different');
  if(selection.localProxy==='unknown')requiredReview.push('local-proxy-evidence');
  if(!row.sourceDefaultPlacement?.sourceYearStemRecorded)
   requiredReview.push('source-lunar-year-stem-provenance');
  if(diagnostic.some(x=>x.startsWith('star-branch-different:')))
   requiredReview.push('school-specific-named-star-placement-rules');
  if(id==='dinh-tap-03')
   requiredReview.push('major-period-san-fang-and-age-boundaries');
  requiredReview.push('source-void-labels-vs-local-tuan-triet-semantics');
  const context={solarDate:row.solarDate,clockHour:row.clockHour,gender:row.gender,
   sourceMing:row.sourceMing,localMing:row.localMing,
   lunarStemRecordedInR32:row.sourceDefaultPlacement?.sourceYearStemRecorded===true};
  checked(typeof context.solarDate==='string'&&Number.isInteger(context.clockHour)&&
   ['Nam','Nữ'].includes(context.gender),'missing chronology provenance');
  traces.push(Object.freeze({
   caseId:selection.id,origin:selection.origin,criterionId:id,
   context:selection.periodBranch===null?'natal':'major-period',
   periodBranch:selection.periodBranch,ageRange:ageRange||null,
   birthContext:Object.freeze(context),
   priority:selection.priority,selectionReasons:Object.freeze([...selection.selectionReasons]),
   sourceDetectorHit:hit,
   sourceRuleChecks:Object.freeze(checks),
   localProxyDiagnostic:selection.localProxy,comparisonCategory:selection.category,
   observedNamedStarBranches:Object.freeze(coords.positions),
   sourceVoidNamedBranches:Object.freeze({...voidSource}),
   sourceVoidUnionBranches:Object.freeze([...(voidBranches.sourceBranches||[])]),
   localVoidUnionBranches:Object.freeze([...(voidBranches.localProxyBranches||[])]),
   voidUnionGeometryStatus:voidBranches.status,
   observedDisagreementIndicators:Object.freeze(diagnostic),
   furtherEvidenceNeeded:Object.freeze(requiredReview),
   rootCauseVerified:false,localCriterionVerified:false,
   sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
   readyForMapping:false
  }));
  reviewByCriterion[id]++;
 }
 checked(unique.size===r55.selectedComparisonCount&&traces.length>0&&
   IDS.every(x=>reviewByCriterion[x]>0),'R56 did not trace every selected criterion');
 const controls=[...new Set(traces.filter(x=>x.origin==='r30').map(x=>x.caseId))];
 checked(controls.length===2,'R56 missing one rare source control');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  genuineSourceRuntime:true,syntheticCasesOnly:true,sourceCaseCount:67,
  totalR55Comparisons:938,selectedTraceCount:traces.length,
  selectedCaseCount:new Set(traces.map(x=>x.caseId)).size,
  controls:Object.freeze(controls.sort()),
  perCriterion:Object.freeze(reviewByCriterion),
  traces:Object.freeze(traces),
  mappedResearch:31,referenceTotal:49,
  rootCauseVerified:false,semanticEquivalenceVerified:false,
  sourceSchoolParityVerified:false,localCriterionVerified:false,
  expertReviewed:false,mayIncreaseMapping:false,mayDeclarePattern:false,
  limitation:'Source predicate trace and named-star geometry are diagnostic only. Need verified calendar, chart school, named Void and period semantics before altering Thiên Đồ.'
 });
}
function markdown(report){
 const lines=[
  '# R56 — Selected pinned source predicate traces',
  '',
  'Reference SHA: '+report.sourceCommit+'; iztro '+report.iztroVersion+'.',
  'Selected comparisons: '+report.selectedTraceCount+' from 938 (67 charts; 804 major-period contexts).',
  '',
  '**Research-only. No source-school, semantic or local criterion equivalence verified. 31/49 unchanged.**',
  ''
 ];
 for(const x of report.traces){
  const branch=x.periodBranch===null?'natal':'period '+x.periodBranch;
  lines.push('## '+x.criterionId+' / '+x.caseId+' / '+branch,'',
   '- Input: '+x.birthContext.solarDate+' '+x.birthContext.clockHour+':00 '+x.birthContext.gender+
    '; Mệnh source/local: '+x.birthContext.sourceMing+'/'+x.birthContext.localMing,
   '- Source detector: '+x.sourceDetectorHit+'; local proxy: '+x.localProxyDiagnostic+
    '; classification: '+x.comparisonCategory,
   '- Source atoms: '+JSON.stringify(x.sourceRuleChecks),
   '- Star coordinates: '+JSON.stringify(x.observedNamedStarBranches),
   '- Void source names: '+JSON.stringify(x.sourceVoidNamedBranches),
   '- Observed indicators: '+(x.observedDisagreementIndicators.join(', ')||'none'),
   '- Still needed: '+x.furtherEvidenceNeeded.join(', '),'');
 }
 return lines.join('\n')+'\n';
}
if(require.main===module){
 if(process.argv.length!==6)throw Error('R56 requires genuine R32/R53/R54/R55 report paths');
 const inputs=process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
 const r=buildR56PredicateTraces(...inputs);
 fs.writeFileSync('.r56-pinned-source-predicate-traces.json',JSON.stringify(r,null,2)+'\n');
 fs.writeFileSync('.r56-pinned-source-predicate-traces.md',markdown(r));
 console.log('R56: '+r.selectedTraceCount+' predicate-level source-backed traces from '+
  r.selectedCaseCount+' cases, '+r.controls.length+' rare controls; 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,sourceRule,buildR56PredicateTraces,markdown});
