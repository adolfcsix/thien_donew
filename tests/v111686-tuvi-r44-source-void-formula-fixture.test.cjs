'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {VOID,IDS,evaluatePinnedSourceVoidFixture:run}=require('../packages/interpretation/src/source-void-formula-fixture.cjs');
const make=(rows={},ming=0)=>({
 kind:'source-synthetic-fixture',mingGongBranch:ming,
 palaces:Array.from({length:12},(_,branch)=>({
  branch,stars:(rows[branch]||[]).map(s=>typeof s==='string'?{name:s}:s)
 })),
 periodBranches:Array.from({length:12},(_,i)=>i)
});
test('R44 retains 31/49 and no real-chart authority',()=>{
 assert.deepEqual(VOID,['旬空','副旬','截路','截空','空亡','副截']);
 assert.deepEqual(IDS,['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 const x=run(make());
 assert.deepEqual(x.items.map(i=>i.formulaMatched),[false,false,false]);
 assert.equal(x.sourceCommit,'7922285d947b36610e7e31c232d8f1e2a0d0871d');
 assert.equal(x.mappedConditionResearch,31);
 assert.equal(x.referenceTotal,49);
 assert.equal(x.mayDeclarePattern,false);
 assert.equal(x.mayIncreaseMapping,false);
 assert.ok(Object.isFrozen(x.items[2].periods));
});
test('Source formula 生不逢时 requires both 廉贞 and exact Void at Mệnh',()=>{
 for(const name of VOID){
  assert.equal(run(make({0:['廉贞',name]})).items[0].formulaMatched,true,name);
  assert.equal(run(make({0:['廉贞'],1:[name]})).items[0].formulaMatched,false,name);
 }
 assert.equal(run(make({0:['廉贞','Tuần','Triệt']})).items[0].formulaMatched,false);
});
test('Source formula 禄逢两杀: 禄存 OR 化禄 AND Void AND 地空 AND 地劫',()=>{
 assert.equal(run(make({0:['禄存','旬空','地空','地劫']})).items[1].formulaMatched,true);
 assert.equal(run(make({0:[{name:'文昌',siHua:'禄'},'副截','地空','地劫']})).items[1].formulaMatched,true);
 for(const removed of ['禄存','旬空','地空','地劫']){
  const list=['禄存','旬空','地空','地劫'].filter(x=>x!==removed);
  assert.equal(run(make({0:list})).items[1].formulaMatched,false,removed);
 }
 assert.equal(run(make({0:['禄存','旬空','地空'],1:['地劫']})).items[1].formulaMatched,false);
});
test('Source formula 禄衰马困: both 禄存/天马 at Void, 七杀 in period four courts',()=>{
 const fixture=make({1:['禄存','旬空'],7:['天马','副截'],3:['七杀']});
 const before=JSON.stringify(fixture),rows=run(fixture).items[2].periods;
 assert.deepEqual(rows.filter(row=>row.formulaMatched).map(row=>row.branch),[3,7,9,11]);
 assert.equal(JSON.stringify(fixture),before);
 assert.equal(run(make({1:['禄存','旬空'],7:['天马'],3:['七杀']})).items[2].formulaMatched,false);
 assert.equal(run(make({1:['禄存','旬空'],7:['天马','副截']})).items[2].formulaMatched,false);
});
test('Palace array order is irrelevant; all results address branch rather than array offset',()=>{
 const base=make({0:['廉贞','旬空'],1:['禄存','副旬'],3:['七杀'],
  7:['天马','副截']});
 const expected=run(base);
 const rearranged=JSON.parse(JSON.stringify(base));
 rearranged.palaces.push(...rearranged.palaces.splice(0,2));
 assert.deepEqual(run(rearranged),expected);
 const reverse=JSON.parse(JSON.stringify(base));
 reverse.palaces.reverse();
 assert.deepEqual(run(reverse),expected);
});
test('A relevant source star cannot occupy two branches of a synthetic chart',()=>{
 for(const name of ['廉贞','禄存','天马','七杀','地空','地劫','旬空','副截']){
  assert.throws(()=>run(make({0:[name],1:[name]})),RangeError,name);
 }
});
test('Malformed source fixtures fail closed',()=>{
 assert.throws(()=>run({}),TypeError);
 const d=make();d.palaces[1].branch=0;assert.throws(()=>run(d),RangeError);
 const p=make();p.periodBranches[1]=0;assert.throws(()=>run(p),RangeError);
 const h=make({0:[{name:'廉贞',siHua:'bogus'}]});assert.throws(()=>run(h),TypeError);
 const n=make();n.kind='thiendo-chart';assert.throws(()=>run(n),TypeError);
});
