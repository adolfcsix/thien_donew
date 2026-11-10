'use strict';
/**
 * Research-only cross-school brightness comparison. Values are independently
 * transcribed from the pinned reference's SB_QS rows 9, 23, 24.
 * NB: SB_QS currently gives Hỏa and Linh identical rows while algorithm.ts
 * documents a separate override for Linh; that discrepancy is NOT resolved.
 * This code does not change placements, Thiên Đồ strength or rule verdicts.
 */
const REF_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const ROOT='https://github.com/Renhuai123/ziwei-doushu/blob/'+REF_COMMIT+'/lib/ziwei/';
const SOURCE_URL=ROOT+'school-tables.generated.ts';
const CROSSCHECK_URL=ROOT+'algorithm.ts';
const PROFILE='ziwei-doushu-SB_QS-comparison-2026-11-10-v2';
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const LABELS=Object.freeze({1:'Miếu',2:'Vượng',3:'Đắc',4:'Lợi',5:'Bình',6:'Bất',7:'Hãm'});
// SB_QS is 1-based with column 0 reserved. We store ONLY columns 1-12,
// which directly match Thiên Đồ's Tý=0 ... Hợi=11 index convention.
const ROWS=Object.freeze({
 'Tham Lang':Object.freeze([2,1,5,4,1,7,2,1,5,4,1,7]), // SB_QS[9]
 'Hỏa Tinh':Object.freeze([7,3,1,4,7,3,1,4,7,3,1,4]), // SB_QS[23]
 'Linh Tinh':Object.freeze([7,3,1,4,7,3,1,4,7,3,1,4]) // SB_QS[24]
});
const SOURCE_IDS=Object.freeze({'Tham Lang':9,'Hỏa Tinh':23,'Linh Tinh':24});
const discrepancy=Object.freeze({
 code:'qs-huo-ling-identical-algorithm-ling-override',
 unresolved:true,
 detail:'Bảng SB_QS tại commit nguồn có Hỏa/Linh trùng 12 ô. Bảng mặc định trong algorithm.ts của cùng nguồn có giá trị Linh Tinh khác tại một số cung; đã chuẩn hóa thứ tự chi để đối chiếu nhưng chưa thẩm định trường phái nào phù hợp.',
 alternateUrl:CROSSCHECK_URL
});
/**
 * A *different* pinned source path: algorithm.ts DEFAULT_BRIGHTNESS['铃星'].
 * Its 12 cells start from Dần, whereas SB_QS uses Tý-first. Preserve its
 * original ordering here; the conversion below makes the distinction visible.
 * This is a reference-source comparison, not another engine rule set.
 */
const DEFAULT_LINH_DAN_FIRST=Object.freeze(['庙','利','得','得','庙','得','得','得','庙','陷','陷','陷']);
const ZH_LEVELS=Object.freeze({'庙':'Miếu','旺':'Vượng','得':'Đắc','利':'Lợi','平':'Bình','不':'Bất','闲':'Nhàn','陷':'Hãm','地':'Địa'});
const DEFAULT_LINH_TY_FIRST=Object.freeze(BRANCHES.map((_,branchIndex)=>{
 const indexFromDan=(branchIndex+10)%12;
 return ZH_LEVELS[DEFAULT_LINH_DAN_FIRST[indexFromDan]];
}));
const LINH_COMPARISON=Object.freeze(BRANCHES.map((branchName,branchIndex)=>{
 const qsLabel=LABELS[ROWS['Linh Tinh'][branchIndex]];
 const defaultLabel=DEFAULT_LINH_TY_FIRST[branchIndex];
 return Object.freeze({branchIndex,branchName,qsLabel,defaultLabel,differs:qsLabel!==defaultLabel});
}));
const LINH_DIFFERENCES=Object.freeze(LINH_COMPARISON.filter(x=>x.differs));
const linhReconciliation=Object.freeze({
 sourceUrl:SOURCE_URL,alternateUrl:CROSSCHECK_URL,sourceCommit:REF_COMMIT,
 baseSchool:'SB_QS',alternativeSchool:'algorithm.ts DEFAULT_BRIGHTNESS (Linh Tinh)',
 totalBranches:12,differenceCount:LINH_DIFFERENCES.length,
 differingBranches:Object.freeze(LINH_DIFFERENCES.map(x=>x.branchName)),
 rows:LINH_COMPARISON,differences:LINH_DIFFERENCES,
 sourceOrder:'Dần-first to Tý-first',adopted:false,expertReviewed:false,
 note:'Đây là hai cấu hình nằm trong cùng mã tham khảo. Sai khác không chứng minh trường phái nào đúng; không được tự thay đổi bảng an sao hoặc xác nhận cách cục.'
});

