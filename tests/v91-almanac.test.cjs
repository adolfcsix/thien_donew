'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const almanac=require('../packages/astrology-engine/src/almanac.js');
const engine=require('../packages/astrology-engine/src/tuvi.js');
const root=path.join(__dirname,'..');
test('V9.1 engine exposes new calendar fields and preserves former public API',()=>{
 assert.equal(engine.calendarRuleSet,'almanac-calendar-utc7-v9.2');
 assert.equal(typeof engine.calculate,'function');
 for(const name of ['solarTermInfo','solarMonthCanChi','auspiciousHours']) assert.equal(typeof engine[name],'function');
 const d=engine.calendarDay(2026,10,10); assert.equal(d.solarTerm.name,'Hàn Lộ');assert.ok(d.monthCanChi.name);assert.equal(d.auspiciousHours.length,6);
});
test('V9.1 24 solar terms defined exactly once in cyclic order',()=>{
 assert.equal(almanac.SOLAR_TERMS.length,24);assert.equal(new Set(almanac.SOLAR_TERMS).size,24);
 for(const d of [0,15,30,45,90,180,270,315]) assert.ok(almanac.SOLAR_TERMS[d/15]);
});
test('V9.1 solar terms around 2026 Lap Xuan agree with local noon day-level reference',()=>{
 assert.equal(almanac.solarTermInfo(2026,2,3).name,'Đại Hàn');
 assert.equal(almanac.solarTermInfo(2026,2,4).name,'Lập Xuân');
 assert.equal(almanac.solarTermInfo(2026,3,6).name,'Kinh Trập');
 assert.equal(almanac.solarTermInfo(2026,3,21).name,'Xuân Phân');
 assert.equal(almanac.solarMonthCanChi(2026,2,3).name,'Kỷ Sửu');
 assert.equal(almanac.solarMonthCanChi(2026,2,4).name,'Canh Dần');
});
test('V9.1 Gregorian year, lunar year and solar-term year are explicitly distinct',()=>{
 const before=almanac.dayInfo(2026,2,3), after=almanac.dayInfo(2026,2,5);
 assert.equal(before.yearCanChi,'Ất Tỵ');assert.equal(before.monthCanChi.solarYear,2025);
 assert.equal(after.yearCanChi,'Ất Tỵ');assert.equal(after.monthCanChi.solarYear,2026);
});
test('V9.1 every day contains six distinct hour branches, 12-year cycles reuse patterns',()=>{
 for(let branch=0;branch<12;branch++){
  const hs=almanac.auspiciousHours(branch);
  assert.equal(hs.length,6);assert.equal(new Set(hs.map(h=>h.branch)).size,6);
  for(const h of hs)assert.match(h.time,/\d{2}:00/);
  assert.deepEqual(hs,almanac.auspiciousHours((branch+6)%12));
 }
 assert.throws(()=>almanac.auspiciousHours(-1),RangeError);
});
test('V9.1 example 20 September 2026 traditional lucky hours agree with source table',()=>{
 const d=almanac.dayInfo(2026,9,20);
 assert.equal(d.dayCanChi,'Đinh Dậu');
 assert.deepEqual(d.auspiciousHours.map(h=>h.branch),['Tý','Dần','Mão','Ngọ','Mùi','Dậu']);
 assert.equal(d.auspiciousHours[0].time,'23:00–01:00 (qua ngày)');
});
test('V9.1 month lists approximate term transition markers',()=>{
 const m=almanac.monthView(2026,2);
 assert.deepEqual(m.terms.map(x=>x.name),['Lập Xuân','Vũ Thủy']);
 assert.equal(m.days.length,28);
 let n=0;for(let mo=1;mo<=12;mo++)n+=almanac.monthView(2026,mo).terms.length;
 assert.equal(n,24);
});
test('V9.1 no non-lunar assets change the 2026 Tet or traditional festival classifications',()=>{
 const tet=almanac.dayInfo(2026,2,17);
 assert.equal(tet.event,'Tết Nguyên đán');assert.equal(tet.yearCanChi,'Bính Ngọ');
 assert.equal(tet.solarTerm.name,'Lập Xuân');assert.equal(tet.auspiciousHours.length,6);
});
test('V9.1 local-noon approximations warn close to major or minor transitions',()=>{
 assert.equal(almanac.dayInfo(2026,2,4).monthCanChi.nearBoundary,true);
 assert.equal(almanac.dayInfo(2026,2,4).solarTerm.nearBoundary,true);
 const d=almanac.dayInfo(2026,10,10);
 assert.equal(d.solarTerm.nearBoundary,false);
});
test('V9.1 React page, CSS and types are wired without taking birth data to APIs',()=>{
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/calendar/page.tsx'),'utf8');
 const types=fs.readFileSync(path.join(root,'packages/astrology-engine/src/index.d.ts'),'utf8');
 assert.match(page,/chosen\.auspiciousHours\.map/);
 assert.match(page,/grid\.terms\.map/);
 assert.match(page,/chosen\.monthCanChi\.name/);
 assert.match(page,/chuyển tiết/);
 assert.match(types,/nearBoundary:boolean/);
 assert.doesNotMatch(page,/\bfetch\(/);
});
