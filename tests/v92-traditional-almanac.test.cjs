 'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const cal=require('../packages/astrology-engine/src/almanac.js');const Engine=require('../packages/astrology-engine/src/tuvi.js');
test('V9.2: traditional rule sets exported, distinct from natal chart',()=>{
 assert.equal(cal.RULESET,'almanac-calendar-utc7-v9.2');
 for(const k of ['twelveTruc','daySpirit','twentyEightTu'])assert.equal(typeof Engine[k],'function');
 assert.equal(typeof Engine.calculate,'function');
 const v=cal.dayInfo(2026,10,10);assert.equal(v.ruleSet,cal.RULESET);
 assert.ok(v.truc.ruleSet);assert.ok(v.dayStatus.ruleSet);assert.ok(v.moonMansion.ruleSet);
});
test('V9.2: 12 Trực use monthly solar-term branch and 12 day cycle',()=>{
 assert.deepEqual(cal.TWELVE_TRUC,['Kiến','Trừ','Mãn','Bình','Định','Chấp','Phá','Nguy','Thành','Thu','Khai','Bế']);
 for(let monthBranch=0;monthBranch<12;monthBranch++){
  for(let d=0;d<12;d++) assert.equal(cal.twelveTruc(d,monthBranch).name,cal.TWELVE_TRUC[(d-monthBranch+12)%12]);
  assert.equal(cal.twelveTruc(monthBranch,monthBranch).name,'Kiến');
 }
 assert.throws(()=>cal.twelveTruc(12,1),RangeError);
 assert.throws(()=>cal.twelveTruc(2,-1),RangeError);
});
test('V9.2: day spirits follow the published month groups and 6/12 favorable pattern',()=>{
 assert.equal(cal.TWELVE_DAY_SPIRITS.length,12);
 for(let month=1;month<=12;month++){
  const start=2*((month-1)%6);
  assert.equal(cal.daySpirit(month,start).name,'Thanh Long');
  const days=Array.from({length:12},(_,d)=>cal.daySpirit(month,d));
  assert.equal(days.filter(x=>x.status==='hoang-dao').length,6);
  assert.equal(days.filter(x=>x.status==='hac-dao').length,6);
  if(month>6)assert.deepEqual(days,Array.from({length:12},(_,d)=>cal.daySpirit(month-6,d)));
 }
 assert.throws(()=>cal.daySpirit(0,2),RangeError);
 assert.throws(()=>cal.daySpirit(1,12),RangeError);
});
test('V9.2: independent checks for October 8 and 10, 2026',()=>{
 const oct8=cal.dayInfo(2026,10,8),oct10=cal.dayInfo(2026,10,10);
 assert.equal(oct8.moonMansion.name,'Tỉnh');
 assert.equal(oct10.solar.iso,'2026-10-10');
 assert.equal(oct10.dayCanChi,'Đinh Tỵ');
 assert.equal(oct10.monthCanChi.name,'Mậu Tuất');
 assert.equal(oct10.lunar.month,9);
 assert.equal(oct10.truc.name,'Nguy');
 assert.equal(oct10.moonMansion.name,'Liễu');
 assert.equal(oct10.dayStatus.name,'Minh Đường');
 assert.equal(oct10.dayStatus.label,'Hoàng đạo');
});
test('V9.2: 28 Tú continuous 28-day cycle across leap months and year boundaries',()=>{
 assert.equal(new Set(cal.TWENTY_EIGHT_TU).size,28);
 for(let y of [2024,2025,2026,2027,2100])for(let m=1;m<=12;m++){
  const day=15;
  const base=cal.twentyEightTu(y,m,day);
  const later=new Date(Date.UTC(y,m-1,day+28));
  if(later.getUTCFullYear()>2100) continue;
  assert.equal(base.name,cal.twentyEightTu(later.getUTCFullYear(),later.getUTCMonth()+1,later.getUTCDate()).name);
 }
 assert.equal(cal.twentyEightTu(2026,10,10).group,'Chu Tước');
 assert.throws(()=>cal.twentyEightTu(2026,2,30),RangeError);
});
test('V9.2: each month retains all previous data and three new layers',()=>{
 const m=cal.monthView(2026,10);assert.equal(m.days.length,31);
 for(const day of m.days){
  assert.ok(day.solarTerm.name);assert.equal(day.auspiciousHours.length,6);
  assert.ok(day.truc.name);assert.ok(day.dayStatus.label);assert.ok(day.moonMansion.name);
  assert.equal(day.moonMansion.ruleSet,'28-tu-28day-anchored-2026-10-10-v1');
 }
});
test('V9.2: pages expose source labels and caution instead of a single favorable-day score',()=>{
 const root=path.resolve(__dirname,'..');
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/calendar/page.tsx'),'utf8');
 const types=fs.readFileSync(path.join(root,'packages/astrology-engine/src/index.d.ts'),'utf8');
 const preview=fs.readFileSync(path.join(root,'tools/offline/calendar.html'),'utf8');
 for(const text of ['chosen.truc.name','chosen.dayStatus.label','chosen.moonMansion.name','Không nên dùng riêng một nhãn']) assert.ok(page.includes(text));
 for(const text of ['truc:{name:string','dayStatus:{name:string','moonMansion:{name:string'])assert.ok(types.includes(text));
 assert.ok(preview.includes('Thập Nhị Trực'));
 assert.ok(preview.includes('Nhị Thập Bát Tú'));
 assert.doesNotMatch(page,/\bfetch\(/);
});
