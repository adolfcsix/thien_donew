'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const {buildInventory}=require('../packages/star-audit/src/index.cjs');
const {comparePeriods}=require('../packages/interpretation/src/period-timeline.cjs');
const {profiles:palaces}=require('../packages/knowledge/src/twelve-palace-study.json');
const guide=require('../packages/knowledge/src/annual-palace-deep-reading-v111494.json');
const baselines=require('../packages/star-audit/fixtures/chart-baselines.json');
const sample=()=>Engine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});
const unique=items=>new Set(items).size===items.length;

test('12 cung x 3 lớp thời gian đều có câu hỏi riêng biệt, không dùng thay phép an sao',()=>{
 assert.equal(Object.keys(guide.palaces).length,12);
 assert.deepEqual(new Set(Object.keys(guide.palaces)),new Set(Object.keys(palaces)));
 const texts=[];
 for(const row of Object.values(guide.palaces))for(const key of ['daiHan','tieuHan','luuThaiTue']){
  assert.ok(row[key].length>85);texts.push(row[key]);
 }
 assert.equal(texts.length,36);assert.ok(unique(texts));
 assert.equal(guide.expertReviewed,false);
});
test('12 sao lưu có hồ sơ riêng, và danh mục đúng sao an bởi engine',()=>{
 const chart=sample(),annual=Engine.annualOverview(chart,2026);
 assert.equal(annual.luuStars.items.length,12);
 assert.deepEqual(new Set(Object.keys(guide.annualStars)),new Set(annual.luuStars.items.map(s=>s.name)));
 assert.ok(Object.values(guide.annualStars).every(v=>v.question.length>65&&v.status==='editorial-unreviewed'));
 assert.ok(!Object.hasOwn(guide.annualStars,'Lưu Thiên Không'));
});
test('kiểm kê 104 tên gốc/vòng sao và 168 ô chính tinh x cung, không cộng sao lưu hoặc Tứ Hóa',()=>{
 const inventory=buildInventory();
 assert.equal(inventory.totals.implementedNatalAndCycleNames,104);
 assert.equal(inventory.totals.mainStars,14);
 assert.equal(inventory.totals.annualStarOverlays,12);
 assert.equal(inventory.totals.natalTransformations,4);
 assert.equal(inventory.totals.annualTransformations,4);
 assert.equal(inventory.totals.editorialProfilesMatched,104);
 for(const name of inventory.records.filter(r=>r.group==='main').map(r=>r.name)){
  for(const palace of Object.keys(palaces))assert.ok(Knowledge.lookupPrimaryStarPalace(name,palace));
 }
});
test('22 lá số baseline: 104 tên/vòng sao không biến thành sao lưu, 12 cung có đúng tên',()=>{
 for(const entry of baselines.cases){
  const chart=Engine.calculate(entry.input),year=Math.min(2100,Math.max(2026,chart.lunar.year));
  const report=comparePeriods(chart,year);
  assert.equal(report.houses.length,12,entry.id);
  assert.ok(unique(report.houses.map(h=>h.palace)),entry.id);
  assert.ok(unique(report.houses.map(h=>h.branchIndex)),entry.id);
  assert.equal(report.natalInventory.placedNameOccurrences,104,entry.id);
  assert.equal(report.houses.reduce((n,h)=>n+h.annualStars.length,0),12,entry.id);
  assert.equal(report.houses.reduce((n,h)=>n+h.annualTransformations.length,0),4,entry.id);
  assert.ok(report.houses.every(h=>h.periodQuestions.every(q=>h.labels.includes(q.label))),entry.id);
 }
});
test('sao gốc và ba vòng không bị lẫn vào sao lưu năm, kể cả tên gần giống',()=>{
 const chart=sample(),a=comparePeriods(chart,2026);
 for(const house of a.houses){
   const ref=chart.houses.find(x=>x.branchIndex===house.branchIndex);
   assert.deepEqual(house.natalGroups.find(g=>g.key==='yearStars')?.names??[],ref.yearStars);
   assert.deepEqual(house.natalCycles.find(g=>g.key==='thaiTue')?.names??[],ref.cycleStars.thaiTue);
   assert.ok(house.annualStudy.every(x=>house.annualStars.includes(x.name)&&x.expertReviewed===false));
 }
 assert.equal(a.natalInventory.layersSeparate,true);
 assert.equal(a.editorial.schoolVerified,false);
});
test('đại hạn, tiểu hạn, lưu thái tuế chỉ hiển thị câu hỏi nếu có vị trí tương ứng',()=>{
 const chart=sample();
 for(const year of [chart.lunar.year,2026,2046,2099]){
  const {selected,houses}=comparePeriods(chart,year);
  assert.equal(houses.flatMap(h=>h.periodQuestions.filter(q=>q.label==='Đại hạn')).length,selected.daiHan?1:0);
  assert.equal(houses.flatMap(h=>h.periodQuestions.filter(q=>q.label==='Tiểu hạn')).length,1);
  assert.equal(houses.flatMap(h=>h.periodQuestions.filter(q=>q.label==='Lưu Thái Tuế')).length,1);
 }
});
test('giao diện phải phân biệt 104 sao gốc/vòng, sao lưu và câu hỏi hạn; không gắn nhãn đã duyệt',()=>{
 const view=readFileSync('apps/web/src/features/chart/components/period-timeline.tsx','utf8');
 for(const token of ['natalStarCount','natalCycles','annualStudy','periodQuestions','Chuyên môn độc lập']){
  if(token==='Chuyên môn độc lập') continue;
  assert.ok(view.includes(token),token);
 }
 assert.ok(view.includes('chưa được thẩm định chuyên môn độc lập'));
});
test('15 bộ môn có hướng dẫn chuyên sâu và giới hạn được trình bày trong thư mục nghiên cứu',()=>{
 const disciplines=require('../packages/knowledge/src/research-disciplines.json').records;
 const audit=require('../infrastructure/scripts/audit-discipline-depth-v111494.cjs').audit();
 assert.equal(disciplines.length,15);assert.equal(audit.rows.length,15);
 for(const row of disciplines){
   assert.equal(row.advancedStudy.expertReviewed,false,row.id);
   for(const key of ['readingMethod','verificationExercise','remainingGap']) assert.ok(row.advancedStudy[key].length>45,row.id+'/'+key);
 }
 const page=readFileSync('apps/web/src/app/research/page.tsx','utf8');
 for(const name of ['advancedStudy.readingMethod','advancedStudy.verificationExercise','advancedStudy.remainingGap'])assert.ok(page.includes(name),name);
});
