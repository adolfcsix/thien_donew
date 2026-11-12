'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {
  SCHEMA,VERSION,SAMPLES,PAIRS,LIMITATION,classify,
  sourceCoordinates,auditSourceDefaultVoidPlacement,compareRecord,auditCrossEngineMatrix
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
 const placement=report.counts.sourceDefaultPlacement;
 assert.equal(placement.knownStem,2);
 assert.equal(placement.missingStem,65);
 assert.equal(Object.values(placement.jiekongDefaultDouble).reduce((a,b)=>a+b,0),2);
 assert.equal(Object.values(placement.fuxunPair).reduce((a,b)=>a+b,0),67);
 assert.ok(report.records.every(x=>
  x.sourceDefaultPlacement.sourceSchoolParityVerified===false&&
  x.sourceDefaultPlacement.sourcePlacementVerifiedForLocalChart===false&&
  x.sourceDefaultPlacement.mayDeclarePattern===false));
 assert.ok(report.records.filter(x=>x.origin==='r29')
  .every(x=>x.sourceDefaultPlacement.jiekongDefaultDouble===null));
 assert.deepEqual(Object.keys(report.counts.sourceVoidNames),
  ['旬空','副旬','截路','截空','空亡','副截']);
 for(const x of Object.values(report.counts.sourceVoidNames))
  assert.equal(x.unique+x.absent+x.duplicate,67);
 for(const x of Object.values(report.counts.sourceVoidAliasPairs))
  assert.equal(Object.values(x).reduce((s,n)=>s+n,0),67);
 assert.ok(report.records.every(r=>Object.keys(r.voidCoordinates.sourceAllNamedEntries).length===6));
 assert.ok(report.records.every(x=>x.voidCoordinates.sourceNamedBranches&&
  Object.keys(x.voidCoordinates.sourceNamedBranches).length===4));
 assert.ok(report.records.every(x=>x.localPatternVerdictVerified===false&&
  x.sourceCriterionVerifiedForLocalChart===false));
});

test('r47: six source Void names distinguish absent legacy alias and duplicate name',()=>{
 const palaces=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
 for(const [branch,name] of [[0,'旬空'],[1,'副旬'],[2,'截空'],[3,'副截']])
  palaces[branch].stars.push({name,siHua:null});
 const before=JSON.stringify(palaces),a=sourceCoordinates({palaces});
 assert.deepEqual(Object.keys(a.allNames),['旬空','副旬','截路','截空','空亡','副截']);
 assert.equal(a.allNames['截路'].presence,'absent');
 assert.equal(a.aliasPairs['截路/截空'].status,'normalized-only');
 assert.deepEqual(a.voidBranches,[0,1,2,3]);
 assert.equal(JSON.stringify(palaces),before);
 const old=clone(palaces);old[2].stars[0].name='截路';
 assert.equal(sourceCoordinates({palaces:old}).aliasPairs['截路/截空'].status,'legacy-only');
 assert.equal(sourceCoordinates({palaces:old}).voidBranches,null);
 const both=clone(palaces);both[8].stars.push({name:'截路',siHua:null});
 assert.equal(sourceCoordinates({palaces:both}).aliasPairs['截路/截空'].status,'both-labels');
 const dup=clone(palaces);dup[9].stars.push({name:'截空',siHua:null});
 const duplicate=sourceCoordinates({palaces:dup});
 assert.equal(duplicate.allNames['截空'].presence,'duplicate');
 assert.equal(duplicate.aliasPairs['截路/截空'].status,'ambiguous');
});

test('r48: all ten pinned SOURCE stems give correct default double positions without school parity claim',()=>{
 const {SOURCE_STEMS,auditSourceDoubleJiekongCodeConcordance}=
  require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
 for(let i=0;i<10;i++){
  const formula=auditSourceDoubleJiekongCodeConcordance(SOURCE_STEMS[i]);
  assert.equal(formula.sourceFormulaConcordant,true);
  const palaces=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
  for(const [name,b] of [['旬空',0],['副旬',1],
   ['截空',formula.formulaCodes[0]-1],['副截',formula.formulaCodes[1]-1]])
   palaces[b].stars.push({name,siHua:null});
  const before=JSON.stringify(palaces);
  const actual=auditSourceDefaultVoidPlacement({sourceYearStemIndex:i,palaces});
  assert.equal(actual.jiekongDefaultDouble.status,'matched',SOURCE_STEMS[i]);
  assert.equal(actual.fuxunPair.status,'matched');
  assert.equal(actual.mayDeclarePattern,false);
  assert.equal(actual.sourceSchoolParityVerified,false);
  assert.equal(JSON.stringify(palaces),before);
  const wrong=clone(palaces);
  const jie=wrong.find(p=>p.stars.some(s=>s.name==='截空'));
  const vice=wrong.find(p=>p.stars.some(s=>s.name==='副截'));
  if(jie!==vice){
   const a=jie.stars.find(s=>s.name==='截空'),b=vice.stars.find(s=>s.name==='副截');
   jie.stars=jie.stars.filter(s=>s!==a);
   vice.stars=vice.stars.filter(s=>s!==b);
   jie.stars.push(b);vice.stars.push(a);
   assert.equal(auditSourceDefaultVoidPlacement({sourceYearStemIndex:i,palaces:wrong})
    .jiekongDefaultDouble.status,'different');
  }
 }
});
test('r48: missing SOURCE year-stem is unknown; no fallback to local calendar',()=>{
 const palaces=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
 palaces[0].stars.push({name:'旬空',siHua:null});
 palaces[1].stars.push({name:'副旬',siHua:null});
 const unknown=auditSourceDefaultVoidPlacement({palaces});
 assert.equal(unknown.jiekongDefaultDouble,null);
 assert.equal(unknown.sourceYearStemRecorded,false);
 assert.equal(unknown.fuxunPair.status,'matched');
 for(const index of [-1,10,2.5,'甲'])
  assert.throws(()=>auditSourceDefaultVoidPlacement({palaces,sourceYearStemIndex:index}),RangeError);
 const altered=clone(palaces);
 altered[1].stars=[];
 altered[3].stars.push({name:'副旬',siHua:null});
 assert.equal(auditSourceDefaultVoidPlacement({palaces:altered}).fuxunPair.status,'different');
 altered[3].stars=[];
 assert.equal(auditSourceDefaultVoidPlacement({palaces:altered}).fuxunPair.status,'unknown');
});


