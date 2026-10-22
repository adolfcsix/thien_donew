'use strict';
/**
 * Taiyi annual count (歲計), Wang Ximing, Taiyi Jinjing Shijing, vol. 1.
 * RESEARCH ONLY. Caller must resolve the traditional year boundary externally.
 * This module does not calculate a complete Taiyi chart or make predictions.
 * Primary text: https://zh.wikisource.org/zh/太乙金鏡式經_(四庫全書本)/卷01
 */
const METHOD_ID = 'taiyi-jinjing-annual-724';
const ANCHOR = Object.freeze({ year: 724, accumulatedYears: 1937281, provenance: '《太乙金鏡式經》卷一，開元十二年甲子歲' });
const PALACE_RING = Object.freeze([1, 2, 3, 4, 6, 7, 8, 9]);
const CYCLES = Object.freeze({ grand: 360, ji: 60, yuan: 72, small: 24, residence: 3 });
const STATUS = 'deterministic-subroutine-only';
const SOURCE_URL = 'https://zh.wikisource.org/zh/太乙金鏡式經_(四庫全書本)/卷01';
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
const positiveResidue = (n, cycle) => ((n - 1) % cycle + cycle) % cycle + 1;
function annualCountForYear(traditionalYear) {
  if (!Number.isSafeInteger(traditionalYear) || traditionalYear < 1 || traditionalYear > 9999) {
    throw new RangeError('traditionalYear must be an explicitly resolved CE integer from 1 to 9999; no BCE or implicit timezone conversion');
  }
  return ANCHOR.accumulatedYears + traditionalYear - ANCHOR.year;
}
function annualTaiyiResearch(input) {
  if (!isRecord(input)) throw new TypeError('Expected plain object input');
  const allowed = new Set(['traditionalYear', 'calendarBoundaryResolved', 'methodId']);
  if (Object.keys(input).some(k => !allowed.has(k))) throw new TypeError('Unknown parameter; annual years must not be inferred from a date or an epoch override');
  if (input.methodId !== METHOD_ID) throw new RangeError('Unsupported school; choose the Wang Ximing 724 annual method explicitly');
  if (input.calendarBoundaryResolved !== true) {
    return Object.freeze({ status: 'boundary-unresolved', methodId: METHOD_ID, result: null,
      reason: 'Resolve the traditional year label and its boundary before running this historical annual calculation.' });
  }
  const years = annualCountForYear(input.traditionalYear);
  const in360 = positiveResidue(years, CYCLES.grand);
  const in72 = positiveResidue(years, CYCLES.yuan);
  const in24 = positiveResidue(years, CYCLES.small);
  const in3 = positiveResidue(years, CYCLES.residence);
  const palaceIndex = Math.floor((in24 - 1) / CYCLES.residence);
  const calculation = Object.freeze({
    traditionalYear: input.traditionalYear,
    accumulatedYears: years,
    yearIn360Cycle: in360,
    jiIndexOneBased: Math.floor((in360 - 1) / CYCLES.ji) + 1,
    yearIn60Ji: ((in360 - 1) % CYCLES.ji) + 1,
    yearIn72Cycle: in72,
    yearIn24Cycle: in24,
    palaceIndexOneBased: palaceIndex + 1,
    taiyiPalace: PALACE_RING[palaceIndex],
    yearInPalace: in3,
  });
  return Object.freeze({ status: STATUS, methodId: METHOD_ID, source: SOURCE_URL,
    historicalAnchor: ANCHOR, calendarBoundary: 'confirmed-external-year-label',
    result: calculation,
    limitations: Object.freeze(['annual-count-only', 'no-month-day-hour', 'no-generals-or-interpreted-chart', 'alternative-epochs-not-mixed']) });
}
module.exports = Object.freeze({ METHOD_ID, ANCHOR, PALACE_RING, CYCLES, SOURCE_URL, annualCountForYear, annualTaiyiResearch });
