'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SOURCE_COMMIT,NAMES,census}=require('../infrastructure/scripts/tuvi-r32-r66-pinned-source-local-coordinate-census.cjs');

const copy=x=>JSON.parse(JSON.stringify(x));
function sample() {
 const date='1989-08-15';
 const names=['liem-trinh','loc-ton','thien-ma','that-sat','dia-khong','dia-kiep'];
 const records=Array.from({length:67},(_,i)=>{
  const id=i===0?'stem-1989-nam-h0':i===65?'rare-positive':
   i===66?'rare-negative':('r29-'+String(i).padStart(2,'0'));
  const placement=Object.fromEntries(names.map(name=>[
   name,{sourceBranch:8,localBranch:8,status:'matched'}
  ]));
  if(i===0)placement['liem-trinh']={sourceBranch:11,localBranch:8,status:'different'};
  const hua=i===0?{sourceBranch:3,localBranch:0,status:'different'}:
   {sourceBranch:1,localBranch:1,status:'matched'};
  return {
   id,origin:i<65?'r29':'r30',solarDate:date,clockHour:i%12,
   gender:'Nam',sourceMing:8,localMing:8,mingAligned:true,
   placement,hua,
   voidCoordinates:{
    sourceNamedBranches:{'旬空':2,'副旬':3,'截空':4,'副截':5},
    sourceBranches:[2,3,4,5],localProxyBranches:[2,3,4,5],
    status:'matched',semanticEquivalenceVerified:false
   },semanticEquivalenceVerified:false,
   sourceCriterionVerifiedForLocalChart:false,
   localPatternVerdictVerified:false
  };
 });
 return {
  schema:'thiendo-r32-cross-engine-evidence-report-v1',
  sourceCommit:SOURCE_COMMIT,sourceIztroVersion:'2.6.1',
  referenceRuntimeVerified:true,syntheticOnly:true,
  total:67,checked:67,failures:0,sampleOrigins:{r29:65,r30:2},
  semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  localPatternVerdictsVerified:false,records,errors:[]
 };
}
test('R66 unit census: 67/67 records, seven named coordinates, genuine evidence boundary explicit',()=>{
 const input=sample(),before=JSON.stringify(input),a=census(input),b=census(copy(input));
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(input),before,'R66 must not modify the input');
 assert.equal(a.coordinateComparisons,67*7);
 assert.equal(a.sourceCases,67);
 assert.deepEqual(a.origins,{r29:65,r30:2});
 assert.equal(a.namedStarCounts['liem-trinh'].different,1);
 assert.equal(a.namedStarCounts['hua-loc'].different,1);
 assert.equal(a.reviewQueue[0].caseId,'stem-1989-nam-h0');
 assert.equal(a.reviewQueue[0].verifiedCause,false);
 assert.equal(a.mappedResearch,31);
 assert.equal(a.referenceTotal,49);
 assert.equal(a.rootCauseVerified,false);
 assert.equal(a.semanticEquivalenceVerified,false);
 assert.equal(a.mayIncreaseMapping,false);
 assert.equal(a.evidenceSha256.length,64);
 assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.cases));
 assert.deepEqual(Object.keys(a.namedStarCounts),NAMES);
});
test('R66 must fail closed on duplicated, incomplete, or forged source evidence',()=>{
 const changes=[
  x=>x.records.pop(),
  x=>x.records[1].id=x.records[0].id,
  x=>x.sampleOrigins.r30=3,
  x=>x.sourceCommit='forged',
  x=>x.referenceRuntimeVerified=false,
  x=>x.semanticEquivalenceVerified=true,
  x=>x.records[0].localPatternVerdictVerified=true,
  x=>x.records[0].mingAligned=false,
  x=>x.records[0].placement['liem-trinh'].status='matched',
  x=>x.records[0].placement['liem-trinh'].sourceBranch=12,
  x=>x.records[0].placement['loc-ton'].localBranch=undefined,
  x=>delete x.records[0].placement['dia-kiep'],
  x=>x.records[0].voidCoordinates.sourceNamedBranches['旬空']=7,
  x=>x.records[0].voidCoordinates.status='different',
  x=>x.records[0].voidCoordinates.localProxyBranches=[5,4,3,2],
  x=>x.records[0].voidCoordinates.semanticEquivalenceVerified=true
 ];
 for(const mutate of changes){
  const bad=sample();mutate(bad);
  assert.throws(()=>census(bad),/R66:/);
 }
});
test('R66 unknown coordinates remain unknown, never promoted to a match',()=>{
 const input=sample();
 input.records[1].placement['liem-trinh']={
  sourceBranch:null,localBranch:8,status:'unknown'
 };
 input.records[1].voidCoordinates.localProxyBranches=null;
 input.records[1].voidCoordinates.status='unknown';
 const result=census(input);
 assert.equal(result.namedStarCounts['liem-trinh'].unknown,1);
 assert.equal(result.voidGeometryCounts.unknown,1);
 const row=result.cases.find(x=>x.caseId===input.records[1].id);
 assert.deepEqual(row.unknownStars,['liem-trinh']);
 assert.equal(row.voidGeometry.status,'unknown');
 assert.equal(row.semanticEquivalenceVerified,false);
});
test('R66 genuine: audit report generated earlier in this pinned-source workflow',()=>{
 const reportPath=path.join(__dirname,'../.r32-cross-engine-evidence-matrix-report.json');
 const required=process.env.THIENDO_R32_REQUIRE_GENUINE==='1';
 if(!fs.existsSync(reportPath)){
  assert.ok(!required,'R66 genuine gate requires same-run R32 report');
  return;
 }
 const input=JSON.parse(fs.readFileSync(reportPath,'utf8'));
 const result=census(input);
 assert.equal(result.sourceCases,67);
 assert.equal(result.coordinateComparisons,469);
 assert.equal(result.origins.r30,2);
 assert.ok(result.cases.some(x=>x.caseId==='stem-1989-nam-h0'));
 const case1989=result.cases.find(x=>x.caseId==='stem-1989-nam-h0');
 assert.deepEqual(case1989.namedStarBranches['liem-trinh'],
  {sourceBranch:11,localBranch:8,status:'different'});
 assert.deepEqual(case1989.namedStarBranches['hua-loc'],
  {sourceBranch:3,localBranch:0,status:'different'});
 assert.equal(case1989.sourceMing,8);
 assert.equal(case1989.localMing,8);
 assert.equal(case1989.voidGeometry.status,'matched');
 assert.equal(result.rootCauseVerified,false);
 assert.equal(result.mayChangeChartRules,false);
});
