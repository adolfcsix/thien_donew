'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const { buildPlan } = require('../infrastructure/scripts/tuvi-r35-r69-leap-policy-audit.cjs');

test('R69 plan covers regular controls, midmonth boundaries, and the 30-day leap month', () => {
  const { cases, policies } = buildPlan();
  assert.equal(cases.length, 150);
  assert.equal(new Set(cases.map(row => row.id)).size, 150);
  assert.equal(new Set(cases.map(row => row.solarDate)).size, 25);
  assert.equal(policies.length, 4);
  const lunar = { date: '2017-06-30', hour: 0, gender: 'Nam', calendar: 'lunar', leap: true };
  const converted = Engine.calculate(lunar);
  const direct = Engine.calculate({ date: '2017-08-21', hour: 0 });
  assert.deepEqual(converted.solar, { year: 2017, month: 8, day: 21 });
  assert.deepEqual(converted.lunar, direct.lunar);
  assert.equal(converted.menh, direct.menh);
  assert.equal(converted.ziWei, direct.ziWei);
});
