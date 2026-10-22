/* THIÊN ĐỒ V4 — Annual natal four transformations, one explicitly versioned
 * table. Do NOT conflate with other Toàn Thư/Trung Châu variants or phi hóa.
 * Four labels are assigned to the existing natal chart stars.
 * See docs/SOURCES_AND_VARIANTS.md for bibliography and conflicting tables.
 */
(function (root) {
    'use strict';
    const ROWS = [
        ['Liêm Trinh', 'Phá Quân', 'Vũ Khúc', 'Thái Dương'], // Giáp
        ['Thiên Cơ', 'Thiên Lương', 'Tử Vi', 'Thái Âm'], // Ất
        ['Thiên Đồng', 'Thiên Cơ', 'Văn Xương', 'Liêm Trinh'], // Bính
        ['Thái Âm', 'Thiên Đồng', 'Thiên Cơ', 'Cự Môn'], // Đinh
        ['Tham Lang', 'Thái Âm', 'Hữu Bật', 'Thiên Cơ'], // Mậu
        ['Vũ Khúc', 'Tham Lang', 'Thiên Lương', 'Văn Khúc'], // Kỷ
        ['Thái Dương', 'Vũ Khúc', 'Thái Âm', 'Thiên Đồng'], // Canh
        ['Cự Môn', 'Thái Dương', 'Văn Khúc', 'Văn Xương'], // Tân
        ['Thiên Lương', 'Tử Vi', 'Tả Phụ', 'Vũ Khúc'], // Nhâm
        ['Phá Quân', 'Cự Môn', 'Thái Âm', 'Tham Lang'], // Quý
    ];
    const TYPES = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ'];
    const RULESET = 'annual-tuhoa-tap-v4.0';
    function calculate(yearStem, stars) {
        if (!Number.isInteger(yearStem) || yearStem < 0 || yearStem > 9)
            throw new RangeError('Can năm không hợp lệ');
        if (!Array.isArray(stars))
            throw new TypeError('Thiếu dữ liệu sao an thực tế');
        const index = new Map();
        for (const s of stars) {
            if (index.has(s.name))
                throw new Error(`Sao bị trùng tên: ${s.name}`);
            index.set(s.name, s.branch);
        }
        return ROWS[yearStem].map((name, i) => {
            const branch = index.get(name);
            if (!Number.isInteger(branch) || branch < 0 || branch > 11)
                throw new Error(`Không tìm thấy sao nhận ${TYPES[i]}: ${name}`);
            return { name: TYPES[i], star: name, branch };
        });
    }
    const api = Object.freeze({ calculate, ROWS, TYPES, RULESET });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoTuHoa = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
