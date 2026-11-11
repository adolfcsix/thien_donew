'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalVoidPairGeometry:audit}=require('../packages/interpretation/src/classical-source-void-geometry.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const create=(year,gender='Nam')=>Engine.calculate({date:`${year}-08-15`,hour:8,minute:30,calendar:'solar',gender});
test('r24: full 10-stem x 2-gender matrix matches unordered pairs, with no star-equivalence claims',()=>{
 const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
 const unordered=[['Thân','Dậu'],['Ngọ','Mùi'],['Thìn','Tỵ'],['Dần','Mão'],['Tý','Sửu'],
 ['Thân','Dậu'],['Ngọ','Mùi'],['Thìn','Tỵ'],['Dần','Mão'],['Tý','Sửu']];
 for(let i=0;i<10;i++)for(const gender of ['Nam','Nữ']){
  const chart=create(1984+i,gender),before=JSON.stringify(chart),out=audit(chart);
  assert.equal(out.status,'matched',out.reason+' '+gender+' '+stems[i]);
  assert.equal(out.yearStem,stems[i]);
  assert.deepEqual([...out.chartTrietBranches].sort(),[...unordered[i]].sort());
  assert.deepEqual([...out.sourceDoubleBranches].sort(),[...unordered[i]].sort());
  assert.equal(out.verifiedChartObstructions,true);
  assert.equal(out.sourceFormulaConcordant,true);
  assert.equal(out.pairGeometryConcordant,true);
  assert.equal(out.sourceSchoolParityVerified,false);
  assert.equal(out.sourcePlacementVerified,false);
  assert.equal(out.iztroPlacementVerified,false);
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.nameEquivalenceVerified,false);
  assert.equal(out.comparisonScope,'unordered-branch-pair');
  assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.chartTrietBranches)&&Object.isFrozen(out.sourceDoubleBranches));
  assert.equal(JSON.stringify(chart),before);
 }
});
test('r24: no chart, wrong ruleSet, tampered source markers or house data all fail closed',()=>{
 const original=create(1984);
 assert.equal(audit(null).status,'unknown');
 for(const mutation of [
  c=>{c.advancedStarRuleSet='wrong';},
  c=>{c.obstructionMarkers[1].branches=[0,1];},
  c=>{c.obstructionMarkers[1].name='截空';},
  c=>{c.obstructionMarkers[1].ruleSet='wrong';},
  c=>{c.houses[0].obstructionMarkers.push('Triệt');},
  c=>{c.houses[1].branchIndex=0;},
  c=>{c.yearCanChi='X Giáp';},
  c=>{c.lunar.year=1990;},
  c=>{delete c.obstructionMarkers;}
 ]){
  const c=copy(original);
  mutation(c);
  const before=JSON.stringify(c),out=audit(c);
  assert.equal(out.status,'unknown',JSON.stringify(out));
  assert.equal(out.pairGeometryConcordant,null);
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.nameEquivalenceVerified,false);
  assert.equal(out.verifiedChartObstructions,false);
  assert.equal(JSON.stringify(c),before);
 }
});
test('r24: research remains scoped and does not promote natal or period conclusions',()=>{
 for(const gender of ['Nam','Nữ']){
  const chart=create(2004,gender),before=JSON.stringify(chart);
  const matched=audit(chart),natal=auditClassicalPatternCandidates(chart),period=auditClassicalDingZaSourceBridge(chart);
  assert.equal(matched.status,'matched');
  assert.equal(natal.assessed,28);
  assert.equal(period.mappedIds.length,2);
  assert.equal(period.sourceCriterionVerified,false);
  assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false));
  assert.equal(JSON.stringify(chart),before);
 }
 const source=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-source-void-geometry.cjs'),'utf8');
 assert.match(source,/auditNatalObstructionEvidence/);
 assert.doesNotMatch(source,/sourceCriterionVerified:true/);
 assert.doesNotMatch(source,/nameEquivalenceVerified:true/);
});

test('r24: one read-only chart explanation lives inside the existing void source details',()=>{
 const ui=fs.readFileSync(path.join(__dirname,
 '../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/auditClassicalVoidPairGeometry\(chart\)/);
 assert.match(ui,/Đối chiếu hình học trên lá số đang xem/);
 assert.match(ui,/voidGeometry\.limitation/);
 assert.match(ui,/voidGeometry\.status!=='unknown'/);
 assert.match(ui,/Bảng mã Không Vong theo 10 thiên can · nghiên cứu nguồn/);
 assert.match(ui,/sourceDoubleBranches\.join/);
});
