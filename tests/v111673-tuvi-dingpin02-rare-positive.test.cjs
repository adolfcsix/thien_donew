'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SCHEMA,IZTRO,MAX_SEARCH,LIMITATION,validate,auditRealPositive}=
 require('../infrastructure/scripts/tuvi-r30-audit-rare-positive.cjs');
const {independentlyEvaluate}=require('../infrastructure/scripts/tuvi-r29-evaluate-source-oracle.cjs');
const observed=path.join(__dirname,'../.r30-source-rare-positive-observations.json');
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
function sourceShape(){
 const p=staged(),n=clone(p);
 n.palaces[0].stars=n.palaces[0].stars.filter(s=>s.name!=='地空');
 n.palaces[5].stars.push({name:'地空',siHua:null});
 const record=(x,id,role,hour,positive)=>({
  id,role,solarDate:'1984-08-15',gender:'Nam',clockHour:hour,
  sourceHourBranch:Math.floor(((hour+1)%24)/2),sourceYearStemIndex:0,
  ...x,detector:{dingPin01:true,dingPin02:positive,dingZa03:independentlyEvaluate(x).dingZa03}
 });
 return {
  schema:SCHEMA,provenance:{repository:'Renhuai123/ziwei-doushu',
   sourceCommit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
   iztroVersion:IZTRO,detector:'detectDingPin',sourceGenerator:'generateChart',
   syntheticOnly:true,deterministicSearch:true},
  search:{scanned:42,maxSearch:MAX_SEARCH,years:[1984,1999],months:[1,12],
   days:[1,28],genders:['male','female'],sourceHourBranches:[0,6],
   controlHourShifted:true,positiveFound:true},
  records:[record(p,'source-positive-1','positive',0,true),
   record(n,'hour-shift-negative-1','negative',2,false)]
 };
}
test('r30: strict rare positive requires Lộc, void, Địa Không AND Địa Kiếp at Mệnh',()=>{
 const input=staged();
 assert.equal(independentlyEvaluate(input).dingPin02,true);
 for(const name of ['禄存','旬空','地空','地劫']){
  const c=clone(input);
  c.palaces[0].stars=c.palaces[0].stars.filter(s=>s.name!==name);
  c.palaces[7].stars.push({name,siHua:null});
  assert.equal(independentlyEvaluate(c).dingPin02,false,name);
 }
 const hua=clone(input);
 hua.palaces[0].stars=hua.palaces[0].stars.filter(s=>s.name!=='禄存');
 hua.palaces[7].stars.push({name:'禄存',siHua:null});
 hua.palaces[0].stars.find(s=>s.name==='廉贞').siHua='禄';
 assert.equal(independentlyEvaluate(hua).dingPin02,true);
});
test('r30: exact positive and hour-shift negative metadata, 5000-cap search gate',()=>{
 const o=sourceShape();
 assert.doesNotThrow(()=>validate(o));
 for(const change of [
  x=>{x.provenance.iztroVersion='latest';},
  x=>{x.search.scanned=5001;},
  x=>{x.search.positiveFound=false;},
  x=>{x.records[0].detector.dingPin02=false;},
  x=>{x.records[1].clockHour=12;},
  x=>{x.records[1].solarDate='1984-08-16';},
  x=>{x.records[0].sourceHourBranch=4;},
  x=>{x.records.pop();}
 ]){
  const bad=clone(o);change(bad);assert.throws(()=>validate(bad));
 }
 assert.equal(MAX_SEARCH,5000);
});
test('r30: the source-only scan is deterministic and refuses to invent a positive',()=>{
 const p=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r30-source-rare-positive-probe.ts.template'),'utf8');
 assert.match(p,/generateChart\(/);
 assert.match(p,/detectDingPin\(/);
 assert.match(p,/detectDingZa\(/);
 assert.match(p,/scanned>=MAX_SEARCH/);
 assert.match(p,/NO_SOURCE_POSITIVE_WITHIN_SEARCH_LIMIT/);
 assert.match(p,/negative\.detector\.dingPin02/);
 assert.match(p,/sourceHourBranches:\[0,6\]/);
 assert.match(LIMITATION,/không xác nhận tương đương ý nghĩa/);
});
test('r30: independent source oracle verifies negative controls without promoting local school verdict',()=>{
 const o=sourceShape(),x=clone(o);
 assert.doesNotThrow(()=>validate(x));
 const positive=independentlyEvaluate(x.records[0]);
 const negative=independentlyEvaluate(x.records[1]);
 assert.equal(positive.dingPin02,true);
 assert.equal(negative.dingPin02,false);
 const source=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r30-audit-rare-positive.cjs'),'utf8');
 assert.match(source,/semanticEquivalenceVerified:false/);
 assert.match(source,/localPatternVerdictVerified:false/);
 assert.match(source,/sourceCriterionVerifiedForLocalChart:false/);
 const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
 assert.equal(summarizeClassicalCatalog([]).referenceTotal,49);
});
test('r30: source actual positive+negative must be generated in isolated pinned runtime CI',()=>{
 if(process.env.THIENDO_R30_REQUIRE_GENUINE!=='1'){
  assert.ok(!fs.existsSync(path.join(__dirname,'fixtures/r30-fabricated-source-observation.json')));
  return;
 }
 assert.ok(fs.existsSync(observed),'Source generated R30 evidence missing');
 const o=JSON.parse(fs.readFileSync(observed,'utf8'));
 const result=auditRealPositive(o);
 assert.equal(result.checked,2,JSON.stringify(result.issues));
 assert.equal(result.positiveCount,1);
 assert.equal(result.negativeCount,1);
 assert.equal(result.failures,0,JSON.stringify(result.issues));
 assert.equal(result.semanticEquivalenceVerified,false);
 assert.equal(result.localPatternVerdictVerified,false);
 assert.equal(result.actualPinnedSourceExecuted,true);
});
