'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {PENDING_BLOCKERS,summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');

const sourceIds=()=>auditClassicalPatternCandidates(
 Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'})
).records.map(r=>r.id);

test('r15 counts precisely the 21 remaining reference candidates in independently sourced buckets',()=>{
 const catalog=summarizeClassicalCatalog(sourceIds());
 const report=summarizeClassicalResearchReadiness(catalog);
 assert.equal(catalog.assessed,28);
 assert.deepEqual(report.counts,{total:21,pending:6,disputed:9,unreachable:6,natalPending:2,periodPending:4});
 assert.deepEqual(Object.keys(report.byId).sort(),[
  'dinh-ban-01','dinh-ban-02','dinh-tap-01','dinh-tap-02','dinh-tap-03','dinh-tap-08'
 ]);
 assert.equal(Object.getPrototypeOf(report.byId),null);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.counts)&&Object.isFrozen(report.byId));
 assert.ok(Object.values(report.byId).every(Object.isFrozen));
});

test('r15 blockers distinguish natal Không Vong from Tuần/Triệt and period research from natal verdicts',()=>{
 const report=summarizeClassicalResearchReadiness(summarizeClassicalCatalog(sourceIds()));
 for(const id of ['dinh-ban-01','dinh-ban-02']){
  assert.equal(report.byId[id].scope,'natal-research');
  assert.match(report.byId[id].blocker,/Không Vong/);
 }
 assert.match(report.byId['dinh-ban-01'].blocker,/Tuần\/Triệt/);
 assert.match(report.byId['dinh-ban-02'].blocker,/Địa Không/);
 for(const id of ['dinh-tap-01','dinh-tap-02','dinh-tap-03','dinh-tap-08']){
  assert.equal(report.byId[id].scope,'period-research');
  assert.match(report.byId[id].blocker,/hạn/);
 }
 assert.equal(Object.keys(PENDING_BLOCKERS).length,6);
 assert.ok(Object.values(report.byId).every(x=>x.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/')));
});

test('r15 readiness updates dynamically if a candidate is later implemented',()=>{
 const base=sourceIds();
 const before=summarizeClassicalResearchReadiness(summarizeClassicalCatalog(base));
 const after=summarizeClassicalResearchReadiness(summarizeClassicalCatalog([...base,'dinh-ban-01']));
 assert.equal(before.counts.pending,6);
 assert.equal(after.counts.total,20);
 assert.equal(after.counts.pending,5);
 assert.equal(after.counts.natalPending,1);
 assert.equal(after.byId['dinh-ban-01'],undefined);
 assert.equal(Object.isFrozen(after.counts),true);
});

test('r15 malformed or incomplete reports fail closed, rather than silently claiming completion',()=>{
 const base=summarizeClassicalCatalog(sourceIds());
 assert.throws(()=>summarizeClassicalResearchReadiness(null),/complete classical catalog/);
 assert.throws(()=>summarizeClassicalResearchReadiness({...base,referenceTotal:48}),/mismatch/);
 assert.throws(()=>summarizeClassicalResearchReadiness({...base,assessed:35}),/mismatch/);
 const damaged={...base,groups:base.groups.map(group=>({...group,entries:[...group.entries]}))};
 const candidate=damaged.groups[2].entries.find(e=>e.id==='dinh-ban-01');
 const index=damaged.groups[2].entries.indexOf(candidate);
 damaged.groups[2].entries[index]={...candidate,id:'new-research-rule'};
 assert.throws(()=>summarizeClassicalResearchReadiness(damaged),/prerequisite/);
});

test('r15 workbench is read-only against engine charts and keeps established pattern verdicts',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart);
 const results=auditClassicalPatternCandidates(chart);
 const statuses=results.records.map(r=>[r.id,r.status]);
 const catalog=summarizeClassicalCatalog(results.records.map(r=>r.id));
 const report=summarizeClassicalResearchReadiness(catalog);
 assert.equal(report.counts.pending,6);
 assert.equal(JSON.stringify(chart),before);
 assert.deepEqual(results.records.map(r=>[r.id,r.status]),statuses);
 assert.equal(results.assessed,28);
});

test('r15 keeps the same expert catalog, reveals only actionable blockers and remains responsive',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/conditional-pattern-evidence.module.css'),'utf8');
 assert.match(ui,/summarizeClassicalResearchReadiness\(catalog\)/);
 assert.match(ui,/readiness\.counts\.natalPending/);
 assert.match(ui,/readiness\.counts\.periodPending/);
 assert.match(ui,/!entry\.assessed&&entry\.sourceStatus==='derivable'/);
 assert.match(ui,/readiness\.byId\[entry\.id\]\.blocker/);
 assert.match(css,/\.catalogBlocker/);
 assert.match(css,/\.readinessSummary/);
});
