'use strict';

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const { auditR67 } = require('../infrastructure/scripts/tuvi-r32-r67-lunar-day-star-replay.cjs');

const paths = [
  '.r32-cross-engine-evidence-matrix-report.json',
  '.r33-source-1989-root-cause-observations.json',
].map(file => path.join(__dirname, '..', file));
const evidencePresent = paths.every(existsSync);
const requiresGenuine = process.env.THIENDO_R32_REQUIRE_GENUINE === '1';
const options = { skip: !requiresGenuine && !evidencePresent && 'Requires the R32 and R33 source workflow' };
const readInputs = () => paths.map(file => JSON.parse(readFileSync(file, 'utf8')));

test('R67 reproduces all four source positions on all 18 changed-day inputs', options, () => {
  assert.ok(evidencePresent, 'R67 requires both fresh evidence inputs in source CI');
  const inputs = readInputs();
  const audit = auditR67(...inputs);
  const dimensions = ['ziweiPos', 'liemTrinhBranch', 'thatSatBranch', 'huaLocBranch'];
  const positions = point => dimensions.map(field => point[field]);
  assert.equal(audit.compared, 30);
  assert.equal(audit.sharedInputs, 18);
  assert.equal(audit.reviewQueueCases, 6);
  assert.equal(audit.reproducedQueueCases, 6);
  assert.equal(audit.reproducedCases, 18);
  assert.equal(audit.sameDayControls, 12);
  assert.equal(audit.unresolvedCases, 0);
  for (const row of audit.rows) {
    assert.deepEqual(positions(row.replay), positions(row.source));
    assert.equal(row.replay.yearStem, row.local.yearStem);
    assert.equal(row.replay.mingGongBranch, row.local.mingGongBranch);
    assert.equal(row.replay.wuxingJu, row.local.wuxingJu);
    assert.equal(row.localLiemTrinhOffset, 4);
    assert.equal(row.sourceLiemTrinhOffset, 4);
    if (row.status === 'day-only-reproduced') {
      assert.equal(row.local.lunarDay, row.source.lunarDay + 1);
      assert.equal(row.calendarBoundaryStatus, 'compatible-with-civil-timezone-boundary');
    } else {
      assert.equal(row.local.lunarDay, row.source.lunarDay);
      assert.deepEqual(positions(row.local), positions(row.replay));
    }
  }
  const target = audit.rows.find(row => row.censusCaseId === 'stem-1989-nam-h0');
  assert.deepEqual(positions(target.local), [4, 8, 6, 0]);
  assert.deepEqual(positions(target.replay), [7, 11, 3, 3]);
  for (const key of [
    'rootCauseVerified', 'sourceSchoolParityVerified', 'semanticEquivalenceVerified',
    'expertReviewed', 'mayChangeChartRules', 'mayIncreaseMapping',
  ]) assert.equal(audit[key], false);
  assert.equal(audit.mappedResearch, 31);
  assert.deepEqual(auditR67(...inputs), audit);
});

test('R67 rejects mismatched overlapping coordinates across otherwise valid source inputs', options, () => {
  const [matrix, observations] = readInputs();
  const record = observations.records.find(row => row.id === '1989-08-15-Nam-0');
  record.source.thatSatBranch = 4;
  assert.throws(() => auditR67(matrix, observations), /R33\/R66 coordinates disagree.*stem-1989-nam-h0/);
});

test('R67 leaves a non-reproduced coordinate unresolved on a neighbouring date', options, () => {
  const [matrix, observations] = readInputs();
  const record = observations.records.find(row => row.id === '1989-08-14-Nam-0');
  record.source.huaLocBranch = 11;
  const audit = auditR67(matrix, observations);
  assert.equal(audit.unresolvedCases, 1);
  assert.equal(audit.reproducedCases, 17);
  assert.equal(audit.rows.find(row => row.caseId === record.id).status, 'unresolved');
});
