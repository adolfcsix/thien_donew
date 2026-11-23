'use strict';

const fs = require('node:fs');
const Engine = require('../../packages/astrology-engine/src/tuvi.js');
const { census, SOURCE_COMMIT } = require('./tuvi-r32-r66-pinned-source-local-coordinate-census.cjs');
const { analyzeRootCause, BOUNDARY } = require('./tuvi-r33-evaluate-root-cause.cjs');
const { localPoint, uniqueMainStar } = require('./tuvi-r33-r57-lunar-day-counterfactual.cjs');

const SCHEMA = 'thiendo-r67-pinned-lunar-day-star-replay-v1';
const TARGET_DATE = '1989-08-15';
const STARS = {
  'liem-trinh': 'liemTrinhBranch',
  'that-sat': 'thatSatBranch',
  'hua-loc': 'huaLocBranch',
};
const CONTEXT = ['lunarYear', 'lunarMonth', 'isLeapMonth', 'yearStem', 'wuxingJu', 'mingGongBranch'];
const POSITIONS = ['ziweiPos', ...Object.values(STARS)];
const inputKey = row => [row.solarDate, row.clockHour, row.gender].join('/');
const sameFields = (left, right, fields) => fields.every(field => left[field] === right[field]);

function verifyOverlap(row, case66) {
  if (case66.sourceMing !== row.source.mingGongBranch ||
      case66.localMing !== row.local.mingGongBranch ||
      Object.entries(STARS).some(([id, field]) => {
        const pair = case66.namedStarBranches[id];
        return pair.sourceBranch !== row.source[field] || pair.localBranch !== row.local[field];
      })) {
    throw Error('R67 R33/R66 coordinates disagree for ' + case66.caseId);
  }
}

function replayLunarDay({ solarDate, clockHour, gender, source, local }) {
  // Hold all local input fields fixed except the day, then verify the derived context.
  const date = [local.lunarYear, local.lunarMonth, source.lunarDay]
    .map(value => String(value).padStart(2, '0')).join('-');
  const replay = Engine.calculate({
    date, hour: clockHour, minute: 0, gender, calendar: 'lunar', leap: local.isLeapMonth,
  });
  const hua = replay.transformations.filter(star => star.name === 'Hóa Lộc');
  if (hua.length !== 1 || !Number.isInteger(hua[0].branch) ||
      hua[0].branch < 0 || hua[0].branch > 11) {
    throw Error('R67 missing or invalid Hóa Lộc in replay for ' + solarDate);
  }
  const result = {
    ...localPoint(replay),
    yearStem: Engine.STEMS.indexOf(replay.yearCanChi.split(' ')[0]),
    thatSatBranch: uniqueMainStar(replay, 'Thất Sát'),
    huaLocBranch: hua[0].branch,
  };
  if (!sameFields(result, local, CONTEXT) || result.lunarDay !== source.lunarDay) {
    throw Error('R67 replay changed more than the lunar day for ' + solarDate);
  }
  return { inputDate: date, ...result };
}

function auditR67(matrix, sourceObservations) {
  const coordinateReport = census(matrix);
  const calendarReport = analyzeRootCause(sourceObservations);
  if (calendarReport.failures !== 0 || calendarReport.compared !== 30) {
    throw Error('R67 requires the complete R33 calendar and coordinate comparison');
  }

  const calendarKeys = new Set(calendarReport.records.map(inputKey));
  const overlap = new Map();
  for (const row of coordinateReport.cases) {
    const key = inputKey(row);
    if (!calendarKeys.has(key)) continue;
    if (overlap.has(key)) throw Error('R67 duplicate R66 birth input: ' + key);
    overlap.set(key, row);
  }
  const queued = new Set(coordinateReport.reviewQueue.map(row => row.caseId));
  if (overlap.size !== 18 || queued.size !== 6 ||
      [...overlap.values()].filter(row => queued.has(row.caseId) && row.solarDate === TARGET_DATE).length !== 6) {
    throw Error('R67 expected 18 shared inputs and all six R66 queue cases on ' + TARGET_DATE);
  }

  const rows = calendarReport.records.map(row => {
    const { source, local } = row;
    const case66 = overlap.get(inputKey(row));
    if (case66) verifyOverlap(row, case66);
    const sourceOffset = (source.liemTrinhBranch - source.ziweiPos + 12) % 12;
    const localOffset = (local.liemTrinhBranch - local.ziweiPos + 12) % 12;
    const contextMatches = sameFields(source, local, CONTEXT);
    const replay = contextMatches ? replayLunarDay(row) : null;
    const dayChanged = source.lunarDay !== local.lunarDay;
    const directMatches = sameFields(source, local, POSITIONS);
    const replayMatches = Boolean(replay && sameFields(source, replay, POSITIONS));
    const status = !contextMatches ? 'context-differs'
      : dayChanged && !directMatches && replayMatches && sourceOffset === localOffset
        ? 'day-only-reproduced'
        : !dayChanged && directMatches && replayMatches ? 'same-day-control' : 'unresolved';
    return {
      caseId: row.id, censusCaseId: case66?.caseId ?? null, solarDate: row.solarDate,
      clockHour: row.clockHour, gender: row.gender, sourceHourBranch: Engine.hourBranch(row.clockHour),
      inReviewQueue: Boolean(case66 && queued.has(case66.caseId)),
      calendarBoundaryStatus: row.calendarBoundary.status,
      source, local, replay, sourceLiemTrinhOffset: sourceOffset, localLiemTrinhOffset: localOffset,
      status,
    };
  });

  return {
    schema: SCHEMA, sourceCommit: SOURCE_COMMIT, iztroVersion: calendarReport.sourceIztroVersion,
    coordinateEvidenceSha256: coordinateReport.evidenceSha256,
    astronomicalBoundary: BOUNDARY,
    compared: rows.length, sharedInputs: overlap.size, reviewQueueCases: queued.size,
    reproducedQueueCases: rows.filter(row => row.inReviewQueue && row.status === 'day-only-reproduced').length,
    reproducedCases: rows.filter(row => row.status === 'day-only-reproduced').length,
    sameDayControls: rows.filter(row => row.status === 'same-day-control').length,
    unresolvedCases: rows.filter(row => !['day-only-reproduced', 'same-day-control'].includes(row.status)).length,
    rows,
    rootCauseVerified: false, sourceSchoolParityVerified: false, semanticEquivalenceVerified: false,
    expertReviewed: false, mayChangeChartRules: false, mayIncreaseMapping: false,
    mappedResearch: 31, referenceTotal: 49,
  };
}

if (require.main === module) {
  if (process.argv.length !== 4) throw Error('R67 requires same-run R32 report and R33 source observations');
  const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
  const report = auditR67(read(process.argv[2]), read(process.argv[3]));
  fs.writeFileSync('.r67-lunar-day-star-replay.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`R67: ${report.reproducedQueueCases}/${report.reviewQueueCases} queued; ${report.reproducedCases} day-only replays; ${report.sameDayControls} controls; ${report.unresolvedCases} unresolved`);
}

module.exports = { auditR67 };
