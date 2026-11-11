'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {auditClassicalDingZaPeriods}=require('../packages/interpretation/src/classical-dingza-period-research.cjs');
const {auditClassicalVoidSemanticGates}=require('../packages/interpretation/src/classical-void-semantic-gates.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');
const {TARGET_IDS,buildClassicalVoidGapLedger}=require('../packages/interpretation/src/classical-void-gap-ledger.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const calculate=(year,gender='Nam',hour=8)=>Engine.calculate({
 date:year+'-08-15',hour,minute:30,calendar:'solar',gender
});
function reports(chart){
 const natal=auditClassicalPatternCandidates(chart);
 const bridge=auditClassicalDingZaSourceBridge(chart);
 const catalog=summarizeClassicalCatalog([...natal.records.map(x=>x.id),...bridge.mappedIds]);
 const readiness=summarizeClassicalResearchReadiness(catalog);
 const period=auditClassicalDingZaPeriods(chart);
 const voidGates=auditClassicalVoidSemanticGates(chart);
 return {catalog,readiness,natal,period,voidGates};
}
test('r43: 20 year-stem/gender combinations retain 31/49 and all three source semantic blockers',()=>{
 assert.deepEqual(TARGET_IDS,['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 for(let year=1984;year<=1993;year++)for(const gender of ['Nam','Nữ']){
  const chart=calculate(year,gender),before=JSON.stringify(chart);
  const inputs=reports(chart),saved=JSON.stringify(inputs);
  const ledger=buildClassicalVoidGapLedger(inputs);
  assert.deepEqual(ledger.summary,{
   referenceTotal:49,mappedConditionResearch:31,unmapped:18,
   pending:3,disputed:9,unreachable:6,semanticVerified:0
  });
  assert.deepEqual(ledger.items.map(x=>x.id),TARGET_IDS);
  assert.equal(ledger.mayIncreaseMapping,false);
  assert.equal(ledger.mayDeclarePattern,false);
  assert.equal(ledger.chartPolicyChanged,false);
  assert.ok(Object.isFrozen(ledger)&&Object.isFrozen(ledger.summary)&&Object.isFrozen(ledger.items));
  for(const entry of ledger.items){
   assert.equal(entry.readyForMapping,false);
   assert.equal(entry.sourceCriterionVerified,false);
   assert.equal(entry.expertReviewed,false);
   assert.equal(entry.sourceGate.status,'unknown');
   assert.ok(entry.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/'));
   assert.ok(entry.blocker);
   assert.ok(Object.isFrozen(entry.localChecks)&&Object.isFrozen(entry.proxyChecks));
   assert.ok(entry.proxyChecks.unknown>=0);
  }
  assert.equal(ledger.items[0].scope,'natal-research');
  assert.equal(ledger.items[1].scope,'natal-research');
  assert.equal(ledger.items[2].scope,'period-research');
  assert.equal(ledger.items[2].checkedPeriods,12);
  assert.equal(ledger.items[2].localChecks.met+ledger.items[2].localChecks.notMet+ledger.items[2].localChecks.unknown,36);
  assert.equal(JSON.stringify(inputs),saved);
  assert.equal(JSON.stringify(chart),before);
 }
});
test('r43: altered mapping counts or source criterion claims fail closed',()=>{
 const args=reports(calculate(2004));
 const checks=[
  {...args,catalog:{...args.catalog,assessed:32}},
  {...args,readiness:{...args.readiness,counts:{...args.readiness.counts,pending:2}}},
  {...args,voidGates:{...args.voidGates,semanticEquivalenceVerified:true}},
  {...args,voidGates:{...args.voidGates,sourceCriterionVerified:true}},
  {...args,natal:{...args.natal,expertReviewed:true}},
  {...args,voidGates:{...args.voidGates,items:args.voidGates.items.map((x,i)=>i===0?{...x,checks:[...x.checks.slice(0,-1),{...x.checks.at(-1),state:'met'}]}:x)}}
 ];
 for(const modified of checks)assert.throws(()=>buildClassicalVoidGapLedger(modified),RangeError);
});
test('r43: duplicate/missing source IDs or invalid condition states never yield a credible ledger',()=>{
 const args=reports(calculate(2004,'Nữ'));
 const wrong=clone(args);
 wrong.catalog.groups[2].entries[0]=clone(wrong.catalog.groups[2].entries[1]);
 assert.throws(()=>buildClassicalVoidGapLedger(wrong),/Trùng/);
 const missing=clone(args);
 missing.natal.pendingEvidence.pop();
 assert.throws(()=>buildClassicalVoidGapLedger(missing),/R43/);
 const malformed=clone(args);
 malformed.natal.pendingEvidence[0].checks[0].state='claimed-verified';
 assert.throws(()=>buildClassicalVoidGapLedger(malformed),/điều kiện/);
});
test('r43: absent period geometry remains unavailable, not an invented source-period match',()=>{
 const args=reports(calculate(2004));
 const ledger=buildClassicalVoidGapLedger({
  ...args,period:{verifiedGeometry:false,items:[]}
 });
 const pending=ledger.items.find(x=>x.id==='dinh-tap-03');
 assert.equal(pending.checkedPeriods,0);
 assert.deepEqual(pending.localChecks,{met:0,notMet:0,unknown:0});
 assert.equal(pending.readyForMapping,false);
 assert.equal(pending.sourceGate.status,'unknown');
});
test('r43: existing catalog shows blockers in one collapsed research section; no new route or auto mapping',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/conditional-pattern-evidence.module.css'),'utf8');
 assert.match(ui,/buildClassicalVoidGapLedger\(\{catalog,readiness,natal:data,period:dingZa,voidGates\}\)/);
 assert.match(ui,/styles\.voidGapAudit/);
 assert.match(ui,/voidGapLedger\.summary\.mappedConditionResearch/);
 assert.match(ui,/voidGapLedger\.items\.map/);
 assert.match(ui,/sourceGate|chưa xác minh ngữ nghĩa|Chưa xác minh tiêu chí Không Vong/i);
 assert.match(css,/\.voidGapAudit>/);
 assert.match(css,/\.voidGapCards/);
 assert.doesNotMatch(ui,/setCatalogStatus\(['"]assessed['"]\)/);
});
