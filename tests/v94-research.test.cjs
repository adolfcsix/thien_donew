'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../packages/astrology-engine/src/good-days.js');
const E=require('../packages/astrology-engine/src/tuvi.js');
const A=require('../packages/astrology-engine/src/almanac.js');
const X=require('../packages/good-days-export/src/index.js');
const project=path.resolve(__dirname,'..');

test('V9.4: 1-month range reproduces the prior searchMonth exactly',()=>{
 for(const p of Object.keys(G.PURPOSES))for(const month of [1,2,10,12]){
  const monthV93=G.searchMonth(2026,month,p);
  const range=G.searchRange(2026,month,1,p);
  assert.deepEqual(range.allDays,monthV93.days);
  assert.deepEqual(range.days,range.allDays);
  assert.equal(range.summary.favorable,monthV93.summary.favorable);
 }
});
test('V9.4: 3 and 6 month ranges preserve date order and have no gaps or duplicates',()=>{
 for(const count of [3,6]){
  const r=G.searchRange(2026,10,count,'cuoi-hoi');
  const dates=r.allDays.map(d=>d.date);
  assert.ok(dates.length>=90 && dates.length<=186);
  assert.deepEqual([...dates].sort(),dates);
  assert.equal(new Set(dates).size,dates.length);
  assert.equal(r.total,dates.length);
  assert.equal(r.summary.favorable+r.summary.neutral+r.summary.caution,r.total);
  assert.equal(r.monthsCovered.length,count);
 }
});
test('V9.4: filters operate on evidence but do not alter classification',()=>{
 const base=G.searchRange(2026,10,3,'khai-truong');
 for(const filter of G.FILTERS){
  const r=G.searchRange(2026,10,3,'khai-truong',filter);
  assert.equal(r.total,base.total);assert.equal(r.summary.favorable,base.summary.favorable);
  assert.equal(r.matches,r.days.length);
  assert.ok(r.days.every(d=>base.allDays.find(b=>b.date===d.date)?.grade===d.grade));
  if(filter==='mixed')assert.ok(r.days.every(d=>d.mixed));
  if(filter==='boundary')assert.ok(r.days.every(d=>d.nearBoundary));
 }
});
test('V9.4: period navigation through New Year stays in 1900–2100',()=>{
 const r=G.searchRange(2026,12,3,'xuat-hanh');
 assert.deepEqual(r.monthsCovered,[{year:2026,month:12},{year:2027,month:1},{year:2027,month:2}]);
 assert.equal(r.allDays.at(-1).date,'2027-02-28');
 assert.equal(G.searchRange(2100,7,6,'xuat-hanh').allDays.at(-1).date,'2100-12-31');
 assert.throws(()=>G.searchRange(2100,8,6,'cuoi-hoi'),RangeError);
 assert.throws(()=>G.searchRange(1899,12,1,'cuoi-hoi'),RangeError);
});
test('V9.4: invalid period, purpose, filter and decimals rejected',()=>{
 for(const n of [0,-1,7,2.4,'3'])assert.throws(()=>G.searchRange(2026,10,n,'cuoi-hoi'),RangeError);
 assert.throws(()=>G.searchRange(2026,10,1,'khong-co'),RangeError);
 assert.throws(()=>G.searchRange(2026,10,1,'cuoi-hoi','../../'),RangeError);
 assert.throws(()=>G.searchRange(2026,0,1,'cuoi-hoi'),RangeError);
});
test('V9.4: compare 1–3 selected days without ranking and no external dates',()=>{
 const r=G.searchRange(2026,10,3,'cuoi-hoi','favorable');
 const dates=r.allDays.slice(0,3).map(d=>d.date);
 const result=G.compareDays(r,dates);
 assert.deepEqual(result.map(d=>d.date),dates);
 assert.deepEqual(result.map(d=>d.truc),r.allDays.slice(0,3).map(d=>d.sourceTruc));
 assert.ok(result.every(d=>!Object.hasOwn(d,'score')));
 assert.throws(()=>G.compareDays(r,dates.concat('2026-11-19')),RangeError);
 assert.throws(()=>G.compareDays(r,[dates[0],dates[0]]),RangeError);
 assert.throws(()=>G.compareDays(r,['2099-01-01']),RangeError);
 assert.throws(()=>G.compareDays({},[dates[0]]),TypeError);
});
test('V9.4: CSV carries BOM, quotation, Vietnamese labels and CRLF',()=>{
 const r=G.searchRange(2026,10,1,'khai-truong','mixed');
 const csv=X.toCsv(r.days);
 assert.equal(csv.charCodeAt(0),0xfeff);
 assert.ok(csv.includes('"Hoàng/Hắc đạo"'));
 assert.ok(csv.includes('"Trực Nguy"')===false); // column only contains name
 assert.equal(csv.trimEnd().split('\r\n').length,r.days.length+1);
 assert.match(csv,/\r\n/);
});
test('V9.4: CSV escapes quote, newline and spreadsheet formulas',()=>{
 assert.equal(X.cell('a"b'),'"a""b"');
 assert.equal(X.cell('=SUM(A1:A2)'),`"'=SUM(A1:A2)"`);
 assert.equal(X.cell('\t+99'),`"'\t+99"`);
 assert.equal(X.cell('@foo'),`"'@foo"`);
 assert.equal(X.cell('-1'),`"'-1"`);
 const day=G.searchRange(2026,10,1,'cuoi-hoi').days[0];
 const malicious={...day,purposeLabel:'=HYPERLINK("bad")',daySpirit:'test\r\nnew'};
 const csv=X.toCsv([malicious]);
 assert.ok(csv.includes(`"'=HYPERLINK(""bad"")"`));
 assert.ok(csv.includes('"test\r\nnew"'));
});
test('V9.4: CSV rejects malformed dates and excessive untrusted rows',()=>{
 const d=G.searchRange(2026,10,1,'cuoi-hoi').days[0];
 assert.throws(()=>X.toCsv(new Array(187).fill(d)),RangeError);
 assert.throws(()=>X.toCsv([{...d,date:'evil.csv'}]),TypeError);
});
test('V9.4: exported API and TypeScript declaration remain in sync',()=>{
 const date=E.goodDaysSearchRange(2026,10,1,'cuoi-hoi').days[0];
 assert.equal(date.date,G.searchRange(2026,10,1,'cuoi-hoi').days[0].date);
 const declaration=fs.readFileSync(path.join(project,'packages/astrology-engine/src/index.d.ts'),'utf8');
 assert.match(declaration,/goodDaysSearchRange/);
 assert.match(declaration,/goodDaysCompare/);
 const page=fs.readFileSync(path.join(project,'apps/web/src/app/good-days/page.tsx'),'utf8');
 assert.match(page,/Engine.goodDaysSearchRange/);
 assert.match(page,/Exporter.toCsv/);
 assert.doesNotMatch(page,/\bfetch\(/);
 const html=fs.readFileSync(path.join(project,'tools/offline/good-days.html'),'utf8');
 assert.match(html,/ThienDoGoodDaysExport/);
 assert.match(html,/G.compareDays\(/);
});
test('V9.4: calendar/GoodDays classification unchanged for reference dates',()=>{
 const a=A.dayInfo(2026,10,10);assert.equal(a.truc.name,'Nguy');
 const result=G.searchRange(2026,10,1,'khai-truong');
 const day=result.days.find(d=>d.date==='2026-10-10');
 assert.equal(day.grade,'cân-nhắc-theo-trực');assert.equal(day.mixed,true);
});
