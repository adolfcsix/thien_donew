'use strict';

const fs = require('node:fs');
const Engine = require('../../packages/astrology-engine/src/tuvi.js');
const r35 = require('../../tests/fixtures/tuvi-r35-vietnam-lunar-boundaries.json');
const { VERSION, GENDERS, HOURS } = require('./tuvi-r33-evaluate-root-cause.cjs');
const { SOURCE_COMMIT: PIN } = require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');

const PLAN = '.r69-leap-policy-plan.json';
const RAW = '.r69-pinned-leap-policy-observations.json';
const REPORT = '.r69-leap-policy-audit.json';
const POLICIES = ['split', 'prev-month', 'next-month', 'origin-month'];
const WINDOWS = [
  { date: '2017-07-23', lunarYear: 2017, lunarMonth: 6, days: 30 },
  ...r35.anchors.filter(anchor => anchor.type === 'leap-start').map(anchor => ({ ...anchor, days: 29 })),
];
const POSITIONS = ['menh', 'cuc', 'ziWei', 'taPhu', 'huuBat'];
const DATE_FIELDS = ['year', 'month', 'day', 'leap'];
const mod = n => ((n % 12) + 12) % 12;
const sameFields = (a, b, fields) => fields.every(key => a[key] === b[key]);

function buildPlan() {
  const cases = WINDOWS.flatMap(({ date, lunarYear, lunarMonth, days }) => {
    const dateOffsets = [-1, 0, 13, 14, 15, 16, 28, ...(days === 30 ? [29] : []), days];
    return dateOffsets.flatMap(offset => {
      const solarDate = new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10);
      const expectedLunar = {
        year: lunarYear, month: lunarMonth + Number(offset === days),
        day: offset === days ? 1 : offset + 1, leap: offset >= 0 && offset < days,
      };
      // The day before a leap month ends its regular namesake. Leave the day
      // number to the two civil calendars, while still checking month and flag.
      if (offset < 0) delete expectedLunar.day;
      return GENDERS.flatMap(gender => HOURS.map(hour => ({
        id: `${solarDate}-${gender}-${hour}`, solarDate, gender, hour, expectedLunar,
      })));
    });
  });
  return { schema: 'thiendo-r69-leap-policy-plan-v1', sourceCommit: PIN, iztroVersion: VERSION, policies: POLICIES, cases };
}

function localChart(sample) {
  const chart = Engine.calculate({ date: sample.solarDate, gender: sample.gender, hour: sample.hour });
  return {
    lunar: chart.lunar,
    positions: {
      menh: Engine.BRANCHES.indexOf(chart.menh), cuc: chart.cuc.number,
      ziWei: Engine.BRANCHES.indexOf(chart.ziWei),
      taPhu: chart.auxiliaries.find(star => star.name === 'Tả Phụ').branch,
      huuBat: chart.auxiliaries.find(star => star.name === 'Hữu Bật').branch,
    },
  };
}

function validateLunar(point) {
  return Number.isInteger(point?.year) && point.year >= 1900 && point.year <= 2100 &&
    Number.isInteger(point.month) && point.month >= 1 && point.month <= 12 &&
    Number.isInteger(point.day) && point.day >= 1 && point.day <= 30 &&
    typeof point.leap === 'boolean';
}

