'use strict';
/** Deep, deterministic, dependency-free property regressions.
 * These check internal calendrical consistency, NOT astronomical ground truth.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Lunar = require('../packages/astrology-engine/src/lunar.js');
const BaZi = require('../packages/astrology-engine/src/bazi.js');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const GoodDays = require('../packages/astrology-engine/src/good-days.js');

function sameDay(actual, expected) {
  assert.deepEqual(actual, expected);
}

test('Deep audit: every Gregorian date 1900–2100 round-trips through lunar conversion', () => {
  let total = 0;
  for (let year = 1900; year <= 2100; year++) {
    for (let month = 1; month <= 12; month++) {
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= last; day++) {
        const lunar = Lunar.solarToLunar(year, month, day);
        const returned = Lunar.lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.leap);
        sameDay(returned, { year, month, day });
        total++;
      }
    }
  }
  assert.equal(total, 73414);
});

test('Deep audit: invalid civil dates and invalid lunar-month day 30 are rejected', () => {
  for (const [y,m,d] of [[2024,2,30],[2025,2,29],[1900,2,29],[2100,2,29],[2101,1,1],[1899,12,31]]) {
    assert.throws(() => Lunar.solarToLunar(y,m,d), RangeError);
  }
  const lengths = new Map();
  for (let y = 2020; y <= 2032; y++) {
    for (let month = 1; month <= 12; month++) {
      const last = new Date(Date.UTC(y,month,0)).getUTCDate();
      for (let day = 1; day <= last; day++) {
        const lunar=Lunar.solarToLunar(y,month,day);
        const key=[lunar.year,lunar.month,lunar.leap].join(':');
        lengths.set(key,Math.max(lengths.get(key) || 0,lunar.day));
      }
    }
  }
  let rejected = 0;
  for (const [key,length] of lengths) {
    if (length !== 29) continue;
    const [y,m,leap] = key.split(':');
    assert.throws(() => Lunar.lunarToSolar(+y,+m,30,leap === 'true'), RangeError);
    rejected++;
  }
  assert.ok(rejected >= 40, `Expected many 29-day lunar months; found ${rejected}`);
});

test('Deep audit: Bát Tự day advances one Can and one Chi per civil day', () => {
  for (let year = 1901; year <= 2099; year += 7) {
    for (let month = 1; month <= 12; month++) {
      const first = BaZi.calculate({date:`${year}-${String(month).padStart(2,'0')}-01`,hour:10});
      const second = BaZi.calculate({date:`${year}-${String(month).padStart(2,'0')}-02`,hour:10});
      assert.equal(second.pillars.day.stemIndex,(first.pillars.day.stemIndex+1)%10);
      assert.equal(second.pillars.day.branchIndex,(first.pillars.day.branchIndex+1)%12);
      assert.equal(first.pillars.day.name,first.dayMaster.stem+' '+first.pillars.day.branch);
    }
  }
});

test('Deep audit: 23:00 late-Zi day rollover matches next midnight Day Master', () => {
  for (let year = 1901; year <= 2099; year += 11) {
    for (let month = 1; month <= 12; month++) {
      const date=`${year}-${String(month).padStart(2,'0')}-15`;
      const tomorrow=new Date(Date.UTC(year,month-1,16)).toISOString().slice(0,10);
      const late=BaZi.calculate({date,hour:23,minute:15,dayBoundary:'late-zi'});
      const next=BaZi.calculate({date:tomorrow,hour:0,minute:15,dayBoundary:'midnight'});
      assert.equal(late.pillars.day.name,next.pillars.day.name);
      assert.equal(late.pillars.hour.name,next.pillars.hour.name);
    }
  }
});

test('Deep audit: Jie boundary finder yields finite nearby references across 1901–2099', () => {
  let checked = 0;
  for (let year = 1901; year <= 2099; year += 3) {
    for (let month = 1; month <= 12; month++) {
      for (const hour of [0,11,23]) {
        const ts=Date.UTC(year,month-1,15,hour-7,30);
        for (const direction of ['forward','reverse']) {
          const b=BaZi.jieBoundaryAt(ts,direction);
          assert.ok(b.intervalDays >= 0 && b.intervalDays <= 37, `${year}-${month}: bad distance`);
          assert.ok(Number.isFinite(b.timestampMs));
          assert.ok(BaZi.JIE_NAMES.includes(b.name));
          assert.ok(Number.isInteger(b.timestampMs / 60000));
          checked++;
        }
      }
    }
  }
  assert.equal(checked,4824);
});

test('Deep audit: eight Đại Vận advance/retreat stem, branch by one per cycle', () => {
  for (const sex of ['male','female']) {
    for (const date of ['1901-01-15','1958-10-03','2004-07-12','2026-02-19','2099-09-11']) {
      const luck=BaZi.daYun({date,hour:10,minute:30,sex});
      assert.equal(luck.cycles.length,8);
      const step=luck.direction==='forward'?1:-1;
      assert.ok(luck.startingAge.decimalYears>=0 && luck.startingAge.decimalYears<=13);
      for (let i=1;i<luck.cycles.length;i++) {
        assert.equal(luck.cycles[i].stemIndex,(luck.cycles[i-1].stemIndex+step+10)%10);
        assert.equal(luck.cycles[i].branchIndex,(luck.cycles[i-1].branchIndex+step+12)%12);
        assert.ok(Math.abs(luck.cycles[i].startingAgeYears-luck.cycles[i-1].startingAgeYears-10)<.002);
      }
    }
  }
});

test('Deep audit: annual overlays never mutate the natal chart', () => {
  for (const input of [
    {date:'2004-07-12',hour:10,minute:30,calendar:'solar',leap:false,gender:'Nam'},
    {date:'1996-02-19',hour:0,minute:0,calendar:'solar',leap:false,gender:'Nữ'},
  ]) {
    const birth=Engine.calculate(input);
    const original=JSON.stringify(birth);
    for (let year=birth.lunar.year;year<=Math.min(2100,birth.lunar.year+25);year++) {
      const result=Engine.annualOverview(birth,year);
      assert.equal(result.year,year);
      assert.equal(result.ageMu,year-birth.lunar.year+1);
      assert.equal(result.tieuHan.ageMu,result.ageMu);
      assert.equal(result.luuTuHoa.items.length,4);
      assert.equal(result.luuStars.items.length,12);
    }
    assert.equal(JSON.stringify(birth),original);
  }
});

test('Deep audit: date range search across year boundary is ordered and duplicate-free', () => {
  for (const month of [1,6,10,12])for(const purpose of Object.keys(GoodDays.PURPOSES)) {
    const result=GoodDays.searchRange(2026,month,6,purpose);
    const iso=result.allDays.map(item=>item.date);
    assert.deepEqual(iso,[...iso].sort());
    assert.equal(new Set(iso).size,iso.length);
    assert.equal(result.summary.favorable+result.summary.neutral+result.summary.caution,result.total);
  }
});
