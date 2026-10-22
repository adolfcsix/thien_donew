/* THIÊN ĐỒ: auditable supplementary star-placement rules.
 * Tý=0 ... Hợi=11; month/day are lunar birth month/day.
 * These rules are a named traditional variant, NOT tested predictions.
 * Sources and variant limits: docs/reference/star-placement-extension.md.
 */
(function (root) {
  'use strict';
  const RULESET = 'supplementary-seven-month-year-day-v1.0';
  const mod = (n, k) => ((n % k) + k) % k;
  function calculate({lunarMonth, lunarDay, yearBranch, taPhuBranch, huuBatBranch}) {
    if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12)
      throw new RangeError('Tháng âm phải từ 1 đến 12');
    if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30)
      throw new RangeError('Ngày âm phải từ 1 đến 30');
    for (const branch of [yearBranch, taPhuBranch, huuBatBranch]) {
      if (!Number.isInteger(branch) || branch < 0 || branch > 11)
        throw new RangeError('Chi năm/Tả Phụ/Hữu Bật phải từ 0 đến 11');
    }
    const place = (name, branch, basis) => ({name, branch, basis, ruleSet: RULESET});
    const rieu = mod(1 + lunarMonth - 1, 12);
    return [
      place('Thiên Hình', mod(9 + lunarMonth - 1, 12), 'thang-am'),
      place('Thiên Riêu', rieu, 'thang-am'),
      place('Thiên Y', rieu, 'thang-am'),
      place('Thiên Khốc', mod(6 - yearBranch, 12), 'chi-nam-sinh'),
      place('Thiên Hư', mod(6 + yearBranch, 12), 'chi-nam-sinh'),
      place('Tam Thai', mod(taPhuBranch + lunarDay - 1, 12), 'ta-phu-va-ngay-am'),
      place('Bát Tọa', mod(huuBatBranch - (lunarDay - 1), 12), 'huu-bat-va-ngay-am'),
    ];
  }
  const api = Object.freeze({calculate, RULESET});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThienDoAdditionalStars = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
