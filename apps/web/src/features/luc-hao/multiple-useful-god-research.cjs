/**
 * Thiên Đồ V11.99 — 六爻 research-only 多现/伏神 & Jie month consistency.
 * This ledger reports observable signals, never selects a useful god or asserts 出伏.
 * The Jie minutes are SECONDARY TRANSCRIPTIONS; consistency is not validation.
 */
'use strict';
const {buildQuestionEvidence}=require('./question-evidence.cjs');
const {BRANCHES}=require('./temporal.cjs');
const {resolveJieAt,COVERAGE}=require('../../../../../packages/astrology-engine/src/bazi-jie-reference.cjs');
const RULE='luc-hao-multiple-yongshen-and-jie-evidence-v11.99';
const SCHOOL='luc-hao-multiple-jie-evidence';
const CLASSIC='https://www.shidianguji.com/book/XYXZSBY/chapter/1lzxsny7db6rt';
const FU_REFERENCE='https://ctext.org/wiki.pl?chapter=157683&if=en';
const SOURCES=Object.freeze({multi:CLASSIC,hidden:FU_REFERENCE});
const NOTES=Object.freeze([
 '古法 có các tiêu chí ưu tiên nhưng Tăng San Bốc Dịch ghi trường hợp ngoại lệ khi gặp Nguyệt Phá và Tuần Không; không được xếp hạng một cách máy móc.',
 'Ngày Can Chi do người nghiên cứu tự cung cấp; thời điểm UTC và tháng Jie từ bảng tham chiếu không tự tính Nhật Can Chi.',
 'Bảng Jie 2025–2027 là bản chép thứ cấp, phút công bố ±60 giây; chưa kiểm định từng dòng so với HKO gốc.',
 'Quan hệ Phi/Phục, hào động, Tuần Không và Nguyệt Phá chỉ là dấu hiệu cần đánh giá cùng toàn bàn.',
 'Không tự phán xuất phục, ám động, nhật phá, vượng suy, ứng kỳ, hoặc tốt/xấu.',
]);
function monthFromJie({instantIso}={}){
 const resolved=resolveJieAt({instantIso});
 const basic={rule:RULE,instantUtc:resolved.instantUtc,sourceId:COVERAGE.sourceId,
   quality:'SECONDARY_MINUTE_REFERENCE_NOT_INDEPENDENTLY_VERIFIED',
   guardSeconds:COVERAGE.guardSeconds,researchOnly:true,referenceStatus:resolved.status};
 if(resolved.status!=='RESOLVED')return Object.freeze({...basic,status:resolved.status,monthBranch:null,
   activeTerm:null,boundary:resolved.boundary??null,verified:false});
 const active=resolved.active;
 return Object.freeze({...basic,status:'REFERENCE_RESOLVED',monthBranch:BRANCHES[(active.monthIndex+2)%12],
   activeTerm:active.term,activeEventUtc:active.instantUtc,boundary:null,verified:false});
}
const flag=x=>x===true?'PRESENT':x===false?'ABSENT':'UNKNOWN';
function classify(x,isHidden){
 const monthBreak=x.month?.monthBreak??null;
 const dayClash=x.day?.clash??null;
 const voided=x.xunVoid??null;
 return Object.freeze({
  position:x.position,stemBranch:x.stemBranch,relative:x.relative,candidateKind:isHidden?'HIDDEN':'VISIBLE',
  moving:isHidden?'NOT_APPLICABLE':flag(x.isDeclaredMoving),xunVoid:flag(voided),monthBreak:flag(monthBreak),dayClash:flag(dayClash),
  flying:isHidden?Object.freeze({stemBranch:x.flying.stemBranch,
   flyingToHidden:x.flying.flyingToHidden,hiddenToFlying:x.flying.hiddenToFlying,
   flyingMoving:flag(x.flying.movementIsDeclaredForFlying),flyingVoid:flag(x.flying.xunVoid),
   flyingMonthBreak:flag(x.flying.monthBreak),flyingDayClash:flag(x.flying.dayClash)}):null,
  emergence:null,priority:null,prosperity:null,chosen:null,
  pending:Object.freeze(['Dụng Thần đa hiện và vai trò của hào động','cách xét Tuần Không/Nguyệt Phá theo truyền bản',
   ...(isHidden?['điều kiện xuất phục và tương quan Phi/Phục']:[])])});
}
function compareCandidates(candidates){
 const conflicts=[];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j];
  const differences=[];
  for(const f of ['moving','xunVoid','monthBreak','dayClash'])
   if(a[f]!=='UNKNOWN'&&b[f]!=='UNKNOWN'&&a[f]!==b[f])differences.push(f);
  conflicts.push(Object.freeze({positions:Object.freeze([a.position,b.position]),differingSignals:Object.freeze(differences),
   selected:null,interpretation:'REQUIRES_SCHOOL_REVIEW'}));
 }
 return Object.freeze(conflicts);
}
/**
 * Month may be compared with a supplied manual Can-Chi day context; a mismatch BLOCKS the
 * entire reading. No implied day-stem/branch from the UTC instant is possible here.
 * Calendar is never promoted to an officially verified ephemeris.
 */
function analyzeMultiple(chart,{questionId,confirmedFamily,context=null,movingPositions=[],instantIso=null}={}){
 const reference=instantIso===null?null:monthFromJie({instantIso});
 if(reference && reference.status!=='REFERENCE_RESOLVED')return Object.freeze({rule:RULE,school:SCHOOL,researchOnly:true,
   status:'CALENDAR_REVIEW',calendar:reference,reading:null,candidates:Object.freeze([]),conflicts:Object.freeze([]),
   decision:Object.freeze({usefulGod:null,emergence:null,auspiciousness:null,timing:null}),sources:SOURCES,notes:NOTES});
 if(reference && !context)throw new TypeError('Phải nhập riêng Can Chi ngày/tháng đã xác nhận trước khi đối chiếu với giờ UTC.');
 if(reference && context.source!=='user-verified-manual')throw new TypeError('Không được lấy ngữ cảnh tháng gần đúng hoặc không rõ nguồn thay cho dữ liệu thủ công.');
 if(reference && context.monthBranch!==reference.monthBranch)throw new RangeError('Nguyệt Kiến thủ công mâu thuẫn với tiết Jie tham chiếu: cần kiểm tra dữ liệu.');
 const reading=buildQuestionEvidence(chart,{questionId,confirmedFamily,context,movingPositions});
 const candidates=Object.freeze([
  ...reading.visible.map(x=>classify(x,false)),...reading.hidden.map(x=>classify(x,true))
 ].sort((a,b)=>a.position-b.position));
 return Object.freeze({rule:RULE,school:SCHOOL,researchOnly:true,status:'EVIDENCE_ONLY',
  calendar:reference,calendarQuality:reference?'REFERENCE_CONSISTENT_NOT_CERTIFIED':
   context?'MANUAL_UNCORROBORATED':'NOT_SUPPLIED',
  question:reading.question,referenceFamily:reading.referenceFamily,
  candidateCount:candidates.length,multiple:candidates.length>1,candidates,
  conflicts:compareCandidates(candidates),chosenUsefulGodLine:null,
  decision:Object.freeze({usefulGod:null,emergence:null,auspiciousness:null,timing:null}),
  sources:SOURCES,notes:NOTES});
}
module.exports=Object.freeze({RULE,SCHOOL,SOURCES,NOTES,monthFromJie,analyzeMultiple});
