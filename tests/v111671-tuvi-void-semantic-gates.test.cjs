'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalVoidSemanticGates:audit,IDS,LIMITATION}=require('../packages/interpretation/src/classical-void-semantic-gates.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const chart=(year,gender='Nam')=>Engine.calculate({date:year+'-08-15',hour:8,minute:30,calendar:'solar',gender});

test('r28: 20 stem/gender natal charts distinguish local geometry, source semantics and verdicts',()=>{
 assert.deepEqual(IDS,['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 for(let year=1984;year<=1993;year++)for(const gender of ['Nam','Nữ']){
  const natal=chart(year,gender),before=JSON.stringify(natal),out=audit(natal);
  assert.equal(out.verifiedLocalObstructions,true);
  assert.equal(out.trietSourcePairGeometryStatus,'matched');
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.semanticEquivalenceVerified,false);
  assert.equal(out.sourcePlacementVerifiedForCurrentChart,false);
  assert.equal(out.sourceSampleCount,65);
  assert.equal(out.items.length,3);
  const expectedMenh=natal.houses.find(h=>h.palace==='Mệnh').branchIndex;
  const expectedVoid=natal.obstructionMarkers.some(m=>m.branches.includes(expectedMenh));
  for(const [i,id] of IDS.entries()){
   const entry=out.items[i];
   assert.equal(entry.id,id);
   assert.equal(entry.sourceCriterionVerified,false);
   assert.equal(entry.semanticEquivalenceVerified,false);
   assert.equal(entry.sourcePlacementVerifiedForCurrentChart,false);
   assert.equal(entry.sampleGeometryEvidenceOnly,true);
   assert.equal(entry.checks.at(-1).state,'unknown');
   assert.match(entry.checks.at(-1).detail,/Chưa thẩm định/);
   assert.ok(Object.isFrozen(entry)&&Object.isFrozen(entry.checks));
  }
  assert.equal(out.items[0].checks[0].state,expectedVoid?'met':'not-met');
  assert.equal(out.items[1].checks[0].state,expectedVoid?'met':'not-met');
  assert.equal(out.items[2].checks.length,3);
  const lu=natal.auxiliaries.find(x=>x.name==='Lộc Tồn').branch;
  const ma=natal.yearStars.find(x=>x.name==='Thiên Mã').branch;
  const union=new Set(natal.obstructionMarkers.flatMap(x=>x.branches));
  assert.equal(out.items[2].checks[0].state,union.has(lu)?'met':'not-met');
  assert.equal(out.items[2].checks[1].state,union.has(ma)?'met':'not-met');
  assert.deepEqual(out.proxyBranches,[...union].sort((x,y)=>x-y));
  assert.equal(JSON.stringify(natal),before);
 }
});

test('r28: malformed and tampered charts cannot yield verified equivalence or semantic verdict',()=>{
 const base=chart(2004,'Nam');
 const mutators=[
  c=>{c.advancedStarRuleSet='corrupted';},
  c=>{c.obstructionMarkers[0].branches=[0,0];},
  c=>{c.houses[0].obstructionMarkers.push('SAI-DỮ-LIỆU');},
  c=>{c.lunar.year=2010;},
  c=>{c.yearCanChi=42;},
  c=>{c.houses.pop();}
 ];
 for(const mutate of mutators){
  const x=clone(base);mutate(x);const before=JSON.stringify(x);const out=audit(x);
  assert.equal(out.verifiedLocalObstructions,false);
  assert.equal(out.semanticEquivalenceVerified,false);
  assert.equal(out.sourceCriterionVerified,false);
  assert.ok(out.items.every(item=>item.checks.every(c=>c.state==='unknown')));
  assert.equal(JSON.stringify(x),before);
 }
 assert.equal(audit(null).sourceCriterionVerified,false);
 assert.ok(audit(null).items.every(item=>item.checks.every(c=>c.state==='unknown')));
});

test('r28: tampering Lộc or Mã layer is unknown, not false evidence',()=>{
 const base=chart(2004,'Nữ');
 for(const [mutate,affected] of [
  [c=>{c.auxiliaryRuleSet='corrupt';},0],
  [c=>{c.auxiliaries[0].branch=(c.auxiliaries[0].branch+1)%12;},0],
  [c=>{c.yearStarRuleSet='corrupt';},1],
  [c=>{c.yearStars[0].branch=(c.yearStars[0].branch+1)%12;},1]
 ]){
  const current=clone(base);mutate(current);
  const result=audit(current).items[2];
  assert.equal(result.checks[affected].state,'unknown');
  assert.equal(result.checks[2].state,'unknown');
  assert.equal(result.sourceCriterionVerified,false);
 }
});

test('r28: only research details expand; no new navigation or artificial increase of the 49 catalog',()=>{
 const natal=chart(2004,'Nam'),n=auditClassicalPatternCandidates(natal),p=auditClassicalDingZaSourceBridge(natal);
 const cat=summarizeClassicalCatalog([...n.records.map(x=>x.id),...p.mappedIds]);
 assert.equal(cat.assessed,31);
 assert.equal(cat.referenceTotal,49);
 assert.equal(n.assessed,28);
 assert.deepEqual(p.mappedIds,['dinh-tap-01','dinh-tap-02','dinh-tap-08']);
 assert.match(LIMITATION,/KHÔNG chứng minh/);
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/auditClassicalVoidSemanticGates\(chart\)/);
 assert.match(ui,/voidGateById\.get\(entry\.id\)/);
 assert.match(ui,/voidGates\.limitation/);
 assert.match(ui,/bridge\.mappedIds\.length\} đại hạn nghiên cứu/);
 assert.doesNotMatch(ui,/28 nguyên cục \+ 2 đại hạn nghiên cứu/);
 assert.match(ui,/R27 đã đối chiếu hình học trên 65 lá số giả lập/);
});
