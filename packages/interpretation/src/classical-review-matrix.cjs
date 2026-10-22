'use strict';
/**
 * V11.63: one additional, critical appraisal of the V11.40 evidence ledger.
 * Deliberately DOES NOT place stars, calculate transformations, certify any
 * historical cách cục, or infer an event. Everything originates from the
 * audited natal-only four-court evidence object and the reference catalogue.
 */
const reference=require('../../knowledge/src/classical-review-questions.json');
const {compareClassicalPositionLenses}=require('./classical-position-lenses.cjs');
const REQUIREMENT_TAGS=Object.freeze({
 'ambiguous':'Vị trí sao xuất hiện ở nhiều cung',
 'not-observed':'Chưa xác nhận đúng chính tinh trong Tứ chính'
});
function buildClassicalReviewMatrix(chart,focus,rule,evidence){
 const profile=reference.profiles[rule.id];
 if(!profile) throw new RangeError(`Thiếu hồ sơ phản biện cho ${rule.id}`);
 if(!evidence||evidence.scope!=='natal-four-courts'||evidence.anchorBranchIndex!==focus.branchIndex||
    evidence.required.length!==rule.conditions.requiredStars.length||
    evidence.required.some((r,i)=>r.star!==rule.conditions.requiredStars[i])){
  throw new TypeError('Chứng cứ bốn cung không trùng khớp quy tắc đang xét.');
 }
 const matched=evidence.required.filter(x=>x.status==='observed');
 const missing=evidence.required.filter(x=>x.status!=='observed');
 // A star appearing twice in its MAIN layer cannot be treated as two clean
 // observations. Existing evidence's Set deliberately deduplicates these;
 // this review layer must explicitly reveal the defect.
 const mainRecordRepeats=[];
 for(const item of matched){
  const h=chart.houses.find(x=>x.branchIndex===item.branchIndex);
  if((h.stars??[]).filter(name=>name===item.star).length!==1){
   mainRecordRepeats.push({star:item.star,branchIndex:item.branchIndex,code:'repeated-main-record',
    detail:`${item.star} có bản ghi chính tinh trùng hoặc không nhất quán trong cùng cung.`});
  }
 }
 const focusEligible=focus.palace===rule.conditions.focusPalace;
 const onAnchor=matched.filter(x=>x.branchIndex===focus.branchIndex && rule.conditions.focusAny.includes(x.star));
 const checks=[
  {id:'focus-palace',label:'Đang xét đúng cung Mệnh',met:focusEligible,
   detail:focusEligible?'Cung gốc có tên Mệnh theo lá số.':'Quy tắc này chỉ xét tại Mệnh; không dùng cung khác thay thế.'},
  {id:'main-anchor',label:'Chính tinh điểm tựa tọa Mệnh',met:onAnchor.length>0,
   detail:onAnchor.length?`Đã thấy: ${onAnchor.map(x=>x.star).join(' · ')}.`:'Chưa có chính tinh thuộc nhóm tọa Mệnh hợp lệ.'},
  {id:'required',label:'Đủ chính tinh bắt buộc trong Tứ chính',met:missing.length===0,
   detail:missing.length?missing.map(x=>`${x.star}: ${x.reason??REQUIREMENT_TAGS[x.status]??'không quan sát được'}`).join('; '):`Đủ ${matched.length}/${evidence.required.length} sao với vị trí duy nhất.`},
  {id:'integrity',label:'Dữ liệu chính tinh không trùng hoặc giả lớp',
   met:mainRecordRepeats.length===0&&!missing.some(x=>x.status==='ambiguous'),
   detail:mainRecordRepeats.length?'Có bản ghi chính tinh lặp cần làm sạch.':missing.some(x=>x.status==='ambiguous')?'Có chính tinh xuất hiện nhiều vị trí.':'Chưa thấy dấu hiệu trùng trong nhóm sao bắt buộc.'},
  {id:'strength',label:'Độ sáng có chứng cứ hợp lệ cho toàn bộ sao yêu cầu',
   met:missing.length===0&&evidence.strengths.every(x=>x.status!==null),
   detail:evidence.strengths.filter(x=>x.status===null).length?`Cần kiểm tra: ${evidence.strengths.filter(x=>x.status===null).map(x=>x.star).join(' · ')}.`:'Các sao đang quan sát có bản ghi độ sáng hợp lệ.'},
  {id:'transformations',label:'Không có bản ghi Tứ Hóa không hợp lệ trong Tứ chính',
   met:evidence.rejectedTransformations.length===0,
   detail:evidence.rejectedTransformations.length?`Có ${evidence.rejectedTransformations.length} bản ghi Hóa không xác minh được sao đích hoặc xung đột nhãn.`:'Không có Tứ Hóa bị loại trong phạm vi kiểm tra.'}
 ];
 const integrityProblem=!checks[3].met||!checks[5].met;
 const structural=checks.slice(0,4).every(x=>x.met);
 const missingStrength=!checks[4].met;
 const status=integrityProblem?'needs-review':!structural?'conditions-not-met':missingStrength?'incomplete-evidence':
    (evidence.obstructions.length||evidence.flags.containsHoaKy||evidence.review.some(x=>x.status==='observed'))?'qualified-candidate':'structural-candidate';
 const qualifiers=[
  ...evidence.obstructions.map(x=>({kind:'obstruction',name:x.marker,branchIndex:x.branchIndex,palace:x.palace,relation:x.relation,
   explanation:`${x.marker} hiện ở ${x.palace} (${x.relation}); phải xét theo trường phái và sao bị tác động, không tự động bác bỏ bộ sao.`})),
  ...evidence.transformations.filter(x=>x.name==='Hóa Kỵ').map(x=>({kind:'natal-hoa-ky',name:x.name,branchIndex:x.branchIndex,palace:x.palace,relation:x.relation,
   explanation:`Hóa Kỵ gắn với ${x.target} tại ${x.palace}; ghi nhận để đối chiếu, không tự động xếp hung hoặc phá cách.`})),
  ...evidence.review.filter(x=>x.status==='observed').map(x=>({kind:'review-star',name:x.star,branchIndex:x.branchIndex,palace:x.palace,relation:x.relation,
   explanation:`${x.star} được nhận diện trong Tứ chính; đây là câu hỏi cần đối chiếu thêm, không phải phán quyết cát/hung.`}))
 ];
 const required=evidence.required.map(x=>({star:x.star,status:x.status,reason:x.reason,
  branchIndex:x.branchIndex,relation:x.relation??null,palace:x.palace??null,
  ...(x.status==='observed'?{strength:evidence.strengths.find(y=>y.star===x.star)?.status??null}:{strength:null})}));
 const blockers=checks.filter(x=>!x.met).map(({id,detail})=>({id,detail}));
 const schoolLenses=compareClassicalPositionLenses(rule,evidence,{id:rule.id,checks});
 return {id:rule.id,title:rule.title,schoolLenses,scope:'natal-four-courts-editorial',edition:reference.edition,
  status,structuralCriteriaMet:structural&&!integrityProblem,required,checks,blockers,qualifiers,
  natalTransformations:evidence.transformations.map(x=>({name:x.name,target:x.target,branchIndex:x.branchIndex,palace:x.palace,relation:x.relation})),
  rejectedTransformations:evidence.rejectedTransformations.length,
  supportCount:evidence.supports.filter(x=>x.status==='observed').length,
  focusQuestion:profile.question,interpretiveFrame:profile.interpretiveFrame,
  counterexample:profile.counterexample,practice:profile.practice,schoolStatus:'unreviewed',
  expertReviewed:false,confirmedClassicalFormation:false,notice:reference.notice};
}
module.exports={buildClassicalReviewMatrix};
