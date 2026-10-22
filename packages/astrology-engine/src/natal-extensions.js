/* THIÊN ĐỒ V11.14 — 3 independent natal stars; branch indices Tý=0 ... Hợi=11.
 * Sources and variants: docs/reference/natal-star-completeness.md.
 * This module does not change pre-existing natal or annual algorithms.
 */
(function(root){
  'use strict';
  const RULESET='additional-natal-three-v11.14.0';
  // Quốc Ấn: Lộc Tồn counted as position 1, Ấn at position 9 (= +8 branches).
  const LOC_TON_BY_STEM=Object.freeze([2,3,5,6,5,6,8,9,11,0]);
  // Kiếp Sát by year branch, following Dần/Ngọ/Tuất -> Hợi etc.
  const KIEP_SAT_BY_BRANCH=Object.freeze([5,2,11,8,5,2,11,8,5,2,11,8]);
  // Phá Toái: four cardinal branches -> Tỵ, four birth branches -> Dậu, four earth branches -> Sửu.
  const PHA_TOAI_BY_BRANCH=Object.freeze([5,1,9,5,1,9,5,1,9,5,1,9]);
  const mod=n=>((n%12)+12)%12;
  function calculate({yearStem,yearBranch,locTonBranch}){
    for(const [key,value,max] of [['yearStem',yearStem,9],['yearBranch',yearBranch,11],['locTonBranch',locTonBranch,11]]){
      if(!Number.isInteger(value)||value<0||value>max) throw new RangeError(`${key} không hợp lệ`);
    }
    if(yearStem%2!==yearBranch%2) throw new RangeError('Can Chi năm sinh không cùng âm dương');
    if(LOC_TON_BY_STEM[yearStem]!==locTonBranch) throw new RangeError('Vị trí Lộc Tồn không tương thích thiên can năm sinh');
    return [
      {name:'Quốc Ấn',branch:mod(locTonBranch+8),basis:'loc-ton-cung-thu-chin',ruleSet:RULESET},
      {name:'Kiếp Sát',branch:KIEP_SAT_BY_BRANCH[yearBranch],basis:'tam-hop-chi-nam',ruleSet:RULESET},
      {name:'Phá Toái',branch:PHA_TOAI_BY_BRANCH[yearBranch],basis:'tu-chinh-tu-sinh-tu-mo',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,LOC_TON_BY_STEM,KIEP_SAT_BY_BRANCH,PHA_TOAI_BY_BRANCH,calculate});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.ThienDoNatalExtensions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
