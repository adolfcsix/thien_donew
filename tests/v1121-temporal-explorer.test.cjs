'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Lunar=require('../packages/astrology-engine/src/lunar.js');
const {listLunarMonths,getHourBranch,getTemporalExplorer}=require('../packages/interpretation/src/temporal-explorer.cjs');
const interpretation=require('../packages/interpretation/src/index.cjs');
const chart=Engine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});

test('V11.21: 2025 leap-six month is separate, ordered and calendrically accurate',()=>{
 const months=listLunarMonths(2025);assert.equal(months.length,13);
 const six=months.findIndex(m=>m.key==='6-0');assert.ok(six>=0);
 assert.equal(months[six+1].key,'6-1');assert.equal(months[six+1].firstSolarDate,'2025-07-25');
 assert.equal(months[six+1].days[0].lunarDay,1);
});
test('V11.21: regular year displays 12 months without phantom leap',()=>{
 const m=listLunarMonths(2026);assert.equal(m.length,12);assert.ok(m.every(x=>!x.leap));
});
test('V11.21: all selectable 2025 lunar days round trip to the same day and leap flag',()=>{
 for(const m of listLunarMonths(2025))for(const d of m.days){const [y,mo,da]=d.solarDate.split('-').map(Number);const actual=Lunar.solarToLunar(y,mo,da);assert.deepEqual(actual,{year:2025,month:m.month,day:d.lunarDay,leap:m.leap});}
});
test('V11.21: reject nonexistent leap month, 31st day, invalid hour',()=>{
 assert.throws(()=>getTemporalExplorer(chart,2026,6,true,1,12),RangeError);
 assert.throws(()=>getTemporalExplorer(chart,2025,6,true,31,12),RangeError);
 assert.throws(()=>getTemporalExplorer(chart,2026,1,false,1,-1),RangeError);
 assert.throws(()=>getHourBranch(24),RangeError);
 assert.throws(()=>listLunarMonths(2101),RangeError);
});
test('V11.21: hour branches are exact two-hour windows with 23h Zi handling',()=>{
 assert.equal(getHourBranch(0).branch,'Tý');assert.equal(getHourBranch(1).branch,'Sửu');
 assert.equal(getHourBranch(22).branch,'Hợi');assert.equal(getHourBranch(23).branch,'Tý');
 assert.match(getHourBranch(23).boundaryNotice,/dị bản/);
 assert.equal(getHourBranch(0).boundaryNotice,null);
 for(let h=0;h<23;h+=2)assert.notEqual(getHourBranch(h).branch,getHourBranch(h+1).branch);
});
test('V11.21: changing month/day/hour leaves the yearly Đại hạn and Tiểu hạn unchanged',()=>{
 const january=getTemporalExplorer(chart,2025,1,false,1,0);
 const leap=getTemporalExplorer(chart,2025,6,true,15,23);
 assert.deepEqual(january.annual,leap.annual);assert.notEqual(january.selected.solarDate,leap.selected.solarDate);
 assert.equal(january.coverage.luuNguyet,false);assert.equal(leap.coverage.luuNhat,false);
 assert.equal(leap.coverage.luuThoi,false);
 assert.ok(!('monthlyPalace' in leap));assert.ok(!('hourlyStars' in leap));
});
test('V11.21: 2100 boundary never invents a solar date after supported calendar range',()=>{
 const months=listLunarMonths(2100);assert.ok(months.length>0);
 assert.ok(months.every(m=>m.days.every(d=>Number(d.solarDate.slice(0,4))<=2100)));
 const partial=months.filter(m=>m.partial);assert.ok(partial.length>0);
 assert.ok(partial.every(m=>m.days.length<29));
 const last=months.at(-1);assert.equal(last.partial,true);
 const temporal=getTemporalExplorer(chart,2100,last.month,last.leap,last.days.length,12);
 assert.equal(temporal.year,2100);
});
test('V11.21: 22 different birth charts do not mutate after choosing a lunar date',()=>{
 for(let birth=1990;birth<2012;birth++){
  const c=Engine.calculate({date:`${birth}-08-17`,calendar:'solar',gender:birth%2?'Nữ':'Nam',hour:(birth%12)*2,minute:0});
  const before=JSON.stringify(c);
  const v=getTemporalExplorer(c,2030,1,false,1,8);
  assert.equal(JSON.stringify(c),before);
  assert.equal(v.annual.tieuHan.branchIndex,Engine.annualOverview(c,2030).tieuHan.branchIndex);
 }
});
test('V11.21: public interface is wired to web without displaying technical rules',()=>{
 assert.equal(typeof interpretation.getTemporalExplorer,'function');
 const layout=readFileSync('apps/web/src/app/layout.tsx','utf8');
 const timeline=readFileSync('apps/web/src/features/chart/components/period-timeline.tsx','utf8');
 const ui=readFileSync('apps/web/src/features/chart/components/temporal-detail.tsx','utf8');
 assert.match(layout,/temporal-detail\.css/);
 assert.match(timeline,/<TemporalDetail key=\{year\} chart=\{chart\} year=\{year\}/);
 assert.match(ui,/onChange=\{e=>\{setMonthKey\(e.target.value\);setDay\(1\);\}\}/);
 assert.match(ui,/Lưu nguyệt, Lưu nhật, Lưu thời chưa được an/);
 assert.doesNotMatch(ui,/ruleSet|sourcePath|referenceUrl/);
});
