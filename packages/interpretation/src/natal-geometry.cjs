'use strict';
/**
 * Evidence-only comparison of *actual* natal positions in a complete chart.
 * Rules here must not claim a way of life or synthesize annual overlays.
 * Duplicate placements fail closed, including duplicates across natal layers.
 */
const {natalGeometryRules}=require('../../knowledge/src/index.cjs');
const {assertChart}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const mod=(n)=>((n%12)+12)%12;
function matchNatalGeometry(chart,branchIndex){
  assertChart(chart,branchIndex);
  const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const starIndex=indexNatalStars(chart);
  const find=name=>locateNatalStar(starIndex,houses,name);
  return natalGeometryRules.flatMap(rule=>{
    const [a,b]=rule.stars.map(find);
    const anchor=rule.anchor?find(rule.anchor):null;
    if(a.status!=='observed'||b.status!=='observed'||(anchor&&anchor.status!=='observed'))return [];
    const atA=a.branchIndex,atB=b.branchIndex;
    let relation='';
    if(rule.geometry==='opposition'){
      if(mod(atA+6)!==atB || ![atA,atB].includes(branchIndex))return [];
      relation='Đối cung (xung chiếu)';
    }else if(rule.geometry==='flank-anchor'){
      if(!anchor || branchIndex!==anchor.branchIndex ||
        new Set([atA,atB]).size!==2 ||
        ![atA,atB].includes(mod(branchIndex+1)) ||
        ![atA,atB].includes(mod(branchIndex-1)))return [];
      relation='Giáp hai phía cung Lộc Tồn';
    }else if(rule.geometry==='pair-separation'){
      if(![atA,atB].includes(branchIndex) || atA===atB)return [];
      const distance=mod(atB-atA);
      relation=distance===6?'Đối cung':distance===4||distance===8?'Tam hợp':
        distance===2||distance===10?'Cách nhau hai cung':'Vị trí khác cung';
    }else return [];
    const described=[a,b,...(anchor?[anchor]:[])].map(item=>({
      star:item.star,branchIndex:item.branchIndex,branch:item.branch,palace:item.palace,
      position:item.branchIndex===branchIndex?'Tọa cung đang xem':
        item.branchIndex===mod(branchIndex+6)?'Đối cung':
        [mod(branchIndex+4),mod(branchIndex+8)].includes(item.branchIndex)?'Tam hợp':
        [mod(branchIndex+1),mod(branchIndex-1)].includes(item.branchIndex)?'Cung giáp':'Cung khác'
    }));
    return [{id:rule.id,title:rule.title,geometry:rule.geometry,relation,
      interpretation:rule.interpretation,caution:rule.caution,evidence:described}];
  });
}
module.exports={matchNatalGeometry};
