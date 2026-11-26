'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Lunar = require('../packages/astrology-engine/src/lunar.js');
const Engine = require('../packages/astrology-engine/src/tuvi.js');

// Extend R69's three existing windows to every leap day plus both neighbors.
// Local input-path consistency only; not independent calendar or school evidence.
const windows = [
  {start: '2017-07-23', year: 2017, month: 6, days: 30},
  {start: '2020-05-23', year: 2020, month: 4, days: 29},
  {start: '2023-03-22', year: 2023, month: 2, days: 29},
];
const iso = ({year, month, day}) =>
  [String(year), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');

for (const {start, year, month, days} of windows) {
  test('R72 full leap window: ' + start + ' civil date roundtrip and chart parity', () => {
    let checked = 0;
    const identities = new Set();
    for (let offset = -1; offset <= days; offset++) {
      const date = new Date(Date.parse(start) + offset * 86400000).toISOString().slice(0, 10);
      const [y, m, d] = date.split('-').map(Number);
      const lunar = Lunar.solarToLunar(y, m, d);
      const label = date + ' / ' + iso(lunar) + ' / leap=' + lunar.leap;
      assert.equal(lunar.year, year, label);
      assert.equal(lunar.month, month + Number(offset === days), label);
      assert.equal(lunar.leap, offset >= 0 && offset < days, label);
      if (offset >= 0) assert.equal(lunar.day, offset === days ? 1 : offset + 1, label);
      const identity = iso(lunar) + '/' + lunar.leap;
      assert.ok(!identities.has(identity), label);
      identities.add(identity);
      assert.deepEqual(Lunar.lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.leap),
        {year: y, month: m, day: d}, label);
      for (const gender of ['Nam', 'Nữ']) for (const hour of [0, 1, 23]) {
        const common = {gender, hour, minute: 0};
        const s = Engine.calculate({...common, date, calendar: 'solar', leap: false});
        const l = Engine.calculate({...common, date: iso(lunar), calendar: 'lunar', leap: lunar.leap});
        const context = label + '/' + gender + '/' + hour;
        for (const key of ['solar', 'lunar', 'menh', 'cuc', 'ziWei', 'houses', 'transformations']) {
          assert.deepEqual(l[key], s[key], context + '/' + key);
        }
        assert.equal(s.houses.length, 12, context);
        const stars = s.houses.flatMap(h => h.stars);
        assert.equal(stars.length, 14, context);
        assert.equal(new Set(stars).size, 14, context);
        assert.equal(s.transformations.length, 4, context);
        checked++;
      }
    }
    assert.equal(identities.size, days + 2);
    assert.equal(checked, (days + 2) * 6);
    if (days === 29) assert.throws(() => Lunar.lunarToSolar(year, month, 30, true), RangeError);
  });
}
