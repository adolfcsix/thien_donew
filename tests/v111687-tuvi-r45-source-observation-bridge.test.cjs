'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {asFixture,evaluateSourceObservationBridge,SCHEMA,LIMITATION}=
 require('../infrastructure/scripts/tuvi-r45-source-observation-bridge.cjs');
const {independentlyEvaluate,SCHEMA:R29_SCHEMA}=
 require('../infrastructure/scripts/tuvi-r29-evaluate-source-oracle.cjs');
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
const actualPath=path.join(__dirname,'../.r29-source-pattern-oracle-observations.json');
const clone=x=>JSON.parse(JSON.stringify(x));
function staged(){
 const palaces=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
 const add=(branch,name,siHua=null)=>palaces[branch].stars.push({name,siHua});
 add(0,'旬空');add(1,'副旬');add(2,'截空');add(3,'副截');
 add(0,'廉贞');add(0,'禄存');add(1,'天马');add(4,'七杀');
 add(0,'地空');add(0,'地劫');
 return {mingGongBranch:0,palaces,
  daXians:Array.from({length:12},(_,branch)=>({
   startAge:2+branch*10,endAge:11+branch*10,palaceBranch:branch
  }))};
}
function observation(){
 return {schema:R29_SCHEMA,
  provenance:{repository:'Renhuai123/ziwei-doushu',
   commit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
   installedIztroVersion:'2.6.1',
   functions:['generateChart','detectDingPin','detectDingZa'],syntheticOnly:true},
  records:matrix.cases.map(sample=>{
   const data=staged(),expected=independentlyEvaluate(data);
   return {id:sample.id,solarDate:sample.date,hour:sample.hour,
    gender:sample.gender,kind:sample.kind,...data,
    detector:{dingPin01:expected.dingPin01,dingPin02:expected.dingPin02,
     dingZa03:expected.dingZa03}};
  })};
}
test('R45 compares 65 synthetic source detector records without upgrading local parity',()=>{
 const data=observation(),before=JSON.stringify(data);
 const report=evaluateSourceObservationBridge(data,matrix);
 assert.equal(report.schema,SCHEMA);
 assert.equal(report.matched,65);
 assert.equal(report.failures,0);
 assert.equal(report.sourceDetectorFormulaAgreementVerified,true);
 assert.equal(report.sourceEnginePlacementParityWithThienDoVerified,false);
 assert.equal(report.calendarConventionParityVerified,false);
 assert.equal(report.mappedConditionResearch,31);
 assert.equal(report.referenceTotal,49);
 assert.equal(report.mayDeclarePattern,false);
 assert.equal(report.mayIncreaseMapping,false);
 assert.match(LIMITATION,/Tuần\/Triệt/);
 assert.ok(Object.isFrozen(report.items));
 assert.equal(JSON.stringify(data),before);
});
test('R45 source fixture removes null transformation only, not any explicit Hóa Lộc',()=>{
 const data=staged();data.palaces[0].stars.push({name:'文昌',siHua:'禄'});
 const fixture=asFixture(data);
 assert.equal(fixture.palaces[0].stars.find(s=>s.name==='文昌').siHua,'禄');
 assert.equal(fixture.palaces[0].stars.find(s=>s.name==='旬空').siHua,undefined);
 assert.equal(data.palaces[0].stars.find(s=>s.name==='旬空').siHua,null);
});
test('R45 rejects a false source detector assertion without declaring source parity',()=>{
 const fake=observation();
 fake.records[0].detector.dingPin01=!fake.records[0].detector.dingPin01;
 const report=evaluateSourceObservationBridge(fake,matrix);
 assert.equal(report.matched,64);
 assert.equal(report.failures,1);
 assert.equal(report.sourceDetectorFormulaAgreementVerified,false);
 assert.equal(report.mayDeclarePattern,false);
 const missing=observation();
 missing.records[1].detector.dingZa03=[];
 const report2=evaluateSourceObservationBridge(missing,matrix);
 assert.equal(report2.failures,1);
});
test('R45 aborts on wrong version, changed case matrix and missing records',()=>{
 const fake=observation();
 fake.provenance.installedIztroVersion='latest';
 assert.throws(()=>evaluateSourceObservationBridge(fake,matrix));
 const wrong=observation();wrong.records.pop();
 assert.throws(()=>evaluateSourceObservationBridge(wrong,matrix));
 const unknown=observation();unknown.records[0].solarDate='1900-01-01';
 assert.throws(()=>evaluateSourceObservationBridge(unknown,matrix));
});
test('R45 genuine 65-chart source execution requires R29 probe environment',()=>{
 if(process.env.THIENDO_R45_REQUIRE_GENUINE!=='1'){
  assert.equal(fs.existsSync(path.join(__dirname,'fixtures/r45-fake-runtime-evidence.json')),false);
  return;
 }
 assert.ok(fs.existsSync(actualPath),'R29 genuine source output is required');
 const observed=JSON.parse(fs.readFileSync(actualPath,'utf8'));
 const report=evaluateSourceObservationBridge(observed,matrix);
 assert.equal(report.total,65);
 assert.equal(report.matched,65,JSON.stringify(report.mismatches.slice(0,6)));
 assert.equal(report.failures,0,JSON.stringify(report.mismatches.slice(0,6)));
 assert.equal(report.sourceDetectorFormulaAgreementVerified,true);
 assert.equal(report.sourceEnginePlacementParityWithThienDoVerified,false);
});
