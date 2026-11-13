'use strict';
/**
 * R60: chart-independent accounting for the 49 pinned classical source titles.
 * 31 = 28 natal condition checks + 3 source QS decade condition bridges.
 * No "assessed" or "mapped" entry is an expert-confirmed classical formation.
 * The three still-derivable entries are BLOCKED until source rule/placement
 * parity is independently verified. No input can self-authorize promotion.
 */
const {ALL,SOURCE_COMMIT}=require('./classical-pattern-catalog.cjs');
const {MAPPED_IDS}=require('./classical-dingza-source-bridge.cjs');
const {PENDING_BLOCKERS}=require('./classical-research-readiness.cjs');
const PENDING=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const REVIEW_GATES=Object.freeze({
 'dinh-ban-01':Object.freeze([
  'Liêm Trinh đúng cung Mệnh trong cùng ngày âm / giờ đã chuẩn hóa',
  'Sao Không Vong theo TỪNG nhãn nguồn được chứng minh tương đương với quy ước Thiên Đồ',
  'Có phản chứng dương/âm của detector nguồn và phép đánh giá Thiên Đồ'
 ]),
 'dinh-ban-02':Object.freeze([
  'Lộc Tồn/Hóa Lộc nguyên cục cùng Địa Không, Địa Kiếp được đối chiếu chính xác',
  'Đối chiếu sáu nhãn Không Vong, không tự đồng nhất Tuần/Triệt',
  'Hai ca R30 hiếm dương/âm, cộng các ca biến thể Tứ Hóa và Can năm'
 ]),
 'dinh-tap-03':Object.freeze([
  'Mỗi đại hạn phải đối chiếu đúng chi cung và tam phương tứ chính có Thất Sát',
  'Lộc Tồn và Thiên Mã có Không Vong nguồn theo nhãn sao và vị trí độc lập',
  'Ca dương/âm của nguồn và phản chứng ít nhất 12 hạn phải phù hợp theo cùng quy tắc'
 ])
});
const sorted=a=>[...a].sort((x,y)=>x.localeCompare(y,'en'));
const equal=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
const hasOnly=(entry,keys)=>entry&&keys.every(k=>Object.hasOwn(entry,k));
function summarizeClassicalResearchMilestone({natal,bridge,catalog,readiness}){
 if(!natal||!bridge||!catalog||!readiness||
    !Array.isArray(natal.records)||!Array.isArray(bridge.mappedIds)||
    !Array.isArray(catalog.groups)||!readiness.counts||
    catalog.referenceTotal!==49||catalog.assessed!==31||
    natal.assessed!==28||natal.records.length!==28||
    natal.referenceTotal!==49||natal.expertReviewed!==false||
    bridge.sourceCriterionVerified!==false||
    bridge.schoolPlacementVerified!==false||
    !equal(bridge.mappedIds,MAPPED_IDS)||bridge.mappedIds.length!==3)
  throw new Error('R60 refuses incomplete or promoted local research evidence');
 const catalogEntries=catalog.groups.flatMap(g=>g.entries);
 if(catalogEntries.length!==49||ALL.length!==49||
    !equal(catalogEntries.map(x=>x.id),ALL.map(x=>x.id))||
    catalog.distribution?.derivable!==34||
    catalog.distribution?.disputed!==9||
    catalog.distribution?.unreachable!==6)
  throw new Error('R60 source catalog provenance or source partition changed');
 const mapped=new Set([...natal.records.map(r=>r.id),...bridge.mappedIds]);
 if(mapped.size!==31||natal.records.some(r=>!r||typeof r.id!=='string'||
    r.expertReviewed!==false||!Array.isArray(r.checks)||r.checks.length===0||
    !['structural-match','not-met','needs-review'].includes(r.status)||
    r.checks.some(c=>!c||!['met','not-met','unknown'].includes(c.state)))||
    bridge.mappedIds.some(id=>natal.records.some(r=>r.id===id)))
  throw new Error('R60 mapped research ID or criterion evidence mismatch');
 const sourceSet=new Map(catalogEntries.map(e=>[e.id,e]));
 if(sourceSet.size!==49||catalog.assessed!==mapped.size||
    catalogEntries.some(e=>!e||typeof e.id!=='string'||e.assessed!==mapped.has(e.id)||
      !String(e.sourceUrl).includes('/blob/'+SOURCE_COMMIT+'/')||
      e.assessed&&e.sourceStatus!=='derivable'))
  throw new Error('R60 catalog reports unsupported mappings or missing source pin');
 const statuses={mapped:0,pending:0,disputed:0,unreachable:0};
 const pending=[];
 for(const entry of catalogEntries){
  if(entry.assessed){statuses.mapped++;continue;}
  if(entry.sourceStatus==='derivable'){
   statuses.pending++;
   if(!PENDING.includes(entry.id)||!hasOnly(readiness.byId?.[entry.id],
     ['blocker','scope','sourceUrl'])||
     readiness.byId[entry.id].blocker!==PENDING_BLOCKERS[entry.id]||
     !REVIEW_GATES[entry.id])
    throw new Error('R60 research next-gate missing for '+entry.id);
   pending.push(Object.freeze({
    id:entry.id,title:entry.title,scope:entry.scope,
    sourceUrl:entry.sourceUrl,blocker:PENDING_BLOCKERS[entry.id],
    requiredChecks:REVIEW_GATES[entry.id],sourceRuleVerifiedForLocalChart:false,
    semanticEquivalenceVerified:false,readyToPromote:false
   }));
  }else if(entry.sourceStatus==='disputed')statuses.disputed++;
  else if(entry.sourceStatus==='unreachable')statuses.unreachable++;
  else throw new Error('R60 unexpected source category');
 }
 const counts=readiness.counts;
 if(!equal(pending.map(x=>x.id),PENDING)||statuses.mapped!==31||
    statuses.pending!==3||statuses.disputed!==9||
    statuses.unreachable!==6||
    counts.total!==18||counts.pending!==3||
    counts.disputed!==9||counts.unreachable!==6||
    counts.natalPending!==2||counts.periodPending!==1)
  throw new Error('R60 catalog/readiness reconciliation failed');
 const mappedByScope=Object.freeze({natal:28,period:3});
 return Object.freeze({
  schema:'thiendo-r60-classical-milestone-v1',
  sourceCommit:SOURCE_COMMIT,total:49,conditionMapped:31,
  mappedByScope,
  remaining:Object.freeze({...statuses,unmapped:18}),
  sourceCandidatesStillDerivable:3,
  nextCandidates:Object.freeze(pending.sort((a,b)=>a.id.localeCompare(b.id,'en'))),
  expertConfirmed:0,sourceSchoolParityVerified:false,
  semanticEquivalenceVerified:false,mayRaiseMilestone:false,
  chartResultIndependent:true,
  note:'31/49 là số mục đã ánh xạ ĐIỀU KIỆN nghiên cứu (28 nguyên cục + 3 đại hạn); không phải 31 cách cục được chứng thực. Chỉ tăng khi có bằng chứng sao/lịch/trường phái, kiểm thử âm/dương và thẩm định thích hợp.'
 });
}
module.exports=Object.freeze({PENDING,REVIEW_GATES,summarizeClassicalResearchMilestone});
