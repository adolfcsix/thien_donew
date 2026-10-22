/* V6 automated structural checks. Not expert verification of fortune rules. */
(function (root) {
    'use strict';
    const RULESET = 'chart-structure-v6.0';
    function check(result) {
        const checks = [];
        const test = (name, passed) => checks.push({ name, passed: Boolean(passed) });
        const valid = (items, count) => Array.isArray(items) && items.length === count && items.every(x => Number.isInteger(x.branch) && x.branch >= 0 && x.branch < 12);
        const h = result && result.houses || [];
        test('Đủ 12 cung không trùng địa chi', h.length === 12 && new Set(h.map(x => x.branchIndex)).size === 12);
        test('Đủ 12 cung chức', h.length === 12 && new Set(h.map(x => x.palace)).size === 12);
        test('14 chính tinh, tên không trùng', h.flatMap(x => x.stars || []).length === 14 && new Set(h.flatMap(x => x.stars || [])).size === 14);
        test('9 phụ tinh nhóm V4', valid(result.auxiliaries, 9) && new Set(result.auxiliaries.map(x => x.name)).size === 9);
        test('5 sao theo chi năm nhóm V6', valid(result.yearStars, 5) && new Set(result.yearStars.map(x => x.name)).size === 5);
        test('Sao theo năm khớp với 12 cung', h.flatMap(x => x.yearStars || []).length === 5);
        test('4 Tứ Hóa ở vị trí sao nhận hóa', valid(result.transformations, 4) && result.transformations.every(t => h.some(p => p.branchIndex === t.branch && (p.stars.includes(t.star) || p.auxiliaryStars.includes(t.star)))));
        test('3 vòng mỗi vòng đủ 12 sao', result.cycles && ['thaiTue', 'bacSi', 'trangSinh'].every(k => valid(result.cycles[k], 12)));
        test('Đủ 12 đại hạn, không trùng cung', result.cycles && valid(result.cycles.daiHan, 12) && new Set(result.cycles.daiHan.map(x => x.branch)).size === 12);
        test('Cung Thân duy nhất', h.filter(x => x.isThan).length === 1);
        return { ruleSet: RULESET, passed: checks.every(x => x.passed), passCount: checks.filter(x => x.passed).length, total: checks.length, checks,
            disclaimer: 'Tự kiểm tra cấu trúc theo mã; không phải xác minh độ đúng chuyên môn của lá số.' };
    }
    const api = Object.freeze({ check, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoVerifier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
