'use strict';
/** V11.95 — isolated Zi Ping evidence ledger. No fate or day-master-strength verdicts.
 * Only accepts V11.94's minute-reference chart after its astronomical gate.
 * See docs/research/schools/bat-tu-month-command.md for conventions and limits.
 */
const BaZi=require('./bazi.js');
const Jie=require('./bazi-jie-reference.cjs');
const RULESET='zi-ping-month-command-evidence-v11.95';
const PILLARS=Object.freeze(['year','month','day','hour']);
const FIVE_PHASES=Object.freeze(['Mộc','Hỏa','Thổ','Kim','Thủy']);
const PILLAR_LABELS=Object.freeze({year:'Năm',month:'Tháng',day:'Ngày',hour:'Giờ'});
const RELATIONS=Object.freeze({
 'Tỷ Kiên':'companion','Kiếp Tài':'companion',
 'Thiên Ấn':'resource','Chính Ấn':'resource',
 'Thực Thần':'output','Thương Quan':'output',
 'Thiên Tài':'wealth','Chính Tài':'wealth',
 'Thất Sát':'authority','Chính Quan':'authority'
});
const NOTES=Object.freeze([
 'Tàng Can giữ thứ tự của bảng bazi.js v9.6; đây là quy ước bảng, không phải phần trăm khí và không tự chứng minh đương lệnh từng ngày.',
 'Thập Thần so theo Nhật Can; mối quan hệ âm dương không tự tạo kết luận hung/cát.',
 'Nguyệt Lệnh có thể gợi ý ứng viên cách cục nhưng cần xét thấu can, hợp hội, biến cách, chế hóa và toàn cục; không tự phong cách cục hoặc Dụng Thần.',
 'Đắc lệnh/đắc địa/đắc thế được ghi thành dấu hiệu có thể quan sát, không tính điểm hay phân loại vượng/nhược.',
 'Nguồn Jie V11.94 là bảng theo phút 2025–2027 chưa thẩm định từng dòng theo HKO; ca sát tiết bắt buộc kiểm tra thêm.'
]);
function guardPillar(row,key,dayStemIndex){
 if(!row||typeof row!=='object'||!Number.isInteger(row.stemIndex)||!Number.isInteger(row.branchIndex)||
   row.stemIndex<0||row.stemIndex>9||row.branchIndex<0||row.branchIndex>11||
   row.stemIndex%2!==row.branchIndex%2)throw new TypeError(`Trụ ${key} không hợp lệ`);
 if(row.stem!==BaZi.STEMS[row.stemIndex]||row.branch!==BaZi.BRANCHES[row.branchIndex])
   throw new TypeError(`Ký hiệu trụ ${key} trái với chỉ số Can Chi`);
 const canonical=BaZi.hiddenStems(row.branchIndex,dayStemIndex);
 if(!Array.isArray(row.hiddenStems)||row.hiddenStems.length!==canonical.length||
   row.hiddenStems.some((x,i)=>x.stemIndex!==canonical[i].stemIndex||x.tenGod!==canonical[i].tenGod))
   throw new TypeError(`Tàng Can trụ ${key} không khớp quy ước bảng`);
 if(row.tenGod!==(key==='day'?null:BaZi.tenGod(dayStemIndex,row.stemIndex)))
   throw new TypeError(`Thập Thần trụ ${key} không khớp Nhật Can`);
}
function blocked(chart){
 const reason=chart?.referenceJie?.status==='BOUNDARY_REVIEW'?'Jie_BOUNDARY_REVIEW':
   chart?.referenceJie?.status==='OUT_OF_COVERAGE'?'Jie_OUT_OF_COVERAGE':
   'MISSING_VERIFIED_PILLARS';
 return Object.freeze({ruleSet:RULESET,researchOnly:true,status:'BLOCKED',reason,
   dayMaster:null,monthCommand:null,visibleTenGods:[],hiddenByPillar:[],
   rootEvidence:[],visibleSupport:[],methodComparisons:[],notes:NOTES});
}
function buildSeasonEvidence(chart){
 if(!chart||chart.ruleSet!=='bazi-hko-jie-calendar-research-v11.94'||chart.researchOnly!==true)
   throw new TypeError('Chỉ nhận lá số nghiên cứu Jie V11.94, không lấy kết quả xấp xỉ làm mốc mùa');
 if(chart.referenceJie?.status!=='RESOLVED'||chart.status==='BOUNDARY_REVIEW'||chart.status==='OUT_OF_COVERAGE'||
   !chart.pillars||PILLARS.some(k=>!chart.pillars[k]))return blocked(chart);
 if(!['PROVISIONAL','CLOCK_REVIEW'].includes(chart.status))throw new TypeError('Trạng thái phép tính Bát Tự không được chấp nhận');
 const p=chart.pillars,dayIndex=p.day.stemIndex;
 if(!Number.isInteger(dayIndex)||dayIndex<0||dayIndex>9||
    !chart.dayMaster||chart.dayMaster.stem!==BaZi.STEMS[dayIndex])throw new TypeError('Nhật Chủ không hợp lệ');
 PILLARS.forEach(k=>guardPillar(p[k],k,dayIndex));
 if(chart.monthIndex!==((p.month.branchIndex+10)%12)||chart.referenceJie.active?.monthIndex!==chart.monthIndex)
   throw new TypeError('Nguyệt Lệnh và lịch Jie không khớp nhau');
 const visibleTenGods=PILLARS.filter(k=>k!=='day').map(k=>Object.freeze({
   pillar:k,stem:p[k].stem,stemIndex:p[k].stemIndex,
   tenGod:BaZi.tenGod(dayIndex,p[k].stemIndex),family:RELATIONS[BaZi.tenGod(dayIndex,p[k].stemIndex)]
 }));
 const hiddenByPillar=PILLARS.map(key=>Object.freeze({
   pillar:key,branch:p[key].branch,branchIndex:p[key].branchIndex,
   stems:Object.freeze(BaZi.hiddenStems(p[key].branchIndex,dayIndex).map((x,i)=>Object.freeze({
    stem:x.stem,stemIndex:x.stemIndex,element:x.element,tenGod:x.tenGod,family:RELATIONS[x.tenGod],
    qi:i===0?'main':i===1?'secondary':'residual',order:i
   })))
 }));
 const month=hiddenByPillar[1];
 const candidates=month.stems.map(x=>Object.freeze({...x,
   exposedAt:Object.freeze(PILLARS.filter(k=>p[k].stemIndex===x.stemIndex)),
   exposedBeyondMonth:PILLARS.filter(k=>k!=='month'&&p[k].stemIndex===x.stemIndex).length>0
 }));
 const principal=candidates[0];
 const rootEvidence=hiddenByPillar.map(x=>Object.freeze({
   pillar:x.pillar,branch:x.branch,dayElementRoot:x.stems.some(s=>s.element===BaZi.ELEMENTS[dayIndex]),
   exactStemRoot:x.stems.some(s=>s.stemIndex===dayIndex),
   supportingHidden:Object.freeze(x.stems.filter(s=>s.family==='resource'||s.family==='companion').map(s=>s.stem))
 }));
 const visibleSupport=visibleTenGods.filter(x=>['companion','resource'].includes(x.family));
 const foundRoots=rootEvidence.filter(x=>x.dayElementRoot);
 const supportCounts=Object.freeze({visibleStemSupport:visibleSupport.length,
    distinctRootBranches:foundRoots.length,monthlyMainQiSupports:['companion','resource'].includes(principal.family)});
 const monthCommand=Object.freeze({branch:month.branch,branchIndex:month.branchIndex,
   solarTerm:chart.referenceJie.active.term,sourceId:chart.referenceJie.sourceId,
   principalQi:principal,hiddenCandidates:Object.freeze(candidates),mainQiSupportsDayMaster:supportCounts.monthlyMainQiSupports,
   visibleCandidateCount:candidates.filter(c=>c.exposedAt.length>0).length,
   unresolved:'Chỉ có thể xác định khí chính và các tàng can lộ; phép lấy cách còn phụ thuộc biến cách, hợp hội và trường phái.'});
 const methodComparisons=Object.freeze([
   Object.freeze({id:'ziping-month-command',status:'CANDIDATE_ONLY',
      evidence:Object.freeze(['month-principal-qi','month-hidden-stems','exposed-hidden-stems']),
      limitation:'Ứng viên nguyệt lệnh, chưa xét biến cách, hợp hóa, thành bại, không quyết định Dụng Thần.'}),
   Object.freeze({id:'structural-support-inventory',status:'EVIDENCE_ONLY',
      evidence:Object.freeze(['visible-resource-companion','day-element-roots','month-main-qi-relation']),
      limitation:'Không dùng điểm ngũ hành, trọng số tàng can hay nhãn Nhật Chủ vượng/nhược.'})
 ]);
 return Object.freeze({ruleSet:RULESET,researchOnly:true,
   status:chart.status==='CLOCK_REVIEW'?'REVIEW_REQUIRED':'PROVISIONAL',
   reason:chart.status==='CLOCK_REVIEW'?'CLOCK_BOUNDARY_REVIEW':null,
   dayMaster:Object.freeze({stem:p.day.stem,stemIndex:dayIndex,element:BaZi.ELEMENTS[dayIndex],polarity:dayIndex%2===0?'Dương':'Âm'}),
   monthCommand,visibleTenGods:Object.freeze(visibleTenGods),hiddenByPillar:Object.freeze(hiddenByPillar),
   rootEvidence:Object.freeze(rootEvidence),visibleSupport:Object.freeze(visibleSupport),
   supportCounts,methodComparisons,notes:NOTES,
   decision:Object.freeze({dayMasterStrength:null,pattern:null,usefulGod:null,reason:'Chưa có giao thức trường phái được đối chứng để ra kết luận.'})});
}
function evaluateSeasonEvidence(input){return buildSeasonEvidence(Jie.evaluateWithReferenceJie(input));}
module.exports=Object.freeze({RULESET,PILLARS,FIVE_PHASES,RELATIONS,NOTES,buildSeasonEvidence,evaluateSeasonEvidence});
