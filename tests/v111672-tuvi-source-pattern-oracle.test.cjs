'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {independentlyEvaluate,validateObservation,evaluateSourcePatternOracle,SCHEMA,LIMITATION}=
 require('../infrastructure/scripts/tuvi-r29-evaluate-source-oracle.cjs');
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
const observedPath=path.resolve(__dirname,'../.r29-source-pattern-oracle-observations.json');
const clone=x=>JSON.parse(JSON.stringify(x));
function staged(){
 const palaces=Array.from({length:12},(_,branch)=>({branch,stars:[]}));
 const put=(b,name,siHua=null)=>palaces[b].stars.push({name,siHua});
 put(0,'旬空');put(1,'副旬');put(2,'截空');put(3,'副截');
 put(0,'廉贞');put(0,'禄存');put(1,'天马');put(4,'七杀');
 put(0,'地空');put(0,'地劫');
 return {mingGongBranch:0,palaces,
  daXians:Array.from({length:12},(_,b)=>({startAge:2+b*10,endAge:11+b*10,palaceBranch:b}))};
}
test('r29: independent strict source definition requires BOTH void and both killers at Mệnh',()=>{
 const good=staged(),hit=independentlyEvaluate(good);
 assert.equal(hit.dingPin01,true);
 assert.equal(hit.dingPin02,true);
 assert.ok(hit.dingZa03.length>0);
 const notVoid=clone(good);
 notVoid.palaces[0].stars=notVoid.palaces[0].stars.filter(s=>s.name!=='旬空');
 notVoid.palaces[6].stars.push({name:'旬空',siHua:null});
 const a=independentlyEvaluate(notVoid);
 assert.equal(a.dingPin01,false);
 assert.equal(a.dingPin02,false);
 assert.equal(a.dingZa03.length,0);
 const oneKiller=clone(good);
 oneKiller.palaces[0].stars=oneKiller.palaces[0].stars.filter(s=>s.name!=='地劫');
 oneKiller.palaces[7].stars.push({name:'地劫',siHua:null});
 assert.equal(independentlyEvaluate(oneKiller).dingPin02,false);
 assert.equal(independentlyEvaluate(oneKiller).dingPin01,true);
 const notHorse=clone(good);
 notHorse.palaces[1].stars=notHorse.palaces[1].stars.filter(s=>s.name!=='天马');
 notHorse.palaces[5].stars.push({name:'天马',siHua:null});
 assert.equal(independentlyEvaluate(notHorse).dingZa03.length,0);
 const outOfCourt=clone(good);
 outOfCourt.palaces[4].stars=outOfCourt.palaces[4].stars.filter(s=>s.name!=='七杀');
 outOfCourt.palaces[9].stars.push({name:'七杀',siHua:null});
 const periods=independentlyEvaluate(outOfCourt).dingZa03;
 assert.ok(periods.every(p=>[9,1,5,3].includes(p.palaceBranch)));
});
test('r29: malformed/duplicated palace and star inputs fail closed',()=>{
 const good=staged();
 for(const change of [
  x=>x.palaces.pop(),
  x=>x.palaces[0].branch=1,
  x=>x.palaces[0].stars.push({name:'旬空',siHua:null}),
  x=>x.palaces[1].stars=[],
  x=>x.daXians[0].startAge=3,
  x=>x.daXians[0].palaceBranch=12,
  x=>x.mingGongBranch=-1,
  x=>x.palaces[2].stars[0].siHua='bad'
 ]){
  const c=clone(good);change(c);
  assert.throws(()=>independentlyEvaluate(c));
 }
 assert.match(LIMITATION,/Không xác nhận Tuần\/Triệt/);
});
test('r29: source version, 65 distinct original case IDs and genuine detector function names are mandatory',()=>{
 assert.equal(matrix.cases.length,65);
 assert.equal(new Set(matrix.cases.map(x=>x.id)).size,65);
 const fake={schema:SCHEMA,
  provenance:{repository:'Renhuai123/ziwei-doushu',
   commit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
   installedIztroVersion:'2.6.1',
   functions:['generateChart','detectDingPin','detectDingZa'],syntheticOnly:true},
  records:matrix.cases.map(x=>({
   id:x.id,solarDate:x.date,hour:x.hour,gender:x.gender,kind:x.kind,
   detector:{dingPin01:false,dingPin02:false,dingZa03:[]}
  }))
 };
 assert.doesNotThrow(()=>validateObservation(fake,matrix));
 for(const broken of [
  {...fake,provenance:{...fake.provenance,installedIztroVersion:'latest'}},
  {...fake,provenance:{...fake.provenance,functions:['generateChart']}},
  {...fake,records:fake.records.slice(1)},
  {...fake,records:[fake.records[0],...fake.records.slice(0,64)]},
  {...fake,records:fake.records.map((v,i)=>i===0?{...v,solarDate:'1900-01-01'}:v)}
 ])assert.throws(()=>validateObservation(broken,matrix));
});
test('r29: probe runs actual source detectors, uses external-only template and never changes classification',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r29-pattern-source-probe.ts.template'),'utf8');
 const checker=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r29-evaluate-source-oracle.cjs'),'utf8');
 assert.match(src,/import \{detectDingPin\}/);
 assert.match(src,/import \{detectDingZa\}/);
 assert.match(src,/detectDingPin\(c\)/);
 assert.match(src,/detectDingZa\(c\)/);
 assert.match(src,/installedIztroVersion:runtime\.version/);
 assert.match(checker,/semanticEquivalenceVerified:false/);
 assert.match(checker,/localPatternVerdictsVerified:false/);
 const r28=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-void-semantic-gates.cjs'),'utf8');
 assert.match(r28,/sourceCriterionVerified:false/);
 assert.match(r28,/semanticEquivalenceVerified:false/);
});
test('r29: only the isolated pinned-source CI may claim actual detector execution',()=>{
 if(process.env.THIENDO_R29_REQUIRE_GENUINE!=='1'){
  assert.ok(!fs.existsSync(path.join(__dirname,'fixtures/r29-fake-runtime-evidence.json')));
  return;
 }
 assert.ok(fs.existsSync(observedPath),'Missing actual pinned source detector execution');
 const source=JSON.parse(fs.readFileSync(observedPath,'utf8'));
 const report=evaluateSourcePatternOracle(source,matrix);
 assert.equal(report.total,65);
 assert.equal(report.checked,65,JSON.stringify(report.mismatches.slice(0,8)));
 assert.equal(report.failures,0,JSON.stringify(report.mismatches.slice(0,8)));
 assert.equal(report.actualSourceDetectorsExecuted,true);
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.localPatternVerdictsVerified,false);
});
