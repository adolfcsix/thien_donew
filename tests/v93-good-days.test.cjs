'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const G=require('../packages/astrology-engine/src/good-days.js');
const A=require('../packages/astrology-engine/src/almanac.js');
const E=require('../packages/astrology-engine/src/tuvi.js');
test('V9.3: independent purpose-based tables include exactly four categories and no conflict',()=>{
 assert.equal(G.RULESET,'good-days-12-truc-purpose-v9.3.0');assert.equal(Object.keys(G.PURPOSES).length,4);
 for(const p of Object.keys(G.PURPOSES)){const {favorable,caution}=G.PURPOSES[p];assert.ok(favorable.length);assert.ok(caution.length);assert.deepEqual(favorable.filter(x=>caution.includes(x)),[]);}
});
test('V9.3: deterministic reason on same data and consistent labels',()=>{
 const d=A.dayInfo(2026,10,10);const a=G.evaluateDay(d,'khai-truong');
 assert.equal(a.grade,'cân-nhắc-theo-trực');assert.equal(a.sourceTruc,'Nguy');assert.equal(a.daySpiritLabel,'Hoàng đạo');assert.equal(a.mixed,true);
 assert.match(a.reasons[1],/đang cho tín hiệu khác/);assert.equal(G.evaluateDay(d,'khai-truong').date,'2026-10-10');
});
test('V9.3: favorable Trực contrasted with Hắc đạo never hidden',()=>{
 const all=G.searchMonth(2026,10,'cuoi-hoi');
 const mixed=all.days.find(d=>d.grade==='thuận-theo-trực' && d.daySpiritLabel==='Hắc đạo');
 assert.ok(mixed);assert.equal(mixed.mixed,true);assert.ok(mixed.reasons.some(x=>x.includes('khác')));
});
test('V9.3: purpose changes classification, not computed ephemeris',()=>{
 const day=A.dayInfo(2026,10,10);const before=JSON.stringify(day);
 const a=G.evaluateDay(day,'dong-tho');const b=G.evaluateDay(day,'xuat-hanh');
 assert.equal(a.date,b.date);assert.equal(a.sourceTruc,b.sourceTruc);assert.equal(JSON.stringify(day),before);
});
test('V9.3: monthly counts must partition all dates',()=>{
 for(const y of [1900,2024,2026,2100])for(const mo of [1,2,10,12])for(const p of Object.keys(G.PURPOSES)){
  const m=G.searchMonth(y,mo,p);assert.equal(m.days.length,A.monthView(y,mo).days.length);
  assert.equal(m.summary.favorable+m.summary.neutral+m.summary.caution,m.days.length);
  assert.equal(new Set(m.days.map(d=>d.date)).size,m.days.length);
 }
});
test('V9.3: invalid purpose/date rejected without undefined results',()=>{
 assert.throws(()=>G.searchMonth(2026,10,'unknown'),RangeError);
 assert.throws(()=>G.searchMonth(2026,13,'cuoi-hoi'),RangeError);
 assert.throws(()=>G.evaluateDay({},'cuoi-hoi'),TypeError);
 assert.throws(()=>G.evaluateDay(A.dayInfo(2026,10,10),'../x'),RangeError);
});
test('V9.3: warns boundary and does not treat 28 Tu as evidence of success',()=>{
 const d=G.evaluateDay(A.dayInfo(2026,2,4),'cuoi-hoi');
 assert.equal(d.nearBoundary,true);
 assert.ok(d.reasons.some(s=>s.includes('chuyển tiết')));
 assert.match(d.reasons.join(' '),/không tham gia xếp nhóm/);
 assert.match(d.disclaimer,/không phải dự báo/);
});
test('V9.3: exported from shared chart engine and typed, no new backend dependency',()=>{
 assert.equal(E.goodDaysRuleSet,G.RULESET);
 assert.deepEqual(E.goodDaysSearchMonth(2026,10,'cuoi-hoi'),G.searchMonth(2026,10,'cuoi-hoi'));
 const defs=fs.readFileSync(path.join(root,'packages/astrology-engine/src/index.d.ts'),'utf8');
 assert.match(defs,/goodDaysSearchMonth/); assert.match(defs,/GoodDayResult/);
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/good-days/page.tsx'),'utf8');
 assert.match(page,/Engine\.goodDaysSearch(?:Month|Range)/); // V9.4 uses superset range lookupassert.doesNotMatch(page,/\bfetch\(/);
 const html=fs.readFileSync(path.join(root,'tools/offline/good-days.html'),'utf8');
 assert.match(html,/ThienDoGoodDays/);assert.match(html,/Không (?:kết luận đây là|xếp hạng) ngày tốt tuyệt đối/);
});
