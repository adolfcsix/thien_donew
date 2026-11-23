'use strict';

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const { auditR68 } = require('../infrastructure/scripts/tuvi-r32-r68-paired-lunar-coordinates.cjs');

const paths = ['.r67-lunar-day-star-replay.json', '.r68-pinned-lunar-source-observations.json']
  .map(file => path.resolve(__dirname, '..', file));
const evidencePresent = paths.every(existsSync);
const required = process.env.THIENDO_R32_REQUIRE_GENUINE === '1';
const options = { skip: !required && !evidencePresent && 'Requires the pinned-source workflow inputs' };

function readInputs() {
  assert.ok(evidencePresent, 'R68 requires both fresh reports in pinned-source CI');
  return paths.map(file => JSON.parse(readFileSync(file, 'utf8')));
}

test('R68 compares all 14 main stars and the Hóa Lộc carrier on both native lunar days', options, () => {
  const report = auditR68(...readInputs());
  const { rows } = report;
  assert.equal(report.solarCases, 30);
  assert.equal(report.solarMainStarDifferences, 252);
  assert.equal(report.pairedLunarScenarios, 48);
  assert.equal(report.comparedMainStarPairs, 672);
  assert.equal(report.pairedMainStarDifferences, 0);
  assert.equal(report.pairedHuaLocCarrierMatches, 48);
  assert.equal(report.pairedHuaLocBranchMatches, 48);
  assert.equal(report.roundTripMatches, 60);

  for (const row of rows) {
    const sameLunarDay = row.sourceDirect.day === row.localDirect.day;
    assert.equal(row.lunarReplays.length, sameLunarDay ? 1 : 2);
    assert.equal(row.directComparison.differingMainStars.length, sameLunarDay ? 0 : 14);
    for (const replay of row.lunarReplays) {
      assert.deepEqual(replay.source, replay.local);
    }
  }
  const target = rows.find(row => row.censusCaseId === 'stem-1989-nam-h0');
  assert.deepEqual(target.lunarReplays.map(replay => [replay.date, replay.source.huaLoc]), [
    ['1989-07-14', { carrier: 'Vũ Khúc', branch: 3 }],
    ['1989-07-15', { carrier: 'Vũ Khúc', branch: 0 }],
  ]);
  for (const key of ['sourceSchoolParityVerified', 'semanticEquivalenceVerified', 'mayChangeChartRules', 'mayIncreaseMapping']) {
    assert.equal(report[key], false);
  }
  assert.equal(report.mappedResearch, 31);
  assert.equal(report.referenceTotal, 49);
});

test('R68 rejects duplicated main stars, missing replays and shifted lunar inputs', options, () => {
  for (const [mutate, expected] of [
    [source => { source.records[0].direct.majorStars[0] = source.records[0].direct.majorStars[1]; }, /requires each of the 14/],
    [source => { source.records[0].replays.pop(); }, /missing, unexpected, or duplicated lunar replay/],
    [source => { source.records[0].replays[0].month += 1; }, /unexpected lunar date or chart context/],
    [source => { source.records[0].replays[0].huaLoc[0].branch = 12; }, /invalid Hóa Lộc carrier or branch/],
  ]) {
    const [baseline, observations] = readInputs();
    mutate(observations);
    assert.throws(() => auditR68(baseline, observations), expected);
  }
});

test('R68 reports valid new star disagreements without silently changing source data', options, () => {
  const [baseline, observations] = readInputs();
  const target = observations.records.find(row => row.caseId === '1989-08-15-Nam-0');
  const tampered = target.replays[1].majorStars.find(star => star.name === '天机');
  tampered.branch = (tampered.branch + 1) % 12;
  const report = auditR68(baseline, observations);
  assert.equal(report.pairedMainStarDifferences, 1);
  assert.deepEqual(report.rows.find(row => row.caseId === target.caseId).lunarReplays[1].differingMainStars, ['Thiên Cơ']);
});
