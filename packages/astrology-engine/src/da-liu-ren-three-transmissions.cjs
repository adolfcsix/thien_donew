'use strict';
/**
 * Narrow, non-production derivation of 三傳 under single 賊克 or uniquely-resolved 比用.
 * Complex 九宗門 branches and 伏吟/反吟 are deliberately NOT approximated.
 */
const {BRANCHES}=require('./da-liu-ren-plates.cjs');
const {buildFourLessons}=require('./da-liu-ren-four-lessons.cjs');
const RULESET='da-liu-ren-three-transmissions-partial-research-v1';
const PENDING=Object.freeze(['thiệp-hại','dao-khac','mao-tinh','biet-trach','bat-chuyen','phuc-ngam','phan-ngam','variant-exceptions']);
const freezeList=items=>Object.freeze(items.map(x=>Object.freeze(x)));
function deriveThreeTransmissions(input){
 const four=buildFourLessons(input);
 const {plate,lessons}=four;
 const main={ruleSet:RULESET,status:'research-only',methodId:'dai-luc-nham-yuejiang',fourLessons:four};
 function blocked(reason,candidates=[],priority=null){
  return Object.freeze({...main,verdict:'unresolved',reason,priority,
   candidates:freezeList(candidates.map(x=>({lesson:x.number,upper:x.upper,relation:x.relation,upperYinYang:x.upperYinYang}))),
   rule:null,transmissions:null,pending:PENDING});
 }
 // Separate named special rules are NOT a mere shifted plate lookup.
 if(plate.pattern!=='normal')return blocked(plate.pattern+'-requires-special-nine-gates-rule');
 if(!four.hasFourDistinctLessons)return blocked('incomplete-or-duplicate-lessons-needs-special-review');
 // First seek 下贼上 across ALL four lessons; only when none exist seek 上克下.
 const down=lessons.filter(l=>l.relation==='lower-attacks-upper');
 const up=lessons.filter(l=>l.relation==='upper-controls-lower');
 const group=down.length?down:up;
 const priority=down.length?'lower-attacks-upper':up.length?'upper-controls-lower':null;
 if(!group.length)return blocked('no-direct-control-requires-other-nine-gates');
 let chosen,rule;
 if(group.length===1){chosen=group[0];rule=priority==='lower-attacks-upper'?'zei-ke-lower-attacks-upper':'zei-ke-upper-controls-lower';}
 else {
  const parity=BRANCHES.indexOf(four.dayBranch); // day stem parity == branch parity, validated by buildFourLessons
  const matching=group.filter(l=>BRANCHES.indexOf(l.upper)%2===parity%2);
  if(matching.length!==1)return blocked('bi-yong-ambiguous-requires-she-hai-or-other-gate',group,priority);
  chosen=matching[0];rule='bi-yong-unique-yin-yang';
 }
 // 相因 method applies ONLY to currently supported first-transmission selection branches.
 const shift=branch=>plate.positions[BRANCHES.indexOf(branch)].heaven;
 const initial=chosen.upper,middle=shift(initial),final=shift(middle);
 return Object.freeze({...main,verdict:'derived-subroutine-only',priority,rule,
  candidates:freezeList(group.map(x=>({lesson:x.number,upper:x.upper,relation:x.relation,upperYinYang:x.upperYinYang}))),
  selectedLesson:chosen.number,
  transmissions:Object.freeze({initial,middle,final,sequence:Object.freeze([initial,middle,final])}),
  constraints:Object.freeze(['Áp dụng quy tắc 相因 cho nhánh 贼克 / 比用 đã chọn',
   'Chưa có các nhánh đặc biệt 九宗門; không được áp dụng cho các tình huống unresolved',
   'Không khẳng định phép đoán truyền thống có tính dự báo được kiểm chứng'])});
}
module.exports=Object.freeze({RULESET,PENDING,deriveThreeTransmissions});
