"use strict";
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../packages/astrology-engine/src/tuvi.js');
const lunar = require('../packages/astrology-engine/src/lunar.js');
const calendar = require('../packages/astrology-engine/src/almanac.js');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V9.0: source public API exposed without breaking chart engine',()=>{
  assert.match(engine.calendarRuleSet,/^almanac-calendar-utc7-v9\.[012]$/);
  assert.equal(typeof engine.calculate,'function');
  assert.equal(typeof engine.calendarDay,'function');
  assert.equal(typeof engine.calendarMonth,'function');
  assert.equal(typeof engine.calendarLunarToSolar,'function');
});

test('V9.0: Tet dates independently cross-checked with Vietnamese public holiday schedules',()=>{
  for (const [year,month,day] of [[2024,2,10],[2025,1,29],[2026,2,17],[2027,2,6]]) {
    const result=calendar.dayInfo(year,month,day);
    assert.deepEqual(result.lunar,{year,month:1,day:1,leap:false});
    assert.equal(result.event,'Tết Nguyên đán');
  }
  assert.equal(calendar.dayInfo(2026,2,16).event,null);
});

test('V9.0: month has Gregorian day count and Monday-aligned weekday offset',()=>{
  const a=calendar.monthView(2026,10);
  assert.equal(a.days.length,31);
  assert.equal(a.startOffset,3); // 2026-10-01 is Thursday
  assert.equal(a.days[0].solar.iso,'2026-10-01');
  assert.equal(a.days[30].solar.iso,'2026-10-31');
  const b=calendar.monthView(2024,2);
  assert.equal(b.days.length,29);
  assert.equal(b.days[9].event,'Tết Nguyên đán');
});

test('V9.0: consecutive day Can Chi increments by 1 mod 10 and 12',()=>{
  const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const a=calendar.monthView(2026,10).days;
  for(let i=1;i<a.length;i++){
    const [sa,ba]=a[i-1].dayCanChi.split(' '),[sb,bb]=a[i].dayCanChi.split(' ');
    assert.equal(stems[(stems.indexOf(sa)+1)%10],sb);
    assert.equal(branches[(branches.indexOf(ba)+1)%12],bb);
  }
});

test('V9.0: leap month is preserved, festivals are not wrongly labeled in leap months',()=>{
  let found;
  for(let y=2023;y<=2035&&!found;y++)for(let m=1;m<=12&&!found;m++){
    try{const solar=lunar.lunarToSolar(y,m,1,true);found={y,m,solar};}catch{}
  }
  assert.ok(found,'leap month should exist in this range');
  const restored=calendar.convertLunarToSolar(found.y,found.m,1,true);
  assert.deepEqual(restored.lunar,{year:found.y,month:found.m,day:1,leap:true});
  assert.equal(restored.event,null);
});

test('V9.0: special 30/2 lunar valid example roundtrips when a lunar month has 30 days',()=>{
  let found;
  for(let y=2000;y<=2050&&!found;y++){
    try{const solar=lunar.lunarToSolar(y,2,30,false);found={y,solar};}catch{}
  }
  assert.ok(found,'at least one lunar second month has 30 days');
  assert.equal(calendar.convertLunarToSolar(found.y,2,30).lunar.day,30);
});

test('V9.0: year Can Chi tracks lunar year, not Gregorian year before Tet',()=>{
  assert.equal(calendar.dayInfo(2026,2,16).yearCanChi,'Ất Tỵ');
  assert.equal(calendar.dayInfo(2026,2,17).yearCanChi,'Bính Ngọ');
});

test('V9.0: reject invalid dates, months and invalid leap flags',()=>{
  for(const a of [[2025,2,29],[1899,12,31],[2101,1,1],[2026,0,1]]){
    assert.throws(()=>calendar.dayInfo(...a),RangeError);
  }
  assert.throws(()=>calendar.monthView(2026,13),RangeError);
  assert.throws(()=>calendar.monthView(2026,2.5),RangeError);
  assert.throws(()=>calendar.convertLunarToSolar(2026,2,31),RangeError);
  assert.throws(()=>calendar.convertLunarToSolar(2026,1,1,true),RangeError);
});

test('V9.0: all sampled days 2024–2027 agree with existing lunar engine and roundtrip',()=>{
  for(let y=2024;y<=2027;y++)for(let m=1;m<=12;m++){
    const calendarMonth=calendar.monthView(y,m);
    for(const d of calendarMonth.days){
      const r=lunar.solarToLunar(d.solar.year,d.solar.month,d.solar.day);
      assert.deepEqual(d.lunar,r);
      const converted=calendar.convertLunarToSolar(r.year,r.month,r.day,r.leap);
      assert.equal(converted.solar.iso,d.solar.iso);
    }
  }
});

test('V9.0: UI wiring, feature discoverability and no network dependency in calendar page',()=>{
  const page=read('apps/web/src/app/calendar/page.tsx');
  const nav=read('apps/web/src/lib/navigation.ts');
  const home=read('apps/web/src/app/page.tsx');
  assert.match(page,/Engine\.calendarMonth/);
  assert.match(page,/Engine\.calendarLunarToSolar/);
  assert.match(page,/Asia\/Ho_Chi_Minh/);
  assert.doesNotMatch(page,/\bfetch\s*\(/);
  assert.match(nav,/href: '\/calendar'/);
  assert.match(home,/<ToolDirectory\s*\/>/);
  assert.match(read('apps/web/src/lib/discipline-presentation.ts'),/path: '\/calendar'/);
  assert.match(read('apps/web/src/app/layout.tsx'),/\.\/calendar\.css/);
});
