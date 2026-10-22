/* V8.8: annual layers are separate from natal placements.
 * Reuse the VERSIONED natal tables only for the selected lunar year's stem/branch.
 * They are educational lookups, NOT verified predictions of events.
 */
(function (root) {
  'use strict';
  const TuHoa=(typeof module !== 'undefined' && module.exports)
    ? require('./tuhoa.js') : root.ThienDoTuHoa;
  const Aux=(typeof module !== 'undefined' && module.exports)
    ? require('./auxiliary.js') : root.ThienDoAuxiliary;
  const YearStars=(typeof module !== 'undefined' && module.exports)
    ? require('./year-stars.js') : root.ThienDoYearStars;
  const AnnualExtensions=(typeof module !== 'undefined' && module.exports) ? require('./annual-extensions.js') : (root.ThienDoAnnualExtensions || {RULESET:'annual-extensions-unavailable-legacy',calculate(){return [];}});
  const RULESET='annual-layers-2026-v11.16';
  const mod=(a,b)=>((a%b)+b)%b;
  const TYPES=Object.freeze(['Lưu Lộc Tồn','Lưu Kình Dương','Lưu Đà La']);
  function calculate(chart, yearStemIndex, yearBranchIndex) {
    if (!chart || !Array.isArray(chart.houses) || chart.houses.length !== 12 ||
        new Set(chart.houses.map(h=>h.branchIndex)).size!==12 ||
        !chart.houses.every(h=>Number.isInteger(h.branchIndex)&&h.branchIndex>=0&&h.branchIndex<12&&Array.isArray(h.stars)&&Array.isArray(h.auxiliaryStars)))
      throw new TypeError('Cần lá số đầy đủ 12 cung và chính/phụ tinh để định vị lưu tinh');
    if (!Number.isInteger(yearStemIndex)||yearStemIndex<0||yearStemIndex>9 ||
        !Number.isInteger(yearBranchIndex)||yearBranchIndex<0||yearBranchIndex>11)
      throw new RangeError('Thiên can / Địa chi của năm xem không hợp lệ');
    const starPosition=new Map();
    for (const house of chart.houses) {
      for (const name of [...house.stars,...house.auxiliaryStars]) {
        if (starPosition.has(name)) throw new Error(`Trùng sao trong lá số: ${name}`);
        starPosition.set(name,house.branchIndex);
      }
    }
    const stars=[...starPosition].map(([name,branch])=>({name,branch}));
    const transformations=TuHoa.calculate(yearStemIndex,stars).map(t=>({
      ...t, palace:chart.houses.find(h=>h.branchIndex===t.branch).palace
    }));
    const locTon=Aux.LOC_TON[yearStemIndex];
    const chiEntries=[locTon,mod(locTon+1,12),mod(locTon-1,12)].map((branch,i)=>({
      name:TYPES[i], branch, palace:chart.houses.find(h=>h.branchIndex===branch).palace,
      basis:'can-nam-xem', ruleSet:Aux.RULESET
    }));
    // Explicitly repeat the year-branch table for the selected annual year.
    // These are NEW annual overlays, not modifications to natal-year stars.
    const annualYearStars=YearStars.calculate(yearBranchIndex);
    const supportedAnnualNames=['Thiên Mã','Đào Hoa','Hoa Cái','Hồng Loan','Thiên Hỷ'];
    for (const name of supportedAnnualNames) {
      const placement=annualYearStars.find(item=>item.name===name);
      if (!placement) throw new Error(`Không tìm thấy vị trí Lưu ${name}`);
      chiEntries.push({name:`Lưu ${name}`,branch:placement.branch,
        palace:chart.houses.find(h=>h.branchIndex===placement.branch).palace,
        basis:'chi-nam-xem',ruleSet:YearStars.RULESET});
    }
    const extraAnnual=AnnualExtensions.calculate(yearBranchIndex);
    for(const item of extraAnnual){
      const house=chart.houses.find(h=>h.branchIndex===item.branch);
      if(!house)throw new Error('Thiếu cung khi an sao lưu mở rộng');
      chiEntries.push({...item,palace:house.palace});
    }
    if(new Set(chiEntries.map(x=>x.name)).size!==chiEntries.length)throw new Error('Trùng tên sao lưu theo năm');
    return {
      ruleSet:RULESET,
      luuTuHoa:{ruleSet:TuHoa.RULESET,yearStemIndex,items:transformations},
      luuStars:{ruleSet:`${Aux.RULESET} + ${YearStars.RULESET} + ${AnnualExtensions.RULESET}`,items:chiEntries}
    };
  }
  const api=Object.freeze({RULESET,calculate});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  root.ThienDoAnnualLayers=api;
})(typeof globalThis!=='undefined'?globalThis:this);
