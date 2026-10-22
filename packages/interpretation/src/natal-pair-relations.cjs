'use strict';
/**
 * Natal pair study, V11.42. Evidence ONLY; deliberately neither a star placer
 * nor an alternative implementation of existing traditional cách cục checks.
 * A match is a positional observation relative to the requested anchor.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const catalogue=require('../../knowledge/src/natal-pair-research.json');
const RELATION_LABELS=Object.freeze({
 'dong-cung':'Đồng cung', 'tam-hop':'Tam hợp', 'doi-cung':'Đối cung', 'giap-cung':'Giáp cung'
});

function diagnoseNatalStarPairs(chart,anchorBranchIndex) {
  assertChart(chart,anchorBranchIndex);
  const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const {tamHop,doiCung}=related(anchorBranchIndex);
  const four=new Set([anchorBranchIndex,...tamHop,doiCung]);
  const flankBefore=(anchorBranchIndex+11)%12,flankAfter=(anchorBranchIndex+1)%12;
  const index=indexNatalStars(chart);
  const place=star=>locateNatalStar(index,houses,star);
  const records=catalogue.pairs.map(pair=>{
    const placements=pair.stars.map(place);
    let relation=null;
    let status='not-observed';
    if(placements.some(p=>p.status==='ambiguous'))status='ambiguous';
    else if(placements.every(p=>p.status==='observed')) {
      const [a,b]=placements.map(p=>p.branchIndex);
      if(a===b && four.has(a))relation='dong-cung';
      else if(new Set([a,b]).has(flankBefore)&&new Set([a,b]).has(flankAfter)&&a!==b)relation='giap-cung';
      else if([a,b].every(p=>four.has(p)) && (a+6)%12===b)relation='doi-cung';
      else if([a,b].every(p=>tamHop.includes(p)||p===anchorBranchIndex) &&
       ((a+4)%12===b||(a+8)%12===b))relation='tam-hop';
      status=relation?'matched':'outside-scope';
    }
    return {id:pair.id,title:pair.title,category:pair.category,stars:[...pair.stars],
      status,relation,relationLabel:relation?RELATION_LABELS[relation]:null,
      placements,question:pair.question,nextStep:pair.nextStep,
      classification:'positional-study-only',expertReviewed:false};
  });
  return {edition:catalogue.edition,scope:'natal-pair-study',anchorBranchIndex,
    assessed:records.length,matched:records.filter(r=>r.status==='matched').length,
    ambiguous:records.filter(r=>r.status==='ambiguous').length,records,
    notice:catalogue.notice,expertReviewed:false};
}
module.exports={diagnoseNatalStarPairs};
