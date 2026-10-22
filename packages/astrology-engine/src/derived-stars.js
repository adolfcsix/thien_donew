/* THIÊN ĐỒ V11.18 — Separate derived natal stars, branch indexes Tý=0 ... Hợi=11.
 * Thiên Tài = Mệnh counted as Tý, count thuận to natal chi.
 * Thiên Thọ = Thân counted as Tý, count thuận to natal chi.
 * Đường Phù = Lộc Tồn counted as 1, count nghịch to position 8 (+5 mod 12).
 * This is a documented selected convention, not a verified universal school standard.
 */
(function(root){
  'use strict';
  const RULESET='menh-than-loc-ton-derived-v11.18.0';
  const NAMES=Object.freeze(['Thiên Tài','Thiên Thọ','Đường Phù']);
  const LOC_TON_BY_STEM=Object.freeze([2,3,5,6,5,6,8,9,11,0]);
  const mod=n=>((n%12)+12)%12;
  function calculate({yearStem,yearBranch,menhBranch,thanBranch,locTonBranch}){
    for(const [key,value,max] of [['yearStem',yearStem,9],['yearBranch',yearBranch,11],['menhBranch',menhBranch,11],['thanBranch',thanBranch,11],['locTonBranch',locTonBranch,11]]) {
      if(!Number.isInteger(value)||value<0||value>max)throw new RangeError(`${key} không hợp lệ`);
    }
    if(yearStem%2!==yearBranch%2)throw new RangeError('Can và Chi năm sinh khác tính âm dương');
    if(LOC_TON_BY_STEM[yearStem]!==locTonBranch)throw new RangeError('Lộc Tồn không đúng theo Can năm sinh');
    return [
      {name:'Thiên Tài',branch:mod(menhBranch+yearBranch),basis:'menh-khoi-ty-thuan-theo-chi-nam',ruleSet:RULESET},
      {name:'Thiên Thọ',branch:mod(thanBranch+yearBranch),basis:'than-khoi-ty-thuan-theo-chi-nam',ruleSet:RULESET},
      {name:'Đường Phù',branch:mod(locTonBranch-7),basis:'loc-ton-khoi-mot-nghich-den-thu-tam',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,NAMES,LOC_TON_BY_STEM,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThienDoDerivedStars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
