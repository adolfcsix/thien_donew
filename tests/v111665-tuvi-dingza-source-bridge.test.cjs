'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT,NAMES,SOURCE_MATRIX,MAPPED_IDS,lookupSourceMainStrength,
 auditClassicalDingZaSourceBridge:audit}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');
const chart=gender=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
const copy=x=>JSON.parse(JSON.stringify(x));
test('r22 source 14x12 QS matrix and labels preserve the full pinned source table',()=>{
 assert.equal(SOURCE_COMMIT,'7922285d947b36610e7e31c232d8f1e2a0d0871d');
 assert.equal(NAMES.length,14);
 assert.equal(Object.keys(SOURCE_MATRIX).length,14);
 for(const name of NAMES){
  assert.equal(SOURCE_MATRIX[name].length,12);
  assert.ok(Object.isFrozen(SOURCE_MATRIX[name]));
  for(let b=0;b<12;b++){
   const p=lookupSourceMainStrength(name,b);
   assert.equal(p.raw,SOURCE_MATRIX[name][b]);
   assert.equal(p.weak,p.raw===7);
   assert.equal(p.strong,p.raw===1||p.raw===2);
   assert.equal(p.placementParityVerified,false);
  }
 }
 assert.deepEqual(SOURCE_MATRIX['Tham Lang'],[2,1,5,4,1,7,2,1,5,4,1,7]);
 assert.equal(lookupSourceMainStrength('Lộc Tồn',0),null);
 assert.equal(lookupSourceMainStrength('Tử Vi',12),null);
});
test('r22 maps two period research condition sets and keeps all source verdicts false',()=>{
 assert.deepEqual(MAPPED_IDS,['dinh-tap-01','dinh-tap-08']);
 for(const gender of ['Nam','Nữ']){
  const c=chart(gender),snapshot=JSON.stringify(c),mapped=audit(c);
  assert.equal(mapped.sourceProfileReady,true,mapped.reason);
  assert.equal(mapped.schoolPlacementVerified,false);
  assert.equal(mapped.sourceCriterionVerified,false);
  assert.deepEqual(mapped.mappedIds,MAPPED_IDS);
  assert.equal(mapped.items.length,2);
  assert.ok(mapped.items.every(x=>x.status==='mapped-condition-research'&&
   x.sourceCriterionVerified===false&&x.unit==='đại hạn'&&x.periods.length===12));
  assert.ok(mapped.items.find(x=>x.id==='dinh-tap-01').periods.every(x=>x.checks.length===1));
  const last=mapped.items.find(x=>x.id==='dinh-tap-08');
  assert.ok(last.periods.every(x=>x.checks.length===3));
  assert.ok(last.periods.some(x=>x.checks.at(-1).state!=='unknown'));
  assert.equal(JSON.stringify(c),snapshot);
  const natal=auditClassicalPatternCandidates(c);
  assert.equal(natal.assessed,28);
  const combined=summarizeClassicalCatalog([...natal.records.map(x=>x.id),...mapped.mappedIds]);
  assert.equal(combined.assessed,30);
  assert.equal(combined.groups[3].assessed,2);
  assert.deepEqual(summarizeClassicalResearchReadiness(combined).counts,
   {total:19,pending:4,disputed:9,unreachable:6,natalPending:2,periodPending:2});
 }
});
test('r22 mutated source layers fail closed, never synthesize positive fortune verdicts',()=>{
 const raw=chart('Nam');
 for(const mutate of [
  c=>{c.cycles.daiHan[0].toAge+=1;},
  c=>{c.mainStarStrengthRuleSet='invalid';},
  c=>{c.houses[0].stars.push('Cự Môn');}
 ]){
  const x=copy(raw);mutate(x);
  const report=audit(x);
  assert.equal(report.sourceProfileReady,false);
  assert.equal(report.items.length,0);
  assert.equal(report.sourceCriterionVerified,false);
 }
 const broken=copy(raw);broken.advancedStarRuleSet='invalid';
 const item=audit(broken).items.find(x=>x.id==='dinh-tap-08');
 assert.ok(item.periods.every(p=>p.checks.at(-1).state==='unknown'));
 assert.equal(audit(null).sourceProfileReady,false);
});
test('r22 period UI is separate from natal record navigation and remains in 49-catalog',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/bridge\.mappedIds/);
 assert.match(ui,/entry\.assessed&&entry\.scope==='natal-research'/);
 assert.match(ui,/Đã ánh xạ điều kiện đại hạn · chưa kết luận/);
 assert.match(ui,/bridgeById.get\(entry.id\)/);
});
