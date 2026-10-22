'use strict';
/** Research-only V11.90 facade: safe propagation of HKO minute-resolution uncertainty. */
const {resolveMonthGeneralAt}=require('./da-liu-ren-zhongqi.cjs');
const {validDay}=require('./da-liu-ren-four-lessons.cjs');
const {BRANCHES}=require('./da-liu-ren-plates.cjs');
const {deriveThreeTransmissions}=require('./da-liu-ren-three-transmissions.cjs');
const RULESET='da-liu-ren-hko-four-lessons-transmissions-study-v1';
function resolveStudyAt(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).sort().join(',')!==['dayStem','dayBranch','divinationHour','instantIso'].sort().join(','))
  throw new TypeError('Explicit ISO instant, day stem, day branch and hour branch are all required');
 validDay(input.dayStem,input.dayBranch);
 if(!BRANCHES.includes(input.divinationHour))throw new RangeError('Hour branch must be explicitly supplied');
 const resolution=resolveMonthGeneralAt({instantIso:input.instantIso});
 if(resolution.status!=='reference-resolved-only')return Object.freeze({
  ruleSet:RULESET,status:resolution.status,resolution,fourLessons:null,threeTransmissions:null,
  reason:'Source time does not establish a reliable Nguyệt Tướng; no downstream lessons or transmissions are computed'});
 const result=deriveThreeTransmissions({monthGeneral:resolution.monthGeneral,
  divinationHour:input.divinationHour,dayStem:input.dayStem,dayBranch:input.dayBranch});
 return Object.freeze({ruleSet:RULESET,status:'research-only',resolution,
  fourLessons:result.fourLessons,threeTransmissions:result,
  disclaimers:Object.freeze(['Can Chi ngày và chi giờ là dữ liệu nhập thủ công, chưa được tính từ giờ sinh',
   'Bảng Trung khí HKO 2025–2027 chỉ chính xác đến phút',
   'Tam Truyền unresolved không được diễn giải hay thay bằng kết quả giả'])});
}
module.exports=Object.freeze({RULESET,resolveStudyAt});
