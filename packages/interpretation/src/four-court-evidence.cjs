'use strict';
/**
 * V11.40: descriptive evidence only. Never positions stars, infers a
 * traditional formation, or treats an annual overlay as a natal layer.
 * All observed branches are verified against the chart's 12-house topology.
 */
const {assertChart,related} = require('./chart-geometry.cjs');
const NATAL_LAYERS = Object.freeze([
 'stars','auxiliaryStars','yearStars','additionalStars','traditionalStars',
 'natalExtensionStars','beneficStars','advancedStars','positionalStars',
 'derivedStars','missingStars'
]);
const VALID_STRENGTHS = new Set(['M','V','D','B','H']);

function inspectFourCourtEvidence(chart, branchIndex, rule) {
 assertChart(chart,branchIndex);
 if (!rule || !rule.conditions || !Array.isArray(rule.conditions.requiredStars) ||
     !Array.isArray(rule.conditions.supportAny) || !Array.isArray(rule.conditions.reviewAny)) {
  throw new TypeError('Cần quy tắc nghiên cứu có danh mục sao rõ ràng.');
 }
 const rel=related(branchIndex);
 const scope = [branchIndex,...rel.tamHop,rel.doiCung];
 const scopeSet=new Set(scope);
 const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const starIndex=new Map();
 for (const house of chart.houses) {
  for (const layer of NATAL_LAYERS) {
   if(!Array.isArray(house[layer])) continue;
   for(const name of house[layer]) {
    if(typeof name!=='string' || !name.trim()) continue;
    let branches=starIndex.get(name);
    if(!branches) {branches=new Map();starIndex.set(name,branches);}
    let layers=branches.get(house.branchIndex);
    if(!layers){layers=new Set();branches.set(house.branchIndex,layers);}
    layers.add(layer);
   }
  }
 }
 const relation = at => at===branchIndex?'toa-cung':rel.tamHop.includes(at)?'tam-hop':'doi-cung';
 function locate(star) {
  const branches=starIndex.get(star);
  const all=branches?[...branches.keys()]:[];
  const candidates=all.filter(at=>scopeSet.has(at));
  if(all.length>1) return {star,status:'ambiguous',reason:'multi-palace',positions:all,branchIndex:null,layers:[]};
  if(candidates.length!==1) return {star,status:'not-observed',reason:all.length?'outside-four-courts':'absent',positions:all,branchIndex:null,layers:[]};
  const at=candidates[0],house=houses.get(at);
  return {star,status:'observed',reason:'unique-natal-position',positions:all,branchIndex:at,
   branch:house.branch,palace:house.palace,relation:relation(at),layers:[...branches.get(at)].sort()};
 }
 const required=rule.conditions.requiredStars.map(star=>{
  const finding=locate(star);
  // A main-star family must never be satisfied by an identically named
  // supporting-star record. This is distinct from an ordinary missing star.
  return finding.status==='observed' && !finding.layers.includes('stars')
   ? {...finding,status:'not-observed',reason:'not-main-star'} : finding;
 });
 const supports=rule.conditions.supportAny.map(locate);
 const review=rule.conditions.reviewAny.map(locate);
 const strengths=required.map(found=>{
  if(found.status!=='observed') return {star:found.star,status:null,reason:'position-unresolved',branchIndex:null};
  // Only the main-star layer is an admissible source for a strength of a main star.
  if(!found.layers.includes('stars')) return {star:found.star,status:null,reason:'not-main-star',branchIndex:found.branchIndex};
  const source=houses.get(found.branchIndex).mainStarStrengths;
  const matches=Array.isArray(source)?source.filter(s=>s && s.name===found.star && s.branch===found.branchIndex):[];
  if(matches.length!==1 || !VALID_STRENGTHS.has(matches[0].status))
   return {star:found.star,status:null,reason:'missing-or-ambiguous-strength',branchIndex:found.branchIndex};
  return {star:found.star,status:matches[0].status,reason:'explicit-chart-record',branchIndex:found.branchIndex};
 });
 const transformations=[];
 const rejectedTransformations=[];
 const transformationKeys=new Set();
 const labels=new Map();
 // A natal Hóa label may point to only one unique location+target per chart.
 // Identical duplicate data records are harmless; conflicting targets are not.
 for(const house of chart.houses)for(const item of Array.isArray(house.tuHoa)?house.tuHoa:[]){
  if(!item || !['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'].includes(item.name))continue;
  if(!labels.has(item.name))labels.set(item.name,new Set());
  labels.get(item.name).add(JSON.stringify([house.branchIndex,item.star]));
 }
 const obstructions=[];
 for (const at of scope) {
  const house=houses.get(at);
  const marks=Array.isArray(house.obstructionMarkers)?house.obstructionMarkers:[];
  for(const marker of new Set(marks)) if(marker==='Tuần'||marker==='Triệt')
   obstructions.push({marker,branchIndex:at,palace:house.palace,relation:relation(at)});
  const items=Array.isArray(house.tuHoa)?house.tuHoa:[];
  for (const item of items) {
   if (!item || !['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'].includes(item.name)) continue;
   const position=typeof item.star==='string'?locate(item.star):null;
   const valid=labels.get(item.name)?.size===1 && position && position.status==='observed' && position.branchIndex===at && position.layers.length>0;
   const key=JSON.stringify([at,item.name,item.star]);
   if(transformationKeys.has(key)) continue;
   transformationKeys.add(key);
   const record={name:item.name,target:typeof item.star==='string'?item.star:null,branchIndex:at,
     palace:house.palace,relation:relation(at),status:valid?'verified-natal-target':'unverified-target'};
   (valid?transformations:rejectedTransformations).push(record);
  }
 }
 const flags={missingRequired:required.some(x=>x.status!=='observed'),
  missingStrengthData:strengths.some(x=>x.status===null),
  ambiguousEvidence:[...required,...supports,...review].some(x=>x.status==='ambiguous')||rejectedTransformations.length>0,
  containsHoaKy:transformations.some(x=>x.name==='Hóa Kỵ'),
  hasObstruction:obstructions.length>0};
 return {scope:'natal-four-courts',anchorBranchIndex:branchIndex,branches:scope,
  required,supports,review,strengths,transformations,rejectedTransformations,obstructions,flags,
  summary:{requiredObserved:required.filter(x=>x.status==='observed').length,requiredTotal:required.length,
   supportsObserved:supports.filter(x=>x.status==='observed').length,reviewObserved:review.filter(x=>x.status==='observed').length,
   transformationsVerified:transformations.length,strengthsKnown:strengths.filter(x=>x.status!==null).length},
  expertConfirmed:false,
  notice:'Bằng chứng vị trí trong lá số gốc; không xác nhận thành cách cục, cát hung hay dự đoán vận mệnh.'};
}
module.exports={inspectFourCourtEvidence,NATAL_LAYERS};