test('r52: criterion-specific disagreement ledger is fail-closed and never asserts school equivalence',()=>{
 const {summarizeR52CriterionGaps,DEFINITIONS,tally}=
  require('../infrastructure/scripts/tuvi-r32-r52-criterion-disagreement.cjs');
 assert.deepEqual(DEFINITIONS.map(x=>x.id),['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 assert.deepEqual(tally(['source-only','local-unknown']).sourceOnly,undefined);
 assert.equal(tally(['source-only','local-unknown'])['source-only'],1);
 assert.throws(()=>tally(['verified']),TypeError);
 assert.throws(()=>summarizeR52CriterionGaps(null));
 if(process.env.THIENDO_R32_REQUIRE_GENUINE!=='1')return;
 assert.ok(fs.existsSync(r29File)&&fs.existsSync(r30File),'Source genuine R29/R30 reports required');
 const source=JSON.parse(fs.readFileSync(r29File,'utf8'));
 const rare=JSON.parse(fs.readFileSync(r30File,'utf8'));
 const fixture=JSON.parse(fs.readFileSync(matrixFile,'utf8'));
 const r32=auditCrossEngineMatrix(source,rare,fixture);
 const prior=JSON.stringify(r32),report=summarizeR52CriterionGaps(r32);
 assert.equal(report.sourceChartCount,67);
 assert.equal(report.sourceMajorPeriodComparisons,804);
 assert.equal(report.criteria.length,3);
 assert.deepEqual(report.criteria.map(x=>x.compared),[67,67,804]);
 assert.equal(report.rarePositiveNegativeControlsVerified,true);
 assert.equal(report.genuineReferenceRuntime,true);
 assert.equal(report.sourceCriterionVerified,false);
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.mayIncreaseMapping,false);
 assert.equal(report.mappedConditionResearch,31);
 assert.equal(report.unmapped,18);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.criteria)&&
  report.criteria.every(x=>Object.isFrozen(x)&&
   x.readyForMapping===false&&x.expertReviewed===false&&
   x.sourceCriterionVerifiedForLocalChart===false));
 for(const criterion of report.criteria)
  assert.equal(Object.values(criterion.categoryCounts).reduce((a,b)=>a+b,0),criterion.compared);
 assert.equal(JSON.stringify(r32),prior,'R52 must not mutate R32 evidence');
 const modified=JSON.parse(prior);
 modified.records[0].evidence['dinh-ban-01'].category='both-met-proxy-only';
 // If the true R32 category happens to be this value, force an incompatible one.
 if(modified.records[0].evidence['dinh-ban-01'].category===
    r32.records[0].evidence['dinh-ban-01'].category)
  modified.records[0].evidence['dinh-ban-01'].category='local-unknown';
 assert.throws(()=>summarizeR52CriterionGaps(modified));
 const missing=JSON.parse(prior);missing.records.pop();
 assert.throws(()=>summarizeR52CriterionGaps(missing));
 const promoted=JSON.parse(prior);promoted.semanticEquivalenceVerified=true;
 assert.throws(()=>summarizeR52CriterionGaps(promoted));
 const duplicate=JSON.parse(prior);duplicate.records[1].id=duplicate.records[0].id;
 assert.throws(()=>summarizeR52CriterionGaps(duplicate));
 const unsafePeriod=JSON.parse(prior);
 unsafePeriod.records[0].evidence['dinh-tap-03'].periodComparisons.pop();
 assert.throws(()=>summarizeR52CriterionGaps(unsafePeriod));
 console.log('R52: 67 genuine source charts, 804 major-period proxy comparisons, 3 gated rules');
});
