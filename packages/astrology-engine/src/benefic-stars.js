/* THIÊN ĐỒ V11.16 — dedicated natal Đức/Giải stars.
 * Branch index: Tý=0 … Hợi=11. Lunar month is 1..12.
 * Selected rules/variants are documented in docs/reference/deuc-giai-and-annual-stars.md.
 * Independent of birth transformations, natal major stars and annual overlays.
 */
(function(root){
  'use strict';
  const RULESET='natal-duc-giai-v11.16.0';
  const mod=n=>((n%12)+12)%12;
  function calculate({yearBranch,lunarMonth}){
    if(!Number.isInteger(yearBranch)||yearBranch<0||yearBranch>11)throw new RangeError('Chi năm sinh phải nằm trong 0–11');
    if(!Number.isInteger(lunarMonth)||lunarMonth<1||lunarMonth>12)throw new RangeError('Tháng âm phải nằm trong 1–12');
    return [
      {name:'Thiên Đức',branch:mod(9+yearBranch),basis:'chi-nam-tu-dau-thuan',ruleSet:RULESET},
      {name:'Nguyệt Đức',branch:mod(5+yearBranch),basis:'chi-nam-tu-ty-thuan',ruleSet:RULESET},
      {name:'Thiên Giải',branch:mod(8+lunarMonth-1),basis:'thang-am-than-thuan',ruleSet:RULESET},
      {name:'Địa Giải',branch:mod(7+lunarMonth-1),basis:'thang-am-mui-thuan',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThienDoBeneficStars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