function lookupQS(name,branchIndex){
 if(typeof name!=='string'||!Object.prototype.hasOwnProperty.call(ROWS,name)||
    !Number.isInteger(branchIndex)||branchIndex<0||branchIndex>11)return null;
 const level=ROWS[name][branchIndex];
 return Object.freeze({
  name,branchIndex,branchName:BRANCHES[branchIndex],sourceStarId:SOURCE_IDS[name],
  level,label:LABELS[level],isMiaoWang:level===1||level===2,
  profile:PROFILE,sourceUrl:SOURCE_URL,sourceCommit:REF_COMMIT
 });
}
function compareQSBrightness(chart,fireAudit,thamPosition,thamStrength){
 const reason=(fireAudit?.reason||'Chưa đủ dữ liệu để kiểm tra Hỏa/Linh.');
 const base={profile:PROFILE,sourceUrl:SOURCE_URL,sourceCommit:REF_COMMIT,discrepancy,
  interpretationOnly:true,expertReviewed:false,confidence:'school-comparison-not-adopted',linhReconciliation};
 const incomplete=message=>Object.freeze({...base,available:false,tham:null,fire:null,bell:null,
  thienDoTham:null,chartLinhComparison:null,mayConfirmClassicalPattern:false,
  reason:message});
 if(!fireAudit?.verified||!Number.isInteger(fireAudit.branchIndex))
  return incomplete('Chưa xác minh nguồn vị trí Hỏa Tinh: '+reason);
 const bell=chart?.advancedStars?.filter(x=>x&&x.name==='Linh Tinh');
 if(!Array.isArray(bell)||bell.length!==1||
    !Number.isInteger(bell[0].branch)||bell[0].branch<0||bell[0].branch>11)
  return incomplete('Thiếu vị trí Linh Tinh duy nhất trên bảng sao nguyên cục.');
 const fire=lookupQS('Hỏa Tinh',fireAudit.branchIndex);
 const linh=lookupQS('Linh Tinh',bell[0].branch);
 // Tham Lang comes from the independent chart-layer uniqueness check.
 const tham=thamPosition?.status==='observed'?lookupQS('Tham Lang',thamPosition.branchIndex):null;
 const thienDoTham=thamStrength?.known&&tham?
  Object.freeze({branchIndex:tham.branchIndex,status:thamStrength.status,label:thamStrength.label,
   source:thamStrength.source,ruleSet:thamStrength.ruleSet}):null;
 return Object.freeze({...base,available:true,tham,fire,bell:linh,thienDoTham,
  chartLinhComparison:LINH_COMPARISON[bell[0].branch],
  mayConfirmClassicalPattern:false,
  reason:'Đây là bảng tham chiếu QS độc lập. Không thay bảng chính tinh Thiên Đồ, không gán độ sáng phụ tinh vào engine và không xác nhận Tham Hỏa tương phùng; cần thống nhất dị bản và thẩm định chuyên gia.'});
}
module.exports=Object.freeze({PROFILE,REF_COMMIT,SOURCE_URL,CROSSCHECK_URL,BRANCHES,ROWS,LABELS,discrepancy,
 DEFAULT_LINH_DAN_FIRST,DEFAULT_LINH_TY_FIRST,linhReconciliation,lookupQS,compareQSBrightness});