function comparePolicy(policy, route, raw, local, sample) {
  if (route?.status === 'source-rejected-lunar-date') {
    const { reported, reason, regularDays, leapDays, signedLeapSolar } = route;
    if (policy !== 'origin-month' || !raw.leap || raw.day !== 30 ||
        !validateLunar(reported) || !sameFields(reported, raw, DATE_FIELDS) ||
        regularDays !== 29 || leapDays !== 30 || signedLeapSolar !== sample.solarDate ||
        reason !== `only 29 days in lunar year ${reported.year} month ${reported.month}`) {
      throw Error(`R69 invalid rejection evidence: ${sample.id}/${policy}`);
    }
    return route;
  }
  if (route?.status !== 'computed' || !validateLunar(route.reported) || !validateLunar(route.runtimeLunar) ||
      ![2, 3, 4, 5, 6].includes(route.positions?.cuc) ||
      POSITIONS.filter(key => key !== 'cuc').some(key => !Number.isInteger(route.positions[key]) ||
        route.positions[key] < 0 || route.positions[key] >= 12)) {
    throw Error(`R69 invalid source policy observation: ${sample.id}/${policy}`);
  }
  const routeDate = policy === 'split' || !raw.leap ? raw : route.reported;
  if (!sameFields(routeDate, route.runtimeLunar, DATE_FIELDS)) {
    throw Error(`R69 source route used an unexpected lunar date: ${sample.id}/${policy}`);
  }
  const { menh, cuc, ziWei, taPhu, huuBat } = route.positions;
  const usedMonths = {
    menh: mod(menh + Engine.hourBranch(sample.hour) - 2) + 1,
    taPhu: mod(taPhu - 4) + 1,
    huuBat: mod(10 - huuBat) + 1,
  };
  const reportedDayReconstruction = Engine.ziWeiPosition(route.reported.day, cuc);
  const runtimeDayReconstruction = Engine.ziWeiPosition(route.runtimeLunar.day, cuc);
  return {
    ...route,
    usedMonths,
    reportedDayDiffersFromRuntime: route.reported.day !== route.runtimeLunar.day,
    reportedDayReconstruction,
    runtimeDayReconstruction,
    runtimeDayReproducesZiWei: runtimeDayReconstruction === ziWei,
    reportedDayReproducesZiWei: reportedDayReconstruction === ziWei,
    differencesFromLocal: POSITIONS.filter(key => route.positions[key] !== local.positions[key]),
  };
}

function auditR69(observations) {
  const plan = buildPlan();
  if (observations?.schema !== 'thiendo-r69-pinned-leap-policy-observations-v1' ||
      observations.sourceCommit !== PIN || observations.iztroVersion !== VERSION ||
      observations.syntheticOnly !== true || !Array.isArray(observations.records) ||
      observations.records.length !== plan.cases.length) throw Error('R69 requires complete pinned-source evidence');
  const byId = new Map(observations.records.map(row => [row.id, row]));
  if (byId.size !== plan.cases.length) throw Error('R69 duplicated source input');
  const rows = plan.cases.map(sample => {
    const record = byId.get(sample.id);
    const local = localChart(sample);
    if (!sameFields(local.lunar, sample.expectedLunar, Object.keys(sample.expectedLunar))) {
      throw Error('R69 local calendar no longer agrees with the sample window: ' + sample.id);
    }
    if (!validateLunar(record?.raw) || Object.keys(record.policies ?? {}).length !== POLICIES.length) {
      throw Error('R69 missing source input or policy evidence: ' + sample.id);
    }
    const policies = Object.fromEntries(POLICIES.map(policy => [
      policy, comparePolicy(policy, record.policies[policy], record.raw, local, sample),
    ]));
    return { ...sample, local, sourceRawLunar: record.raw,
      rawCalendarMatches: sameFields(record.raw, local.lunar, DATE_FIELDS), policies };
  });
  return {
    schema: 'thiendo-r69-leap-policy-audit-v1', sourceCommit: PIN, iztroVersion: VERSION,
    solarCases: rows.length, policyRuns: rows.length * POLICIES.length,
    sourceRawCalendarMatches: rows.filter(row => row.rawCalendarMatches).length,
    byPolicy: Object.fromEntries(POLICIES.map(policy => {
      const results = rows.map(row => row.policies[policy]);
      const computed = results.filter(row => row.status === 'computed');
      return [policy, {
        computed: computed.length, rejected: results.length - computed.length,
        positionMatches: computed.filter(row => row.differencesFromLocal.length === 0).length,
        reportedDayDiffersFromRuntime: computed.filter(row => row.reportedDayDiffersFromRuntime).length,
        runtimeDayReproducesZiWei: computed.filter(row => row.runtimeDayReproducesZiWei).length,
        reportedDayReproducesZiWei: computed.filter(row => row.reportedDayReproducesZiWei).length,
      }];
    })),
    rows,
    mappedResearch: 31, referenceTotal: 49, semanticEquivalenceVerified: false,
    sourceSchoolParityVerified: false, mayChangeChartRules: false, mayIncreaseMapping: false,
  };
}

if (require.main === module) {
  if (process.argv[2] === '--plan') {
    fs.writeFileSync(PLAN, JSON.stringify(buildPlan(), null, 2) + '\n');
  } else {
    const report = auditR69(JSON.parse(fs.readFileSync(RAW, 'utf8')));
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(`R69: ${report.solarCases} solar cases, ${report.policyRuns} source policy runs, ${report.byPolicy.split.reportedDayDiffersFromRuntime} split metadata/runtime day differences`);
  }
}
module.exports = { buildPlan, auditR69 };
