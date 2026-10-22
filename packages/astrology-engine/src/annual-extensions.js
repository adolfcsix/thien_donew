/* THIÊN ĐỒ V11.16 — four year-view stars.
 * Independently derives each annual overlay from selected lunar year's branch.
 * Fixed natal stars with the same suffix/name remain unchanged.
 */
(function(root){
  'use strict';
  const RULESET='annual-tang-ho-khoc-hu-v11.16.0';
  const mod=n=>((n%12)+12)%12;
  function calculate(yearBranch){
    if(!Number.isInteger(yearBranch)||yearBranch<0||yearBranch>11)throw new RangeError('Chi năm xem phải nằm trong 0–11');
    return [
      {name:'Lưu Tang Môn',branch:mod(2+yearBranch),basis:'ty-tai-dan-thuan',ruleSet:RULESET},
      {name:'Lưu Bạch Hổ',branch:mod(8+yearBranch),basis:'ty-tai-than-thuan',ruleSet:RULESET},
      {name:'Lưu Thiên Khốc',branch:mod(6-yearBranch),basis:'ty-tai-ngo-nghich',ruleSet:RULESET},
      {name:'Lưu Thiên Hư',branch:mod(6+yearBranch),basis:'ty-tai-ngo-thuan',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThienDoAnnualExtensions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
