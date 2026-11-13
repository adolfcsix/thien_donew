'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SCHEMA,IDS,MODES,FAMILY,familyAt,fourModes,buildR61}=
 require('../infrastructure/scripts/tuvi-r32-r61-source-void-family-ablation.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
test('R61 source labels normalize exactly two legacy aliases without inventing six distinct stars',()=>{
 assert.equal(SCHEMA,'thiendo-r61-pinned-source-void-family-ablation-v1');
 assert.deepEqual(IDS,['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 assert.deepEqual(MODES,['both','xun-only','jiekong-only','neither']);
 assert.deepEqual(FAMILY.xun,['旬空','副旬']);
 assert.deepEqual(FAMILY.jiekong,['截空','副截']);
 assert.deepEqual(familyAt(['截路','旬空']).canonicalNames,['截空','旬空']);
 assert.deepEqual(familyAt(['空亡','副旬']).canonicalNames,['副截','副旬']);
 assert.deepEqual(familyAt(['截路']).canonicalNames,familyAt(['截空']).canonicalNames);
 assert.equal(familyAt(['截路']).jiekong,true);
 assert.equal(familyAt(['截路']).xun,false);
 assert.equal(familyAt(['旬空']).xun,true);
 assert.equal(familyAt([]).jiekong,false);
 assert.throws(()=>familyAt(['截路','截空']),/double-count/);
 assert.throws(()=>familyAt(['空亡','副截']),/double-count/);
 assert.throws(()=>familyAt(['旬空','旬空']),/repeated/);
 assert.throws(()=>familyAt(['Tuần']),/unrecognized/);
});
test('R61 source predicate family ablation isolates Xun-only, Jie-only and mixed two-place dependencies',()=>{
 const xun=familyAt(['旬空']);
 const jie=familyAt(['截路']);
 const both=familyAt(['旬空','截空']);
 const none=familyAt([]);
 let natal=fourModes('dinh-ban-01',{liemTrinhAtMing:true},{ming:xun});
 assert.equal(natal.both,true);
 assert.equal(natal['xun-only'],true);
 assert.equal(natal['jiekong-only'],false);
 assert.equal(natal.dependsOnXun,true);
 assert.equal(natal.dependsOnJiekong,false);
 assert.equal(natal.familyOnlyXun,true);
 natal=fourModes('dinh-ban-02',{locOrHuaLocAtMing:true,
  diaKhongAtMing:true,diaKiepAtMing:true},{ming:jie});
 assert.equal(natal.both,true);
 assert.equal(natal['xun-only'],false);
 assert.equal(natal['jiekong-only'],true);
 assert.equal(natal.familyOnlyJiekong,true);
 const mixed=fourModes('dinh-tap-03',{periodBranch:4,sat7InPeriodSanFang:true},
  {loc:xun,horse:jie});
 assert.equal(mixed.both,true);
 assert.equal(mixed.onlyTogether,true);
 assert.equal(mixed['xun-only'],false);
 assert.equal(mixed['jiekong-only'],false);
 const common=fourModes('dinh-tap-03',{periodBranch:4,sat7InPeriodSanFang:true},
  {loc:both,horse:both});
 assert.equal(common.both,true);
 assert.equal(common.onlyTogether,false);
 assert.equal(common.dependsOnXun,false);
 assert.equal(common.dependsOnJiekong,false);
 const absent=fourModes('dinh-tap-03',{periodBranch:4,sat7InPeriodSanFang:true},
  {loc:both,horse:none});
 assert.equal(absent.both,false);
 assert.throws(()=>fourModes('dinh-tap-03',{periodBranch:12,sat7InPeriodSanFang:true},
  {loc:xun,horse:jie}),/geometry/);
 assert.throws(()=>fourModes('not-a-criterion',{},{}),/unknown criterion/);
});
test('R61 genuine 67 source charts, 804 periods, three source-only detector probes stay fail-closed',()=>{
 if(process.env.THIENDO_R32_REQUIRE_GENUINE!=='1')return;
 const r29File=path.resolve(__dirname,'../.r29-source-pattern-oracle-observations.json');
 const r30File=path.resolve(__dirname,'../.r30-source-rare-positive-observations.json');
 const matrixFile=path.resolve(__dirname,'fixtures/tuvi-r27-iztro-cases.json');
 for(const file of [r29File,r30File,matrixFile])
  assert.ok(fs.existsSync(file),'R61 missing actual pinned source data: '+file);
 const a=JSON.parse(fs.readFileSync(r29File,'utf8'));
 const b=JSON.parse(fs.readFileSync(r30File,'utf8'));
 const f=JSON.parse(fs.readFileSync(matrixFile,'utf8'));
 const before=JSON.stringify([a,b,f]);
 const report=buildR61(a,b,f);
 assert.equal(report.genuineSourceDetectorsExecuted,true);
 assert.equal(report.syntheticOnly,true);
 assert.equal(report.sourceCaseCount,67);
 assert.equal(report.sourceMajorPeriodCount,804);
 assert.deepEqual(report.sourceOriginCounts,{r29:65,r30:2});
 assert.deepEqual(report.sourceFourCanonicalNames,['旬空','副旬','截空','副截']);
 assert.equal(report.cases.length,67);
 assert.ok(report.cases.every(x=>x.periods.length===12&&
  x.semanticEquivalenceVerified===false&&x.mayDeclarePattern===false));
 assert.equal(report.criterionCounts['dinh-ban-01'].compared,67);
 assert.equal(report.criterionCounts['dinh-ban-02'].compared,67);
 assert.equal(report.criterionCounts['dinh-tap-03'].compared,804);
 assert.ok(report.criterionCounts['dinh-ban-02'].sourcePositive>=1);
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.mayIncreaseMapping,false);
 assert.equal(report.mappedResearch,31);
 assert.equal(report.referenceTotal,49);
 assert.equal(report.expertReviewed,false);
 assert.equal(JSON.stringify([a,b,f]),before);
 assert.deepEqual(report,buildR61(a,b,f));
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.cases)&&
  Object.isFrozen(report.criterionCounts));
 const badDetector=clone(b);
 badDetector.records[0].detector.dingPin02=!badDetector.records[0].detector.dingPin02;
 assert.throws(()=>buildR61(a,badDetector,f));
 const missing=clone(a);
 missing.records.pop();
 assert.throws(()=>buildR61(missing,b,f));
 const dupe=clone(a);
 dupe.records[1].id=dupe.records[0].id;
 assert.throws(()=>buildR61(dupe,b,f));
 const badAlias=clone(a);
 const record=badAlias.records[0],jie=record.palaces.find(p=>p.stars.some(s=>s.name==='截空'));
 assert.ok(jie,'R61 requires pinned normalized 截空 in genuine default source chart');
 jie.stars.push({name:'截路',siHua:null});
 assert.throws(()=>buildR61(badAlias,b,f));
 console.log('R61 pinned source 67 cases and 804 period comparisons; family removal never authorizes mapping 32/49');
});
