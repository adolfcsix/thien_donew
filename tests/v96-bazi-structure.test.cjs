'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BaZi=require('../packages/astrology-engine/src/bazi.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {tenGod,hiddenStems}=BaZi;
const inputs=[
  {date:'2026-02-19',hour:10,minute:30},
  {date:'2024-02-29',hour:23,minute:59,dayBoundary:'late-zi'},
  {date:'1900-01-01',hour:0},
  {date:'2100-12-31',hour:22}
];
const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const hidden=[[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,6,4],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]];
const tenJia=['Tỷ Kiên','Kiếp Tài','Thực Thần','Thương Quan','Thiên Tài','Chính Tài','Thất Sát','Chính Quan','Thiên Ấn','Chính Ấn'];
const tenYi=['Kiếp Tài','Tỷ Kiên','Thương Quan','Thực Thần','Chính Tài','Thiên Tài','Chính Quan','Thất Sát','Chính Ấn','Thiên Ấn'];

test('V9.6: Giáp Nhật Chủ yields all ten distinct Thập Thần (independent fixed reference)',()=>{
 assert.deepEqual(stems.map((_,i)=>tenGod(0,i)),tenJia);
 assert.equal(new Set(tenJia).size,10);
});
test('V9.6: Ất Nhật Chủ swaps each pair by polarity',()=>{
 assert.deepEqual(stems.map((_,i)=>tenGod(1,i)),tenYi);
});
test('V9.6: all day-master stems have exactly ten distinct roles, including two polarity variants per phase',()=>{
 for(let i=0;i<10;i++){
  const roles=Array.from({length:10},(_,j)=>tenGod(i,j));
  assert.equal(new Set(roles).size,10);
  assert.equal(tenGod(i,i),'Tỷ Kiên');
  assert.equal(tenGod(i,i^1),'Kiếp Tài');
 }
});
test('V9.6: 12 Địa Chi Tàng Can match published primary/middle/residual reference table',()=>{
 assert.deepEqual(hidden.map((_,index)=>hiddenStems(index,0).map(stem=>stem.stemIndex)),hidden);
 assert.equal(hidden.length,12);
});
test('V9.6: Tàng Can includes correct principal qi and fixed element/polarity data',()=>{
 for(let branch=0;branch<12;branch++){
  const list=hiddenStems(branch,0);
  assert.equal(list[0].role,'Chính khí');
  assert.ok(list.length>=1&&list.length<=3);
  list.forEach((x,i)=>{
   assert.equal(x.stem,stems[x.stemIndex]);
   assert.equal(x.polarity,x.stemIndex%2===0?'Dương':'Âm');
   assert.equal(x.tenGod,tenJia[x.stemIndex]);
   assert.equal(x.role,['Chính khí','Khí phụ','Dư khí'][i]);
  });
 }
});
test('V9.6: tables reject invalid stem and branch indices instead of silent wrap',()=>{
 for(const invalid of [NaN,3.2,'0',null,-1,10,100]){
  assert.throws(()=>tenGod(invalid,0),RangeError);
  assert.throws(()=>tenGod(0,invalid),RangeError);
  assert.throws(()=>hiddenStems(0,invalid),RangeError);
 }
 for(const invalid of [NaN,'2',2.2,-1,12,99])assert.throws(()=>hiddenStems(invalid,0),RangeError);
});
test('V9.6: exemplary day Giáp Tý, month Canh Dần, year Bính Ngọ, hour Kỷ Tỵ',()=>{
 const result=BaZi.calculate(inputs[0]);
 assert.equal(result.pillars.year.tenGod,'Thực Thần');
 assert.equal(result.pillars.month.tenGod,'Thất Sát');
 assert.equal(result.pillars.day.tenGod,null);
 assert.equal(result.pillars.hour.tenGod,'Chính Tài');
 assert.deepEqual(result.pillars.day.hiddenStems.map(s=>s.tenGod),['Chính Ấn']);
 assert.deepEqual(result.pillars.month.hiddenStems.map(s=>s.tenGod),['Tỷ Kiên','Thực Thần','Thiên Tài']);
 assert.deepEqual(result.pillars.year.hiddenStems.map(s=>s.tenGod),['Thương Quan','Chính Tài']);
});
test('V9.6: elementCounts remain exactly four visible Heavenly Stems, hidden counts are separate',()=>{
 for(const input of inputs){
  const result=BaZi.calculate(input);
  assert.equal(Object.values(result.elementCounts).reduce((a,b)=>a+b,0),4);
  const totalHidden=Object.values(result.pillars).flatMap(p=>p.hiddenStems).length;
  assert.equal(Object.values(result.hiddenElementCounts).reduce((a,b)=>a+b,0),totalHidden);
  assert.equal(Object.values(result.combinedElementCounts).reduce((a,b)=>a+b,0),4+totalHidden);
  for(const name of Object.keys(result.elementCounts)){
   assert.equal(result.combinedElementCounts[name],result.elementCounts[name]+result.hiddenElementCounts[name]);
  }
  assert.match(result.elementCountNote,/không.*trọng số|không.*vượng suy/i);
 }
});
test('V9.6: bazi original four pillars and lunar calculation not altered compared with known V9.5 regression fixtures',()=>{
 const result=BaZi.calculate(inputs[0]);
 assert.deepEqual(Object.values(result.pillars).map(v=>v.name),['Bính Ngọ','Canh Dần','Giáp Tý','Kỷ Tỵ']);
 assert.equal(result.solarTerm.solarYear,2026);
 assert.equal(result.dayMaster.stem,'Giáp');
 assert.match(result.ruleSet,/v9\.(?:6|7)/); // regression applies to the compatible V9.7 evolution
});
test('V9.6: dayBoundary 23h changes Ten Gods recalculated for new Day Master',()=>{
 const a=BaZi.calculate({date:'2026-02-19',hour:23,dayBoundary:'midnight'});
 const b=BaZi.calculate({date:'2026-02-19',hour:23,dayBoundary:'late-zi'});
 assert.notEqual(a.dayMaster.stem,b.dayMaster.stem);
 assert.notEqual(a.pillars.year.tenGod,b.pillars.year.tenGod);
 assert.equal(b.pillars.year.tenGod,tenGod(b.pillars.day.stemIndex,b.pillars.year.stemIndex));
 assert.deepEqual(b.pillars.day.hiddenStems,hiddenStems(b.pillars.day.branchIndex,b.pillars.day.stemIndex));
});
test('V9.6: annual/lunar engine integration still exposes enhanced Bazi and stable original public calculate',()=>{
 assert.deepEqual(Engine.baziCalculate(inputs[0]),BaZi.calculate(inputs[0]));
 assert.equal(typeof Engine.calculate,'function');
 assert.equal(typeof Engine.calendarDay,'function');
 assert.equal(typeof Engine.goodDaysSearchRange,'function');
});
test('V9.6: frozen reference tables prevent mutation across invocations',()=>{
 assert.equal(Object.isFrozen(BaZi.HIDDEN_STEM_INDICES),true);
 assert.ok(BaZi.HIDDEN_STEM_INDICES.every(Object.isFrozen));
 const a=hiddenStems(2,0);a[0].stemIndex=9;
 assert.equal(hiddenStems(2,0)[0].stemIndex,0);
});
test('V9.6: UI types, Next route, CSS, offline output and README connected',()=>{
 const root=path.join(__dirname,'..');
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert.match(read('packages/astrology-engine/src/index.d.ts'),/hiddenStems:BaZiHiddenStem\[\]/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/result.hiddenElementCounts/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/a.hiddenStems.map/);
 assert.match(read('apps/web/src/app/bazi.css'),/bz-hidden-stems/);
 const html=read('tools/offline/bazi.html');
 assert.match(html,/ThienDoBaZi\.calculate/);
 assert.match(html,/hidden-Mộc/);
 assert.match(html,/year-hidden/);
 assert.match(read('README.md'),/Bát Tự/);
});
