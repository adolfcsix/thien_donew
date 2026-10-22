/* THIÊN ĐỒ V11.13 — additional traditional natal stars.
 * Canonical branch indexes: Tý=0 ... Hợi=11. Formula variants and literature
 * are documented in docs/reference/traditional-star-catalogue.md.
 * This module is deliberately isolated: no changes to the 14 main stars,
 * previous auxiliary stars, birth transformations or period calculations.
 */
(function(root) {
  'use strict';
  const RULESET = 'traditional-eleven-natal-v11.13.0';
  const mod = (n) => ((n % 12) + 12) % 12;
  const STEM_QUAN = Object.freeze([7,4,5,2,3,9,11,9,10,6]);
  const STEM_PHUC = Object.freeze([9,8,0,11,3,2,6,5,6,5]);
  const CO_QUA = Object.freeze([
    [2,10], [2,10], [5,1], [5,1], [5,1], [8,4],
    [8,4], [8,4], [11,7], [11,7], [11,7], [2,10]
  ]);
  const requireInt = (n,min,max,label) => {
    if (!Number.isInteger(n) || n<min || n>max) throw new RangeError(`${label} không hợp lệ`);
  };
  function calculate({yearStem, yearBranch, lunarDay, vanXuongBranch, vanKhucBranch}) {
    requireInt(yearStem,0,9,'Thiên can năm sinh');
    requireInt(yearBranch,0,11,'Địa chi năm sinh');
    requireInt(lunarDay,1,30,'Ngày sinh âm lịch');
    requireInt(vanXuongBranch,0,11,'Văn Xương');
    requireInt(vanKhucBranch,0,11,'Văn Khúc');
    if (yearStem%2 !== yearBranch%2) throw new RangeError('Can Chi năm sinh phải cùng âm dương');
    const phongCac = mod(10 - yearBranch);
    const [coThan, quaTu] = CO_QUA[yearBranch];
    const placements = [
      ['Long Trì',mod(4 + yearBranch),'chi-nam-long-tri'],
      ['Phượng Các',phongCac,'chi-nam-phuong-cac'],
      ['Giải Thần',phongCac,'dong-cung-phuong-cac'],
      ['Cô Thần',coThan,'tam-hoi-chi-nam'],
      ['Quả Tú',quaTu,'tam-hoi-chi-nam'],
      ['Thiên Quan',STEM_QUAN[yearStem],'can-nam-bang-viet'],
      ['Thiên Phúc',STEM_PHUC[yearStem],'can-nam-bang-viet'],
      // Ân Quang: from Xương, count forward to lunar day, step back once.
      ['Ân Quang',mod(vanXuongBranch + lunarDay - 2),'xuong-ngay-thuan-lui-mot'],
      // Thiên Quý: Vietnamese variant, count backward from Khúc, step back once
      // in the opposite direction of that count.
      ['Thiên Quý',mod(vanKhucBranch - lunarDay + 2),'khuc-ngay-nghich-lui-mot'],
      // Start at Văn Khúc as the first palace; second palace ±1.
      ['Thái Phụ',mod(vanKhucBranch + 1),'khuc-cung-ke-thuan'],
      ['Phong Cáo',mod(vanKhucBranch - 1),'khuc-cung-ke-nghich'],
    ];
    const names = placements.map(([name])=>name);
    if (new Set(names).size !== 11) throw new Error('Trùng tên sao trong lớp V11.13');
    return placements.map(([name,branch,basis])=>({name,branch,basis,ruleSet:RULESET}));
  }
  const api=Object.freeze({RULESET,STEM_QUAN,STEM_PHUC,CO_QUA,calculate});
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  root.ThienDoTraditionalStars=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
