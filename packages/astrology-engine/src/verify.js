/* V6 automated structural checks. Not expert verification of fortune rules. */
(function (root) {
    'use strict';
    const RULESET = 'chart-structure-v6.0';
    const StarStrength = (typeof module !== 'undefined' && module.exports) ? require('./star-strength.js') : root.ThienDoStarStrength;
    const Advanced = (typeof module !== 'undefined' && module.exports) ? require('./advanced-placements.js') : root.ThienDoAdvancedPlacements;
    const BeneficStars = (typeof module !== 'undefined' && module.exports) ? require('./benefic-stars.js') : root.ThienDoBeneficStars;
    const PositionalStars = (typeof module !== 'undefined' && module.exports) ? require('./positional-stars.js') : root.ThienDoPositionalStars;
    const MissingStars = (typeof module !== 'undefined' && module.exports) ? require('./missing-stars.js') : root.ThienDoMissingStars;
    const DerivedStars = (typeof module !== 'undefined' && module.exports) ? require('./derived-stars.js') : root.ThienDoDerivedStars;
    const NatalExtensions = (typeof module !== 'undefined' && module.exports) ? require('./natal-extensions.js') : root.ThienDoNatalExtensions;
    const Traditional = (typeof module !== 'undefined' && module.exports) ? require('./traditional-stars.js') : root.ThienDoTraditionalStars;
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
        // Optional extension: older saved/exported charts have no supplementary stars.
        if (Array.isArray(result?.additionalStars)) {
            const extras = result.additionalStars;
            test('7 sao bổ sung: đủ vị trí và khớp chính xác với 12 cung',
                valid(extras, 7) && new Set(extras.map(s => s.name)).size === 7 &&
                extras.every(s => typeof s.ruleSet === 'string' && s.ruleSet === result.additionalStarRuleSet &&
                    h.filter(house => (house.additionalStars || []).includes(s.name)).length === 1 &&
                    h.some(house => house.branchIndex === s.branch && (house.additionalStars || []).includes(s.name))) &&
                h.flatMap(house => house.additionalStars || []).length === 7);
        }

        // New traditional layer may be omitted by old exports. When present,
        // recompute it from the natal inputs independently of the chart payload.
        if (result?.traditionalStarRuleSet === Traditional?.RULESET) {
            let expected;
            try {
                const year = result.lunar.year;
                const x = result.auxiliaries.find(s => s.name==='Văn Xương');
                const k = result.auxiliaries.find(s => s.name==='Văn Khúc');
                expected = Traditional.calculate({yearStem:((year-4)%10+10)%10,
                    yearBranch:((year-4)%12+12)%12,lunarDay:result.lunar.day,
                    vanXuongBranch:x.branch,vanKhucBranch:k.branch});
            } catch (_) {expected=null;}
            test('V11.13: mười một sao truyền thống an đúng vị trí và riêng lớp',
                !!expected && valid(result.traditionalStars,11) &&
                result.traditionalStars.every(s=>s.ruleSet===Traditional.RULESET &&
                    expected.some(e=>e.name===s.name&&e.branch===s.branch)) &&
                h.flatMap(house=>house.traditionalStars||[]).length===11 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|')===
                    (house.traditionalStars||[]).join('|')));
        }

        // V11.16: recompute the separate Đức/Giải group from year branch and lunar month.
        if (result?.beneficStarRuleSet !== undefined || result?.beneficStars !== undefined) {
            let expected=null;
            try {expected=BeneficStars.calculate({yearBranch:((result.lunar.year-4)%12+12)%12,lunarMonth:result.lunar.month});}catch(_){expected=null;}
            test('V11.16: bốn sao Đức/Giải khớp vị trí trong 12 cung',
                result.beneficStarRuleSet===BeneficStars.RULESET && !!expected && valid(result.beneficStars,4) &&
                expected.every(e=>result.beneficStars.some(s=>s.name===e.name&&s.branch===e.branch&&s.ruleSet===e.ruleSet)) &&
                h.flatMap(house=>house.beneficStars||[]).length===4 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|')===(house.beneficStars||[]).join('|')));
        }

        // V11.17: exact fixed-branch and fixed-palace placements; legacy charts remain valid.
        if(result?.positionalStars !== undefined || result?.positionalStarRuleSet !== undefined) {
            let expected=null;
            try {expected=PositionalStars.calculate(h);} catch(_) {expected=null;}
            test('V11.17: bốn sao vị trí cố định khớp cung và địa chi',
                result.positionalStarRuleSet===PositionalStars.RULESET && expected!==null &&
                valid(result.positionalStars,4) &&
                expected.every(e=>result.positionalStars.some(s=>s.name===e.name && s.branch===e.branch && s.kind===e.kind && s.ruleSet===e.ruleSet)) &&
                h.flatMap(house=>house.positionalStars||[]).length===4 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|') ===
                    (house.positionalStars||[]).join('|')));
        }

        if ((result?.missingStarRuleSet!==undefined || result?.missingStars!==undefined) && result?.missingStarRuleSet!=='missing-stars-unavailable-legacy') {
            let expected=null;
            try {
                const y=result.lunar.year;
                expected=MissingStars.calculate({yearStem:((y-4)%10+10)%10,yearBranch:((y-4)%12+12)%12,
                    lunarMonth:result.lunar.month,hourBranch:Math.floor((result.hour+1)/2)%12});
            } catch (_) { expected=null; }
            test('V11.19: bốn sao an theo can, chi, tháng, giờ khớp đúng và phản chiếu một lần trên 12 cung',
                !!expected && result.missingStarRuleSet===MissingStars.RULESET && valid(result.missingStars,4) &&
                expected.every(e=>result.missingStars.some(s=>s.name===e.name && s.branch===e.branch && s.basis===e.basis && s.ruleSet===e.ruleSet)) &&
                h.flatMap(house=>house.missingStars||[]).length===4 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|')===(house.missingStars||[]).join('|')));
        }

        // V11.18: verify by recalculation from independently available source fields.
        // Older saved charts omit this optional layer and remain valid.
        if((result?.derivedStarRuleSet!==undefined || result?.derivedStars!==undefined) && result?.derivedStarRuleSet!=='derived-stars-unavailable-legacy') {
            let expected=null;
            try {
                const y=result.lunar.year;
                const loc=result.auxiliaries.find(s=>s.name==='Lộc Tồn');
                const menh=h.find(s=>s.palace==='Mệnh');
                const than=h.find(s=>s.isThan);
                expected=DerivedStars.calculate({yearStem:((y-4)%10+10)%10,yearBranch:((y-4)%12+12)%12,
                    menhBranch:menh.branchIndex,thanBranch:than.branchIndex,locTonBranch:loc.branch});
            } catch (_) {expected=null;}
            test('V11.18: Tài–Thọ–Đường Phù đúng mốc và phản chiếu duy nhất trong 12 cung',
                !!expected && result.derivedStarRuleSet===DerivedStars.RULESET && valid(result.derivedStars,3) &&
                expected.every(e=>result.derivedStars.some(s=>s.name===e.name&&s.branch===e.branch&&s.basis===e.basis&&s.ruleSet===e.ruleSet)) &&
                h.flatMap(house=>house.derivedStars||[]).length===3 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|')===(house.derivedStars||[]).join('|')));
        }

        // V11.14 validates positions and mirror arrays only when the extension layer is present.
        if (result?.natalExtensionStarRuleSet !== undefined || result?.natalExtensionStars !== undefined) {
            let expected=null;
            try {
                const y=result.lunar.year;
                const loc=result.auxiliaries.find(s=>s.name==='Lộc Tồn');
                expected=NatalExtensions.calculate({yearStem:((y-4)%10+10)%10,yearBranch:((y-4)%12+12)%12,locTonBranch:loc.branch});
            } catch (_) {expected=null;}
            test('V11.14: ba sao mở rộng và vị trí cung khớp theo Can Chi',
                result.natalExtensionStarRuleSet===NatalExtensions.RULESET &&
                !!expected && valid(result.natalExtensionStars,3) &&
                expected.every(e=>result.natalExtensionStars.some(s=>s.name===e.name && s.branch===e.branch && s.ruleSet===e.ruleSet)) &&
                h.flatMap(house=>house.natalExtensionStars||[]).length===3 &&
                h.every(house=>expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|')===
                    (house.natalExtensionStars||[]).join('|')));
        }

        // Versioned V11.6 placement layer is optional for legacy/offline charts.
        // Verify by independently re-calculating from birth year, gender, and hour.
        if (result?.advancedStarRuleSet === Advanced?.RULESET) {
            let expected;
            try {
                const y = result.lunar.year;
                expected = Advanced.calculate({yearStem:((y-4)%10+10)%10,yearBranch:((y-4)%12+12)%12,
                    hourBranch:Math.floor((result.hour+1)/2)%12,gender:result.gender});
            } catch (_) { expected = null; }
            test('V11.6: bốn sát tinh an theo Can Chi, giờ và giới tính',
                !!expected && valid(result.advancedStars,4) &&
                expected.stars.every(s => result.advancedStars.some(actual => actual.name===s.name && actual.branch===s.branch && actual.ruleSet===s.ruleSet)) &&
                h.flatMap(house => house.advancedStars || []).length === 4 &&
                h.every(house => expected.stars.filter(s=>s.branch===house.branchIndex).map(s=>s.name).join('|') === (house.advancedStars||[]).join('|')));
            test('V11.6: Tuần và Triệt án đúng hai cung mỗi cặp',
                !!expected && Array.isArray(result.obstructionMarkers) && result.obstructionMarkers.length===2 &&
                expected.obstructions.every(marker => {
                    const actual=result.obstructionMarkers.find(x=>x.name===marker.name);
                    return !!actual && actual.ruleSet===marker.ruleSet && Array.isArray(actual.branches) &&
                        actual.branches.join('|')===marker.branches.join('|') &&
                        h.filter(house=>(house.obstructionMarkers||[]).includes(marker.name)).length===2;
                }) && h.every(house => expected.obstructions.filter(m=>m.branches.includes(house.branchIndex)).map(m=>m.name).join('|') ===
                    (house.obstructionMarkers||[]).join('|')));
        }

        // Reference layer is optional for backward compatibility with V6–V10.8 charts.
        // If present, enforce exact correspondence with the named versioned profile;
        // a label cannot silently move to a different star or branch.
        if (h.some(house => house.mainStarStrengths !== undefined) || result?.mainStarStrengthRuleSet !== undefined) {
            test('168-ô mức chính tinh: nhãn khớp sao, chi và quy tắc đã chọn',
                result.mainStarStrengthRuleSet === StarStrength.RULESET &&
                h.every(house => Array.isArray(house.mainStarStrengths) &&
                    house.mainStarStrengths.length === (house.stars || []).length &&
                    new Set(house.mainStarStrengths.map(x => x.name)).size === house.mainStarStrengths.length &&
                    house.mainStarStrengths.every(item => {
                        const expected = StarStrength.lookup(item.name, house.branchIndex);
                        return Boolean(expected) && house.stars.includes(item.name) &&
                            item.branch === house.branchIndex && item.status === expected.status &&
                            item.label === expected.label && item.ruleSet === expected.ruleSet;
                    })) &&
                h.flatMap(house => house.mainStarStrengths).length === 14);
        }

        return { ruleSet: RULESET, passed: checks.every(x => x.passed), passCount: checks.filter(x => x.passed).length, total: checks.length, checks,
            disclaimer: 'Tự kiểm tra cấu trúc theo mã; không phải xác minh độ đúng chuyên môn của lá số.' };
    }
    const api = Object.freeze({ check, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoVerifier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
