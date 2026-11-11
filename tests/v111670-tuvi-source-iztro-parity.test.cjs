'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluate,validateObservationShape,requireSingle,
 SOURCE_COMMIT,PINNED_IZTRO,PROBE_SCHEMA,DISCLAIMER}=
 require('../infrastructure/scripts/tuvi-r27-evaluate-parity.cjs');

const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,
 'fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
const observationPath=path.resolve(__dirname,'../.r27-source-iztro-observations.json');

test('r27: all 10 stems x 2 genders x 3 clock hours plus calendar-boundary cases',()=>{
 assert.equal(fixture.schema,'thiendo-r27-public-synthetic-case-matrix-v1');
 assert.equal(fixture.cases.length,65);
 assert.equal(new Set(fixture.cases.map(x=>x.id)).size,65);
 assert.equal(fixture.cases.filter(x=>x.kind==='ten-stem-hour-gender-matrix').length,60);
 assert.equal(fixture.cases.filter(x=>x.kind==='calendar-boundary').length,5);
 for(let y=1984;y<=1993;y++)for(const gender of ['Nam','Nữ'])
  for(const hour of [0,8,22]){
   assert.ok(fixture.cases.some(x=>x.date===y+'-08-15'&&x.gender===gender&&x.hour===hour));
  }
 assert.ok(fixture.cases.some(x=>x.kind==='calendar-boundary'&&x.date==='2020-05-30'));
 assert.ok(fixture.cases.every(x=>x.minute===0&&x.hour!==23));
 assert.match(DISCLAIMER,/không chứng minh tương đương sao/);
});

test('r27: reject missing, duplicate and untrusted source/iztro observations',()=>{
 for(const broken of [null,undefined,{},[],{旬空:[]},{旬空:[0,1]},{旬空:[-1]},{旬空:[12]},{旬空:[0.5]},{旬空:['0']}])
  assert.throws(()=>requireSingle(broken,'旬空'));
 assert.equal(requireSingle({旬空:[0]},'旬空'),0);
 const fake={schema:PROBE_SCHEMA,
  provenance:{sourceCommit:SOURCE_COMMIT,sourceRepository:'Renhuai123/ziwei-doushu',
   iztroVersion:PINNED_IZTRO,syntheticCasesOnly:true},
  records:fixture.cases.map(x=>({id:x.id}))};
 assert.doesNotThrow(()=>validateObservationShape(fake,fixture));
 assert.throws(()=>validateObservationShape({...fake,provenance:{...fake.provenance,iztroVersion:'latest'}},fixture));
 assert.throws(()=>validateObservationShape({...fake,records:fake.records.slice(1)},fixture));
 assert.throws(()=>validateObservationShape({...fake,records:[fake.records[0],...fake.records.slice(0,64)]},fixture));
 assert.throws(()=>validateObservationShape({...fake,provenance:{...fake.provenance,syntheticCasesOnly:false}},fixture));
 assert.throws(()=>evaluate({...fake,records:[]},fixture));
});

test('r27: runnable source probe uses both pinned generateChart and direct raw iztro bySolar',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r27-source-iztro-probe.ts.template'),'utf8');
 const runner=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r27-evaluate-parity.cjs'),'utf8');
 assert.match(source,/from '\.\/lib\/ziwei\/algorithm'/);
 assert.match(source,/from 'iztro'/);
 assert.match(source,/generateChart\(/);
 assert.match(source,/astro\.bySolar\(/);
 assert.match(source,/node_modules\/iztro/);
 assert.match(source,/version!==PINNED_IZTRO/);
 assert.match(runner,/rawIztroToSourcePlacementReproduced/);
 assert.match(runner,/sourceFuxunPostprocessingReproduced/);
 assert.match(runner,/namedPlacementEquivalenceVerified:false/);
 assert.match(runner,/sourceSchoolParityVerified:false/);
 assert.match(runner,/sourceCriterionVerified:false/);
});

test('r27: genuinely executed source probes are mandatory in isolated external-runtime CI only',()=>{
 const mandatory=process.env.THIENDO_R27_REQUIRE_GENUINE==='1';
 if(!mandatory){
  assert.ok(!('sourceRunExecuted' in fixture));
  return;
 }
 assert.ok(fs.existsSync(observationPath),'Pinned runtime source observation file missing');
 const source=JSON.parse(fs.readFileSync(observationPath,'utf8'));
 const report=evaluate(source,fixture);
 assert.equal(report.caseCount,65);
 assert.equal(report.failures,0,JSON.stringify(report.failedCases.slice(0,10)));
 assert.equal(report.sourceConsistent,65);
 assert.equal(report.sourceRunExecuted,true);
 assert.equal(report.namedPlacementEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.sourceCriterionVerified,false);
 assert.equal(report.results.length,65);
 assert.ok(report.results.every(x=>x.sourceFuxunPostprocessingReproduced&&
  x.rawIztroToSourcePlacementReproduced&&x.namedSourceFormulaReproduced));
});
