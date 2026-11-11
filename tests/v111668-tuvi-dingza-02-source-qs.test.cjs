'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalDingZaSourceBridge:audit,MAPPED_IDS}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const chart=(date,gender)=>Engine.calculate({date,hour:8,minute:30,calendar:'solar',gender});

test('r25 maps Ding Za 02 as a DECade rule without synthesizing fortune or source-equivalence',()=>{
 assert.deepEqual(MAPPED_IDS,['dinh-tap-01','dinh-tap-02','dinh-tap-08']);
 for(const gender of ['Nam','Nữ']){
  const natal=chart('2004-08-15',gender),before=JSON.stringify(natal),out=audit(natal);
  assert.equal(out.sourceProfileReady,true);
  assert.equal(out.schoolPlacementVerified,false);
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.items.length,3);
  const rule=out.items.find(x=>x.id==='dinh-tap-02');
  assert.ok(rule);
  assert.equal(rule.unit,'đại hạn');
  assert.equal(rule.status,'mapped-condition-research');
  assert.equal(rule.sourceCriterionVerified,false);
  assert.equal(rule.sourcePlacementVerified,false);
  assert.equal(rule.periods.length,12);
  assert.ok(rule.periods.every(x=>x.checks.length===3));
  assert.ok(rule.periods.every(x=>x.checks[0].label.includes('sáu sát tinh')));
  assert.ok(rule.periods.every(x=>x.checks[1].label.includes('SB_QS')));
  assert.ok(rule.periods.every(x=>x.checks[2].label.includes('cát ≥2 và sát ≤1')));
  assert.ok(rule.periods.some(x=>x.checks.every(y=>y.state!=='unknown')));
  assert.ok(rule.periods.every(x=>x.checks.every(y=>['met','not-met','unknown'].includes(y.state))));
  assert.equal(JSON.stringify(natal),before);
 }
});

test('r25 requires six-sha at the exact period palace, source QS strength and full period good gate',()=>{
 for(const gender of ['Nam','Nữ']){
  for(const date of ['1984-08-15','2004-08-15','2014-08-15']){
   const natal=chart(date,gender),bridge=audit(natal);
   assert.equal(bridge.sourceProfileReady,true);
   const periods=bridge.items.find(x=>x.id==='dinh-tap-02').periods;
   const shaNames=['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
   for(const p of periods){
    const positions=[
      ...natal.auxiliaries.filter(x=>shaNames.includes(x.name)),
      ...natal.advancedStars.filter(x=>shaNames.includes(x.name))
    ];
    const count=positions.filter(x=>x.branch===p.branchIndex).length;
    assert.equal(p.checks[0].state,count>0?'met':'not-met');
    const matched=p.checks.every(x=>x.state==='met');
    if(matched){
     assert.ok(count>=1);
     assert.ok(p.checks[1].state==='met');
     assert.ok(p.checks[2].state==='met');
    }
   }
  }
 }
});

test('r25 mutated star provenance cannot be counted as an affirmative Ding Za 02',()=>{
 const base=chart('2004-08-15','Nam');
 const damages=[
  c=>{c.advancedStarRuleSet='invalid';},
  c=>{c.auxiliaryRuleSet='invalid';},
  c=>{c.yearStarRuleSet='invalid';},
  c=>{c.tuHoaRuleSet='invalid';},
  c=>{c.advancedStars[0].branch=(c.advancedStars[0].branch+1)%12;}
 ];
 for(const change of damages){
  const c=clone(base);change(c);const snap=JSON.stringify(c),out=audit(c);
  const second=out.items.find(x=>x.id==='dinh-tap-02');
  assert.ok(second);
  assert.ok(second.periods.every(p=>p.checks[0].state==='unknown'&&p.checks[2].state==='unknown'));
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(JSON.stringify(c),snap);
 }
});

test('r25 catalog/readiness 31/49 is condition mapping only; no new menu or birth forecast',()=>{
 const c=chart('2004-08-15','Nữ');
 const natal=auditClassicalPatternCandidates(c),period=audit(c);
 assert.equal(natal.assessed,28);
 assert.equal(period.items.length,3);
 const catalog=summarizeClassicalCatalog([...natal.records.map(x=>x.id),...period.mappedIds]);
 assert.equal(catalog.referenceTotal,49);
 assert.equal(catalog.assessed,31);
 assert.deepEqual(summarizeClassicalResearchReadiness(catalog).counts,{
  total:18,pending:3,disputed:9,unreachable:6,natalPending:2,periodPending:1
 });
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/bridgeById.get\(entry.id\)/);
 assert.match(ui,/dinh-tap-02/);
 assert.match(ui,/entry\.scope==='period-research'/);
 assert.match(ui,/chưa kết luận/);
});
