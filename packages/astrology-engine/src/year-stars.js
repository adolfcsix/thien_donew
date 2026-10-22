/* THIÊN ĐỒ V6: Five stars positioned from lunar birth-year branch.
 * Branch index convention: Ty=0 ... Hoi=11. Sources/variants in docs.
 * Explicit, bounded, educational rules. No predictive interpretation. */
(function (root) {
    'use strict';
    const RULESET = 'year-branch-five-v6.0';
    const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    const YEAR_TABLE = [
        /* birth year in */
        { branches: [2, 6, 10], ma: 8, dao: 3, cai: 10, label: 'Dần – Ngọ – Tuất' },
        { branches: [8, 0, 4], ma: 2, dao: 9, cai: 4, label: 'Thân – Tý – Thìn' },
        { branches: [5, 9, 1], ma: 11, dao: 6, cai: 1, label: 'Tỵ – Dậu – Sửu' },
        { branches: [11, 3, 7], ma: 5, dao: 0, cai: 7, label: 'Hợi – Mão – Mùi' }
    ];
    const mod = (value, count) => ((value % count) + count) % count;
    function calculate(yearBranch) {
        if (!Number.isInteger(yearBranch) || yearBranch < 0 || yearBranch > 11) {
            throw new RangeError('Địa chi năm sinh phải từ 0 đến 11');
        }
        const group = YEAR_TABLE.find(row => row.branches.includes(yearBranch));
        if (!group)
            throw new Error('Không tìm thấy nhóm tam hợp năm sinh');
        const hongLoan = mod(3 - yearBranch, 12); // Tý -> Mão, tính nghịch
        const defs = [
            ['Thiên Mã', group.ma, 'tam-hop-chi-nam'],
            ['Đào Hoa', group.dao, 'tam-hop-chi-nam'],
            ['Hoa Cái', group.cai, 'tam-hop-chi-nam'],
            ['Hồng Loan', hongLoan, 'ty-khoi-mao-nghich'],
            ['Thiên Hỷ', mod(hongLoan + 6, 12), 'xung-chieu-hong-loan']
        ];
        return defs.map(([name, branch, basis]) => ({ name, branch, basis }));
    }
    const api = Object.freeze({ calculate, YEAR_TABLE, BRANCHES, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoYearStars = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
