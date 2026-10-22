const {test}=require('node:test');
const assert=require('node:assert/strict');
const Y=require('../packages/engine/year-stars.js');
const T=require('../packages/engine/tuvi.js');
const V=require('../packages/engine/verify.js');
// Fixture positions transcribed from independent traditional placement tables.
// branch indexing: Tý 0, Sửu 1, Dần 2, Mão 3, Thìn 4, Tỵ 5,
// Ngọ 6, Mùi 7, Thân 8, Dậu 9, Tuất 10, Hợi 11.
const FIXTURES={
  0:[2,9,4,3,9], 1:[11,6,1,2,8],2:[8,3,10,1,7],3:[5,0,7,0,6],
  4:[2,9,4,11,5],5:[11,6,1,10,4],6:[8,3,10,9,3],7:[5,0,7,8,2],
  8:[2,9,4,7,1],9:[11,6,1,6,0],10:[8,3,10,5,11],11:[5,0,7,4,10]
};
const names=['Thiên Mã','Đào Hoa','Hoa Cái','Hồng Loan','Thiên Hỷ'];
for (const [branch,expected] of Object.entries(FIXTURES)){
  test(`External table — chi ${Y.BRANCHES[branch]} => 5 sao`,()=>{
    const stars=Y.calculate(Number(branch));
    assert.deepEqual(stars.map(x=>x.name),names);
    assert.deepEqual(stars.map(x=>x.branch),expected);
  });
}
test('Year-star boundary rejects nonsensical branch indexes',()=>{
 for(const value of [-1,12,1.2,'1',null,NaN])assert.throws(()=>Y.calculate(value));
});
test('Recorded natal chart: full set counted, unique, transparent validation',()=>{
  const chart=T.calculate({date:'1990-08-15',hour:9,minute:30,gender:'Nam'});
  assert.equal(chart.yearStarRuleSet,Y.RULESET);
  assert.equal(chart.yearStars.length,5);
  assert.equal(chart.auxiliaries.length,9);
  assert.equal(chart.houses.flatMap(h=>h.yearStars).length,5);
  const report=V.check(chart);
  assert.equal(report.passed,true,JSON.stringify(report.checks));
  assert.equal(report.passCount,10);
  assert.ok(report.disclaimer.includes('không phải'));
});
test('Verifier detects corrupted chart instead of claiming a passed test',()=>{
  const original=T.calculate({date:'2004-01-01',hour:8,gender:'Nữ'});
  const corrupted=structuredClone(original);
  corrupted.yearStars[0].branch=17;
  assert.equal(V.check(corrupted).passed,false);
  corrupted.yearStars[0].branch=original.yearStars[0].branch;
  corrupted.houses[0].palace=corrupted.houses[1].palace;
  assert.equal(V.check(corrupted).passed,false);
});
test('Solar and lunar input produce same year-branch stars',()=>{
  const a=T.calculate({date:'2023-03-22',hour:10,gender:'Nữ'});
  const b=T.calculate({date:'2023-02-01',calendar:'lunar',leap:true,hour:10,gender:'Nữ'});
  assert.deepEqual(a.yearStars,b.yearStars);
  assert.deepEqual(a.houses,b.houses);
});
