/* THIÊN ĐỒ V4 — 9 secondary stars by stem/month/hour.
 * Branch indexes: Tý=0 ... Hợi=11; traditional positioning, UTC+7 already
 * handled by engine/lunar.js. Do not use as an absolute prediction engine.
 * Rule reference: see docs/SOURCES_AND_VARIANTS.md.
 */
(function (root) {
    'use strict';
    const mod = (x, n) => ((x % n) + n) % n;
    const LOC_TON = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
    // Giáp/Mậu Khôi Sửu, Việt Mùi; Ất/Kỷ Tý/Thân; Bính/Đinh Hợi/Dậu;
    // Canh/Tân Ngọ/Dần; Nhâm/Quý Mão/Tỵ.
    const KHOI = [1, 0, 11, 11, 1, 0, 6, 6, 3, 3];
    const VIET = [7, 8, 9, 9, 7, 8, 2, 2, 5, 5];
    const RULESET = 'aux-nine-v4.0';
    function calculate({ yearStem, lunarMonth, hourBranch }) {
        if (!Number.isInteger(yearStem) || yearStem < 0 || yearStem > 9)
            throw new RangeError('Can năm không hợp lệ');
        if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12)
            throw new RangeError('Tháng âm không hợp lệ');
        if (!Number.isInteger(hourBranch) || hourBranch < 0 || hourBranch > 11)
            throw new RangeError('Chi giờ không hợp lệ');
        const loc = LOC_TON[yearStem];
        const defs = [
            ['Lộc Tồn', loc, 'can-nam'],
            ['Kình Dương', mod(loc + 1, 12), 'can-nam'],
            ['Đà La', mod(loc - 1, 12), 'can-nam'],
            ['Tả Phụ', mod(4 + lunarMonth - 1, 12), 'thang-am'],
            ['Hữu Bật', mod(10 - (lunarMonth - 1), 12), 'thang-am'],
            ['Văn Xương', mod(10 - hourBranch, 12), 'gio-sinh'],
            ['Văn Khúc', mod(4 + hourBranch, 12), 'gio-sinh'],
            ['Thiên Khôi', KHOI[yearStem], 'can-nam'],
            ['Thiên Việt', VIET[yearStem], 'can-nam'],
        ];
        return defs.map(([name, branch, basis]) => ({ name, branch, basis }));
    }
    const api = Object.freeze({ calculate, RULESET, LOC_TON, KHOI, VIET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoAuxiliary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
