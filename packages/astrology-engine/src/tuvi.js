/* THIÊN ĐỒ V6 — 12 cung + 14 chính tinh, conventional Tam Hợp reference rules.
   No predictive conclusions. Rule set versioned for later expert verification. */
(function (root) {
    'use strict';
    const Lunar = (typeof module !== 'undefined' && module.exports) ? require('./lunar.js') : root.ThienDoLunar;
    const Almanac = (typeof module !== 'undefined' && module.exports) ? require('./almanac.js') : root.ThienDoAlmanac;
    const BaZi = (typeof module !== 'undefined' && module.exports) ? require('./bazi.js') : root.ThienDoBaZi;
    const GoodDays = (typeof module !== 'undefined' && module.exports) ? require('./good-days.js') : root.ThienDoGoodDays;
    const ZiPingDepth = (typeof module!=='undefined'&&module.exports) ? require('./ziping-depth.cjs') : null;
    const TrachNhatDepth = (typeof module!=='undefined'&&module.exports) ? require('./trach-nhat-specialized.cjs') : null;
    const Aux = (typeof module !== 'undefined' && module.exports) ? require('./auxiliary.js') : root.ThienDoAuxiliary;
    const TuHoa = (typeof module !== 'undefined' && module.exports) ? require('./tuhoa.js') : root.ThienDoTuHoa;
    const Cycles = (typeof module !== 'undefined' && module.exports) ? require('./cycles.js') : root.ThienDoCycles;
    const YearStars = (typeof module !== 'undefined' && module.exports) ? require('./year-stars.js') : root.ThienDoYearStars;
    const StarStrength = (typeof module !== 'undefined' && module.exports) ? require('./star-strength.js') : root.ThienDoStarStrength;
    const AdditionalStars = (typeof module !== 'undefined' && module.exports) ? require('./additional-stars.js') : root.ThienDoAdditionalStars;
    const BeneficStars = (typeof module !== 'undefined' && module.exports) ? require('./benefic-stars.js') : (root.ThienDoBeneficStars || {RULESET:'benefic-stars-unavailable-legacy',calculate(){return [];}});
    const PositionalStars = (typeof module !== 'undefined' && module.exports) ? require('./positional-stars.js') : (root.ThienDoPositionalStars || {RULESET:'positional-stars-unavailable-legacy',calculate(){return [];}});
    const MissingStars = (typeof module !== 'undefined' && module.exports) ? require('./missing-stars.js') : (root.ThienDoMissingStars || {RULESET:'missing-stars-unavailable-legacy',calculate(){return [];}});
    const DerivedStars = (typeof module !== 'undefined' && module.exports) ? require('./derived-stars.js') : (root.ThienDoDerivedStars || {RULESET:'derived-stars-unavailable-legacy',calculate(){return [];}});
    const NatalExtensions = (typeof module !== 'undefined' && module.exports) ? require('./natal-extensions.js') : (root.ThienDoNatalExtensions || {RULESET:'natal-extensions-unavailable',calculate(){return [];}});
    const TraditionalStars = (typeof module !== 'undefined' && module.exports) ? require('./traditional-stars.js') : (root.ThienDoTraditionalStars || {RULESET:'traditional-stars-unavailable-legacy',calculate(){return [];}});
    const AdvancedPlacements = (typeof module !== 'undefined' && module.exports) ? require('./advanced-placements.js') : (root.ThienDoAdvancedPlacements || {RULESET:'advanced-placements-unavailable-legacy',calculate(){return {stars:[],obstructions:[]};}});
    // Offline UMD consumers that load only the old scripts must still be able to calculate a chart.
    const PalaceResearch = (typeof module !== 'undefined' && module.exports) ? require('./palace-research.js') : (root.ThienDoPalaceResearch || { RULESET: 'palace-evidence-v1.0', build() { throw new Error('Cần tải palace-research.js trước tuvi.js để nghiên cứu cung.'); } });
    const TraceableFindings = (typeof module !== 'undefined' && module.exports) ? require('./traceable-findings.js') : (root.ThienDoTraceableFindings || {RULESET:'palace-traceable-findings-v1.0',build(){throw new Error('Cần tải traceable-findings.js trước tuvi.js để lập phiếu luận cứ.');}});
    const Annual = (typeof module !== 'undefined' && module.exports) ? require('./annual.js') : root.ThienDoAnnual;
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
        if (typeof leap !== 'boolean' || (calendar === 'solar' && leap))
            throw new RangeError('Cờ tháng nhuận phải là boolean và chỉ dùng cho lịch âm');
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)
            throw new RangeError('Giờ phút sinh không hợp lệ');
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
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
            solar = Lunar.lunarToSolar(y, m, d, leap);
            lunar = { year: y, month: m, day: d, leap };
        }
        else
            throw new RangeError('Chưa hỗ trợ loại lịch này');
        const hBranch = hourBranch(hour), { menh, than } = branchesOfChart(lunar.month, hBranch), yearStem = stemOfYear(lunar.year);
        const cuc = cucFromMenh(yearStem, menh), z = ziWeiPosition(lunar.day, cuc.number), stars = majorStars(z);
        const auxiliaries = Aux.calculate({ yearStem, lunarMonth: lunar.month, hourBranch: hBranch });
        const transformations = TuHoa.calculate(yearStem, [...stars, ...auxiliaries]);
        const yearBranch = mod(lunar.year - 4, 12);
        const yearStars = YearStars.calculate(yearBranch);
        const taPhuBranch = auxiliaries.find(x => x.name === 'Tả Phụ').branch;
        const huuBatBranch = auxiliaries.find(x => x.name === 'Hữu Bật').branch;
        const additionalStars = AdditionalStars.calculate({lunarMonth: lunar.month, lunarDay: lunar.day, yearBranch, taPhuBranch, huuBatBranch});
        const traditionalStars = TraditionalStars.calculate({yearStem,yearBranch,lunarDay:lunar.day,
            vanXuongBranch:auxiliaries.find(s=>s.name==='Văn Xương').branch,
            vanKhucBranch:auxiliaries.find(s=>s.name==='Văn Khúc').branch});
        // Separate the four new sát tinh from the original seven auxiliary extension rules.
        const advanced = AdvancedPlacements.calculate({yearStem,yearBranch,hourBranch:hBranch,gender});
        const locTonBranch = auxiliaries.find(x => x.name === 'Lộc Tồn').branch;
        const natalExtensions = NatalExtensions.calculate({yearStem,yearBranch,locTonBranch});
        const beneficStars = BeneficStars.calculate({yearBranch,lunarMonth:lunar.month});
        const cycles = Cycles.calculate({ yearStem, yearBranch, gender, cucNumber: cuc.number, locTonBranch, menhBranch: menh });
        const positionalStars = PositionalStars.calculate(BRANCHES.map((branch,i)=>({branchIndex:i,palace:HOUSES[mod(i-menh,12)]})));
        const derivedStars = DerivedStars.calculate({yearStem,yearBranch,menhBranch:menh,thanBranch:than,locTonBranch});
        const missingStars = MissingStars.calculate({yearStem,yearBranch,lunarMonth:lunar.month,hourBranch:hBranch});
        const houses = BRANCHES.map((branch, i) => ({ branch, branchIndex: i, stem: STEMS[stemAtBranch(yearStem, i)], cell: POS_CELL[i], palace: HOUSES[mod(i - menh, 12)], isThan: i === than, stars: stars.filter(s => s.branch === i).map(s => s.name), mainStarStrengths: stars.filter(s => s.branch === i).map(s => StarStrength.lookup(s.name, i)), auxiliaryStars: auxiliaries.filter(s => s.branch === i).map(s => s.name), yearStars: yearStars.filter(s => s.branch === i).map(s => s.name), additionalStars: additionalStars.filter(s => s.branch === i).map(s => s.name), additionalStarDetails: additionalStars.filter(s => s.branch === i), traditionalStars:traditionalStars.filter(s=>s.branch===i).map(s=>s.name), traditionalStarDetails:traditionalStars.filter(s=>s.branch===i), beneficStars:beneficStars.filter(s=>s.branch===i).map(s=>s.name), beneficStarDetails:beneficStars.filter(s=>s.branch===i), positionalStars:positionalStars.filter(s=>s.branch===i).map(s=>s.name), positionalStarDetails:positionalStars.filter(s=>s.branch===i), derivedStars:derivedStars.filter(s=>s.branch===i).map(s=>s.name), derivedStarDetails:derivedStars.filter(s=>s.branch===i), missingStars:missingStars.filter(s=>s.branch===i).map(s=>s.name), missingStarDetails:missingStars.filter(s=>s.branch===i), natalExtensionStars:natalExtensions.filter(s=>s.branch===i).map(s=>s.name), natalExtensionStarDetails:natalExtensions.filter(s=>s.branch===i), advancedStars:advanced.stars.filter(s => s.branch === i).map(s => s.name), advancedStarDetails:advanced.stars.filter(s => s.branch === i), obstructionMarkers:advanced.obstructions.filter(s => s.branches.includes(i)).map(s => s.name), tuHoa: transformations.filter(s => s.branch === i).map(s => ({ name: s.name, star: s.star })), cycleStars: { thaiTue: cycles.thaiTue.filter(s => s.branch === i).map(s => s.name), bacSi: cycles.bacSi.filter(s => s.branch === i).map(s => s.name), trangSinh: cycles.trangSinh.filter(s => s.branch === i).map(s => s.name) }, daiHan: cycles.daiHan.find(x => x.branch === i) }));
        const warnings = [];
        if (hour === 23)
            warnings.push('Giờ 23:00–23:59 có khác biệt quy ước chuyển ngày Tý; V6 đang giữ ngày dân sự nhập vào, cần đối chiếu trường phái.');
        if (lunar.leap)
            warnings.push('Tháng âm nhuận: V6 dùng cùng thứ tự tháng cho Mệnh và Tả/Hữu; các trường phái có quy ước khác.');
        if (solar.year < 1950)
            warnings.push('Lịch sử múi giờ Việt Nam có giai đoạn khác UTC+7; nên kiểm tra nơi và giờ sinh thực tế.');
        if(MissingStars.RULESET==='missing-stars-unavailable-legacy') warnings.push('Bản HTML ngoại tuyến chưa tải missing-stars.js V11.19 nên thiếu Thiên Trù/Lưu Hà/Thiên Không/Đẩu Quân.');
        if(DerivedStars.RULESET==='derived-stars-unavailable-legacy') warnings.push('Bản HTML ngoại tuyến chưa tải lớp sao Mệnh–Thân–Lộc Tồn V11.18, cần nạp derived-stars.js trước tuvi.js để hiển thị ba sao này.');
        warnings.push('Vòng Tràng Sinh V6 dùng bộ khởi cố định theo Cục; có dị bản đổi điểm khởi khi đi nghịch.');
        warnings.push('Tuổi Đại hạn là tuổi mụ theo Cục, không phải tuổi dương lịch chính xác.');
        warnings.push('Tứ Hóa V6 dùng bảng Toàn Tập phổ biến; một số tài liệu/phái có dị bản, nhất là Canh/Nhâm.');
        warnings.push(advanced.stars.length ? 'V11.6 an thêm Không/Kiếp/Hỏa/Linh và cặp Tuần/Triệt theo một dị bản có ghi nguồn; không phải bảng an sao đầy đủ mọi trường phái.' : 'Bản ngoại tuyến cũ chưa tải lớp an sao V11.6 nên không hiển thị Không/Kiếp/Hỏa/Linh, Tuần/Triệt.');
        return { ruleSet: RULESET, auxiliaryRuleSet: Aux.RULESET, tuHoaRuleSet: TuHoa.RULESET, solar, lunar, hour, minute, hourBranch: BRANCHES[hBranch], gender, yearCanChi: `${STEMS[yearStem]} ${BRANCHES[mod(lunar.year - 4, 12)]}`, menh: BRANCHES[menh], than: BRANCHES[than], thanPalace: houses[than].palace, cuc, ziWei: BRANCHES[z], thienPhu: BRANCHES[mod(4 - z, 12)], houses, auxiliaries, yearStars, yearStarRuleSet: YearStars.RULESET, additionalStars, additionalStarRuleSet: AdditionalStars.RULESET, traditionalStars, traditionalStarRuleSet:TraditionalStars.RULESET, beneficStars, beneficStarRuleSet:BeneficStars.RULESET, positionalStars, positionalStarRuleSet:PositionalStars.RULESET, derivedStars, derivedStarRuleSet:DerivedStars.RULESET, missingStars, missingStarRuleSet:MissingStars.RULESET, natalExtensionStars:natalExtensions, natalExtensionStarRuleSet:NatalExtensions.RULESET, advancedStars:advanced.stars, advancedStarRuleSet:AdvancedPlacements.RULESET, obstructionMarkers:advanced.obstructions, mainStarStrengthRuleSet: StarStrength.RULESET, transformations, cycles, warnings, coverage: { coreHouses: 12, mainStars: 14, auxiliaryStars: 9, yearBranchStars: 5, fortuneCycles: true, thaiTue: 12, bacSi: 12, trangSinh: 12, daiHan: 12, tieuHan: 'tieu-han-tu-mo-nam-thuan-nu-nghich-v1', tuHoa: true, annualTuHoaOnly: true, annualOverlayRuleSet: 'annual-layers-2026-v11.16', annualLuuTuHoa: true, annualLuuStars: 12, additionalRuleBasedStars: 7, traditionalRuleBasedStars:traditionalStars.length, beneficRuleBasedStars:beneficStars.length, positionalRuleBasedStars:positionalStars.length, derivedRuleBasedStars:derivedStars.length, missingRuleBasedStars:missingStars.length, natalExtensionRuleBasedStars:natalExtensions.length, advancedStars:advanced.stars.length, pairedObstructions:advanced.obstructions.length, fullLuuNien:false, mainStarStrengthCells: 168, mainStarStrengthProfile: StarStrength.RULESET }, reference: 'Lịch Hồ Ngọc Đức; Tam Hợp; Tứ Hóa; vòng sao & đại hạn V5; sao chi năm V6; V11.6 — xem docs/reference/advanced-stars-and-periods.md' };
    }
    const api = Object.freeze({ traceableFindingsRuleSet: TraceableFindings.RULESET, traceableFindings: TraceableFindings.build, palaceResearchRuleSet: PalaceResearch.RULESET, palaceResearch: PalaceResearch.build, additionalStarRuleSet: AdditionalStars.RULESET, advancedStarRuleSet:AdvancedPlacements.RULESET, traditionalStarRuleSet:TraditionalStars.RULESET, calculateTraditionalStars:TraditionalStars.calculate, natalExtensionStarRuleSet:NatalExtensions.RULESET, beneficStarRuleSet:BeneficStars.RULESET, calculateBeneficStars:BeneficStars.calculate, positionalStarRuleSet:PositionalStars.RULESET, calculatePositionalStars:PositionalStars.calculate, derivedStarRuleSet:DerivedStars.RULESET, calculateDerivedStars:DerivedStars.calculate, missingStarRuleSet:MissingStars.RULESET, calculateMissingStars:MissingStars.calculate, calculateNatalExtensionStars:NatalExtensions.calculate, calculateAdvancedPlacements:AdvancedPlacements.calculate, mainStarStrengthRuleSet: StarStrength.RULESET, mainStarStrengthSource: StarStrength.SOURCE, lookupMainStarStrength: StarStrength.lookup, mainStarStrengthMatrix: StarStrength.matrix, calculateAdditionalStars: AdditionalStars.calculate, baziCalculate: BaZi.calculate, baziDaYun: BaZi.daYun, zipingDeepResearch: (input) => {if(!ZiPingDepth)throw new Error('Chế độ Tử Bình nghiên cứu yêu cầu engine mới');return ZiPingDepth.evaluate(input);}, zipingDeepRuleSet:'zi-ping-three-methods-verified-gates-v11.134', trachNhatEvaluate: (input) => {if(!TrachNhatDepth)throw new Error('Chế độ Trạch Nhật chuyên sâu yêu cầu engine mới');return TrachNhatDepth.evaluate(input);}, trachNhatRuleSet:'trach-nhat-independent-purpose-lenses-v11.134', baziDaYunRuleSet: BaZi.DA_YUN_RULESET, baziRuleSet: BaZi.RULESET, goodDaysSearchMonth: GoodDays.searchMonth, goodDaysSearchRange: GoodDays.searchRange, goodDaysCompare: GoodDays.compareDays, goodDaysEvaluateDay: GoodDays.evaluateDay, goodDaysPurposes: GoodDays.PURPOSES, goodDaysRuleSet: GoodDays.RULESET, calendarDay: Almanac.dayInfo, calendarMonth: Almanac.monthView, calendarLunarToSolar: Almanac.convertLunarToSolar, calendarRuleSet: Almanac.RULESET, solarTermInfo: Almanac.solarTermInfo, solarMonthCanChi: Almanac.solarMonthCanChi, auspiciousHours: Almanac.auspiciousHours, twelveTruc: Almanac.twelveTruc, daySpirit: Almanac.daySpirit, twentyEightTu: Almanac.twentyEightTu, calculate, majorStars, ziWeiPosition, branchesOfChart, cucFromMenh, stemAtBranch, hourBranch, annualOverview: Annual.annualOverview, suggestedAnnualYear: Annual.suggestedAnnualYear, currentVietnamLunarYear: Annual.currentVietnamLunarYear, BRANCHES, STEMS, HOUSES, POS_CELL, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoTuVi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
