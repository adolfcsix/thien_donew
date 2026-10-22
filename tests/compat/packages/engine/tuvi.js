/* THIÊN ĐỒ V6 — 12 cung + 14 chính tinh, conventional Tam Hợp reference rules.
   No predictive conclusions. Rule set versioned for later expert verification. */
(function (root) {
    'use strict';
    const Lunar = (typeof module !== 'undefined' && module.exports) ? require('./lunar.js') : root.ThienDoLunar;
    const Aux = (typeof module !== 'undefined' && module.exports) ? require('./auxiliary.js') : root.ThienDoAuxiliary;
    const TuHoa = (typeof module !== 'undefined' && module.exports) ? require('./tuhoa.js') : root.ThienDoTuHoa;
    const Cycles = (typeof module !== 'undefined' && module.exports) ? require('./cycles.js') : root.ThienDoCycles;
    const YearStars = (typeof module !== 'undefined' && module.exports) ? require('./year-stars.js') : root.ThienDoYearStars;
    const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    const STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
    const HOUSES = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];
    // Lục Thập Hoa Giáp: 30 successive two-year nạp âm elements (independent of individual's yearly mệnh).
    const NAP_AM = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
    const ELEMENT_CUC = { Thủy: 2, Mộc: 3, Kim: 4, Thổ: 5, Hỏa: 6 };
    const CUC_NAME = { Thủy: 'Thủy Nhị Cục', Mộc: 'Mộc Tam Cục', Kim: 'Kim Tứ Cục', Thổ: 'Thổ Ngũ Cục', Hỏa: 'Hỏa Lục Cục' };
    const POS_CELL = [14, 13, 12, 8, 4, 0, 1, 2, 3, 7, 11, 15];
    const RULESET = 'tam-hop-core-v6.0';
    const mod = (n, k) => ((n % k) + k) % k;
    function sexagenaryIndex(stem, branch) { for (let k = 0; k < 60; k++)
        if (k % 10 === stem && k % 12 === branch)
            return k; throw new Error('Can/Chi không cùng âm dương'); }
    function hourBranch(hour) { if (!Number.isInteger(hour) || hour < 0 || hour > 23)
        throw new RangeError('Giờ phải từ 0 đến 23'); return mod(Math.floor((hour + 1) / 2), 12); }
    function stemOfYear(y) { return mod(y - 4, 10); }
    function branchesOfChart(lunarMonth, hourBranchIndex) { const base = mod(2 + lunarMonth - 1, 12); return { menh: mod(base - hourBranchIndex, 12), than: mod(base + hourBranchIndex, 12) }; }
    function stemAtBranch(yearStem, branchIndex) {
        const starts = [2, 4, 6, 8, 0];
        const d = startFromStem(yearStem);
        return mod(d + mod(branchIndex - 2, 12), 10);
    }
    function startFromStem(stem) { return [2, 4, 6, 8, 0][stem % 5]; }
    function cucFromMenh(yearStem, menhBranch) { const s = stemAtBranch(yearStem, menhBranch); const k = sexagenaryIndex(s, menhBranch); const element = NAP_AM[Math.floor(k / 2)]; return { element, number: ELEMENT_CUC[element], name: CUC_NAME[element], stem: s, naAmIndex: k }; }
    function ziWeiPosition(lunarDay, cuc) {
        if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30 || ![2, 3, 4, 5, 6].includes(cuc))
            throw new RangeError('Ngày hoặc Cục không hợp lệ');
        const borrow = mod(-lunarDay, cuc), q = (lunarDay + borrow) / cuc;
        const anchor = mod(2 + q - 1, 12); // Đếm từ Dần = 1
        return mod(anchor + (borrow % 2 === 0 ? borrow : -borrow), 12);
    }
    function majorStars(zi) {
        const fu = mod(4 - zi, 12);
        const slots = [
            ['Tử Vi', zi], ['Thiên Cơ', mod(zi - 1, 12)], ['Thái Dương', mod(zi - 3, 12)], ['Vũ Khúc', mod(zi - 4, 12)], ['Thiên Đồng', mod(zi - 5, 12)], ['Liêm Trinh', mod(zi - 8, 12)],
            ['Thiên Phủ', fu], ['Thái Âm', mod(fu + 1, 12)], ['Tham Lang', mod(fu + 2, 12)], ['Cự Môn', mod(fu + 3, 12)], ['Thiên Tướng', mod(fu + 4, 12)], ['Thiên Lương', mod(fu + 5, 12)], ['Thất Sát', mod(fu + 6, 12)], ['Phá Quân', mod(fu + 10, 12)]
        ];
        return slots.map(([name, branch]) => ({ name, branch }));
    }
    function calculate(input) {
        const { date, hour, minute = 0, gender = 'Nam', calendar = 'solar', leap = false } = input || {};
        if (!['Nam', 'Nữ'].includes(gender))
            throw new RangeError('Giới tính an sao cần Nam hoặc Nữ');
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)
            throw new RangeError('Giờ phút sinh không hợp lệ');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ''))
            throw new RangeError('Ngày phải là YYYY-MM-DD');
        const [y, m, d] = date.split('-').map(Number);
        let solar, lunar;
        if (calendar === 'solar') {
            if (!Lunar.validSolar(y, m, d))
                throw new RangeError('Ngày dương không hợp lệ hoặc ngoài 1900–2100');
            solar = { year: y, month: m, day: d };
            lunar = Lunar.solarToLunar(y, m, d);
        }
        else if (calendar === 'lunar') {
            solar = Lunar.lunarToSolar(y, m, d, Boolean(leap));
            lunar = { year: y, month: m, day: d, leap: Boolean(leap) };
        }
        else
            throw new RangeError('Chưa hỗ trợ loại lịch này');
        const hBranch = hourBranch(hour), { menh, than } = branchesOfChart(lunar.month, hBranch), yearStem = stemOfYear(lunar.year);
        const cuc = cucFromMenh(yearStem, menh), z = ziWeiPosition(lunar.day, cuc.number), stars = majorStars(z);
        const auxiliaries = Aux.calculate({ yearStem, lunarMonth: lunar.month, hourBranch: hBranch });
        const transformations = TuHoa.calculate(yearStem, [...stars, ...auxiliaries]);
        const yearBranch = mod(lunar.year - 4, 12);
        const yearStars = YearStars.calculate(yearBranch);
        const locTonBranch = auxiliaries.find(x => x.name === 'Lộc Tồn').branch;
        const cycles = Cycles.calculate({ yearStem, yearBranch, gender, cucNumber: cuc.number, locTonBranch, menhBranch: menh });
        const houses = BRANCHES.map((branch, i) => ({ branch, branchIndex: i, stem: STEMS[stemAtBranch(yearStem, i)], cell: POS_CELL[i], palace: HOUSES[mod(i - menh, 12)], isThan: i === than, stars: stars.filter(s => s.branch === i).map(s => s.name), auxiliaryStars: auxiliaries.filter(s => s.branch === i).map(s => s.name), yearStars: yearStars.filter(s => s.branch === i).map(s => s.name), tuHoa: transformations.filter(s => s.branch === i).map(s => ({ name: s.name, star: s.star })), cycleStars: { thaiTue: cycles.thaiTue.filter(s => s.branch === i).map(s => s.name), bacSi: cycles.bacSi.filter(s => s.branch === i).map(s => s.name), trangSinh: cycles.trangSinh.filter(s => s.branch === i).map(s => s.name) }, daiHan: cycles.daiHan.find(x => x.branch === i) }));
        const warnings = [];
        if (hour === 23)
            warnings.push('Giờ 23:00–23:59 có khác biệt quy ước chuyển ngày Tý; V6 đang giữ ngày dân sự nhập vào, cần đối chiếu trường phái.');
        if (lunar.leap)
            warnings.push('Tháng âm nhuận: V6 dùng cùng thứ tự tháng cho Mệnh và Tả/Hữu; các trường phái có quy ước khác.');
        if (solar.year < 1950)
            warnings.push('Lịch sử múi giờ Việt Nam có giai đoạn khác UTC+7; nên kiểm tra nơi và giờ sinh thực tế.');
        warnings.push('Vòng Tràng Sinh V6 dùng bộ khởi cố định theo Cục; có dị bản đổi điểm khởi khi đi nghịch.');
        warnings.push('Tuổi Đại hạn là tuổi mụ theo Cục, không phải tuổi dương lịch chính xác.');
        warnings.push('Tứ Hóa V6 dùng bảng Toàn Tập phổ biến; một số tài liệu/phái có dị bản, nhất là Canh/Nhâm.');
        return { ruleSet: RULESET, auxiliaryRuleSet: Aux.RULESET, tuHoaRuleSet: TuHoa.RULESET, solar, lunar, hour, minute, hourBranch: BRANCHES[hBranch], gender, yearCanChi: `${STEMS[yearStem]} ${BRANCHES[mod(lunar.year - 4, 12)]}`, menh: BRANCHES[menh], than: BRANCHES[than], thanPalace: houses[than].palace, cuc, ziWei: BRANCHES[z], thienPhu: BRANCHES[mod(4 - z, 12)], houses, auxiliaries, yearStars, yearStarRuleSet: YearStars.RULESET, transformations, cycles, warnings, coverage: { coreHouses: 12, mainStars: 14, auxiliaryStars: 9, yearBranchStars: 5, fortuneCycles: true, thaiTue: 12, bacSi: 12, trangSinh: 12, daiHan: 12, tieuHan: false, fullLuuNien: false, tuHoa: true, annualTuHoaOnly: true }, reference: 'Lịch Hồ Ngọc Đức; Tam Hợp; Tứ Hóa; vòng sao & đại hạn V5; sao chi năm V6 — xem docs/SOURCES_AND_VARIANTS.md' };
    }
    const api = Object.freeze({ calculate, majorStars, ziWeiPosition, branchesOfChart, cucFromMenh, stemAtBranch, hourBranch, BRANCHES, STEMS, HOUSES, POS_CELL, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoTuVi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
