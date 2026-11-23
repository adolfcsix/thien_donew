'use strict';
/**
 * R66: read-only census of named-star source/local branch coordinates.
 * Consumes the R32 report generated in the SAME pinned-source CI run.
 * Status matches are geometric observations, never proof of school or meaning.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');

const SCHEMA = 'thiendo-r66-pinned-coordinate-census-v1';
const SOURCE_COMMIT = '7922285d947b36610e7e31c232d8f1e2a0d0871d';
const NAMES = Object.freeze([
 'liem-trinh','loc-ton','thien-ma','that-sat','dia-khong','dia-kiep','hua-loc'
]);
const VOID_NAMES = Object.freeze(['旬空','副旬','截空','副截']);
const STATUSES = Object.freeze(['matched','different','unknown']);
const valid = x => Number.isInteger(x) && x>=0 && x<12;
const fail = msg => { throw Error('R66: '+msg); };
const check = (ok,msg) => { if (!ok) fail(msg); };
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const sorted = a => [...a].sort((x,y)=>x-y);
const union = a => sorted([...new Set(a)]);
const coordinateStatus = (a,b) =>
 a===null||b===null ? 'unknown' : a===b ? 'matched' : 'different';
function coordinate(input,caseId,name) {
 check(input && typeof input==='object','missing coordinate '+caseId+'/'+name);
 const {sourceBranch,localBranch,status}=input;
 check((sourceBranch===null||valid(sourceBranch)) &&
  (localBranch===null||valid(localBranch)),
  'invalid branch '+caseId+'/'+name);
 check(STATUSES.includes(status) &&
  status===coordinateStatus(sourceBranch,localBranch),
  'forged coordinate status '+caseId+'/'+name);
 return Object.freeze({sourceBranch,localBranch,status});
}
function voidGeometry(input,caseId) {
 check(input && input.semanticEquivalenceVerified===false,
  'void source/local semantic gate '+caseId);
 const named=input.sourceNamedBranches;
 check(named && typeof named==='object' &&
  equal(Object.keys(named).sort(),[...VOID_NAMES].sort()),
  'missing named source Void entries '+caseId);
 const names=Object.fromEntries(VOID_NAMES.map(name=>{
  const b=named[name];
  check(b===null||valid(b),'invalid named Void '+caseId+'/'+name);
  return [name,b];
 }));
 const source=Object.values(names).every(valid) ? union(Object.values(names)):null;
 const local=input.localProxyBranches;
 check(equal(source,input.sourceBranches),'source Void union is not derived from names '+caseId);
 check(local===null || (Array.isArray(local) &&
  local.every(valid) && equal(local,union(local))),
  'local Void union invalid '+caseId);
 const status=source===null||local===null?'unknown':
  equal(source,local)?'matched':'different';
 check(input.status===status,'forged Void geometry '+caseId);
 return Object.freeze({
  sourceNamedBranches:Object.freeze(names),
  sourceBranches:source,localProxyBranches:local,status,
  semanticEquivalenceVerified:false
 });
}
function census(report) {
 check(report?.schema==='thiendo-r32-cross-engine-evidence-report-v1',
  'must consume actual R32 schema');
 check(report.sourceCommit===SOURCE_COMMIT && report.sourceIztroVersion==='2.6.1',
  'reference dependency or source SHA drift');
 check(report.referenceRuntimeVerified===true && report.syntheticOnly===true &&
  report.total===67 && report.checked===67 && report.failures===0 &&
  report.sampleOrigins?.r29===65 && report.sampleOrigins?.r30===2,
  '67 pinned-source comparisons not complete');
 check(report.semanticEquivalenceVerified===false &&
  report.sourceSchoolParityVerified===false &&
  report.localPatternVerdictsVerified===false,
  'R32 scholarly/verdict gates elevated');
 check(Array.isArray(report.records)&&report.records.length===67 &&
  Array.isArray(report.errors)&&report.errors.length===0,
  'missing or duplicated genuine report entries');
 const seen=new Set(),origins={r29:0,r30:0},cases=[];
 for(const item of report.records) {
  const id=item?.id;
  check(typeof id==='string' && id.length>0 && !seen.has(id),
   'empty/duplicate ID');
  seen.add(id);
  check(item.origin==='r29'||item.origin==='r30','invalid origin '+id);
  origins[item.origin]++;
  check(/^\d{4}-\d{2}-\d{2}$/.test(item.solarDate||'') &&
   Number.isInteger(item.clockHour) && item.clockHour>=0 && item.clockHour<=23 &&
   ['Nam','Nữ'].includes(item.gender),'birth provenance missing '+id);
  check(valid(item.sourceMing)&&valid(item.localMing) &&
   item.mingAligned===(item.sourceMing===item.localMing),
   'Mệnh branch contradiction '+id);
  check(item.semanticEquivalenceVerified===false &&
   item.sourceCriterionVerifiedForLocalChart===false &&
   item.localPatternVerdictVerified===false,
   'local verdict gate elevated '+id);
  check(item.placement && typeof item.placement==='object' &&
   equal(Object.keys(item.placement).sort(),NAMES.filter(x=>x!=='hua-loc').sort()),
   'star name inventory changed '+id);
  const stars=Object.fromEntries(NAMES.map(name=>[
   name,coordinate(name==='hua-loc'?item.hua:item.placement[name],id,name)
  ]));
  const voids=voidGeometry(item.voidCoordinates,id);
  const mismatchedStars=NAMES.filter(name=>stars[name].status==='different');
  const unknownStars=NAMES.filter(name=>stars[name].status==='unknown');
  const signals=[
   ...(item.mingAligned?[]:['ming-branch-different']),
   ...mismatchedStars.map(name=>'named-star-branch-different:'+name),
   ...unknownStars.map(name=>'named-star-branch-unknown:'+name),
   ...(voids.status==='matched'?[]:['void-union-'+voids.status])
  ];
  cases.push(Object.freeze({
   caseId:id,origin:item.origin,solarDate:item.solarDate,
   clockHour:item.clockHour,gender:item.gender,
   sourceMing:item.sourceMing,localMing:item.localMing,
   mingAligned:item.mingAligned,namedStarBranches:Object.freeze(stars),
   voidGeometry:voids,
   mismatchedStars:Object.freeze(mismatchedStars),
   unknownStars:Object.freeze(unknownStars),
   reviewSignals:Object.freeze(signals),
   rootCauseVerified:false,sourceSchoolParityVerified:false,
   semanticEquivalenceVerified:false,mayChangeChartRules:false,
   mayIncreaseMapping:false
  }));
 }
 check(origins.r29===65&&origins.r30===2,'R29/R30 origins incomplete');
 cases.sort((a,b)=>a.caseId.localeCompare(b.caseId,'en'));
 const summary=Object.fromEntries(NAMES.map(name=>{
  const counts=Object.fromEntries(STATUSES.map(status=>[
   status,cases.filter(x=>x.namedStarBranches[name].status===status).length
  ]));
  check(Object.values(counts).reduce((a,b)=>a+b,0)===67,'count coverage '+name);
  return [name,Object.freeze(counts)];
 }));
 const bySolarYear=Object.fromEntries(
  [...new Set(cases.map(x=>x.solarDate.slice(0,4)))].sort().map(year=>[
   year,Object.freeze({
    cases:cases.filter(x=>x.solarDate.startsWith(year)).length,
    casesWithNamedStarDifferences:cases.filter(x=>
     x.solarDate.startsWith(year)&&x.mismatchedStars.length>0).length
   })
  ])
 );
 const reviewQueue=cases.filter(x=>x.reviewSignals.length>0)
  .sort((a,b)=>b.mismatchedStars.length-a.mismatchedStars.length||
   a.caseId.localeCompare(b.caseId,'en'))
  .map(x=>Object.freeze({
   caseId:x.caseId,origin:x.origin,solarDate:x.solarDate,
   mismatchedStars:x.mismatchedStars,unknownStars:x.unknownStars,
   reviewSignals:x.reviewSignals,
   verifiedCause:false,readyForMapping:false
  }));
 const json=JSON.stringify(cases);
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  pinnedSourceRuntime:true,syntheticCasesOnly:true,
  sourceCases:67,origins:Object.freeze(origins),
  coordinateComparisons:67*NAMES.length,
  namedStarCounts:Object.freeze(summary),
  mingAligned:cases.filter(x=>x.mingAligned).length,
  voidGeometryCounts:Object.freeze(Object.fromEntries(STATUSES.map(s=>[
   s,cases.filter(x=>x.voidGeometry.status===s).length
  ]))),
  bySolarYear:Object.freeze(bySolarYear),
  cases:Object.freeze(cases),
  reviewQueue:Object.freeze(reviewQueue),
  reviewQueueLength:reviewQueue.length,
  evidenceSha256:crypto.createHash('sha256').update(json).digest('hex'),
  mappedResearch:31,referenceTotal:49,
  rootCauseVerified:false,sourceSchoolParityVerified:false,
  semanticEquivalenceVerified:false,expertReviewed:false,
  mayChangeChartRules:false,mayIncreaseMapping:false,
  caveat:'Named-star branch coincidence is only a source/local geometric observation. Calendar, hour, school, Void semantics, and major-period rules remain independently unverified.'
 });
}
if (require.main===module) {
 check(process.argv.length===3,'expected exactly one R32 report path');
 const result=census(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 fs.writeFileSync('.r66-pinned-source-local-coordinate-census.json',
  JSON.stringify(result,null,2)+'\n');
 console.log('R66: '+result.sourceCases+' pinned charts, '+
  result.coordinateComparisons+' named-star pairs, '+
  result.reviewQueueLength+' cases require further inspection; 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,SOURCE_COMMIT,NAMES,VOID_NAMES,
 coordinateStatus,coordinate,voidGeometry,census});
