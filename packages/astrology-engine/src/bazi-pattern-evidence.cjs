'use strict';
/** V11.96: Zi Ping pattern-transformation evidence only, NOT a pattern verdict.
 * Input must pass V11.95 season ledger guard, itself gated by V11.94 Jie and V11.93 clock.
 * Full triads/seasonal meetings and exposed stems are SYMBOLIC observations:
 * they do not certify transformed elements, 成格/破格, strength or 用神.
 */
const BaZi=require('./bazi.js');
const Jie=require('./bazi-jie-reference.cjs');
const Season=require('./bazi-season-evidence.cjs');
const RULESET='zi-ping-month-transformation-evidence-v11.96';
const PILLARS=Object.freeze(['year','month','day','hour']);
const SEASONAL_MEETINGS=Object.freeze([
 Object.freeze({branches:Object.freeze([2,3,4]),element:'Mộc'}),
 Object.freeze({branches:Object.freeze([5,6,7]),element:'Hỏa'}),
 Object.freeze({branches:Object.freeze([8,9,10]),element:'Kim'}),
 Object.freeze({branches:Object.freeze([11,0,1]),element:'Thủy'})
]);
const CONDITIONS=Object.freeze([
 'Xác minh độc lập độ chính xác của thời điểm giao Jie và quy tắc ranh giới năm/tháng.',
 'Đối chiếu dị bản tàng can và thứ tự chọn khí tháng của trường phái.',
 'Thẩm định thấu can, vị trí tương quan, hợp/xung và các tác động can chi có thể chế hóa.',
 'Đối chiếu điều kiện hóa thực sự: đủ bộ chi chỉ là hình thái, không đủ chứng minh hóa khí.',
 'Thẩm định thành/bại, cứu ứng, thanh/trọc và toàn cục trước khi xác định cách cục hay dụng thần.',
 'Cần ví dụ đối chiếu độc lập và phê duyệt chuyên gia trước khi mở engine chính.'
]);
const NOTES=Object.freeze([
 'Thấu can được nhận diện bằng vị trí trụ; Nhật Can không dùng như một can thấu ngoại thân để kết luận cách.',
 'Tam Hợp và Tam Hội chỉ xác nhận đủ ba ký hiệu chi ở ba trụ khác nhau, không chứng nhận hóa cục.',
 'Hai trụ cùng chi không được tính như hai thành viên độc lập của bộ ba.',
 'Xung, hợp và Tam Hội đồng tồn tại tạo ra sự kiện cần thẩm định, không có ưu tiên hóa tự động.',
 'Mọi cách cục, thành/bại, vượng suy và Dụng Thần vẫn chưa quyết định.'
]);
function freezeArray(rows){return Object.freeze(rows.map(x=>Object.freeze(x)));}
function blank(status,reason,seasonStatus){return Object.freeze({ruleSet:RULESET,researchOnly:true,
 status,reason,seasonStatus,monthBranch:null,exposure:[],branchGroups:[],stemContacts:[],branchContacts:[],
 possibleTransformations:[],methodChecks:[],pendingConditions:CONDITIONS,notes:NOTES,
 decision:Object.freeze({pattern:null,formation:null,breakage:null,dayMasterStrength:null,usefulGod:null,
 reason:'Thiếu giao thức đối chiếu trường phái và điều kiện chuyển hóa đã chứng nhận.'})});}
