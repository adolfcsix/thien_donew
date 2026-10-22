'use strict';
/**
 * 大六壬 四課: isolated study implementation of 干支寄宮 and overlaid heaven plate.
 * References and independent worked examples: docs/research/schools/dai-luc-nham-four-lessons.md.
 * This is NOT date/day-pillar calculation or a public production engine.
 */
const {BRANCHES,buildHeavenEarthPlates}=require('./da-liu-ren-plates.cjs');
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const STEM_LODGING=Object.freeze({
 'Giáp':'Dần','Ất':'Thìn','Bính':'Tỵ','Đinh':'Mùi','Mậu':'Tỵ',
 'Kỷ':'Mùi','Canh':'Thân','Tân':'Tuất','Nhâm':'Hợi','Quý':'Sửu',
});
const BRANCH_ELEMENTS=Object.freeze({
 'Tý':'thủy','Sửu':'thổ','Dần':'mộc','Mão':'mộc','Thìn':'thổ','Tỵ':'hỏa',
 'Ngọ':'hỏa','Mùi':'thổ','Thân':'kim','Dậu':'kim','Tuất':'thổ','Hợi':'thủy',
});
const STEM_ELEMENTS=Object.freeze({
 'Giáp':'mộc','Ất':'mộc','Bính':'hỏa','Đinh':'hỏa','Mậu':'thổ',
 'Kỷ':'thổ','Canh':'kim','Tân':'kim','Nhâm':'thủy','Quý':'thủy',
});
const CONTROLS=Object.freeze({'mộc':'thổ','thổ':'thủy','thủy':'hỏa','hỏa':'kim','kim':'mộc'});
const RULESET='da-liu-ren-four-lessons-research-v1';
function validDay(dayStem,dayBranch){
 if(!Object.hasOwn(STEM_LODGING,dayStem)||!BRANCHES.includes(dayBranch))
  throw new RangeError('Require canonical Vietnamese dayStem and dayBranch (no implicit calendar conversion)');
 if(STEMS.indexOf(dayStem)%2!==BRANCHES.indexOf(dayBranch)%2)
  throw new RangeError('Day stem/branch parity is impossible in sexagenary 60-day cycle');
}
function strictObject(input,fields){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==fields.slice().sort().join(','))
  throw new TypeError('Require exactly {'+fields.join(', ')+'}; time/calendar pillars must be supplied explicitly');
}
const heavenAt=(plate,earth)=>plate.positions[BRANCHES.indexOf(earth)].heaven;
function lesson(number,lower,upper,lowerType){
 const lowerElement=lowerType==='stem'?STEM_ELEMENTS[lower]:BRANCH_ELEMENTS[lower];
 const upperElement=BRANCH_ELEMENTS[upper];
 const lowerControlsUpper=CONTROLS[lowerElement]===upperElement;
 const upperControlsLower=CONTROLS[upperElement]===lowerElement;
 return Object.freeze({number,lower,upper,lowerType,lowerElement,upperElement,
  relation:lowerControlsUpper?'lower-attacks-upper':upperControlsLower?'upper-controls-lower':'no-control',
  upperYinYang:BRANCHES.indexOf(upper)%2===0?'yang':'yin'});
}
function buildFourLessons(input){
 strictObject(input,['monthGeneral','divinationHour','dayStem','dayBranch']);
 validDay(input.dayStem,input.dayBranch);
 const plate=buildHeavenEarthPlates({monthGeneral:input.monthGeneral,divinationHour:input.divinationHour});
 const first=heavenAt(plate,STEM_LODGING[input.dayStem]);
 const second=heavenAt(plate,first);
 const third=heavenAt(plate,input.dayBranch);
 const fourth=heavenAt(plate,third);
 const lessons=Object.freeze([
  lesson(1,input.dayStem,first,'stem'),lesson(2,first,second,'branch'),
  lesson(3,input.dayBranch,third,'branch'),lesson(4,third,fourth,'branch'),
 ]);
 const uniquePairs=new Set(lessons.map(x=>x.lower+'-'+x.upper)).size;
 return Object.freeze({ruleSet:RULESET,status:'research-only',dayStem:input.dayStem,dayBranch:input.dayBranch,
  stemLodging:STEM_LODGING[input.dayStem],plate,lessons,uniquePairs,
  hasFourDistinctLessons:uniquePairs===4,
  constraints:Object.freeze(['Người nghiên cứu xác minh nhật can chi độc lập; không tự suy từ ngày dương',
   'Không coi Tứ Khóa là dự báo',
   'Địa chi giờ và Nguyệt Tướng phải được xác minh theo đúng trường phái'])});
}
module.exports=Object.freeze({STEMS,STEM_LODGING,STEM_ELEMENTS,BRANCH_ELEMENTS,CONTROLS,RULESET,validDay,buildFourLessons});
