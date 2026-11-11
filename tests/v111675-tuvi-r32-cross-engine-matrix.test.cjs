'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {
  SCHEMA,VERSION,SAMPLES,PAIRS,LIMITATION,classify,
  sourceCoordinates,compareRecord,auditCrossEngineMatrix
}=require('../infrastructure/scripts/tuvi-r32-cross-engine-evidence-matrix.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const r29File=path.join(__dirname,'../.r29-source-pattern-oracle-observations.json');
const r30File=path.join(__dirname,'../.r30-source-rare-positive-observations.json');
const matrixFile=path.join(__dirname,'fixtures/tuvi-r27-iztro-cases.json');

test('r32: comparisons explicitly classify source hit versus local proxy, never school equivalence',()=>{
  const expected=[
    [true,'met',true,'both-met-proxy-only'],
    [false,'not-met',true,'both-not-met-proxy-only'],
    [true,'not-met',true,'source-only'],
    [false,'met',true,'local-proxy-only'],
    [true,'unknown',true,'local-unknown'],
    [false,'unknown',true,'local-unknown'],
    [true,'met',false,'different-ming-branch'],
    [false,'not-met',false,'different-ming-branch']
  ];
  for(const [hit,local,aligned,want] of expected)
    assert.equal(classify(hit,local,aligned),want);
  assert.equal(SCHEMA,'thiendo-r32-cross-engine-evidence-report-v1');
  assert.equal(VERSION,'2.6.1');
  assert.equal(SAMPLES,67);
  assert.equal(PAIRS.length,6);
  assert.match(LIMITATION,/không chứng minh hai trường phái/);
});

test('r32: source coordinates require unique star positions and complete four void markers',()=>{
 const p=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
 const add=(name,branch,siHua=null)=>p[branch].stars.push({name,siHua});
 add('旬空',0);add('副旬',1);add('截空',2);add('副截',3);
 add('廉贞',5,'禄');
 add('禄存',4);add('天马',8);
 const record={palaces:p};
 const orig=JSON.stringify(record);
 const res=sourceCoordinates(record);
 assert.deepEqual(res.voidBranches,[0,1,2,3]);
 assert.equal(res.get('廉贞'),5);
 assert.equal(res.huaLoc,5);
 assert.equal(res.get('禄存'),4);
 assert.deepEqual(res.voidNamedBranches,{'旬空':0,'副旬':1,'截空':2,'副截':3});
 assert.equal(JSON.stringify(record),orig);
 // Two pairs of independently named source stars may share two palaces.
 // A branch SET must not falsely differ because four source labels overlap.
 const overlapping=clone(record);
 overlapping.palaces[1].stars=[];
 overlapping.palaces[0].stars.push({name:'副旬',siHua:null});
 overlapping.palaces[3].stars=[];
 overlapping.palaces[2].stars.push({name:'副截',siHua:null});
 const union=sourceCoordinates(overlapping);
 assert.deepEqual(union.voidBranches,[0,2]);
 assert.deepEqual(union.voidNamedBranches,{'旬空':0,'副旬':0,'截空':2,'副截':2});
 const dup=clone(record);
 dup.palaces[6].stars.push({name:'截空',siHua:null});
 assert.equal(sourceCoordinates(dup).voidBranches,null);
 assert.equal(sourceCoordinates(dup).get('截空'),null);
 const missing=clone(record);
 missing.palaces[1].stars=[];
 assert.equal(sourceCoordinates(missing).voidBranches,null);
 const doubleHua=clone(record);
 doubleHua.palaces[7].stars.push({name:'天机',siHua:'禄'});
 assert.equal(sourceCoordinates(doubleHua).huaLoc,null);
});

test('r32: malformed source records cannot silently pass independent source verification',()=>{
 assert.throws(()=>compareRecord({id:'broken',palaces:[],daXians:[]},'r29'));
 const forged={
   provenance:{repository:'Renhuai123/ziwei-doushu',commit:'fake'},
   schema:'thiendo-r29-pinned-source-pattern-observation-v1',records:[]
 };
 assert.throws(()=>auditCrossEngineMatrix(forged,null,{cases:[]}),
  /Unpinned|incomplete|source/);
});

test('r32: no new mapped catalog status, user verdict or mutation',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:0,calendar:'solar',gender:'Nữ'});
 const before=JSON.stringify(chart);
 const natal=auditClassicalPatternCandidates(chart);
 const bridge=auditClassicalDingZaSourceBridge(chart);
 const catalog=summarizeClassicalCatalog([
   ...natal.records.map(x=>x.id),...bridge.mappedIds
 ]);
 assert.equal(catalog.assessed,31);
 assert.equal(catalog.referenceTotal,49);
 assert.deepEqual(bridge.mappedIds,['dinh-tap-01','dinh-tap-02','dinh-tap-08']);
 assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false));
 assert.equal(JSON.stringify(chart),before);
 const source=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r32-cross-engine-evidence-matrix.cjs'),'utf8');
 assert.match(source,/sourceCriterionVerifiedForLocalChart:false/);
 assert.match(source,/semanticEquivalenceVerified:false/);
 assert.match(source,/sourceSchoolParityVerified:false/);
 assert.match(source,/compareRecord\(r,origin\)/);
});

test('r32: genuine source R29 and R30 execution is mandatory only in the pinned CI',()=>{
 if(process.env.THIENDO_R32_REQUIRE_GENUINE!=='1'){
  assert.ok(!fs.existsSync(path.join(__dirname,'fixtures/r32-fabricated-source-evidence.json')));
  return;
 }
 assert.ok(fs.existsSync(r29File),'Missing genuine R29 source runtime capture');
 assert.ok(fs.existsSync(r30File),'Missing genuine R30 rare positive source runtime capture');
 const r29=JSON.parse(fs.readFileSync(r29File,'utf8'));
 const r30=JSON.parse(fs.readFileSync(r30File,'utf8'));
 const matrix=JSON.parse(fs.readFileSync(matrixFile,'utf8'));
 const report=auditCrossEngineMatrix(r29,r30,matrix);
 assert.equal(report.total,67);
 assert.equal(report.checked,67,JSON.stringify(report.errors.slice(0,7)));
 assert.equal(report.failures,0,JSON.stringify(report.errors.slice(0,7)));
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.localPatternVerdictsVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.referenceRuntimeVerified,true);
 assert.equal(report.sampleOrigins.r29,65);
 assert.equal(report.sampleOrigins.r30,2);
 assert.equal(report.records.length,67);
 const countedYearDiff=Object.values(report.counts.affectedSolarYears)
  .reduce((n,x)=>n+x,0);
 assert.ok(countedYearDiff<=67);
 assert.equal(report.counts.placements['void-pair'].unknown,0);
 assert.ok(report.records.every(x=>x.voidCoordinates.sourceNamedBranches&&
  Object.keys(x.voidCoordinates.sourceNamedBranches).length===4));
 assert.ok(report.records.every(x=>x.localPatternVerdictVerified===false&&
  x.sourceCriterionVerifiedForLocalChart===false));
});
