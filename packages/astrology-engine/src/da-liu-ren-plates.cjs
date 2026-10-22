'use strict';
/**
 * Đại Lục Nhâm, restricted research subroutine: 月将加时 (month general above hour).
 * Earth plate order 子丑寅卯辰巳午未申酉戌亥. Manual inputs ONLY.
 * It does not compute astronomical zhongqi, Four Lessons, Three Transmissions or forecast.
 * Classical reference: 六壬指南 卷一, https://zh.wikisource.org/zh-hans/六壬指南/1
 */
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const ZHONG_QI=Object.freeze({
 'Vũ Thủy':'Hợi','Xuân Phân':'Tuất','Cốc Vũ':'Dậu','Tiểu Mãn':'Thân',
 'Hạ Chí':'Mùi','Đại Thử':'Ngọ','Xử Thử':'Tỵ','Thu Phân':'Thìn',
 'Sương Giáng':'Mão','Tiểu Tuyết':'Dần','Đông Chí':'Sửu','Đại Hàn':'Tý',
});
const RULESET='da-liu-ren-month-general-on-hour-reference-v1';
const MONTH_GENERAL_SOURCE='六壬指南 卷一; manual 中氣 input, no astronomical calculation';
function assertBranch(value, field){
 if(typeof value!=='string'||!BRANCHES.includes(value))throw new RangeError(`${field} must be one of ${BRANCHES.join(', ')}`);
 return BRANCHES.indexOf(value);
}
function monthGeneralAfterZhongQi(term){
 if(typeof term!=='string'||!Object.hasOwn(ZHONG_QI,term))throw new RangeError('Zhongqi must be a known 12-item middle-solar-term name; NOT a date or solar-term estimate');
 return ZHONG_QI[term];
}
function buildHeavenEarthPlates(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='divinationHour,monthGeneral')
  throw new TypeError('Supply exactly {monthGeneral, divinationHour}; do not infer solar boundaries');
 const g=assertBranch(input.monthGeneral,'monthGeneral');
 const h=assertBranch(input.divinationHour,'divinationHour');
 const offset=(g-h+12)%12;
 const positions=Object.freeze(BRANCHES.map((earth,i)=>Object.freeze({earth,heaven:BRANCHES[(i+offset)%12],earthIndex:i,heavenIndex:(i+offset)%12})));
 const result={
  ruleSet:RULESET,methodId:'dai-luc-nham-yuejiang',status:'deterministic-subroutine-only',
  monthGeneral:input.monthGeneral,divinationHour:input.divinationHour,offset,
  pattern:offset===0?'phuc-ngam':offset===6?'phan-ngam':'normal',
  positions,
  boundaries:Object.freeze(['Nguyệt Tướng phải xác định độc lập theo Trung khí','Không tự suy từ tháng âm hoặc ngày dương',
   'Chưa lập Tứ Khóa/Tam Truyền hoặc đoán quẻ']),
 };
 return Object.freeze(result);
}
module.exports=Object.freeze({BRANCHES,ZHONG_QI,RULESET,MONTH_GENERAL_SOURCE,monthGeneralAfterZhongQi,buildHeavenEarthPlates});
