/* THIÊN ĐỒ V11.6 — selected, versioned traditional star placement extension.
 * Địa chi index Tý=0 ... Hợi=11. This is not a forecast or a complete star catalogue.
 * Sources and variants: docs/reference/advanced-stars-and-periods.md.
 * Tuần/Triệt are paired obstructions, NOT two independent astronomical stars.
 */
(function(root) {
  'use strict';
  const RULESET = 'advanced-placements-tam-hop-v11.6.0';
  const mod = (n,k) => ((n % k) + k) % k;
  const ensure = (n, limit, label) => {
    if (!Number.isInteger(n) || n < 0 || n >= limit) throw new RangeError(`${label} không hợp lệ`);
  };
  // [Hỏa khởi, Linh khởi] by the four chi-year tam hợp groups.
  const FIRE_START = Object.freeze({
    2:[1,3], 6:[1,3], 10:[1,3],
    8:[2,10], 0:[2,10], 4:[2,10],
    5:[3,10], 9:[3,10], 1:[3,10],
    11:[9,10], 3:[9,10], 7:[9,10]
  });
  // Giáp–Kỷ: Thân/Dậu; Ất–Canh: Ngọ/Mùi; Bính–Tân: Thìn/Tỵ;
  // Đinh–Nhâm: Dần/Mão; Mậu–Quý: Tý/Sửu.
  const TRIET_PAIR = Object.freeze([[8,9],[6,7],[4,5],[2,3],[0,1]]);
  function calculate({yearStem, yearBranch, hourBranch, gender}) {
    ensure(yearStem,10,'Thiên can năm sinh');
    ensure(yearBranch,12,'Địa chi năm sinh');
    ensure(hourBranch,12,'Giờ địa chi');
    if (gender !== 'Nam' && gender !== 'Nữ') throw new RangeError('Giới tính phải là Nam hoặc Nữ');
    if ((yearStem & 1) !== (yearBranch & 1)) throw new RangeError('Can Chi năm sinh phải cùng âm dương');
    // First Giáp year in this decade of the sexagenary cycle.
    const giapBranch = mod(yearBranch - yearStem,12);
    const tuanPair = [mod(giapBranch - 2,12),mod(giapBranch - 1,12)];
    const trietPair = TRIET_PAIR[yearStem%5];
    const polarDirection = (yearStem%2 === 0) === (gender === 'Nam') ? 1 : -1;
    const [fireStart, bellStart] = FIRE_START[yearBranch];
    const stars = [
      {name:'Địa Kiếp',branch:mod(11 + hourBranch,12),basis:'gio-ty-tu-hoi-thuan',ruleSet:RULESET},
      {name:'Địa Không',branch:mod(11 - hourBranch,12),basis:'gio-ty-tu-hoi-nghich',ruleSet:RULESET},
      {name:'Hỏa Tinh',branch:mod(fireStart + polarDirection*hourBranch,12),basis:'tam-hop-nam-gio-am-duong',ruleSet:RULESET},
      {name:'Linh Tinh',branch:mod(bellStart - polarDirection*hourBranch,12),basis:'tam-hop-nam-gio-am-duong',ruleSet:RULESET},
    ];
    const obstructions = [
      {name:'Tuần',branches:tuanPair,basis:'luc-giap-khong-vong',ruleSet:RULESET},
      {name:'Triệt',branches:[...trietPair],basis:'can-nam-sinh',ruleSet:RULESET},
    ];
    return {ruleSet:RULESET, stars, obstructions, note:'Theo một bảng Tam Hợp Việt Nam đã định phiên bản; Hỏa/Linh và Tuần/Triệt có dị bản. Tuần/Triệt án hai cung, không tính là bốn sao độc lập.'};
  }
  const api = Object.freeze({RULESET,calculate});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThienDoAdvancedPlacements = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
