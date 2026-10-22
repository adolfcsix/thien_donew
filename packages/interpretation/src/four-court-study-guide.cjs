'use strict';
/** V11.41 editorial case prompts derived solely from V11.40 natal evidence.
 * Never classifies a traditional formation, assigns probabilities, or places stars.
 */
const library=require('../../knowledge/src/four-court-research.json');
const byId=new Map(library.families.map(item=>[item.id,item]));
function buildFourCourtStudyGuide(id,evidence,{focusIsMenh,focusStarPresent}) {
 const family=byId.get(id);
 if(!family) throw new RangeError(`Không có hồ sơ khảo cứu cho bộ sao: ${id}`);
 if(!evidence || evidence.scope!=='natal-four-courts' || !Array.isArray(evidence.required) ||
    !Array.isArray(evidence.supports) || !Array.isArray(evidence.review) || !Array.isArray(evidence.strengths) ||
    !Array.isArray(evidence.transformations) || !Array.isArray(evidence.rejectedTransformations) ||
    !Array.isArray(evidence.obstructions)) throw new TypeError('Thiếu bằng chứng gốc để chọn tình huống khảo cứu.');
 if(typeof focusIsMenh!=='boolean'||typeof focusStarPresent!=='boolean') throw new TypeError('Thiếu trạng thái cung Mệnh.');
 const missing=evidence.required.filter(item=>item.status!=='observed').map(item=>item.star);
 const supporting=evidence.supports.filter(item=>item.status==='observed').map(item=>({star:item.star,branch:item.branch,palace:item.palace,relation:item.relation}));
 const review=evidence.review.filter(item=>item.status==='observed').map(item=>({star:item.star,branch:item.branch,palace:item.palace,relation:item.relation}));
 const weakStrengths=evidence.strengths.filter(item=>item.status==='H'||item.status==='B').map(item=>item.star);
 const isIncomplete=missing.length>0||!focusIsMenh||!focusStarPresent;
 const hasReview=review.length>0 || weakStrengths.length>0 || evidence.transformations.some(item=>item.name==='Hóa Kỵ') || evidence.obstructions.length>0 || evidence.rejectedTransformations.length>0;
 const cases=[];
 const add=(key,observations)=>{const entry=family.cases[key];cases.push({id:`${id}:${key}`,title:entry.title,question:entry.question,action:entry.action,observations,status:'editorial-question'});};
 if(isIncomplete) add('gap',[
  ...(missing.length? [`Chưa xác định trong Tứ chính: ${missing.join(', ')}`]:[]),
  ...(!focusIsMenh?['Cung đang xét không phải Mệnh']:[]),
  ...(!focusStarPresent?['Chưa có chính tinh điểm tựa tại Mệnh']:[])
 ]);
 if(supporting.length>0) add('support',supporting.map(item=>`${item.star}: ${item.relation} tại ${item.palace} (${item.branch})`));
 if(hasReview) add('review',[
  ...review.map(item=>`${item.star}: ${item.relation} tại ${item.palace} (${item.branch})`),
  ...weakStrengths.map(star=>`${star}: trạng thái Bình/Hãm theo bản ghi`),
  ...evidence.transformations.filter(item=>item.name==='Hóa Kỵ').map(item=>`Hóa Kỵ (${item.target}) tại ${item.palace}`),
  ...evidence.obstructions.map(item=>`${item.marker} tại ${item.palace}`),
  ...(evidence.rejectedTransformations.length?[`${evidence.rejectedTransformations.length} bản ghi Tứ Hóa chưa xác minh, không dùng để kết luận`]:[])
 ]);
 return {familyId:id,title:family.id,focus:family.focus,studySteps:[...family.studySteps],cases,
   evidenceSummary:{requiredObserved:evidence.required.filter(item=>item.status==='observed').length,requiredTotal:evidence.required.length,missing,unknownStrengths:evidence.strengths.filter(item=>item.status===null).map(item=>item.star),rejectedTransformations:evidence.rejectedTransformations.length},
   studyOnly:true,expertReviewed:false,notice:library.notice};
}
module.exports={buildFourCourtStudyGuide};
