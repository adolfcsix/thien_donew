'use strict';
/**
 * V11.64: comparison of editorial positional hypotheses, not traditional-school
 * certification. Reuses ONLY audited V11.40 natal four-court evidence.
 * No placements, transformations or strength tables are computed here.
 */
const catalogue=require('../../knowledge/src/classical-position-lenses.json');
const VALID_RELATIONS=new Set(['toa-cung','tam-hop','doi-cung']);
function compareClassicalPositionLenses(rule,evidence,review){
 const profile=catalogue.families[rule.id];
 if(!profile) throw new RangeError(`Không có hồ sơ khảo sát: ${rule.id}`);
 if(!evidence||evidence.scope!=='natal-four-courts'||
   !Array.isArray(evidence.required)||!Array.isArray(evidence.branches)||evidence.branches.length!==4||
   !review||review.id!==rule.id||!Array.isArray(review.checks)||
   evidence.required.length!==rule.conditions.requiredStars.length||
   evidence.required.some((item,i)=>item.star!==rule.conditions.requiredStars[i])) {
  throw new TypeError('Lớp đối chiếu cần chứng cứ bốn cung và bảng phản biện cùng quy tắc.');
 }
 const dataUnsafe=review.checks.some(c=>['integrity','transformations'].includes(c.id)&&!c.met);
 const strengthIncomplete=review.checks.some(c=>c.id==='strength'&&!c.met);
 const tests=profile.lenses.map(lens=>{
  const observed=evidence.required.filter(x=>x.status==='observed'&&VALID_RELATIONS.has(x.relation));
  const notObserved=evidence.required.filter(x=>x.status!=='observed'||!VALID_RELATIONS.has(x.relation));
  const outside=lens.geometry==='triad-only'?observed.filter(x=>x.relation==='doi-cung'):[];
  const anchorMissing=lens.anchorAll.filter(name=>!observed.some(x=>x.star===name&&x.relation==='toa-cung'));
  const validFocus=review.checks.some(c=>c.id==='focus-palace'&&c.met);
  const invalidAnchor=review.checks.some(c=>c.id==='main-anchor'&&!c.met);
  const geometryMatches=validFocus&&!invalidAnchor&&!notObserved.length&&!outside.length&&!anchorMissing.length;
  const quality=dataUnsafe?'data-needs-review':!geometryMatches?'geometry-not-met':strengthIncomplete?'geometry-only-needs-strength':'geometry-observed';
  const reasonParts=[];
  if(!validFocus)reasonParts.push('Chưa xét đúng cung Mệnh');
  if(invalidAnchor)reasonParts.push('Chính tinh điểm tựa chưa tọa Mệnh');
  if(notObserved.length)reasonParts.push(`Sao bản mệnh thiếu/không rõ: ${notObserved.map(x=>x.star).join(', ')}`);
  if(outside.length)reasonParts.push(`Chỉ thấy ở đối cung: ${outside.map(x=>x.star).join(', ')}`);
  if(anchorMissing.length)reasonParts.push(`Không tọa Mệnh: ${anchorMissing.join(', ')}`);
  if(dataUnsafe)reasonParts.push('Dữ liệu sao hoặc Tứ Hóa bất nhất; không được xác nhận hình học');
  if(strengthIncomplete)reasonParts.push('Độ sáng chưa đủ để luận phẩm chất cách');
  if(!reasonParts.length)reasonParts.push('Đủ vị trí theo giả định biên tập; chưa xác nhận cách cục');
  return {
   id:lens.id,label:lens.label,geometry:lens.geometry,explanation:lens.explanation,
   status:quality,geometryMatches:geometryMatches&&!dataUnsafe,
   observed:observed.map(x=>({star:x.star,branchIndex:x.branchIndex,relation:x.relation,palace:x.palace})),
   outside:outside.map(x=>x.star),notObserved:notObserved.map(x=>x.star),anchorMissing,
   reasons:reasonParts,expertReviewed:false,confirmedClassicalFormation:false
  };
 });
 const eligible=tests.filter(t=>t.geometryMatches).length;
 return {familyId:rule.id,scope:catalogue.scope,edition:catalogue.edition,
  question:profile.question,counterexample:profile.counterexample,
  comparison:{eligible,total:tests.length},tests,
  contextSignals:{obstructions:evidence.obstructions.map(x=>x.marker),
   verifiedHoaKy:evidence.transformations.filter(x=>x.name==='Hóa Kỵ').map(x=>x.target),
   strengthIncomplete,transformationConflicts:evidence.rejectedTransformations.length},
  schoolStatus:'unreviewed',expertReviewed:false,confirmedClassicalFormation:false,
  notice:catalogue.notice};
}
module.exports={compareClassicalPositionLenses};
