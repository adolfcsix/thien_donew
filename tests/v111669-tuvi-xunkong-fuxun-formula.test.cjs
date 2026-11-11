'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT,SOURCE_XUN_CODES,SOURCE_VOID_STEM_ROWS}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {SOURCE_URL,CAUTION,SOURCE_FUXUN_PAIRS,projectSourceFuxunPartner:project}=require('../packages/interpretation/src/classical-source-fuxun-formula.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');

test('r26: applySchoolFuxun parity formula covers all 12 source branch indices, reversible within six pairs',()=>{
 const branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
 assert.equal(SOURCE_FUXUN_PAIRS.length,6);
 for(let i=0;i<12;i++){
  const out=project(i),partner=i%2===0?i+1:i-1;
  assert.ok(out);
  assert.equal(out.primaryBranchIndex,i);
  assert.equal(out.partnerBranchIndex,partner);
  assert.equal(out.primaryBranch,branches[i]);
  assert.equal(out.partnerBranch,branches[partner]);
  assert.equal(out.inputKind,'source-xunkong-branch-index');
  assert.equal(out.primaryName,'旬空');
  assert.equal(out.partnerName,'副旬');
  assert.equal(out.sourceFormulaReproduced,true);
  assert.equal(out.sourceXunkongPlacementVerified,false);
  assert.equal(out.iztroPlacementVerified,false);
  assert.equal(out.sourceSchoolParityVerified,false);
  assert.equal(out.natalChartParityVerified,false);
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.sourceUrl,SOURCE_URL);
  assert.ok(Object.isFrozen(out));
  assert.equal(project(partner).partnerBranchIndex,i);
  assert.equal(SOURCE_FUXUN_PAIRS[Math.floor(i/2)].branches.includes(branches[i]),true);
 }
 assert.ok(SOURCE_URL.includes('/blob/'+SOURCE_COMMIT+'/lib/ziwei/algorithm.ts'));
 assert.deepEqual(SOURCE_FUXUN_PAIRS.map(x=>x.branches),
  [['Tý','Sửu'],['Dần','Mão'],['Thìn','Tỵ'],['Ngọ','Mùi'],['Thân','Dậu'],['Tuất','Hợi']]);
 assert.ok(Object.isFrozen(SOURCE_FUXUN_PAIRS));
 assert.ok(SOURCE_FUXUN_PAIRS.every(x=>Object.isFrozen(x)&&Object.isFrozen(x.branches)&&Object.isFrozen(x.branchIndices)));
});

test('r26: reject invalid indices and never treat 1-based Xun source-table codes as verified source chart placement',()=>{
 for(const invalid of [null,undefined,false,true,-1,12,13,0.5,NaN,Infinity,'0','Tý',{},[],[0]]){
  assert.equal(project(invalid),null,JSON.stringify(invalid));
 }
 assert.equal(SOURCE_XUN_CODES.length,13); // sentinel, ten documented stems, two extra cells
 assert.equal(SOURCE_VOID_STEM_ROWS.length,10);
 assert.equal(SOURCE_VOID_STEM_ROWS[0].xunSourceCode,3);
 assert.equal(project(2).primaryBranch,'Dần');
 assert.match(CAUTION,/Không tính được 旬空 từ năm sinh/);
 assert.match(CAUTION,/không chạy iztro/);
 assert.match(CAUTION,/không đồng nhất với Tuần của Thiên Đồ/);
});

test('r26: projections do not mutate natal data or promote classical patterns for either gender',()=>{
 for(const gender of ['Nam','Nữ']){
  const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
  const snapshot=JSON.stringify(chart);
  const projections=Array.from({length:12},(_,i)=>project(i));
  assert.ok(projections.every(x=>x.sourceCriterionVerified===false&&x.iztroPlacementVerified===false));
  assert.equal(JSON.stringify(chart),snapshot);
  const natal=auditClassicalPatternCandidates(chart);
  const period=auditClassicalDingZaSourceBridge(chart);
  assert.equal(natal.assessed,28);
  assert.equal(period.mappedIds.length,3);
  assert.equal(summarizeClassicalCatalog([...natal.records.map(x=>x.id),...period.mappedIds]).assessed,31);
  assert.deepEqual(natal.pendingEvidence.map(x=>x.id),['dinh-ban-01','dinh-ban-02']);
  assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false));
  assert.equal(period.sourceCriterionVerified,false);
  assert.equal(JSON.stringify(chart),snapshot);
 }
});

test('r26: expert UI stays in the existing collapsed research panel with explicit limitations',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/SOURCE_FUXUN_PAIRS,CAUTION as FUXUN_CAUTION/);
 assert.match(ui,/SOURCE_FUXUN_PAIRS\.map\(pair=>pair\.branches\.join/);
 assert.match(ui,/Quy tắc ghép 旬空 \/ 副旬 theo nguồn/);
 assert.match(ui,/\{FUXUN_CAUTION\}/);
 assert.match(ui,/<details className=\{styles\.schoolFull\}>/);
 assert.match(ui,/Bảng mã Không Vong theo 10 thiên can/);
 const vocabulary=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-source-void-vocabulary.cjs'),'utf8');
 assert.doesNotMatch(vocabulary,/nâng tổng 30\/49/);
});
