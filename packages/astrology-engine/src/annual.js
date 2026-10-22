/* THIÊN ĐỒ V8.7 — các phép tra cứu VẬN NĂM mang tính bảng quy tắc.
 * Tiểu hạn: 1 dị bản Việt Nam (tam hợp chi tuổi; nam thuận, nữ nghịch).
 * Không suy luận biến cố; KHÔNG đồng nghĩa đã triển khai lưu niên đầy đủ.
 */
(function (root) {
  'use strict';
  const Lunar = (typeof module !== 'undefined' && module.exports)
    ? require('./lunar.js') : root.ThienDoLunar;
  const Layers = (typeof module !== 'undefined' && module.exports)
    ? require('./annual-layers.js') : root.ThienDoAnnualLayers;
  const BRANCHES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const STEMS = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const RULESET = 'annual-luu-tu-hoa-luu-tinh-v8.8';
  const TIEU_HAN_RULESET = 'tieu-han-tu-mo-nam-thuan-nu-nghich-v1';
  const mod = (n, k) => ((n % k) + k) % k;
  // Four mutually exclusive trigones; indices are Tý = 0, ..., Hợi = 11.
  const START_HOUSE = Object.freeze({
    2:4, 6:4, 10:4,         // Dần – Ngọ – Tuất  => Thìn
    8:10, 0:10, 4:10,       // Thân – Tý – Thìn => Tuất
    5:7, 9:7, 1:7,         // Tỵ – Dậu – Sửu   => Mùi
    11:1, 3:1, 7:1         // Hợi – Mão – Mùi  => Sửu
  });
  function annualOverview(chart, selectedLunarYear) {
    if (!chart || !chart.lunar || !Array.isArray(chart.houses) || chart.houses.length !== 12 ||
        !['Nam','Nữ'].includes(chart.gender))
      throw new TypeError('Lá số thiếu thông tin 12 cung hoặc giới tính an sao');
    const birthLunarYear = chart.lunar.year;
    if (!Number.isInteger(birthLunarYear) || !Number.isInteger(selectedLunarYear) ||
        selectedLunarYear < Math.max(1900, birthLunarYear) || selectedLunarYear > 2100)
      throw new RangeError('Năm âm lịch phải từ năm sinh (tối thiểu 1900) đến 2100');
    const ageMu = selectedLunarYear - birthLunarYear + 1;
    const birthBranchIndex = mod(birthLunarYear - 4, 12);
    const branchIndex = mod(selectedLunarYear - 4, 12);
    const stemIndex = mod(selectedLunarYear - 4, 10);
    const activeHouse = chart.houses.find(h => h.daiHan && ageMu >= h.daiHan.fromAge && ageMu <= h.daiHan.toAge) ?? null;
    const startIndex = START_HOUSE[birthBranchIndex];
    const direction = chart.gender === 'Nam' ? 1 : -1;
    const tieuHanBranchIndex = mod(startIndex + direction*(selectedLunarYear - birthLunarYear), 12);
    const tieuHanHouse = chart.houses.find(h => h.branchIndex === tieuHanBranchIndex);
    if (!tieuHanHouse) throw new TypeError('Lá số thiếu cung tương ứng với Tiểu hạn');
    const layers=Layers.calculate(chart,stemIndex,branchIndex);
    return {
      ...layers,
      ruleSet: RULESET,
      year: selectedLunarYear,
      canChi: `${STEMS[stemIndex]} ${BRANCHES[branchIndex]}`,
      luuThaiTueBranch: BRANCHES[branchIndex],
      luuThaiTueBranchIndex: branchIndex,
      ageMu,
      activeDaiHan: activeHouse ? {
        branchIndex: activeHouse.branchIndex,
        branch: activeHouse.branch,
        palace: activeHouse.palace,
        fromAge: activeHouse.daiHan.fromAge,
        toAge: activeHouse.daiHan.toAge
      } : null,
      tieuHan: {
        ruleSet: TIEU_HAN_RULESET,
        branchIndex: tieuHanBranchIndex,
        branch: BRANCHES[tieuHanBranchIndex],
        palace: tieuHanHouse.palace,
        startBranchIndex: startIndex,
        startBranch: BRANCHES[startIndex],
        direction: direction === 1 ? 'thuận' : 'nghịch',
        ageMu
      },
      note: 'Tra theo NĂM ÂM LỊCH (không mặc định bắt đầu từ 01/01 dương lịch): chi năm, Đại hạn (tuổi mụ), Tiểu hạn theo một dị bản Việt Nam (tam hợp năm sinh; nam thuận, nữ nghịch). Có dị bản Tiểu hạn và Tứ Hóa khác. Đã có bảng Lưu Tứ Hóa và 12 lưu tinh theo can/chi năm xem, nhưng CHƯA tính đầy đủ lưu niên và không dự báo sự kiện.'
    };
  }
  /** A year is 2025 until Vietnamese Lunar New Year 2026, even after Jan 1. */
  function currentVietnamLunarYear(now = new Date()) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('Ngày hiện tại không hợp lệ');
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(now);
    const field = part => Number(parts.find(x => x.type === part)?.value);
    const [y,m,d] = [field('year'),field('month'),field('day')];
    if (y < 1900) return 1900;
    if (y > 2100) return 2100;
    return Math.max(1900, Math.min(2100, Lunar.solarToLunar(y,m,d).year));
  }
  function suggestedAnnualYear(chart, now = new Date()) {
    if (!Number.isInteger(chart?.lunar?.year)) throw new TypeError('Năm sinh âm lịch chưa hợp lệ');
    return Math.min(2100, Math.max(1900, chart.lunar.year, currentVietnamLunarYear(now)));
  }
  const api = Object.freeze({ RULESET, TIEU_HAN_RULESET, annualOverview, currentVietnamLunarYear, suggestedAnnualYear });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThienDoAnnual = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
