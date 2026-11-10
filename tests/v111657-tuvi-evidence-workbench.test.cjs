'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates:research}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {FILTERS,summarizeChecks,summarizeClassicalEvidence,filterClassicalEvidence}=require('../packages/interpretation/src/classical-evidence-workbench.cjs');

const datum=(id,status,states)=>({
 id,status,checks:states.map((state,i)=>({label:'Điều kiện '+i,state,detail:'Đối chiếu mẫu'}))
});
test('r13 counts every state exactly once, preserving the engine-defined negative-first precedence',()=>{
 const records=[
  datum('dinh-quy-01','structural-match',['met','met']),
  datum('dinh-quy-02','needs-review',['met','unknown']),
  datum('dinh-quy-03','not-met',['not-met','unknown','met'])
 ];
 const overview=summarizeClassicalEvidence(records);
 assert.deepEqual(overview.counts,{all:3,relevant:2,matched:1,review:1,notMet:1});
 assert.deepEqual(overview.byId['dinh-quy-01'],{total:2,met:2,notMet:0,unknown:0});
 assert.deepEqual(overview.byId['dinh-quy-02'],{total:2,met:1,notMet:0,unknown:1});
 assert.deepEqual(overview.byId['dinh-quy-03'],{total:3,met:1,notMet:1,unknown:1});
 assert.equal(Object.isFrozen(overview.counts),true);
 assert.equal(Object.isFrozen(overview.byId['dinh-quy-03']),true);
 assert.equal(Object.getPrototypeOf(overview.byId),null);
});
test('r13 five filters retain original source order and distinguish review from structural match',()=>{
 const rows=[
  datum('dinh-quy-01','needs-review',['met','unknown']),
  datum('dinh-quy-02','not-met',['not-met']),
  datum('dinh-quy-03','structural-match',['met']),
  datum('dinh-quy-04','needs-review',['unknown'])
 ];
 const ids=name=>filterClassicalEvidence(rows,name).map(x=>x.id);
 assert.deepEqual(FILTERS,['relevant','matched','review','not-met','all']);
 assert.deepEqual(ids('relevant'),['dinh-quy-01','dinh-quy-03','dinh-quy-04']);
 assert.deepEqual(ids('matched'),['dinh-quy-03']);
 assert.deepEqual(ids('review'),['dinh-quy-01','dinh-quy-04']);
 assert.deepEqual(ids('not-met'),['dinh-quy-02']);
 assert.deepEqual(ids('all'),rows.map(x=>x.id));
 assert.equal(Object.isFrozen(filterClassicalEvidence(rows,'all')),true);
 assert.throws(()=>filterClassicalEvidence(rows,'unknown-filter'),/Unknown classical evidence filter/);
});
test('r13 contradictory or malformed research evidence fails closed and is never counted as matched',()=>{
 assert.throws(()=>summarizeChecks(datum('dinh-quy-01','structural-match',['met','unknown'])),/Contradictory/);
 assert.throws(()=>summarizeChecks(datum('dinh-quy-01','needs-review',['not-met','unknown'])),/Contradictory/);
 assert.throws(()=>summarizeChecks(datum('dinh-quy-01','structural-match',[])),/non-empty/);
 assert.throws(()=>summarizeChecks(datum('dinh-quy-01','not-met',['invalid'])),/Invalid/);
 assert.throws(()=>summarizeClassicalEvidence([
  datum('dinh-quy-01','needs-review',['unknown']),datum('dinh-quy-01','needs-review',['unknown'])
 ]),/identifier/);
 assert.throws(()=>summarizeClassicalEvidence([{...datum('dinh-quy-01','needs-review',['unknown']),id:'__proto__'}]),/identifier/);
});
test('r13 real engine chart gives 28 coherent non-predictive research counters without mutating the chart',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const original=JSON.stringify(chart);
 const data=research(chart),overview=summarizeClassicalEvidence(data.records);
 assert.equal(overview.counts.all,28);
 assert.equal(overview.counts.matched,data.matched);
 assert.equal(overview.counts.review,data.needsReview);
 assert.equal(overview.counts.relevant,data.matched+data.needsReview);
 for(const filter of FILTERS){
  const visible=filterClassicalEvidence(data.records,filter);
  assert.ok(visible.length<=data.assessed);
  if(filter==='matched')assert.ok(visible.every(x=>x.status==='structural-match'));
  if(filter==='review')assert.ok(visible.every(x=>x.status==='needs-review'));
 }
 const tham=data.records.find(x=>x.id==='dinh-quy-17');
 assert.equal(tham.status!=='structural-match',true,'Hỏa brightness remains unverified');
 assert.equal(JSON.stringify(chart),original);
});
test('r13 expert UI has status-specific filters, accessible totals and safe catalog jump',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const style=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/conditional-pattern-evidence.module.css'),'utf8');
 assert.match(ui,/summarizeClassicalEvidence\(data\.records\)/);
 assert.match(ui,/filterClassicalEvidence\(data\.records,filter\)/);
 for(const v of ['relevant','matched','review','not-met','all']){
  assert.match(ui,new RegExp("aria-pressed=\\{filter==='"+v+"'\\}"));
 }
 assert.match(ui,/role="status" aria-live="polite"/);
 assert.match(ui,/evidence\.byId\[record\.id\]\.unknown/);
 assert.match(ui,/evidence\.byId\[record\.id\]\.notMet/);
 assert.match(ui,/setFilter\('all'\);setJumpToId\(entry\.id\)/);
 assert.match(style,/\.evidenceFilterCount/);
 assert.match(style,/\.evidenceCounts/);
});
