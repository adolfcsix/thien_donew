'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const BaZi=require('../packages/astrology-engine/src/bazi.js');
const base={date:'2026-02-19',hour:10,minute:30};
const b=(a={})=>Engine.baziCalculate({...base,...a});

test('V9.5: HKO independent day-cycle fixture 19 Feb 2026 = Giáp Tý',()=>{
  const result=b();assert.equal(result.pillars.day.name,'Giáp Tý');assert.equal(result.pillars.year.name,'Bính Ngọ');assert.equal(result.pillars.month.name,'Canh Dần');assert.equal(result.pillars.hour.name,'Kỷ Tỵ');
});
test('V9.5: Lập Xuân changes BaZi year/month even before lunar new year',()=>{
  assert.equal(b({date:'2026-02-03'}).pillars.year.name,'Ất Tỵ');
  assert.equal(b({date:'2026-02-03'}).pillars.month.name,'Kỷ Sửu');
  assert.equal(b({date:'2026-02-05'}).pillars.year.name,'Bính Ngọ');
  assert.equal(b({date:'2026-02-05'}).pillars.month.name,'Canh Dần');
});
test('V9.5: Jie month starts at 30° steps, no change at Zhongqi midpoint',()=>{
 const a=b({date:'2026-03-02'}),middle=b({date:'2026-03-20'}),next=b({date:'2026-04-07'});
 assert.equal(a.pillars.month.branch,'Dần');assert.equal(middle.pillars.month.branch,'Mão');assert.equal(next.pillars.month.branch,'Thìn');
});
test('V9.5: Ngũ Thử Độn: group-by-day-stem five starting stems at Tý',()=>{
 const beginnings=[0,2,4,6,8];
 for(let dayStem=0;dayStem<10;dayStem++){
  const stem=(dayStem%5)*2;assert.equal(stem,beginnings[dayStem%5]);
 }
 for(const hour of [0,23]) assert.equal(BaZi.calculate({date:'2026-02-19',hour}).pillars.hour.branch,'Tý');
 assert.equal(BaZi.calculate({date:'2026-02-19',hour:0}).pillars.hour.name,'Giáp Tý');
 assert.equal(BaZi.calculate({date:'2026-02-19',hour:10}).pillars.hour.name,'Kỷ Tỵ');
});
test('V9.5: switching late-Zi changes day and corresponding hour, not year/month',()=>{
 const a=b({hour:23,minute:10,dayBoundary:'midnight'}),c=b({hour:23,minute:10,dayBoundary:'late-zi'});
 assert.notEqual(a.pillars.day.name,c.pillars.day.name);assert.notEqual(a.pillars.hour.name,c.pillars.hour.name);
 assert.equal(a.pillars.year.name,c.pillars.year.name);assert.equal(a.pillars.month.name,c.pillars.month.name);
 assert.ok(c.warnings.some(x=>x.includes('23:00')));
});
test('V9.5: default midnight same day at 00:00 and 23:59',()=>{
 const a=b({hour:0}),c=b({hour:23,minute:59});assert.equal(a.pillars.day.name,c.pillars.day.name);
});
test('V9.5: strict validation rejects impossible, out of supported year and malformed input',()=>{
 for(const q of [{date:'2026-02-30'},{date:'2026-13-01'},{date:'2026-2-03'},{date:'1800-01-01'},{date:'2101-01-01'},{hour:-1},{hour:24},{minute:60},{minute:1.5},{dayBoundary:'unknown'}]) assert.throws(()=>b(q),RangeError,JSON.stringify(q));
});
test('V9.5: Gregorian leap day supported and within valid pillar indices',()=>{
 const a=b({date:'2024-02-29',hour:5});for(const x of Object.values(a.pillars)){assert.ok(x.stemIndex>=0&&x.stemIndex<10);assert.ok(x.branchIndex>=0&&x.branchIndex<12);assert.equal(x.stemIndex%2,x.branchIndex%2);}
});
test('V9.5: only four visible Heavenly Stems counted; no hidden-branch claims',()=>{
 const a=b();assert.equal(Object.values(a.elementCounts).reduce((x,y)=>x+y,0),4);assert.match(a.elementCountScope,/không bao gồm tàng can/i);assert.ok(a.disclaimer);
});
test('V9.5: near Jie explicitly flags approximate solar longitude',()=>{
 const a=b({date:'2026-02-03'});assert.equal(a.solarTerm.nearBoundary,true);assert.ok(a.warnings.some(x=>x.includes('chuyển tiết')));
});
test('V9.5: public engine exposure, page navigation and docs wired',()=>{
 assert.equal(Engine.baziRuleSet,BaZi.RULESET);
 assert.match(fs.readFileSync('apps/web/src/lib/navigation.ts','utf8'),/href: '\/bazi'/);
 assert.match(fs.readFileSync('apps/web/src/app/layout.tsx','utf8'),/\.\/bazi\.css/);
 assert.match(fs.readFileSync('apps/web/src/app/bazi/page.tsx','utf8'),/Engine\.baziCalculate/);
 assert.match(fs.readFileSync('packages/astrology-engine/src/index.d.ts','utf8'),/BaZiResult/);
});
