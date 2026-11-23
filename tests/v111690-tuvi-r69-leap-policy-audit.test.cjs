'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const { buildPlan, auditR69 } = require('../infrastructure/scripts/tuvi-r35-r69-leap-policy-audit.cjs');

const pathToEvidence = path.resolve(__dirname, '..', '.r69-pinned-leap-policy-observations.json');
const required = process.env.THIENDO_R35_REQUIRE_GENUINE === '1';
const options = { skip: !required && !existsSync(pathToEvidence) && 'Requires the pinned R69 source observations' };

function observations() {
  assert.ok(existsSync(pathToEvidence), 'R69 requires fresh pinned-source results in CI');
  return JSON.parse(readFileSync(pathToEvidence, 'utf8'));
}

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

test('R69 measures the split between days 15 and 16 on Mệnh, Tả Phụ and Hữu Bật', options, () => {
  const report = auditR69(observations());
  assert.equal(report.policyRuns, 600);
  assert.equal(report.sourceRawCalendarMatches, 150);
  for (const row of report.rows) {
    const { sourceRawLunar: raw, policies } = row;
    const expectedMonth = raw.month + Number(raw.leap && raw.day > 15);
    assert.deepEqual(Object.values(policies.split.usedMonths), [expectedMonth, expectedMonth, expectedMonth]);
    assert.equal(policies.split.runtimeDayReproducesZiWei, true);
    if (raw.leap && raw.day === 16) {
      assert.deepEqual(Object.values(policies['prev-month'].usedMonths), [raw.month, raw.month, raw.month]);
      assert.deepEqual(Object.values(policies['next-month'].usedMonths), [expectedMonth, expectedMonth, expectedMonth]);
    }
  }
  for (const flag of ['sourceSchoolParityVerified', 'semanticEquivalenceVerified', 'mayChangeChartRules', 'mayIncreaseMapping']) {
    assert.equal(report[flag], false);
  }
  assert.equal(report.mappedResearch, 31);
  assert.equal(report.referenceTotal, 49);
});

test('R69 retains day 30 placement and records the source origin-month rejection', options, () => {
  const report = auditR69(observations());
  assert.equal(report.byPolicy.split.reportedDayDiffersFromRuntime, 6);
  assert.equal(report.byPolicy['origin-month'].rejected, 6);
  const target = report.rows.filter(row => row.solarDate === '2017-08-21');
  assert.equal(target.length, 6);
  for (const row of target) {
    const split = row.policies.split;
    assert.deepEqual(split.reported, { year: 2017, month: 7, day: 29, leap: false });
    assert.deepEqual(split.runtimeLunar, { year: 2017, month: 6, day: 30, leap: true });
    assert.equal(split.runtimeDayReproducesZiWei, true);
    assert.equal(split.reportedDayReproducesZiWei, false);
    assert.equal(row.policies['prev-month'].runtimeLunar.day, 29);
    assert.equal(row.policies['next-month'].runtimeLunar.day, 29);
    const origin = row.policies['origin-month'];
    assert.equal(origin.status, 'source-rejected-lunar-date');
    assert.equal(origin.signedLeapSolar, row.solarDate);
    assert.equal(origin.regularDays, 29);
    assert.equal(origin.leapDays, 30);
  }
});

test('R69 rejects mismatched runtime lunar dates, incomplete cases and unsupported failures', options, () => {
  const shifted = observations();
  shifted.records[0].policies.split.runtimeLunar.day -= 1;
  assert.throws(() => auditR69(shifted), /source route used an unexpected lunar date/);
  const missing = observations();
  missing.records.pop();
  assert.throws(() => auditR69(missing), /requires complete pinned-source evidence/);
  const invalid = observations();
  const target = invalid.records.find(row => row.id === '2017-08-21-Nam-0');
  target.policies['origin-month'].reason = 'unexpected error';
  assert.throws(() => auditR69(invalid), /invalid rejection evidence/);
});
