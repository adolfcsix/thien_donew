'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Audit=require('../packages/astrology-engine/src/tuvi-zi-scenario-audit.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const deepClone=x=>JSON.parse(JSON.stringify(x));
function input(date,hour=23,minute=0,gender='Nam'){
 return {date,hour,minute,gender,calendar:'solar'};
}
function expectedCivilFields(chart) {
 return {
  lunarYear:chart.lunar.year,lunarMonth:chart.lunar.month,
  lunarDay:chart.lunar.day,lunarLeap:chart.lunar.leap,
  yearCanChi:chart.yearCanChi,menh:chart.menh,than:chart.than,
  cuc:chart.cuc.number,ziWei:chart.ziWei,thienPhu:chart.thienPhu
 };
}
test('r37: invalid, ambiguous and out-of-scope inputs fail closed',()=>{
 for(const bad of [
  {},null,{date:'2024-02-09',hour:23,minute:0,gender:'khác'},
  input('2024-02-30'),input('2024-13-01'),
  input('2023-02-29'),input('1899-12-31'),input('2101-01-01'),
  input('2024-02-09',24),input('2024-02-09',-1),
  input('2024-02-09',23,60),input('2024-02-09',23,-1),
  {...input('2024-02-09'),calendar:'lunar'},
  {...input('2024-02-09'),date:'2024-2-9'}
 ])assert.throws(()=>Audit.evaluate(bad),RangeError,JSON.stringify(bad));
 assert.equal(Audit.nextDay('2024-02-09'),'2024-02-10');
 assert.equal(Audit.nextDay('2024-12-31'),'2025-01-01');
});
test('r37: 23:00 and 23:59 compare exact source dates without modifying input',()=>{
 for(const date of ['2020-05-22','2023-03-21','2024-02-09','2025-01-28']){
  for(const minute of [0,59]){
   for(const gender of ['Nam','Nữ']){
    const request=input(date,23,minute,gender),before=JSON.stringify(request);
    const report=Audit.evaluate(request);
    assert.equal(JSON.stringify(request),before);
    assert.equal(report.schema,Audit.SCHEMA);
    assert.equal(report.eligible,true);
    assert.equal(report.candidateAvailable,true);
    assert.equal(report.candidateDate,Audit.nextDay(date));
    assert.equal(report.comparison.coreStarCount,14);
    assert.deepEqual(Object.keys(report.sameDay).filter(x=>x!=='mainStars').sort(),
      Object.keys(report.nextDay).filter(x=>x!=='mainStars').sort());
    const a=Engine.calculate(request),b=Engine.calculate({...request,date:report.candidateDate});
    const snapshotA=expectedCivilFields(a),snapshotB=expectedCivilFields(b);
    for(const [key,v] of Object.entries(snapshotA))assert.deepEqual(report.sameDay[key],v);
    for(const [key,v] of Object.entries(snapshotB))assert.deepEqual(report.nextDay[key],v);
    for(const [name,cell] of Object.entries(report.comparison.coreStars)){
      assert.equal(cell.sameDay,report.sameDay.mainStars[name]);
      assert.equal(cell.nextDay,report.nextDay.mainStars[name]);
      assert.equal(cell.same,cell.sameDay===cell.nextDay);
    }
    assert.deepEqual(report.comparison.changedFields,
     Audit.FIELDS.filter(k=>report.sameDay[k]!==report.nextDay[k]));
    assert.deepEqual(report.comparison.changedCoreStars,
     Object.keys(report.comparison.coreStars).filter(k=>!report.comparison.coreStars[k].same));
    assert.ok(Object.isFrozen(report.sameDay));
    assert.ok(Object.isFrozen(report.sameDay.mainStars));
    assert.equal(report.productionPolicyUnchanged,true);
    assert.equal(report.selectedPolicy,'current-day');
    assert.equal(report.sourceSchoolEquivalenceVerified,false);
    assert.equal(report.astroTimezoneVerified,false);
   }
  }
 }
});
test('r37: 00:00/22:59 are ineligible; engine day and all stars are unchanged',()=>{
 for(const hour of [0,1,12,22]){
  const t=input('2024-02-09',hour,59,'Nữ'),before=JSON.stringify(t);
  const result=Audit.evaluate(t);
  assert.equal(result.eligible,false);
  assert.equal(result.candidateAvailable,false);
  assert.equal(result.candidateDate,null);
  assert.equal(result.comparison,null);
  assert.equal(result.nextDay,undefined);
  assert.equal(result.sameDay.lunarDay,Engine.calculate(t).lunar.day);
  assert.equal(JSON.stringify(t),before);
 }
});
test('r37: 2100 year boundary never silently supplies an unsupported candidate',()=>{
 const r=Audit.evaluate(input('2100-12-31',23,59));
 assert.equal(r.eligible,true);
 assert.equal(r.candidateAvailable,false);
 assert.equal(r.candidateDate,null);
 assert.equal(r.comparison,null);
 assert.match(r.reason,/2100/);
});
test('r37: deterministic comparison of mixed major-star and palace changes',()=>{
 const a=Object.freeze({lunarYear:2024,lunarMonth:1,lunarDay:1,lunarLeap:false,
  yearCanChi:'Giáp Thìn',menh:'Tý',than:'Tỵ',cuc:2,ziWei:'Dần',thienPhu:'Thân',
  mainStars:Object.freeze({'Tử Vi':'Dần','Thiên Phủ':'Thân'})});
 const b=Object.freeze({...a,lunarDay:2,ziWei:'Mão',
  mainStars:Object.freeze({'Tử Vi':'Mão','Thiên Phủ':'Thân'})});
 const result=Audit.compareChartSummaries(a,b);
 assert.deepEqual(result.changedFields,['lunarDay','ziWei']);
 assert.deepEqual(result.changedCoreStars,['Tử Vi']);
 assert.equal(result.coreStarCount,2);
 assert.equal(result.coreStars['Thiên Phủ'].same,true);
 assert.deepEqual(Audit.compareChartSummaries(a,a).changedFields,[]);
});
test('r37: original engine outputs are identical before and after many audit calls',()=>{
 const seeds=[input('2020-05-22',23,0),input('2024-02-09',22,59),input('2025-01-28',23,59,'Nữ')];
 const before=seeds.map(s=>deepClone(Engine.calculate(s)));
 for(let i=0;i<4;i++)for(const seed of seeds)Audit.evaluate(seed);
 const after=seeds.map(s=>deepClone(Engine.calculate(s)));
 assert.deepEqual(after,before);
 assert.equal(Audit.LIMITATION.includes('Không tự đổi ngày lập lá số'),true);
 assert.equal(summarizeClassicalCatalog([]).referenceTotal,49);
});
