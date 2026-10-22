/* THIÊN ĐỒ V11.17 — Nam-phai reference positional stars.
 * Thiên La/Địa Võng are FIXED BRANCH markers; Thiên Thương/Thiên Sứ
 * are FIXED PALACE stars. The two are conceptually distinct.
 * The alternate Trung Chau Thương–Sứ inversion is NOT implemented.
 */
(function(root){
  'use strict';
  const RULESET='positional-nam-phai-v11.17.0';
  const NAMES=Object.freeze(['Thiên La','Địa Võng','Thiên Thương','Thiên Sứ']);
  function calculate(houses){
    if(!Array.isArray(houses)||houses.length!==12||
      new Set(houses.map(h=>h.branchIndex)).size!==12||
      new Set(houses.map(h=>h.palace)).size!==12||
      houses.some(h=>!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||
        typeof h.palace!=='string'||!h.palace.trim()))
      throw new RangeError('Cần đủ 12 cung có địa chi và chức cung duy nhất');
    const findPalace=name=>{const h=houses.find(h=>h.palace===name);if(!h)throw new RangeError(`Thiếu cung ${name}`);return h.branchIndex;};
    for(const name of ['Nô Bộc','Tật Ách','Thiên Di'])if(!houses.some(h=>h.palace===name))throw new RangeError(`Thiếu cung ${name}`);
    return [
      {name:'Thiên La',branch:4,basis:'co-dinh-dia-chi-thin',kind:'branch-marker',ruleSet:RULESET},
      {name:'Địa Võng',branch:10,basis:'co-dinh-dia-chi-tuat',kind:'branch-marker',ruleSet:RULESET},
      {name:'Thiên Thương',branch:findPalace('Nô Bộc'),basis:'co-dinh-cung-no-boc',kind:'palace-star',ruleSet:RULESET},
      {name:'Thiên Sứ',branch:findPalace('Tật Ách'),basis:'co-dinh-cung-tat-ach',kind:'palace-star',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,NAMES,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThienDoPositionalStars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
