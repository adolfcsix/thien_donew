'use strict';
/**
 * R54 evidence triage: identify OBSERVED mismatches without claiming causality,
 * equivalence of named Void stars, or any local classical-pattern verdict.
 * Reuses two independent, source-backed R32/R53 audits, never user charts.
 */
const fs=require('node:fs');
const {auditCrossEngineMatrix,SCHEMA: R32_SCHEMA}=require('./tuvi-r32-cross-engine-evidence-matrix.cjs');
const {buildR53}=require('./tuvi-r32-r53-source-void-atoms.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');

const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const STAR_RELEVANCE=Object.freeze({
 'dinh-ban-01':Object.freeze(['liem-trinh']),
 'dinh-ban-02':Object.freeze(['loc-ton','dia-khong','dia-kiep','hua-loc']),
 'dinh-tap-03':Object.freeze(['loc-ton','thien-ma','that-sat'])
});
const CATEGORY=Object.freeze([
 'different-ming-branch','local-unknown','both-met-proxy-only',
 'both-not-met-proxy-only','source-only','local-proxy-only'
]);
const GEOMETRY=Object.freeze(['matched','different','unknown']);
const CANDIDATE_CODES=Object.freeze([
 'ming-branch-different','named-star-branch-different',
 'named-star-branch-unknown','void-union-geometry-different',
 'void-union-geometry-unknown','source-vs-local-proxy-disagrees',
 'local-proxy-unknown'
]);
const statusOf=(value,name)=>{
 if(!value||!GEOMETRY.includes(value.status))
  throw new Error('R54 missing source/local coordinate evidence for '+name);
 return value.status;
};
function classifyObservation(row,id,sourceHit,localProxy,category,periodBranch=null){
 if(!IDS.includes(id)||!CATEGORY.includes(category)||
    typeof sourceHit!=='boolean'||!['met','not-met','unknown'].includes(localProxy))
  throw new TypeError('R54 malformed criterion comparison');
 const placements=Object.fromEntries(STAR_RELEVANCE[id].map(name=>[
  name,statusOf(name==='hua-loc'?row.hua:row.placement?.[name],name)]));
 const voidGeometry=statusOf(row.voidCoordinates,'voidCoordinates');
 const reasonCodes=[];
 if(row.mingAligned!==true)reasonCodes.push('ming-branch-different');
 if(Object.values(placements).some(s=>s==='different'))
  reasonCodes.push('named-star-branch-different');
 if(Object.values(placements).some(s=>s==='unknown'))
  reasonCodes.push('named-star-branch-unknown');
 if(voidGeometry==='different')reasonCodes.push('void-union-geometry-different');
 if(voidGeometry==='unknown')reasonCodes.push('void-union-geometry-unknown');
 if(category==='source-only'||category==='local-proxy-only')
  reasonCodes.push('source-vs-local-proxy-disagrees');
 if(category==='local-unknown')reasonCodes.push('local-proxy-unknown');
 // These are observations, NOT an assertion that any individual one caused
 // the divergent rule verdict.
 const branchKind=periodBranch===null?'natal':'major-period';
 if(periodBranch!==null&&(!Number.isInteger(periodBranch)||periodBranch<0||periodBranch>11))
  throw new RangeError('R54 period branch is invalid');
 return Object.freeze({
  criterionId:id,context:branchKind,periodBranch,
  sourceRuleHit:sourceHit,localProxy,comparisonCategory:category,
  mingBranchAligned:row.mingAligned,
  relevantNamedStarBranchStatuses:Object.freeze(placements),
  voidUnionGeometryStatus:voidGeometry,
  observableDifferenceCodes:Object.freeze(reasonCodes),
  rootCauseVerified:false,semanticEquivalenceVerified:false,
  nameEquivalenceVerified:false,sourceCriterionVerifiedForLocalChart:false
 });
}
function buildR54(source,rare,fixture){
 const r32=auditCrossEngineMatrix(source,rare,fixture);
 const r53=buildR53(source,rare,fixture);
 if(r32.schema!==R32_SCHEMA||r32.sourceCommit!==SOURCE_COMMIT||
    r32.checked!==67||r32.failures!==0||r32.referenceRuntimeVerified!==true||
    r32.semanticEquivalenceVerified!==false||
    r32.localPatternVerdictsVerified!==false||
    r32.sourceSchoolParityVerified!==false||
    r53.sourceCommit!==SOURCE_COMMIT||r53.sourceCases!==67||
    r53.sourceMajorPeriods!==804||r53.semanticEquivalenceVerified!==false||
    r53.sourceSchoolParityVerified!==false||
    r53.mayDeclarePattern!==false||r53.mayIncreaseMapping!==false)
  throw new Error('R54 requires complete genuine R32 and R53 source evidence');
 const atoms=new Map(r53.cases.map(x=>[x.id,x]));
 if(atoms.size!==67)throw new Error('R54 duplicate source atom ID');
 const cases=[],overall=Object.fromEntries(IDS.map(id=>[id,[]]));
 let totalPeriods=0;
 for(const row of r32.records){
  if(!row||typeof row.id!=='string'||!atoms.has(row.id)||
    !['r29','r30'].includes(row.origin)||row.semanticEquivalenceVerified!==false||
    row.localPatternVerdictVerified!==false||
    row.sourceCriterionVerifiedForLocalChart!==false)
    throw new Error('R54 missing or promoted source row');
  const atom=atoms.get(row.id);
  if(atom.origin!==row.origin||atom.sourceMingBranch!==row.sourceMing||
    atom.localMingBranch!==row.localMing||
    atom.sourceSchoolParityVerified!==false||atom.mayDeclarePattern!==false)
    throw new Error('R54 source atoms not aligned to row');
  const natal=Object.freeze(Object.fromEntries(IDS.slice(0,2).map(id=>{
   const e=row.evidence?.[id];
   if(!e||e.category!==atom.localProxyCategories[id])
    throw new Error('R54 source/local category mismatch');
   const observed=classifyObservation(row,id,e.sourceHit,e.localProxy,e.category);
   const atomHit=id==='dinh-ban-01'?atom.sourceAtoms.sourceDinhBan01Hit:
    atom.sourceAtoms.sourceDinhBan02Hit;
   if(observed.sourceRuleHit!==atomHit)
    throw new Error('R54 source detector mismatch');
   overall[id].push(observed);
   return [id,observed];
  })));
  const periodProof=atom.sourceAtoms.majorPeriods;
  const pMap=new Map(periodProof.map(p=>[p.palaceBranch,p]));
  if(periodProof.length!==12||pMap.size!==12||
    !Array.isArray(row.evidence?.['dinh-tap-03']?.periodComparisons)||
    row.evidence['dinh-tap-03'].periodComparisons.length!==12)
   throw new Error('R54 incomplete source period evidence');
  const periodEvidence=Object.freeze(row.evidence['dinh-tap-03'].periodComparisons.map(p=>{
   const a=pMap.get(p.branch);
   if(!a||a.sourceRuleHit!==p.sourceHit||
      a.localProxy!==p.localProxy||a.comparisonCategory!==p.category)
    throw new Error('R54 source and local period mismatch');
   const observation=classifyObservation(row,'dinh-tap-03',
    p.sourceHit,p.localProxy,p.category,p.branch);
   overall['dinh-tap-03'].push(observation);totalPeriods++;
   return observation;
  }));
  cases.push(Object.freeze({id:row.id,origin:row.origin,
   sourceMing:row.sourceMing,localMing:row.localMing,
   natal,periods:periodEvidence,
   sourceVoidAtMing:Object.freeze([...atom.sourceAtoms.mingVoidNamedStars]),
   sourceVoidAtLocTon:Object.freeze([...atom.sourceAtoms.locTonVoidNamedStars]),
   sourceVoidAtThienMa:Object.freeze([...atom.sourceAtoms.thienMaVoidNamedStars]),
   rootCauseVerified:false,mayDeclarePattern:false
  }));
 }
 if(cases.length!==67||new Set(cases.map(c=>c.id)).size!==67||
    totalPeriods!==804||overall['dinh-ban-01'].length!==67||
    overall['dinh-ban-02'].length!==67)
  throw new Error('R54 incomplete compared-case totals');
 const criteria=Object.freeze(IDS.map(id=>{
  const observations=overall[id],denominator=id==='dinh-tap-03'?804:67;
  const categories=Object.freeze(Object.fromEntries(CATEGORY.map(c=>[
   c,observations.filter(x=>x.comparisonCategory===c).length
  ])));
  const differences=Object.freeze(Object.fromEntries(CANDIDATE_CODES.map(code=>[
   code,observations.filter(x=>x.observableDifferenceCodes.includes(code)).length
  ])));
  if(observations.length!==denominator||
     Object.values(categories).reduce((n,x)=>n+x,0)!==denominator)
   throw new Error('R54 incomplete criterion comparisons');
  return Object.freeze({id,compared:denominator,
   unit:id==='dinh-tap-03'?'major-periods':'charts',
   comparisonCategories:categories,observedDifferenceCodeCounts:differences,
   exactCauseOfDisagreementVerified:false,
   sourceSchoolParityVerified:false,expertReviewed:false,
   readyForMapping:false});
 }));
 return Object.freeze({
  schema:'thiendo-r54-diagnostic-cross-engine-disagreement-triage-v1',
  sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  genuineSourceRuntime:true,syntheticCasesOnly:true,
  sourceCharts:67,periodContexts:804,criteria,
  cases:Object.freeze(cases),rootCauseVerified:false,
  sourceCriterionVerifiedForLocalChart:false,
  semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  expertReviewed:false,mappedResearch:31,referenceTotal:49,
  mayIncreaseMapping:false,mayDeclarePattern:false,
  caveat:'Khác biệt tọa độ, cung, nguồn và proxy chỉ là dấu hiệu chẩn đoán, không xác nhận nguyên nhân gốc hay đồng nhất sao Không Vong với Tuần/Triệt.'
 });
}
if(require.main===module){
 if(process.argv.length!==4)throw new Error('R54 requires genuine R29 and R30 source observation paths');
 const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/tuvi-r27-iztro-cases.json','utf8'));
 const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const rare=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const report=buildR54(source,rare,fixtures);
 fs.writeFileSync('.r54-source-local-difference-triage.json',JSON.stringify(report,null,2)+'\n','utf8');
 console.log('R54: 67 genuine source charts and 804 periods triaged; '+
  '3 still-blocked criteria, 31/49 unchanged, no unproved root cause');
}
module.exports=Object.freeze({IDS,STAR_RELEVANCE,CATEGORY,GEOMETRY,CANDIDATE_CODES,
 classifyObservation,buildR54});
