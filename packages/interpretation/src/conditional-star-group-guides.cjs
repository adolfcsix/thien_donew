'use strict';
/**
 * V11.59 — conditional, natal-only reading for the six existing group studies.
 * Consumes V11.43's observed positional records; NEVER recalculates star positions,
 * creates additional stars, or promotes an editorial group to a classical formation.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
const catalogue=require('../../knowledge/src/conditional-star-group-guides.json');
const fixtures=require('../../knowledge/src/conditional-star-group-examples.json');

const REASONS={
 absent:'Không thấy sao trong các lớp sao gốc đang hỗ trợ',
 outside:'Sao nằm ngoài Tứ chính của cung đang xét',
 ambiguous:'Sao xuất hiện ở nhiều cung; cần kiểm tra dữ liệu',
 repeated:'Tên sao lặp trong cùng một lớp hoặc nhiều lớp tại một cung; cần kiểm tra dữ liệu',
 inconsistent:'Bản ghi khảo sát không khớp vị trí sao gốc thực tế; cần tạo lại dữ liệu'
};
function repeatedWithinOneLayer(chart,star){
 return chart.houses.some(house=>{
  const counts=NATAL_LAYERS.map(layer=>Array.isArray(house[layer])?house[layer].filter(name=>name===star).length:0);
  return counts.some(count=>count>1)||counts.filter(count=>count>0).length>1;
 });
}
function buildConditionalStarGroupGuides(chart,anchorBranchIndex,records){
 assertChart(chart,anchorBranchIndex);
 if(!Array.isArray(records))throw new TypeError('Cần kết quả khảo sát bộ sao từ cùng lá số.');
 const groups=new Map(records.map(record=>[record.id,record]));
 const houses=new Map(chart.houses.map(house=>[house.branchIndex,house]));
 const index=indexNatalStars(chart),relation=related(anchorBranchIndex);
 const allowed=new Set([anchorBranchIndex,...relation.tamHop,relation.doiCung]);
 const relationLabel=at=>at===anchorBranchIndex?'Tọa cung':relation.tamHop.includes(at)?'Tam hợp':'Đối cung';
 const result=[];
 for(const [id,profile] of Object.entries(catalogue.profiles)){
  const record=groups.get(id);
  if(!record||!Array.isArray(record.stars)||!Array.isArray(record.placements)||
    record.placements.length!==record.stars.length ||
    new Set(record.stars).size!==record.stars.length ||
    record.stars.some((name,i)=>name!==record.placements[i]?.star)){
   throw new TypeError(`Danh mục khảo sát sao không khớp hồ sơ: ${id}`);
  }
  const evidence=[];const excluded=[];
  for(const place of record.placements){
   const actual=locateNatalStar(index,houses,place.star);
   const invalid=actual.status==='ambiguous'?'ambiguous':
    repeatedWithinOneLayer(chart,place.star)?'repeated':
    actual.status==='absent'?'absent':
    place.status!=='observed'||actual.branchIndex!==place.branchIndex||
     place.inFourCourts!==allowed.has(actual.branchIndex)?'inconsistent':
    !allowed.has(actual.branchIndex)?'outside':null;
   if(invalid){
    excluded.push({star:place.star,reason:invalid,explanation:REASONS[invalid],
      ...(place.status==='observed'&&Number.isInteger(place.branchIndex)?{branchIndex:place.branchIndex,palace:place.palace,relation:place.relation}:{})});
   }else{
    const house=houses.get(actual.branchIndex);
    evidence.push({star:place.star,branchIndex:actual.branchIndex,palace:house.palace,
      branch:house.branch,relation:relationLabel(actual.branchIndex),
      accompanyingMainStars:[...house.stars]});
   }
  }
  const needsReview=excluded.some(x=>['ambiguous','repeated','inconsistent'].includes(x.reason));
  const status=needsReview?'needs-review':evidence.length===record.stars.length?'complete':
    evidence.length>=2?'partial':'insufficient';
  const samePalacePairs=[];
  for(let i=0;i<evidence.length;i++)for(let j=i+1;j<evidence.length;j++){
   if(evidence[i].branchIndex===evidence[j].branchIndex){
    samePalacePairs.push({stars:[evidence[i].star,evidence[j].star],palace:evidence[i].palace,branchIndex:evidence[i].branchIndex});
   }
  }
  const evidenceText=evidence.length?evidence.map(p=>`${p.star} ở ${p.palace} (${p.branch}), ${p.relation.toLowerCase()}`).join('; '):'Chưa có đủ vị trí sao gốc để đối chiếu.';
  result.push({id,title:record.title,category:record.category,status,
   required:record.stars.length,observed:evidence.length,stars:[...record.stars],
   evidence,excluded,samePalacePairs,
   focusAngle:profile.focusAngle,example:status==='complete'?profile.workedFull:profile.workedPartial,
   referenceCases:fixtures.cases.filter(example=>example.groupId===id).map(example=>({
    status:example.status,date:example.input.date,gender:example.input.gender,hour:example.input.hour,
    anchorPalace:example.anchorPalace,expectedEvidence:example.expectedEvidence.map(value=>({...value})),
    expectedExcluded:example.expectedExcluded.map(value=>({...value}))
   })),
   workedFull:profile.workedFull,workedPartial:profile.workedPartial,
   counterexample:profile.counterexample,practice:profile.practice,boundary:profile.boundary,
   observedNarrative:`Vị trí đã đối chiếu: ${evidenceText}`,
   conditions:{scope:'natal-four-courts',requiresAll:[...record.stars],
    allConditionsMet:status==='complete',doesNotConfirmClassicalFormation:true},
   classification:'editorial-conditional-study-only',expertReviewed:false});
 }
 return {edition:catalogue.edition,scope:catalogue.scope,anchorBranchIndex,
  expertReviewed:false,assessed:result.length,complete:result.filter(x=>x.status==='complete').length,
  partial:result.filter(x=>x.status==='partial').length,
  needsReview:result.filter(x=>x.status==='needs-review').length,
  records:result,notice:catalogue.notice};
}
module.exports={buildConditionalStarGroupGuides};
