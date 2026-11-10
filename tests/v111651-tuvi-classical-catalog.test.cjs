'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SOURCE_COMMIT,GROUPS,ALL,summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const counts={derivable:34,disputed:9,unreachable:6};
test('49 pinned research indices have unique stable IDs and four complete groups',()=>{
 assert.equal(ALL.length,49);
 assert.equal(new Set(ALL.map(x=>x.id)).size,49);
 assert.deepEqual(GROUPS.map(g=>g.entries.length),[6,27,8,8]);
 assert.equal(SOURCE_COMMIT,'7922285d947b36610e7e31c232d8f1e2a0d0871d');
 assert.ok(ALL.every(x=>x.sourceUrl.includes('/blob/'+SOURCE_COMMIT+'/lib/ziwei/')));
 assert.deepEqual(Object.fromEntries(Object.keys(counts).map(k=>[k,ALL.filter(x=>x.sourceStatus===k).length])),counts);
});
test('Source classifications do not claim rules have been audited in Thiên Đồ',()=>{
 const report=summarizeClassicalCatalog();
 assert.equal(report.referenceTotal,49);
 assert.equal(report.assessed,0);
 assert.deepEqual(report.distribution,counts);
 assert.ok(report.groups.every(g=>g.assessed===0&&g.entries.every(e=>e.assessed===false)));
 assert.match(report.notice,/chưa thẩm định độc lập/);
});
test('Implemented IDs come only from current classical evaluator, not a hardcoded completion number',()=>{
 const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
 const names=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
 const houses=Array.from({length:12},(_,i)=>({branchIndex:i,branch:String(i),palace:names[i],stars:[],auxiliaryStars:[],yearStars:[],tuHoa:[]}));
 const source=auditClassicalPatternCandidates({houses});
 const report=summarizeClassicalCatalog(source.records.map(x=>x.id));
 assert.equal(report.assessed,source.assessed);
 assert.equal(report.groups.reduce((n,g)=>n+g.assessed,0),source.assessed);
 assert.ok(source.records.every(x=>report.groups.flatMap(g=>g.entries).find(e=>e.id===x.id)?.assessed));
});
test('Disputed or unreachable reference categories can never be passed as assessed',()=>{
 for(const id of ['dinh-phu-01','dinh-quy-12','dinh-quy-07','dinh-ban-03','dinh-tap-04']){
  assert.throws(()=>summarizeClassicalCatalog([id]),/non-derivable/);
 }
 assert.throws(()=>summarizeClassicalCatalog(['dinh-quy-01','dinh-quy-01']),/Duplicate/);
 assert.throws(()=>summarizeClassicalCatalog(['not-real']),/Unrecognized/);
 assert.throws(()=>summarizeClassicalCatalog('dinh-quy-01'),/array/);
});
test('Period research is isolated from natal assessment',()=>{
 const report=summarizeClassicalCatalog(['dinh-quy-01']);
 assert.equal(report.groups[3].key,'dinh-tap');
 assert.ok(report.groups[3].entries.every(x=>x.scope==='period-research'&&!x.assessed));
 assert.ok(report.groups.slice(0,3).every(g=>g.entries.every(x=>x.scope==='natal-research')));
});
test('External views cannot mutate immutable catalog source data',()=>{
 assert.ok(Object.isFrozen(ALL)&&Object.isFrozen(GROUPS));
 assert.ok(GROUPS.every(g=>Object.isFrozen(g.entries)&&g.entries.every(Object.isFrozen)));
 assert.throws(()=>{ALL[0].sourceStatus='derivable';},TypeError);
 assert.equal(summarizeClassicalCatalog().assessed,0);
});
