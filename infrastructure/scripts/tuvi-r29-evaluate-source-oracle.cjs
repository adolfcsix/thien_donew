'use strict';
/**
 * R29: Independently re-evaluate THREE source algorithms from their observed
 * 12-palace chart data. Compare with ACTUAL executed reference detectors.
 * This is a pinned-source consistency oracle, not Thiên Đồ prognostics.
 */
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {auditClassicalVoidSemanticGates}=
 require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const SCHEMA='thiendo-r29-pinned-source-pattern-observation-v1';
const MATRIX='thiendo-r27-public-synthetic-case-matrix-v1';
const VERSION='2.6.1';
const VOID=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const LIMITATION='Chỉ kiểm nghiệm nội tại bộ định nghĩa nguồn trên ca giả lập. Không xác nhận Tuần/Triệt tương đương Không Vong, độ chính xác của trường phái hoặc sự kiện đời sống.';
const isIntegerBranch=n=>Number.isInteger(n)&&n>=0&&n<12;
const sanFang=b=>[b,(b+4)%12,(b+8)%12,(b+6)%12];
function palaceIndex(record){
 if(!isIntegerBranch(record?.mingGongBranch)||
  !Array.isArray(record.palaces)||record.palaces.length!==12||
  !Array.isArray(record.daXians)||record.daXians.length!==12)
  throw new Error('Invalid 12-palace source chart');
 const map=new Map();
 for(const palace of record.palaces){
  if(!palace||!isIntegerBranch(palace.branch)||map.has(palace.branch)||
   !Array.isArray(palace.stars)||palace.stars.some(s=>!s||
    typeof s.name!=='string'||s.name.length===0||
    !(s.siHua===null||s.siHua===undefined||s.siHua===''||
     ['禄','权','科','忌'].includes(s.siHua))))
   throw new Error('Missing or duplicate source branch/star data');
  map.set(palace.branch,palace.stars);
 }
 if(map.size!==12)throw new Error('Incomplete source palace branches');
 const names=['旬空','副旬','截空','副截','廉贞','禄存','天马','七杀','地空','地劫'];
 for(const name of names){
  const at=[...map.values()].flat().filter(s=>s.name===name).length;
  if(at!==1)throw new Error('Required source star is absent or duplicated: '+name);
 }
 const seen=new Set(),ages=new Set();
 for(const dx of record.daXians){
  if(!dx||!isIntegerBranch(dx.palaceBranch)||seen.has(dx.palaceBranch)||
    !Number.isInteger(dx.startAge)||!Number.isInteger(dx.endAge)||
    dx.startAge<1||dx.endAge<dx.startAge||ages.has(dx.startAge))
   throw new Error('Invalid or duplicated source major-period geometry');
  seen.add(dx.palaceBranch);ages.add(dx.startAge);
 }
 return map;
}
function independentlyEvaluate(record){
 const houses=palaceIndex(record);
 const stars=b=>houses.get(b);
 const has=(b,name)=>stars(b).some(s=>s.name===name);
 const isKong=b=>stars(b).some(s=>VOID.includes(s.name));
 const ming=record.mingGongBranch;
 const luAt=stars(ming).some(s=>s.name==='禄存'||s.siHua==='禄');
 const first=isKong(ming)&&has(ming,'廉贞');
 const second=luAt&&isKong(ming)&&has(ming,'地空')&&has(ming,'地劫');
 const starBranch=name=>{
  for(const [b,items] of houses)if(items.some(s=>s.name===name))return b;
  throw new Error('Source star not placed: '+name);
 };
 const luVoid=isKong(starBranch('禄存'));
 const horseVoid=isKong(starBranch('天马'));
 const majorPeriods=record.daXians.filter(dx=>
  sanFang(dx.palaceBranch).some(branch=>has(branch,'七杀'))&&
  luVoid&&horseVoid
 ).map(dx=>({startAge:dx.startAge,endAge:dx.endAge,palaceBranch:dx.palaceBranch}))
  .sort((x,y)=>x.startAge-y.startAge);
 return Object.freeze({dingPin01:first,dingPin02:second,
  dingZa03:Object.freeze(majorPeriods)});
}
function validateObservation(o,matrix){
 if(!o||o.schema!==SCHEMA||!o.provenance||
  o.provenance.repository!=='Renhuai123/ziwei-doushu'||
  o.provenance.commit!==SOURCE_COMMIT||
  o.provenance.installedIztroVersion!==VERSION||
  o.provenance.syntheticOnly!==true||
  !Array.isArray(o.provenance.functions)||
  JSON.stringify(o.provenance.functions)!==JSON.stringify(['generateChart','detectDingPin','detectDingZa'])||
  !matrix||matrix.schema!==MATRIX||!Array.isArray(matrix.cases)||
  matrix.cases.length!==65||!Array.isArray(o.records)||o.records.length!==65)
  throw new Error('Unpinned or incomplete R29 source observation');
 const cases=new Map(matrix.cases.map(x=>[x.id,x]));
 if(cases.size!==65||new Set(o.records.map(x=>x.id)).size!==65)
  throw new Error('Duplicate case IDs in R29 source observations');
 for(const item of o.records){
  const expected=cases.get(item.id);
  if(!expected||expected.date!==item.solarDate||
   expected.hour!==item.hour||expected.gender!==item.gender||
   expected.kind!==item.kind||!item.detector||
   typeof item.detector.dingPin01!=='boolean'||
   typeof item.detector.dingPin02!=='boolean'||
   !Array.isArray(item.detector.dingZa03))
   throw new Error('Source case values or detector output are missing/altered');
 }
}
function samePeriods(a,b){
 const norm=x=>x.map(p=>[p.startAge,p.endAge,p.palaceBranch]).sort((u,v)=>u[0]-v[0]);
 return JSON.stringify(norm(a))===JSON.stringify(norm(b));
}
function evaluateSourcePatternOracle(o,matrix){
 validateObservation(o,matrix);
 const observations=[],mismatches=[],differences=[];
 for(const item of o.records){
  try{
   const independent=independentlyEvaluate(item);
   if(independent.dingPin01!==item.detector.dingPin01||
      independent.dingPin02!==item.detector.dingPin02||
      !samePeriods(independent.dingZa03,item.detector.dingZa03))
    throw new Error('Pinned source detector disagrees with independent 12-palace predicate');
   const chart=Engine.calculate({date:item.solarDate,hour:item.hour,minute:0,
    gender:item.gender,calendar:'solar'});
   const prior=JSON.stringify(chart),proxy=auditClassicalVoidSemanticGates(chart);
   if(JSON.stringify(chart)!==prior)throw new Error('Local chart was mutated');
   if(proxy.sourceCriterionVerified!==false||
      proxy.semanticEquivalenceVerified!==false||
      proxy.items.length!==3||
      proxy.items.some(x=>x.sourceCriterionVerified!==false))
    throw new Error('Local pattern verdict was incorrectly promoted');
   const localProxy=proxy.items[0].checks[0].state;
   const sourceVoid=independent.dingPin01;
   if(localProxy==='unknown')differences.push({id:item.id,reason:'local-proxy-unknown'});
   observations.push({
    id:item.id,dingPin01:independent.dingPin01,
    dingPin02:independent.dingPin02,dingZa03Periods:independent.dingZa03.length,
    sourceVoidRelated01:sourceVoid,localMenhVoidProxy:localProxy,
    localSourceSemanticEquivalent:false,
    sourceCriterionVerifiedForLocalChart:false
   });
  }catch(e){
   mismatches.push({id:item.id,reason:String(e&&e.message||e)});
  }
 }
 return Object.freeze({
  schema:'thiendo-r29-source-pattern-oracle-report-v1',
  sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  actualSourceDetectorsExecuted:true,syntheticOnly:true,
  total:65,checked:observations.length,failures:mismatches.length,
  counts:Object.freeze({
   dingPin01:observations.filter(x=>x.dingPin01).length,
   dingPin02:observations.filter(x=>x.dingPin02).length,
   dingZa03Periods:observations.reduce((n,x)=>n+x.dingZa03Periods,0)
  }),
  semanticEquivalenceVerified:false,localPatternVerdictsVerified:false,
  limitation:LIMITATION,observations,mismatches,differences
 });
}
if(require.main===module){
 const input=process.argv[2];
 if(!input)throw new Error('Real executed source observation JSON is required');
 const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tests/fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
 const observation=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 const report=evaluateSourcePatternOracle(observation,matrix);
 fs.writeFileSync('.r29-source-pattern-oracle-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R29 source oracle: '+report.checked+'/'+report.total+
  ' checked, '+report.failures+' discrepancies; semantic equivalence remains UNVERIFIED');
 if(report.failures)process.exitCode=1;
}
module.exports=Object.freeze({independentlyEvaluate,validateObservation,evaluateSourcePatternOracle,SCHEMA,LIMITATION});