function buildPatternEvidence(chart){
 // Recheck all canonical V11.95 input invariants, including Jie and hidden stems.
 const season=Season.buildSeasonEvidence(chart);
 if(season.status==='BLOCKED')return blank('BLOCKED',season.reason,season.status);
 if(!chart.pillars||PILLARS.some(k=>!chart.pillars[k]))throw new TypeError('Thiếu bốn trụ');
 const pillars=chart.pillars,month=season.monthCommand;
 const stems=month.hiddenCandidates.map(q=>Object.freeze({stem:q.stem,stemIndex:q.stemIndex,qi:q.qi,tenGod:q.tenGod,
   exposedAt:Object.freeze(q.exposedAt.filter(k=>k!=='day')),isDayMasterOnly:q.exposedAt.length>0&&q.exposedAt.every(k=>k==='day'),
   monthPillarExposed:q.exposedAt.includes('month'),outsideMonthExposed:q.exposedAt.some(k=>k!=='month'&&k!=='day')}));
 const main=stems[0],additional=stems.slice(1).filter(s=>s.exposedAt.length>0);
 const principalExposed=main.exposedAt.length>0;
 const branchIndices=PILLARS.map(k=>pillars[k].branchIndex);
 const contacts=BaZi.detectRelations(pillars);
 const clashes=contacts.branchClashes.map(c=>Object.freeze({pillars:Object.freeze(c.pillars),branches:Object.freeze(c.symbols)}));
 const branchContacts=freezeArray([...contacts.branchCombinations.map(c=>({kind:'LUC_HOP',pillars:Object.freeze(c.pillars),branches:Object.freeze(c.symbols),transformed:false})),
   ...clashes.map(c=>({kind:'LUC_XUNG',pillars:c.pillars,branches:c.branches,transformed:false}))]);
 const stemContacts=freezeArray([...contacts.stemCombinations.map(c=>({kind:'THIEN_CAN_HOP',pillars:Object.freeze(c.pillars),stems:Object.freeze(c.symbols),symbolicElement:c.traditionalElement,transformed:false})),
   ...contacts.stemClashes.map(c=>({kind:'THIEN_CAN_XUNG',pillars:Object.freeze(c.pillars),stems:Object.freeze(c.symbols),symbolicElement:null,transformed:false}))]);
 // Require three different symbol branches, each assigned to a different pillar.
 const groups=[];
 for(const row of [
  ...BaZi.BRANCH_TRIADS.map(x=>({kind:'TAM_HOP',branches:x.branches,element:x.element})),
  ...SEASONAL_MEETINGS.map(x=>({kind:'TAM_HOI',branches:x.branches,element:x.element}))
 ]){
  const matched=row.branches.map(b=>PILLARS.find(k=>pillars[k].branchIndex===b)||null);
  if(matched.some(x=>x===null)||new Set(matched).size!==3)continue;
  const includesMonth=matched.includes('month');
  const relevantClashes=clashes.filter(c=>c.pillars.some(k=>matched.includes(k)));
  groups.push(Object.freeze({kind:row.kind,branches:Object.freeze(row.branches.map(i=>BaZi.BRANCHES[i])),
   pillars:Object.freeze(matched),symbolicElement:row.element,includesMonth,
   clashEvidence:Object.freeze(relevantClashes),transformed:false,
   status:relevantClashes.length?'CONFLICT_REVIEW':'COMPLETE_SYMBOLS_ONLY'}));
 }
 const monthGroups=groups.filter(g=>g.includesMonth);
 const possibleTransformations=[];
 if(additional.length)possibleTransformations.push(Object.freeze({mechanism:'THAU_CAN',
  candidateStems:Object.freeze(additional.map(c=>c.stem)),status:'CANDIDATE_ONLY',
  reason:principalExposed?'Khí chính cũng thấu: chưa quyết định ưu tiên giữa các ứng viên.':'Khí chính chưa thấu, phụ/dư khí lộ: cần xét điều kiện đổi cách.'}));
 if(monthGroups.length)possibleTransformations.push(Object.freeze({mechanism:'HOI_CHI',
  candidateElements:Object.freeze([...new Set(monthGroups.map(g=>g.symbolicElement))]),status:'CANDIDATE_ONLY',
  reason:'Đủ ký hiệu Tam Hợp/Tam Hội gồm Chi tháng không chứng minh sự chuyển hóa ngũ hành hoặc cách cục.'}));
 const methodChecks=freezeArray([
  {id:'ziping-hidden-qi-exposure',observation:additional.length?'ALTERNATE_EXPOSED':'MAIN_OR_UNEXPOSED',
   evidence:Object.freeze(stems.filter(s=>s.exposedAt.length).map(s=>s.stem)),verdict:'UNDETERMINED'},
  {id:'ziping-month-grouping',observation:monthGroups.length?'MONTH_GROUP_PRESENT':'NO_COMPLETE_MONTH_GROUP',
   evidence:Object.freeze(monthGroups.map(g=>g.kind+':'+g.symbolicElement)),verdict:'UNDETERMINED'},
  {id:'ziping-pattern-formation',observation:'PENDING_CLASSICAL_CONDITIONS',evidence:Object.freeze([]),verdict:'UNDETERMINED'}
 ]);
 return Object.freeze({ruleSet:RULESET,researchOnly:true,
  status:season.status==='REVIEW_REQUIRED'?'REVIEW_REQUIRED':'PROVISIONAL',reason:season.reason,seasonStatus:season.status,
  monthBranch:month.branch,exposure:Object.freeze(stems),branchGroups:Object.freeze(groups),stemContacts,
  branchContacts,possibleTransformations:Object.freeze(possibleTransformations),methodChecks,
  pendingConditions:CONDITIONS,notes:NOTES,
  decision:Object.freeze({pattern:null,formation:null,breakage:null,dayMasterStrength:null,usefulGod:null,
   reason:'Đủ hình thái không chứng minh hóa cục hoặc thành/bại; chưa thẩm định biến cách theo nguồn độc lập.'})});
}
function evaluatePatternEvidence(input){return buildPatternEvidence(Jie.evaluateWithReferenceJie(input));}
module.exports=Object.freeze({RULESET,PILLARS,SEASONAL_MEETINGS,CONDITIONS,NOTES,buildPatternEvidence,evaluatePatternEvidence});
