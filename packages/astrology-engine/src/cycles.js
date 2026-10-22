/* THIÊN ĐỒ V5 — conventional 12-star cycles and 10-year đại hạn.
   These are reproducible traditional placements, not scientific predictions.
   Index of 12 terrestrial branches: Tý=0, Sửu=1,...,Hợi=11.
   Version policy: baseline Tràng Sinh (fixed anchor by Cục) is ONE variant;
   alternative yin-sex reversed anchors are not silently conflated.
*/
(function (root) {
    'use strict';
    const mod = (a, n) => ((a % n) + n) % n;
    const RULESET = 'cycles-tam-hop-fixed-anchor-v5.0';
    const THAI_TUE = ['Thái Tuế', 'Thiếu Dương', 'Tang Môn', 'Thiếu Âm', 'Quan Phù', 'Tử Phù', 'Tuế Phá', 'Long Đức', 'Bạch Hổ', 'Phúc Đức', 'Điếu Khách', 'Trực Phù'];
    const BAC_SI = ['Bác Sĩ', 'Lực Sĩ', 'Thanh Long', 'Tiểu Hao', 'Tướng Quân', 'Tấu Thư', 'Phi Liêm', 'Hỷ Thần', 'Bệnh Phù', 'Đại Hao', 'Phục Binh', 'Quan Phủ'];
    const TRANG_SINH = ['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng'];
    const TS_ANCHOR = Object.freeze({ 2: 8, 3: 11, 4: 5, 5: 8, 6: 2 }); // Thuỷ/Thổ Thân; Mộc Hợi; Kim Tỵ; Hỏa Dần
    function direction(yearStem, gender) {
        if (!Number.isInteger(yearStem) || yearStem < 0 || yearStem > 9)
            throw new RangeError('Can năm không hợp lệ');
        if (!['Nam', 'Nữ'].includes(gender))
            throw new RangeError('Giới tính không hợp lệ');
        // Even numbered heavenly stems are yang; yang male and yin female => +1.
        return ((yearStem % 2 === 0) === (gender === 'Nam')) ? 1 : -1;
    }
    function place(names, start, step, basis) {
        return names.map((name, index) => ({ name, branch: mod(start + index * step, 12), basis }));
    }
    function calculate({ yearStem, yearBranch, gender, cucNumber, locTonBranch, menhBranch }) {
        for (const b of [yearBranch, locTonBranch, menhBranch])
            if (!Number.isInteger(b) || b < 0 || b > 11)
                throw new RangeError('Địa chi phải từ 0 đến 11');
        if (!Object.prototype.hasOwnProperty.call(TS_ANCHOR, cucNumber))
            throw new RangeError('Cục phải là 2, 3, 4, 5 hoặc 6');
        const step = direction(yearStem, gender);
        const thaiTue = place(THAI_TUE, yearBranch, 1, 'chi-nam-sinh');
        const bacSi = place(BAC_SI, locTonBranch, step, 'loc-ton-va-am-duong-nam-nu');
        const trangSinh = place(TRANG_SINH, TS_ANCHOR[cucNumber], step, 'cuc-va-am-duong-nam-nu');
        const daiHan = Array.from({ length: 12 }, (_, index) => ({
            branch: mod(menhBranch + step * index, 12),
            fromAge: cucNumber + 10 * index,
            toAge: cucNumber + 10 * index + 9,
            index,
            basis: 'tuoi-mu-theo-cuc',
        }));
        return { ruleSet: RULESET, direction: step, thaiTue, bacSi, trangSinh, daiHan };
    }
    // 2026 means Bính Ngọ cycle-year here, *not* January 1 to December 31.
    function yearBranch(year) {
        if (!Number.isInteger(year) || year < 1900 || year > 2100)
            throw new RangeError('Năm tra cứu từ 1900 đến 2100');
        return mod(year - 4, 12);
    }
    function yearHighlight(year) { return { year, branch: yearBranch(year), label: 'Lưu Thái Tuế / chi năm tra cứu', basis: 'nam-am-lich-canchi', warning: 'Năm tra cứu là năm Can Chi (âm lịch); không phải kết quả an toàn bộ lưu niên hoặc tiểu hạn.' }; }
    const api = Object.freeze({ RULESET, THAI_TUE, BAC_SI, TRANG_SINH, TS_ANCHOR, direction, calculate, yearBranch, yearHighlight });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoCycles = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
