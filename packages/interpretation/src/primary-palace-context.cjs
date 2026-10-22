'use strict';
/**
 * V11.31: evidence-bounded reading of existing 14x12 editorial records.
 * Produces no star placements, divination outcomes, ratings, or claims of scholarly validation.
 * Natal year-origin stars (house.yearStars) are not annual overlays (annual.luuStars).
 */
const {lookupPrimaryStarPalace}=require('../../knowledge/src/index.cjs');
const {assertChart,related,natalStarNames}=require('./chart-geometry.cjs');
const STATUS=Object.freeze({M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'});
const HOA=new Set(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
const VALID_MARKERS=new Set(['Tuần','Triệt']);

function strengthFor(house,star){
  const values=(house.mainStarStrengths??[]).filter(s=>s && s.name===star && typeof s.status==='string');
  // Contradictory or unknown input must not become an apparently authoritative status.
  return values.length===1 && Object.hasOwn(STATUS,values[0].status)
    ? {code:values[0].status,label:STATUS[values[0].status],confirmedByExpert:false}
    : {code:null,label:'Chưa xác định',confirmedByExpert:false};
}
function cleanNames(value){return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string' && x.trim()))]:[];}
function buildPrimaryPalaceContext(chart,branchIndex){
  assertChart(chart,branchIndex);
  const byIndex=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const focus=byIndex.get(branchIndex);
  const {tamHop,doiCung}=related(branchIndex);
  const peers=tamHop.map(i=>byIndex.get(i));
  const opposite=byIndex.get(doiCung);
  const placed=cleanNames(focus.stars);
  const otherNatal=cleanNames(natalStarNames(focus)).filter(s=>!placed.includes(s));
  const markers=cleanNames(focus.obstructionMarkers).filter(x=>VALID_MARKERS.has(x));
  return placed.flatMap(star=>{
    const entry=lookupPrimaryStarPalace(star,focus.palace);
    if(!entry) return [];
    const natalHoa=(Array.isArray(focus.tuHoa)?focus.tuHoa:[]).filter(item=>
      item && HOA.has(item.name) && item.star===star);
    return [{
      star,palace:focus.palace,branch:focus.branch,
      focus:entry.focus,potential:entry.potential,tradeoff:entry.tradeoff,
      reflection:entry.reflection,
      evidence:{
        tọaCung:{branchIndex,palace:focus.palace,star},
        strength:strengthFor(focus,star),
        samePalaceMainStars:placed.filter(s=>s!==star),
        samePalaceSupportingStars:otherNatal,
        natalTransformations:[...new Set(natalHoa.map(x=>x.name))],
        obstructionMarkers:markers,
        tamHop:peers.map(h=>({branchIndex:h.branchIndex,palace:h.palace,branch:h.branch,mainStars:cleanNames(h.stars)})),
        opposite:{branchIndex:opposite.branchIndex,palace:opposite.palace,branch:opposite.branch,mainStars:cleanNames(opposite.stars)},
      },
      quality:{status:entry.status,source:'primary-star-palace-guidance.json',
        expertReviewed:false,independentValidation:false,
        natalOnly:true,hasExplicitMainStarPlacement:true},
    }];
  });
}
module.exports={buildPrimaryPalaceContext};
