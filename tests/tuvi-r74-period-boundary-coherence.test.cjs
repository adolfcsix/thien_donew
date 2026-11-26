'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {comparePeriods}=require('../packages/interpretation/src/period-timeline.cjs');
const {auditClassicalPeriodGeometry}=require('../packages/interpretation/src/classical-period-geometry.cjs');

// Local contract across natal, annual and presentation layers. The dates are
// synthetic, not evidence for a classical school or a prediction.
// Early birth years allow every one of the twelve decades and both outside
// boundaries to be observed within the supported annual range (1900–2100).
for(const gender of ['Nam','Nữ']){
 test('R74 every decade boundary and annual projection: '+gender,()=>{
  let checked=0;
  const birthBranches=new Set();
  for(let year=1901;year<=1912;year++){
   const chart=Engine.calculate({date:year+'-08-15',calendar:'solar',
    gender,hour:(year-1901)*2,minute:0});
   const before=JSON.stringify(chart);
   const geometry=auditClassicalPeriodGeometry(chart);
   assert.equal(geometry.verifiedGeometry,true,geometry.reason);
   birthBranches.add((chart.lunar.year-4)%12);
   const periods=chart.cycles.daiHan;
   assert.equal(periods.length,12);
   const ages=new Set([1,periods[0].fromAge-1,periods.at(-1).toAge+1]);
   for(const period of periods){ages.add(period.fromAge);ages.add(period.toAge);}
   // For Cục 2, the year immediately before the first period is age 1.
   assert.equal(ages.size,chart.cuc.number===2?26:27);
   for(const age of [...ages].sort((a,b)=>a-b)){
    const selected=chart.lunar.year+age-1;
    const label=[year,gender,selected,age].join('/');
    assert.ok(selected<=2100,label);
    const matching=periods.filter(p=>age>=p.fromAge&&age<=p.toAge);
    assert.ok(matching.length<=1,label);
    const expected=matching[0];
    const annual=Engine.annualOverview(chart,selected);
    const timeline=comparePeriods(chart,selected,1);
    assert.equal(annual.ageMu,age,label);
    assert.equal(timeline.selected.ageMu,age,label);
    assert.equal(timeline.years.length,1,label);
    assert.deepEqual(timeline.years[0],timeline.selected,label);
    assert.equal(annual.activeDaiHan?.branchIndex,expected?.branch,label);
    assert.equal(timeline.selected.daiHan?.branchIndex,expected?.branch,label);
    if(expected){
     assert.equal(annual.activeDaiHan.fromAge,expected.fromAge,label);
     assert.equal(annual.activeDaiHan.toAge,expected.toAge,label);
     assert.equal(timeline.selected.daiHan.fromAge,expected.fromAge,label);
     assert.equal(timeline.selected.daiHan.toAge,expected.toAge,label);
    }else{
     assert.equal(annual.activeDaiHan,null,label);
     assert.equal(timeline.selected.daiHan,null,label);
    }
    const ti=(annual.tieuHan.startBranchIndex+
      (gender==='Nam'?1:-1)*(age-1)+12*age)%12;
    assert.equal(annual.tieuHan.branchIndex,ti,label);
    assert.equal(timeline.selected.tieuHan.branchIndex,ti,label);
    assert.equal(annual.luuThaiTueBranchIndex,(selected-4)%12,label);
    assert.equal(timeline.selected.luuThaiTue.branchIndex,annual.luuThaiTueBranchIndex,label);
    assert.equal(timeline.houses.length,12,label);
    const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
    const labels=[['Đại hạn',expected?.branch],['Tiểu hạn',ti],
      ['Lưu Thái Tuế',annual.luuThaiTueBranchIndex]];
    const overlaps=[];
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
     const [a,ab]=labels[i],[b,bb]=labels[j];
     if(ab!==undefined&&ab===bb)overlaps.push({branchIndex:ab,label:a+' và '+b+' cùng cung'});
    }
    assert.deepEqual(timeline.selected.overlaps,overlaps,label);
    for(const h of timeline.houses){
     const natal=byBranch.get(h.branchIndex);
     assert.equal(h.palace,natal.palace,label);
     assert.deepEqual(h.labels,labels.filter(([,b])=>b===h.branchIndex).map(([n])=>n),label);
     assert.deepEqual(h.annualStars,annual.luuStars.items.filter(s=>s.branch===h.branchIndex).map(s=>s.name),label);
     assert.deepEqual(h.annualTransformations,annual.luuTuHoa.items.filter(s=>s.branch===h.branchIndex).map(s=>({name:s.name,star:s.star})),label);
     for(const t of h.annualTransformations)
      assert.ok(natal.stars.includes(t.star)||natal.auxiliaryStars.includes(t.star),label+'/'+t.star);
    }
    assert.equal(timeline.houses.reduce((n,h)=>n+h.annualStars.length,0),12,label);
    assert.equal(timeline.houses.reduce((n,h)=>n+h.annualTransformations.length,0),4,label);
    assert.equal(timeline.coverage.fullLuuNien,false,label);
    assert.equal(timeline.coverage.luuNguyet,false,label);
    assert.equal(timeline.coverage.luuNhat,false,label);
    assert.equal(timeline.coverage.luuThoi,false,label);
    checked++;
   }
   assert.equal(JSON.stringify(chart),before,'natal chart mutated');
  }
  assert.equal(birthBranches.size,12);
  assert.ok(checked>=312&&checked<=324);
  console.log('R74 '+gender+': '+checked+' boundary-year projections, 12 natal charts');
 });
}
