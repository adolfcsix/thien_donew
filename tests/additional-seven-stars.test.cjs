'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const Stars=require('../packages/astrology-engine/src/additional-stars.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const monthFixtures = [
  [1,9,1],[2,10,2],[3,11,3],[4,0,4],[5,1,5],[6,2,6],
  [7,3,7],[8,4,8],[9,5,9],[10,6,10],[11,7,11],[12,8,0],
];
const yearFixtures = [
  [0,6,6],[1,5,7],[2,4,8],[3,3,9],[4,2,10],[5,1,11],
  [6,0,0],[7,11,1],[8,10,2],[9,9,3],[10,8,4],[11,7,5],
];
const place=(month, day=1, year=0, ta=4, huu=10)=>Stars.calculate({lunarMonth:month,lunarDay:day,yearBranch:year,taPhuBranch:ta,huuBatBranch:huu});
test('seven-stars: 12 month fixtures independently tabulated for Hình, Riêu, Y',()=>{
  for(const [month,hinh,rieu] of monthFixtures){
    const stars=place(month);
    assert.deepEqual(stars.slice(0,3).map(s=>s.branch),[hinh,rieu,rieu]);
    assert.deepEqual(stars.slice(0,3).map(s=>s.name),['Thiên Hình','Thiên Riêu','Thiên Y']);
  }
});
test('seven-stars: 12 year-branch fixtures for Khốc/Hư',()=>{
  for(const [year,khoc,hu] of yearFixtures){
    const stars=place(1,1,year);
    assert.deepEqual(stars.slice(3,5).map(s=>s.branch),[khoc,hu]);
  }
});
test('seven-stars: Thai/Toa anchor first lunar day and travel opposite directions',()=>{
  for(let ta=0;ta<12;ta++)for(let huu=0;huu<12;huu++)for(let day=1;day<=30;day++){
    const result=place(6,day,2,ta,huu);
    assert.equal(result[5].branch,(ta+day-1)%12);
    assert.equal(result[6].branch,((huu-(day-1))%12+12)%12);
  }
});
test('seven-stars: reject illegal day, month and branch values with finite integer enforcement',()=>{
  for(const invalid of [0,13,-1,1.5,NaN,Infinity,'2',null])assert.throws(()=>place(invalid));
  for(const invalid of [0,31,-1,1.5,NaN,Infinity,'2',null])assert.throws(()=>place(2,invalid));
  for(const invalid of [-1,12,1.5,NaN,Infinity,'2',null]){
    assert.throws(()=>place(2,1,invalid));assert.throws(()=>place(2,1,1,invalid));assert.throws(()=>place(2,1,1,1,invalid));
  }
});
test('seven-stars: names are unique; 7 rules project once into 12 natal palaces',()=>{
  const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam'});
  assert.equal(chart.additionalStars.length,7);
  assert.equal(new Set(chart.additionalStars.map(s=>s.name)).size,7);
  assert.equal(chart.houses.flatMap(h=>h.additionalStars).length,7);
  assert.equal(chart.houses.flatMap(h=>h.additionalStarDetails).length,7);
  for(const s of chart.additionalStars){
    assert.ok(chart.houses[s.branch].additionalStars.includes(s.name));
    assert.ok(chart.houses[s.branch].additionalStarDetails.some(x=>x.name===s.name && x.ruleSet===Stars.RULESET));
  }
  assert.equal(chart.additionalStarRuleSet,Stars.RULESET);
  assert.equal(chart.coverage.additionalRuleBasedStars,7);
  assert.equal(chart.auxiliaries.length,9);assert.equal(chart.yearStars.length,5);
  assert.equal(chart.houses.flatMap(h=>h.stars).length,14);
});
test('seven-stars: original chart and new stars invariant between equivalent solar/lunar input',()=>{
  const solar=Engine.calculate({date:'2023-03-22',hour:10,gender:'Nữ'});
  const lunar=Engine.calculate({date:'2023-02-01',calendar:'lunar',leap:true,hour:10,gender:'Nữ'});
  assert.deepEqual(solar.additionalStars,lunar.additionalStars);
  assert.deepEqual(solar.houses,lunar.houses);
});
test('seven-stars: SVG export includes new group and escaped labels, and all old star sections',()=>{
  const chart=Engine.calculate({date:'2004-08-15',hour:8,gender:'Nam'});
  const svg=renderChartSvg(chart,'Tên <kiểm thử>');
  assert.match(svg,/Sao bổ sung:/);
  assert.match(svg,/Thiên Hình/);
  assert.match(svg,/Tên &lt;kiểm thử&gt;/);
  assert.match(svg,/Sao năm:/);
});
test('seven-stars: Next board and search index read optional supplementary projection',()=>{
  const chart=readFileSync(join(__dirname,'../apps/web/src/features/chart/components/palace-tile.tsx'),'utf8');
  const search=readFileSync(join(__dirname,'../apps/web/src/features/chart/lib/chart-explorer.ts'),'utf8');
  assert.match(chart,/SAO BỔ SUNG/);
  assert.match(chart,/additionalStars\?\.length/);
  assert.match(search,/\.\.\.\(house\.additionalStars \?\? \[\]\)/);
});

test('seven-stars: chart verifier catches corrupted projection; legacy records remain compatible',()=>{
  const chart=Engine.calculate({date:'2004-08-15',hour:8,gender:'Nam'});
  assert.equal(Verify.check(chart).passed,true);
  const broken=structuredClone(chart);broken.additionalStars[0].branch=(broken.additionalStars[0].branch+1)%12;
  assert.equal(Verify.check(broken).passed,false);
  const old=structuredClone(chart);delete old.additionalStars;delete old.additionalStarRuleSet;
  for(const house of old.houses){delete house.additionalStars;delete house.additionalStarDetails;}
  assert.equal(Verify.check(old).passed,true);
});
