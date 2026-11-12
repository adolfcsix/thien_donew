'use strict';
/**
 * R43: transparent research blockers for the three still-unmapped
 * Không Vong-dependent source criteria. No chart calculation, placement,
 * school equivalence, permission, persistence or fortune-telling.
 *
 * This intentionally accepts existing audited reports rather than inspecting
 * an unaudited star string or inferring a judgment from local proxy geometry.
 */
const {SOURCE_COMMIT}=require('./classical-pattern-catalog.cjs');
const TARGET_IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const STATES=Object.freeze(['met','not-met','unknown']);
const SCOPE=Object.freeze({
 'dinh-ban-01':'natal-research',
 'dinh-ban-02':'natal-research',
 'dinh-tap-03':'period-research'
});
function assertUnique(items,key,name){
 if(!Array.isArray(items)||items.some(item=>!item||typeof item[key]!=='string'))
  throw new TypeError('Dữ liệu '+name+' không hợp lệ.');
 const map=new Map();
 for(const item of items){
  if(map.has(item[key]))throw new RangeError('Trùng '+name+': '+item[key]);
  map.set(item[key],item);
 }
 return map;
}
function countsFrom(checks){
 const counts={met:0,notMet:0,unknown:0};
 for(const check of checks){
  if(!check||typeof check.label!=='string'||!STATES.includes(check.state))
   throw new TypeError('Bản ghi điều kiện chưa được kiểm chứng nhất quán.');
  if(check.state==='not-met')counts.notMet++;
  else counts[check.state]++;
 }
 return Object.freeze(counts);
}
function buildClassicalVoidGapLedger({catalog,readiness,natal,period,voidGates}={}){
 if(!catalog||catalog.referenceTotal!==49||catalog.assessed!==31||
    !Array.isArray(catalog.groups)||!readiness||!readiness.counts||
    readiness.counts.total!==18||readiness.counts.pending!==3||
    readiness.counts.disputed!==9||readiness.counts.unreachable!==6||
    !readiness.byId||!natal||!Array.isArray(natal.pendingEvidence)||
    !period||typeof period.verifiedGeometry!=='boolean'||!Array.isArray(period.items)||
    !voidGates||!Array.isArray(voidGates.items))
  throw new RangeError('Bộ chứng cứ R43 không khớp mốc nghiên cứu 31/49.');
 const catalogEntries=assertUnique(catalog.groups.flatMap(group=>group.entries),'id','danh mục');
 if(catalogEntries.size!==49)throw new RangeError('Danh mục không có đủ 49 chỉ mục.');
 const pending=assertUnique(natal.pendingEvidence,'id','điều kiện nguyên cục');
 const periods=assertUnique(period.items,'id','điều kiện đại hạn');
 const voidItems=assertUnique(voidGates.items,'id','bộ kiểm toán Không Vong');
 if(natal.expertReviewed!==false||voidGates.sourceCriterionVerified!==false||
    voidGates.semanticEquivalenceVerified!==false||
    voidGates.sourcePlacementVerifiedForCurrentChart!==false)
  throw new RangeError('Không được công bố kiểm chứng ngữ nghĩa nguồn ở R43.');
 const items=TARGET_IDS.map(id=>{
  const entry=catalogEntries.get(id),prerequisite=readiness.byId[id];
  const source=voidItems.get(id);
  const primary=id.startsWith('dinh-ban')?pending.get(id):periods.get(id);
  if(!entry||entry.assessed!==false||entry.sourceStatus!=='derivable'||
     entry.scope!==SCOPE[id]||!prerequisite||prerequisite.scope!==SCOPE[id]||
     typeof prerequisite.blocker!=='string'||!prerequisite.blocker||
     !prerequisite.sourceUrl?.includes('/blob/'+SOURCE_COMMIT+'/')||
     !source||source.sourceCriterionVerified!==false||
     source.semanticEquivalenceVerified!==false||
     source.sourcePlacementVerifiedForCurrentChart!==false||
     !Array.isArray(source.checks)||source.checks.at(-1)?.state!=='unknown'||
     !source.checks.at(-1)?.label?.includes('Không Vong')||
     (id.startsWith('dinh-ban')&&(!primary||primary.status!=='partial-evidence'||primary.sourceCriterionVerified!==false))||
     (id==='dinh-tap-03'&&period.verifiedGeometry&&(!primary||primary.status!=='partial-evidence'||primary.sourceCriterionVerified!==false)))
   throw new RangeError('R43 không thể xác nhận ranh giới chứng cứ của '+id);
  const rawChecks=id.startsWith('dinh-ban')
    ?primary.checks
    :(period.verifiedGeometry?primary.periods.flatMap(range=>range.checks):[]);
  if(!Array.isArray(rawChecks))throw new TypeError('Thiếu các điều kiện được quan sát.');
  const local=countsFrom(rawChecks);
  const proxy=countsFrom(source.checks.slice(0,-1));
  const sourceGate=Object.freeze({
   id:'source-void-semantics',status:'unknown',
   note:'Chưa có kiểm chứng tương đương ngữ nghĩa Không Vong nguồn với Tuần/Triệt Thiên Đồ cho lá số này.'
  });
  return Object.freeze({
   id,title:primary?.title||entry.title,scope:entry.scope,
   sourceUrl:prerequisite.sourceUrl,blocker:prerequisite.blocker,
   localChecks:local,proxyChecks:proxy,
   checkedPeriods:id==='dinh-tap-03'&&period.verifiedGeometry?primary.periods.length:0,
   sourceGate,sourceCriterionVerified:false,expertReviewed:false,
   readyForMapping:false,status:'needs-source-verification'
  });
 });
 const summary=Object.freeze({
  referenceTotal:49,mappedConditionResearch:31,unmapped:18,
  pending:3,disputed:9,unreachable:6,semanticVerified:0
 });
 return Object.freeze({
  schema:'thiendo-r43-void-gap-ledger-v1',summary,
  items:Object.freeze(items),sourceCommit:SOURCE_COMMIT,
  chartPolicyChanged:false,mayDeclarePattern:false,mayIncreaseMapping:false,
  notice:'Các phép kiểm sao và Tuần/Triệt là chứng cứ nội bộ hoặc proxy hình học. Không chứng minh tương đương Không Vong nguồn, không phải kết luận cách cục.'
 });
}
module.exports=Object.freeze({TARGET_IDS,buildClassicalVoidGapLedger});
