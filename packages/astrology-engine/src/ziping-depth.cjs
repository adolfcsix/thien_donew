'use strict';
/** V11.134 — scholarly Zi Ping comparison. Isolated from V9.8's approximation.
 * Never equate 格局用神, 扶抑用神 and 调候用神 or certify a useful god/strength.
 * The 2025–2027 Jie reference is minute-transcribed secondary data, not an ephemeris.
 */
const Bazi=require('./bazi.js');
const Jie=require('./bazi-jie-reference.cjs');
const Season=require('./bazi-season-evidence.cjs');
const Pattern=require('./bazi-pattern-evidence.cjs');
const RULESET='zi-ping-three-methods-verified-gates-v11.134';
const LUCK_RULESET='dayun-reference-jie-3-days-year-v11.134-research';
const PILLAR_KEYS=['year','month','day','hour'];
const mod=(n,m)=>((n%m)+m)%m;
const LONGITUDINAL_SEASONS=Object.freeze({
  winter:Object.freeze([11,0,1]), summer:Object.freeze([5,6,7]),
  spring:Object.freeze([2,3,4]), autumn:Object.freeze([8,9,10])
});
function makeComparison(chart,season,pattern){
 if(season.status==='BLOCKED'||pattern.status==='BLOCKED')return Object.freeze({status:'BLOCKED',reason:season.reason||pattern.reason,methods:[],conclusion:null});
 const month=season.monthCommand;
 const principal=month.principalQi;
 const alternatives=month.hiddenCandidates.filter(s=>s.exposedAt.some(k=>k!=='day'));
 const p=chart.pillars;
 const seasonName=Object.entries(LONGITUDINAL_SEASONS).find(([,v])=>v.includes(month.branchIndex))?.[0]||'unknown';
 const risks=pattern.branchGroups.filter(g=>g.status==='CONFLICT_REVIEW');
 const comparisons=[
  {method:'ge-ju',label:'Cách cục · lấy Nguyệt Lệnh (《Tử Bình Chân Thuyên》)',
   status:'CANDIDATE_ONLY',candidate:principal.tenGod,
   observations:[`Chính khí tháng ${month.branch}: ${principal.stem} (${principal.tenGod}).`,
    `Các tàng can có thấu ngoài Nhật Can: ${alternatives.map(s=>s.stem+' '+s.tenGod).join(', ')||'không có'}.`,
    `Bộ hợp/hội đủ ký hiệu có liên quan tháng: ${pattern.branchGroups.filter(g=>g.includesMonth).length}.`,
    ...risks.map(g=>`${g.kind} ${g.branches.join('–')} đồng thời gặp xung: cần đối chiếu cứu ứng.`)],
   pending:'Chưa xác nhận thành cách, phá cách, biến cách, hỷ/kỵ; cần thẩm định thấu can, hợp hóa, cứu ứng theo từng truyền bản.'},
  {method:'fu-yi',label:'Phù ức · quan sát đắc lệnh, đắc địa, đắc thế',status:'EVIDENCE_ONLY',candidate:null,
   observations:[`Chính khí tháng trợ Nhật Chủ: ${season.supportCounts.monthlyMainQiSupports?'có':'không'}.`,
    `Số địa chi có căn cùng hành Nhật Chủ: ${season.supportCounts.distinctRootBranches}/4.`,
    `Thiên Can lộ Ấn/Tỷ/Kiếp ngoài Nhật Can: ${season.supportCounts.visibleStemSupport}/3.`],
   pending:'Không quy đổi số ký hiệu thành điểm vượng suy; chưa chứng minh thân vượng/nhược hoặc hành cần phù/ức.'},
  {method:'diao-hou',label:'Điều hậu · xét hàn noãn táo thấp (《Cùng Thông Bảo Giám》)',
   status:'SEASONAL_CONTEXT_ONLY',candidate:null,
   observations:[`Nguyệt chi ${month.branch} thuộc nhóm mùa ${seasonName} theo phân loại quy ước.`,
    seasonName==='winter'?'Bối cảnh mùa đông: cần xem xét hàn khí trong toàn cục, không mặc định cứ dụng Hỏa.':
    seasonName==='summer'?'Bối cảnh mùa hạ: cần xem xét nhiệt/táo trong toàn cục, không mặc định cứ dụng Thủy.':
    'Bối cảnh mùa chuyển: phải xem Nhật Can, độ táo thấp và cấu trúc toàn bộ tứ trụ.'],
   pending:'Chưa có bảng điều hậu 10 Can × 12 tháng đã khảo dị; không đưa ra một hành Dụng thần tự động.'}
 ].map(x=>Object.freeze({...x,observations:Object.freeze(x.observations)}));
 return Object.freeze({status:chart.status==='CLOCK_REVIEW'||season.status==='REVIEW_REQUIRED'?'REVIEW_REQUIRED':'PROVISIONAL',
  reason:chart.status==='CLOCK_REVIEW'?'CLOCK_BOUNDARY_REVIEW':null,
  methods:Object.freeze(comparisons),conclusion:null,
  evidence:Object.freeze({monthBranch:month.branch,dayMaster:p.day.stem,schoolConflictPolicy:'KEEP_METHODS_SEPARATE',
   transformedElementAsserted:false,confirmedPattern:null,confirmedUsefulGod:null})});
}
function researchDayun(chart,sex,count=8){
 if(!['male','female'].includes(sex))throw new RangeError('Phải chọn giới tính theo quy ước Đại Vận đang nghiên cứu');
 if(!Number.isInteger(count)||count<1||count>12)throw new RangeError('Số vận phải là 1–12');
 const blank=(reason)=>Object.freeze({ruleSet:LUCK_RULESET,status:'BLOCKED',reason,direction:null,startingAge:null,cycles:[],referenceJie:null});
 if(chart.referenceJie?.status!=='RESOLVED'||!chart.pillars?.year||!chart.pillars?.month)return blank('JIE_NOT_RESOLVED');
 if(chart.status==='CLOCK_REVIEW')return blank('BIRTH_CLOCK_BOUNDARY_REVIEW');
 const instant=Date.parse(chart.actualUtc);
 if(!Number.isFinite(instant))return blank('INVALID_INSTANT');
 const yr=chart.pillars.year,month=chart.pillars.month;
 const direction=((yr.stemIndex%2===0)===(sex==='male'))?'forward':'reverse';
 const step=direction==='forward'?1:-1;
 // Chronological Jie records: 12 Jie per year, not the 12 mid-terms (中氣).
 const chosen=direction==='forward'?Jie.EVENTS.find(e=>e.epochMs>instant):[...Jie.EVENTS].reverse().find(e=>e.epochMs<instant);
 if(!chosen)return blank('REFERENCE_JIE_OUT_OF_COVERAGE');
 const elapsed=Math.abs(chosen.epochMs-instant)/86400000;
 if(!(elapsed>0&&elapsed<38))return blank('REFERENCE_JIE_INTERVAL_INVALID');
 if(Math.abs(chosen.epochMs-instant)<=Jie.COVERAGE.guardSeconds*1000)return blank('REFERENCE_JIE_MINUTE_GUARD');
 const startingAge=elapsed/3;
 const roundedTotalMonths=Math.round(startingAge*12);
 const cycles=Array.from({length:count},(_,i)=>{
  const stemIndex=mod(month.stemIndex+step*(i+1),10),branchIndex=mod(month.branchIndex+step*(i+1),12);
  return Object.freeze({index:i+1,stemIndex,branchIndex,name:Bazi.STEMS[stemIndex]+' '+Bazi.BRANCHES[branchIndex],
   tenGod:Bazi.tenGod(chart.pillars.day.stemIndex,stemIndex),startingAgeYears:Number((startingAge+i*10).toFixed(4)),
   endingAgeYears:Number((startingAge+(i+1)*10).toFixed(4))});
 });
 return Object.freeze({ruleSet:LUCK_RULESET,status:'PROVISIONAL',direction,
  directionLabel:direction==='forward'?'Thuận':'Nghịch',sourceId:Jie.SOURCE_ID,
  startingAge:Object.freeze({decimalYears:Number(startingAge.toFixed(5)),years:Math.floor(roundedTotalMonths/12),
   months:roundedTotalMonths%12,conversion:'3 ngày = 1 năm; 1 ngày = 4 tháng (ước tính truyền thống)'}),
  referenceJie:Object.freeze({term:chosen.term,instantUtc:chosen.instantUtc,elapsedDays:Number(elapsed.toFixed(5)),publishedPrecision:'minute'}),
  cycles:Object.freeze(cycles),limitation:'Chỉ khảo sát 2025–2027 theo bảng Jie chép thứ cấp; tuổi khởi vận là quy đổi truyền thống, chưa xác minh thiên văn phút và múi giờ lịch sử.'});
}
function evaluate(input){
 if(!input||typeof input!=='object')throw new TypeError('Thiếu dữ liệu lập Bát Tự');
 const {sex,count=8,...calendarInput}=input;
 const chart=Jie.evaluateWithReferenceJie(calendarInput);
 const season=Season.buildSeasonEvidence(chart);
 const pattern=Pattern.buildPatternEvidence(chart);
 return Object.freeze({ruleSet:RULESET,researchOnly:true,input:Object.freeze({...calendarInput,sex}),
  calendar:Object.freeze({status:chart.status,sourceId:Jie.SOURCE_ID,sourceStatus:chart.referenceJie?.status||'UNKNOWN',
   nearClockBoundary:chart.status==='CLOCK_REVIEW',coverage:'2025–2027, phút, bảng thứ cấp'}),
  pillarNames:Object.freeze(Object.fromEntries(PILLAR_KEYS.map(k=>[k,chart.pillars?.[k]?.name||null]))),
  methods:makeComparison(chart,season,pattern),luck:researchDayun(chart,sex,count),
  verifiedUsefulGod:null,verifiedPattern:null,
  note:'Phân hệ nghiên cứu cách cục / phù ức / điều hậu và Đại Vận, không kết luận thành cách, hỷ kỵ hay định mệnh.'});
}
module.exports=Object.freeze({RULESET,LUCK_RULESET,LONGITUDINAL_SEASONS,makeComparison,researchDayun,evaluate});
