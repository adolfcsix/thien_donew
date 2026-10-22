'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {comparePeriods}=require('../packages/interpretation/src/period-timeline.cjs');
const interpretation=require('../packages/interpretation/src/index.cjs');
const input=(date='2004-05-14',gender='Nam',hour=12)=>({date,calendar:'solar',gender,hour,minute:0});
const example=()=>Engine.calculate(input());

test('V11.20: twelve-year timeline includes the chosen year and exactly 12 distinct consecutive years',()=>{
 const chart=example();const timeline=comparePeriods(chart,2026);
 assert.equal(timeline.selectedYear,2026);
 assert.equal(timeline.years.length,12);
 assert.deepEqual(timeline.years.map(v=>v.year),Array.from({length:12},(_,i)=>2021+i));
 assert.equal(timeline.houses.length,12);
 assert.equal(timeline.houses.reduce((n,h)=>n+h.annualStars.length,0),12);
 assert.equal(timeline.houses.reduce((n,h)=>n+h.annualTransformations.length,0),4);
 assert.equal(timeline.coverage.fullLuuNien,false);
 assert.equal(timeline.coverage.luuNguyet,false);
});
test('V11.20: annual year and individual branch marks reflect engine results exactly',()=>{
 const chart=example();const year=2042;const expected=Engine.annualOverview(chart,year);const actual=comparePeriods(chart,year);
 assert.equal(actual.selected.canChi,expected.canChi);
 assert.equal(actual.selected.ageMu,expected.ageMu);
 assert.equal(actual.selected.tieuHan.branchIndex,expected.tieuHan.branchIndex);
 assert.equal(actual.selected.daiHan?.branchIndex,expected.activeDaiHan?.branchIndex);
 for(const h of actual.houses){
  assert.deepEqual(h.annualStars,expected.luuStars.items.filter(s=>s.branch===h.branchIndex).map(s=>s.name));
  assert.deepEqual(h.annualTransformations,expected.luuTuHoa.items.filter(s=>s.branch===h.branchIndex).map(s=>({name:s.name,star:s.star})));
  assert.equal(h.labels.includes('Tiểu hạn'),expected.tieuHan.branchIndex===h.branchIndex);
  assert.equal(h.labels.includes('Đại hạn'),expected.activeDaiHan?.branchIndex===h.branchIndex);
  assert.equal(h.labels.includes('Lưu Thái Tuế'),expected.luuThaiTueBranchIndex===h.branchIndex);
 }
});
test('V11.20: correct edge ranges near birth-year, 2100 and late birth years',()=>{
 const birth=example();const old=comparePeriods(birth,birth.lunar.year);
 assert.equal(old.years[0].year,birth.lunar.year);
 assert.equal(old.years.length,12);
 const last=comparePeriods(birth,2100);
 assert.equal(last.years.at(-1).year,2100);
 assert.equal(last.years.length,12);
 const late=Engine.calculate(input('2099-10-20'));
 const lateResult=comparePeriods(late,2100);
 assert.equal(lateResult.years.length,2);
 assert.deepEqual(lateResult.years.map(x=>x.year),[2099,2100]);
});
test('V11.20: reject invalid input and out-of-range 1–24 year window',()=>{
 const chart=example();
 for(const year of [NaN,Infinity,2026.5,'2026',chart.lunar.year-1,2101,1899]) assert.throws(()=>comparePeriods(chart,year),RangeError);
 for(const length of [-1,0,25,2.5]) assert.throws(()=>comparePeriods(chart,2026,length),RangeError);
 for(const bogus of [null,{lunar:{year:2004},houses:[]},{lunar:{year:2004},houses:Array.from({length:12},(_,i)=>({branchIndex:0,palace:'Mệnh'}))}]) assert.throws(()=>comparePeriods(bogus,2026),TypeError);
});
test('V11.20: 22 diverse charts retain 12 original houses and annual periods are not mutated',()=>{
 for(let birth=1990;birth<2012;birth++){
   const gender=birth%2?'Nữ':'Nam';const chart=Engine.calculate(input(`${birth}-08-17`,gender, birth%12*2));
   const before=JSON.stringify(chart);
   const current=comparePeriods(chart,2030);
   assert.equal(JSON.stringify(chart),before);
   assert.equal(current.houses.length,12);
   assert.deepEqual(current.houses.map(h=>h.branchIndex),Array.from({length:12},(_,i)=>i));
   for(const year of current.years){
      const standalone=Engine.annualOverview(chart,year.year);
      assert.equal(year.tieuHan.branchIndex,standalone.tieuHan.branchIndex);
      assert.equal(year.luuThaiTue.branchIndex,standalone.luuThaiTueBranchIndex);
      assert.equal(year.annualStarCount,standalone.luuStars.items.length);
      assert.equal(year.annualTransformationCount,standalone.luuTuHoa.items.length);
   }
 }
});
test('V11.20: coincident periods are reported only when branch positions agree',()=>{
 const chart=example();
 for(const year of [2025,2026,2027,2030,2040,2050]){
   const timeline=comparePeriods(chart,year),s=timeline.selected;
   const labels=[['Đại hạn',s.daiHan?.branchIndex],['Tiểu hạn',s.tieuHan.branchIndex],['Lưu Thái Tuế',s.luuThaiTue.branchIndex]];
   const count=labels.filter(([,b])=>b!==undefined).length;
   assert.ok(s.overlaps.length<=count*(count-1)/2);
   for(const over of s.overlaps){
     assert.ok(labels.filter(([n,b])=>b===over.branchIndex&&over.label.includes(n)).length>=2);
   }
 }
});
test('V11.20: comparePeriods exposed via interpretation package and inputs from TypeScript UI',()=>{
 assert.equal(typeof interpretation.comparePeriods,'function');
 const root=readFileSync('apps/web/src/app/layout.tsx','utf8');
 const board=readFileSync('apps/web/src/features/chart/components/chart-board.tsx','utf8');
 const ui=readFileSync('apps/web/src/features/chart/components/period-timeline.tsx','utf8');
 assert.match(root,/period-timeline\.css/);
 assert.match(board,/PeriodTimeline chart=\{result\} year=\{year\}/);
 assert.match(ui,/onYearChange\(item\.year\)/);
 assert.match(ui,/onSelectPalace\(h\.branchIndex\)/);
 assert.match(ui,/aria-expanded=\{expanded\}/);
 assert.match(ui,/timeline\.limitation/);
 // Versioned rules became intentional expert evidence in V11.149.5.
 // Keep the evidence while excluding implementation file paths from the UI.
 assert.match(ui,/e\.ruleSet/);
 assert.match(ui,/period-evidence-source/);
 assert.doesNotMatch(ui,/path:|packages\//);
});
