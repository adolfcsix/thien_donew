'use strict';

/**
 * Read-only research readiness for the *unassessed* pinned classical catalog.
 * Every blocker below describes missing evidence or scope; none authorizes a
 * pattern judgment or changes any natal / period chart calculations.
 */
const PENDING_BLOCKERS=Object.freeze({
 'dinh-ban-01': 'Đối chiếu Không Vong theo sáu sao trong nguồn, không tự đồng nhất với Tuần/Triệt của Thiên Đồ; kiểm tra thêm Liêm Trinh đúng lớp chính tinh tại Mệnh.',
 'dinh-ban-02': 'Chuẩn hóa Không Vong theo nguồn và kiểm chứng đồng cung của Lộc Tồn hoặc Hóa Lộc với Địa Không, Địa Kiếp; phân biệt Tứ Hóa nguyên cục với lưu hạn.',
 'dinh-tap-01': 'Cần bộ đánh giá đại hạn theo vị trí địa chi, tiêu chí cung Mệnh/Thân yếu và Lộc–Mã hội trong tam phương tứ chính; không dùng chỉ số mảng thay địa chi.',
 'dinh-tap-02': 'Cần bộ tiêu chí đại hạn có phiên bản cho cung mạnh, sao cát hội chiếu và số lượng sát tinh; không chỉ dựa trên một sao tại cung hạn.',
 'dinh-tap-03': 'Cần mô hình đại hạn riêng, xác minh Thất Sát hội hạn và kiểm chứng cả Lộc Tồn lẫn Thiên Mã cùng chịu Không Vong theo nguồn.',
 'dinh-tap-08': 'Cần xác minh Mệnh suy theo độ sáng chính tinh và hạn tốt theo cung hạn cùng tam phương tứ chính; không suy từ nguyên cục thành kết quả vận hạn.'
});
const VALID=Object.freeze(['derivable','disputed','unreachable']);
const SCOPES=Object.freeze(['natal-research','period-research']);

/**
 * A derivable source label is a *research candidate*, not implemented truth.
 * Keep every unimplemented derivable item backed by an explicit missing gate.
 */
function summarizeClassicalResearchReadiness(report){
 if(!report||!Array.isArray(report.groups)||!Number.isInteger(report.referenceTotal))
  throw new TypeError('Expected a complete classical catalog report');
 const counts={total:0,pending:0,disputed:0,unreachable:0,natalPending:0,periodPending:0};
 const byId=Object.create(null);
 const seen=new Set();
 let entries=0,implemented=0;
 for(const group of report.groups){
  if(!group||!Array.isArray(group.entries))throw new TypeError('Invalid research catalog group');
  for(const entry of group.entries){
   entries++;
   if(!entry||typeof entry.id!=='string'||seen.has(entry.id)||
      !VALID.includes(entry.sourceStatus)||!SCOPES.includes(entry.scope)||
      typeof entry.assessed!=='boolean')
    throw new RangeError('Missing, duplicate, or inconsistent research entry');
   seen.add(entry.id);
   if(entry.assessed){implemented++;continue;}
   counts.total++;
   if(entry.sourceStatus==='derivable'){
    const blocker=Object.hasOwn(PENDING_BLOCKERS,entry.id)?PENDING_BLOCKERS[entry.id]:null;
    if(!blocker)throw new RangeError('No research prerequisite documented for '+entry.id);
    counts.pending++;
    if(entry.scope==='natal-research')counts.natalPending++;
    else counts.periodPending++;
    byId[entry.id]=Object.freeze({id:entry.id,scope:entry.scope,blocker,sourceUrl:entry.sourceUrl});
   }else if(entry.sourceStatus==='disputed')counts.disputed++;
   else counts.unreachable++;
  }
 }
 if(entries!==report.referenceTotal||implemented!==report.assessed||
    counts.total+implemented!==report.referenceTotal||
    counts.total!==counts.pending+counts.disputed+counts.unreachable)
  throw new RangeError('Classical research backlog count mismatch');
 return Object.freeze({counts:Object.freeze(counts),byId:Object.freeze(byId)});
}
module.exports=Object.freeze({PENDING_BLOCKERS,summarizeClassicalResearchReadiness});
