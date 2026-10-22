'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Lunar = require('../packages/astrology-engine/src/lunar.js');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const Almanac = require('../packages/astrology-engine/src/almanac.js');

const input = { date:'2020-04-01', calendar:'lunar', leap:false, hour:10, minute:0, gender:'Nam' };

test('A08 rejects a misleading string leap flag (2020 leap fourth month)', () => {
  assert.deepEqual(Lunar.lunarToSolar(2020,4,1,false),{year:2020,month:4,day:23});
  assert.deepEqual(Lunar.lunarToSolar(2020,4,1,true),{year:2020,month:5,day:23});
  for (const invalid of ['false', 'true', 0, 1, null, [], {}]) {
    assert.throws(() => Lunar.lunarToSolar(2020,4,1,invalid),RangeError,`lunar: ${JSON.stringify(invalid)}`);
    assert.throws(() => Almanac.convertLunarToSolar(2020,4,1,invalid),RangeError,`almanac: ${JSON.stringify(invalid)}`);
    assert.throws(() => Engine.calculate({...input,leap:invalid}),RangeError,`chart: ${JSON.stringify(invalid)}`);
  }
});

test('A08 chart engine rejects a leap flag on solar dates and malformed date values', () => {
  assert.throws(() => Engine.calculate({...input,calendar:'solar',leap:true}),RangeError);
  for (const invalid of [['2020-04-01'], {toString:()=> '2020-04-01'}, 20200401])
    assert.throws(() => Engine.calculate({...input,date:invalid}),RangeError);
  assert.equal(Engine.calculate({...input,leap:false}).lunar.leap,false);
  assert.equal(Engine.calculate({...input,leap:true}).lunar.leap,true);
});

test('A08 chart remains stable across lunar and solar input of the same instant', () => {
  for(const date of ['2026-02-17','2026-10-16','2033-12-22','2020-05-23']) {
    const [year,month,day] = date.split('-').map(Number);
    const lun = Lunar.solarToLunar(year,month,day);
    const s = Engine.calculate({date,calendar:'solar',leap:false,hour:12,minute:30,gender:'Nữ'});
    const l = Engine.calculate({date:`${lun.year}-${String(lun.month).padStart(2,'0')}-${String(lun.day).padStart(2,'0')}`,
      calendar:'lunar',leap:lun.leap,hour:12,minute:30,gender:'Nữ'});
    assert.deepEqual(l.houses,s.houses);
    assert.deepEqual(l.lunar,s.lunar);
    assert.deepEqual(l.solar,s.solar);
  }
});

test('A08 12 palaces, 14 main stars, 4 natal transformations, annual boundary remain stable', () => {
  const dates=['2024-02-10','2025-01-29','2026-02-17','2026-10-16','2033-12-22'];
  for(const date of dates)for(const gender of ['Nam','Nữ'])for(const hour of [0,1,11,12,22,23]) {
    const chart=Engine.calculate({date,calendar:'solar',leap:false,hour,minute:30,gender});
    assert.equal(chart.houses.length,12);
    assert.equal(new Set(chart.houses.map(h=>h.branchIndex)).size,12);
    assert.equal(new Set(chart.houses.map(h=>h.palace)).size,12);
    const stars=chart.houses.flatMap(h=>h.stars);
    assert.equal(stars.length,14);
    assert.equal(new Set(stars).size,14);
    assert.equal(chart.transformations.length,4);
    const overview=Engine.annualOverview(chart,chart.lunar.year);
    assert.equal(overview.ageMu,1);
    assert.equal(overview.tieuHan.ageMu,1);
    assert.equal(overview.luuTuHoa.items.length,4);
    assert.equal(overview.luuStars.items.length,12);
  }
});

test('A08 2026 Vietnamese calendar independently documented anchors', () => {
  assert.deepEqual(Lunar.solarToLunar(2026,2,17),{year:2026,month:1,day:1,leap:false});
  assert.deepEqual(Lunar.solarToLunar(2026,10,16),{year:2026,month:9,day:7,leap:false});
  const d=Almanac.dayInfo(2026,10,16);
  assert.equal(d.dayCanChi,'Quý Hợi');
  assert.equal(d.monthCanChi.name,'Mậu Tuất');
  assert.equal(d.solarTerm.name,'Hàn Lộ');
});
