'use strict';

const fs = require('node:fs');
const Engine = require('../../packages/astrology-engine/src/tuvi.js');
const { SOURCE_COMMIT } = require('./tuvi-r32-r66-pinned-source-local-coordinate-census.cjs');
const { DATES, GENDERS, HOURS, VERSION } = require('./tuvi-r33-evaluate-root-cause.cjs');

const NAMES = {
  '紫微': 'Tử Vi', '天机': 'Thiên Cơ', '太阳': 'Thái Dương', '武曲': 'Vũ Khúc',
  '天同': 'Thiên Đồng', '廉贞': 'Liêm Trinh', '天府': 'Thiên Phủ', '太阴': 'Thái Âm',
  '贪狼': 'Tham Lang', '巨门': 'Cự Môn', '天相': 'Thiên Tướng', '天梁': 'Thiên Lương',
  '七杀': 'Thất Sát', '破军': 'Phá Quân',
};
const MAIN_STARS = Object.values(NAMES);
const EXPECTED_IDS = DATES.flatMap(date => GENDERS.flatMap(gender => HOURS.map(hour => `${date}-${gender}-${hour}`)));
const CONTEXT = ['year', 'month', 'day', 'leap', 'yearStem', 'menh', 'cuc'];
const isBranch = value => Number.isInteger(value) && value >= 0 && value < 12;

function indexedRows(rows) {
  const index = new Map(rows.map(row => [row.caseId, row]));
  if (rows.length !== EXPECTED_IDS.length || index.size !== EXPECTED_IDS.length ||
      !EXPECTED_IDS.every(id => index.has(id))) throw Error('R68 incomplete or duplicated cases');
  return index;
}

function localObservation(input) {
  const chart = Engine.calculate(input);
  return {
    ...chart.lunar,
    yearStem: Engine.STEMS.indexOf(chart.yearCanChi.split(' ')[0]),
    menh: Engine.BRANCHES.indexOf(chart.menh),
    cuc: chart.cuc.number,
    majorStars: chart.houses.flatMap(house => house.stars.map(name => ({ name, branch: house.branchIndex }))),
    huaLoc: chart.transformations.filter(item => item.name === 'Hóa Lộc')
      .map(item => ({ name: item.star, branch: item.branch })),
  };
}

function normalize(observation, baseline, day, source, label) {
  const expected = {
    year: baseline.lunarYear, month: baseline.lunarMonth, day, leap: false,
    yearStem: baseline.yearStem, menh: baseline.mingGongBranch, cuc: baseline.wuxingJu,
  };
  if (!CONTEXT.every(key => observation?.[key] === expected[key])) {
    throw Error('R68 unexpected lunar date or chart context: ' + label);
  }
  const nameOf = name => source ? NAMES[name] : name;
  const entries = observation.majorStars?.map(({ name, branch }) => [nameOf(name), branch]);
  const locations = new Map(entries);
  if (entries?.length !== MAIN_STARS.length ||
      !MAIN_STARS.every(name => isBranch(locations.get(name)))) {
    throw Error('R68 requires each of the 14 main stars exactly once: ' + label);
  }
  const hua = observation.huaLoc?.[0];
  const carrier = nameOf(hua?.name);
  if (observation.huaLoc?.length !== 1 || !isBranch(hua.branch) ||
      locations.get(carrier) !== hua.branch) {
    throw Error('R68 invalid Hóa Lộc carrier or branch: ' + label);
  }
  return {
    ...expected,
    majorStars: Object.fromEntries(MAIN_STARS.map(name => [name, locations.get(name)])),
    huaLoc: { carrier, branch: hua.branch },
  };
}

function compare(source, local) {
  return {
    differingMainStars: MAIN_STARS.filter(name => source.majorStars[name] !== local.majorStars[name]),
    huaLocCarrierMatches: source.huaLoc.carrier === local.huaLoc.carrier,
    huaLocBranchMatches: source.huaLoc.branch === local.huaLoc.branch,
  };
}

function verifyPriorPositions(chart, prior, id) {
  const { majorStars, huaLoc } = chart;
  if (majorStars['Tử Vi'] !== prior.ziweiPos || majorStars['Liêm Trinh'] !== prior.liemTrinhBranch ||
      majorStars['Thất Sát'] !== prior.thatSatBranch || huaLoc.branch !== prior.huaLocBranch) {
    throw Error('R68 direct chart differs from the same-run R67 evidence: ' + id);
  }
}

function auditR68(baseline, observations) {
  if (baseline?.schema !== 'thiendo-r67-pinned-lunar-day-star-replay-v1' ||
      observations?.schema !== 'thiendo-r68-pinned-lunar-source-observations-v1' ||
      ![baseline, observations].every(x => x.sourceCommit === SOURCE_COMMIT && x.iztroVersion === VERSION) ||
      observations.syntheticOnly !== true || !Array.isArray(baseline.rows) || !Array.isArray(observations.records)) {
    throw Error('R68 requires R67 and matching pinned source evidence');
  }
  const baselineById = indexedRows(baseline.rows);
  const sourceById = indexedRows(observations.records);
  const rows = EXPECTED_IDS.map(id => {
    const row = baselineById.get(id);
    const { solarDate, clockHour, gender, source, local } = row;
    if (id !== `${solarDate}-${gender}-${clockHour}` || source.isLeapMonth !== false ||
        local.isLeapMonth !== false || source.lunarYear !== local.lunarYear || source.lunarMonth !== local.lunarMonth) {
      throw Error('R68 only compares the same non-leap lunar month on the R67 birth inputs: ' + id);
    }

    const input = { hour: clockHour, minute: 0, gender };
    const observation = sourceById.get(id);
    const sourceDirect = normalize(observation.direct, source, source.lunarDay, true, id);
    const localDirect = normalize(localObservation({ ...input, date: solarDate }), local, local.lunarDay, false, id);
    verifyPriorPositions(sourceDirect, source, id);
    verifyPriorPositions(localDirect, local, id);

    const days = [...new Set([source.lunarDay, local.lunarDay])].sort((a, b) => a - b);
    if (!Array.isArray(observation.replays) || observation.replays.length !== days.length ||
        days.some((day, i) => observation.replays[i]?.day !== day)) {
      throw Error('R68 missing, unexpected, or duplicated lunar replay: ' + id);
    }
    const lunarReplays = days.map((day, i) => {
      const date = [source.lunarYear, source.lunarMonth, day].map(value => String(value).padStart(2, '0')).join('-');
      const sourceReplay = normalize(observation.replays[i], source, day, true, `${id}/${day}`);
      const localReplay = normalize(
        localObservation({ ...input, date, calendar: 'lunar', leap: false }), local, day, false, `${id}/${day}`
      );
      return { date, source: sourceReplay, local: localReplay, ...compare(sourceReplay, localReplay) };
    });

    return {
      caseId: id, solarDate, clockHour, gender, censusCaseId: row.censusCaseId,
      sourceDirect, localDirect, directComparison: compare(sourceDirect, localDirect),
      lunarReplays,
      sourceRoundTrip: compare(sourceDirect, lunarReplays.find(item => item.source.day === source.lunarDay).source),
      localRoundTrip: compare(localDirect, lunarReplays.find(item => item.local.day === local.lunarDay).local),
    };
  });
  const replays = rows.flatMap(row => row.lunarReplays);
  const countDifferences = items => items.reduce((count, item) => count + item.differingMainStars.length, 0);
  const allMatch = item => item.differingMainStars.length === 0 && item.huaLocCarrierMatches && item.huaLocBranchMatches;
  return {
    schema: 'thiendo-r68-paired-lunar-coordinate-report-v1', sourceCommit: SOURCE_COMMIT,
    iztroVersion: VERSION, syntheticOnly: true, solarCases: rows.length,
    solarMainStarDifferences: countDifferences(rows.map(row => row.directComparison)),
    pairedLunarScenarios: replays.length, comparedMainStarPairs: replays.length * MAIN_STARS.length,
    pairedMainStarDifferences: countDifferences(replays),
    pairedHuaLocCarrierMatches: replays.filter(item => item.huaLocCarrierMatches).length,
    pairedHuaLocBranchMatches: replays.filter(item => item.huaLocBranchMatches).length,
    roundTripMatches: rows.flatMap(row => [row.sourceRoundTrip, row.localRoundTrip]).filter(allMatch).length,
    mappedResearch: 31, referenceTotal: 49, sourceSchoolParityVerified: false,
    semanticEquivalenceVerified: false, mayChangeChartRules: false, mayIncreaseMapping: false,
    rows,
  };
}

if (require.main === module) {
  const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
  const report = auditR68(read('.r67-lunar-day-star-replay.json'), read('.r68-pinned-lunar-source-observations.json'));
  fs.writeFileSync('.r68-paired-lunar-coordinate-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`R68: ${report.comparedMainStarPairs - report.pairedMainStarDifferences}/${report.comparedMainStarPairs} main star coordinates matched across ${report.pairedLunarScenarios} same-lunar-input comparisons`);
}

module.exports = { auditR68 };
