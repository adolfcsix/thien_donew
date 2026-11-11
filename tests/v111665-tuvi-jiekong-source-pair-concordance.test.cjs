'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaPeriods}=require('../packages/interpretation/src/classical-dingza-period-research.cjs');
const {
 SOURCE_COMMIT,SOURCE_VOID_STEM_ROWS,SOURCE_SCHOOL_DATA_URL,SOURCE_URL,
 auditSourceDoubleJiekongCodeConcordance
}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');

test('r22: ten year stems independently match the pinned formula for the double Jiekong school',()=>{
 const expected=[
  ['Giáp',[9,10],['Thân','Dậu']],
  ['Ất',[8,7],['Mùi','Ngọ']],
  ['Bính',[5,6],['Thìn','Tỵ']],
  ['Đinh',[4,3],['Mão','Dần']],
  ['Mậu',[1,2],['Tý','Sửu']],
  ['Kỷ',[10,9],['Dậu','Thân']],
  ['Canh',[7,8],['Ngọ','Mùi']],
  ['Tân',[6,5],['Tỵ','Thìn']],
  ['Nhâm',[3,4],['Dần','Mão']],
  ['Quý',[2,1],['Sửu','Tý']]
 ];
 assert.equal(SOURCE_VOID_STEM_ROWS.length,expected.length);
 for(const [stem,codes,branches] of expected){
  const out=auditSourceDoubleJiekongCodeConcordance(stem);
  assert.ok(out);
  assert.equal(out.variant,'double');
  assert.deepEqual(out.sourceCodes,codes);
  assert.deepEqual(out.formulaCodes,codes);
  assert.deepEqual(out.formulaBranches,branches);
  assert.equal(out.sourceFormulaConcordant,true);
  assert.equal(out.sourceAlgorithmUrl,SOURCE_URL);
  assert.equal(out.sourceDataUrl,SOURCE_SCHOOL_DATA_URL);
  assert.ok(out.sourceAlgorithmUrl.includes('/blob/'+SOURCE_COMMIT+'/lib/ziwei/algorithm.ts'));
  assert.ok(out.sourceDataUrl.includes('/blob/'+SOURCE_COMMIT+'/lib/ziwei/school-data.ts'));
  assert.equal(out.sourcePlacementVerified,false);
  assert.equal(out.sourceSchoolParityVerified,false);
  assert.equal(out.sourceCriterionVerified,false);
  assert.equal(out.sourceCodeMappingVerified,false);
  assert.equal(Object.prototype.hasOwnProperty.call(out,'branchIndex'),false);
  assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.formulaCodes)&&Object.isFrozen(out.formulaBranches));
 }
});

test('r22: formula comparison is pure, strictly bounded and does not claim Xun or school placement',()=>{
 const before=JSON.stringify(SOURCE_VOID_STEM_ROWS);
 for(const value of [null,undefined,0,1,'','甲','Tý','Tuần','Triệt','Giáp ','giáp',{},[]]){
  assert.equal(auditSourceDoubleJiekongCodeConcordance(value),null);
 }
 const first=auditSourceDoubleJiekongCodeConcordance('Giáp');
 assert.equal(first.formulaBranches.includes('Tý'),false);
 assert.equal(JSON.stringify(SOURCE_VOID_STEM_ROWS),before);
 assert.ok(Object.isFrozen(SOURCE_VOID_STEM_ROWS));
});

test('r22: the existing compact research table renders the source-only pair without a new route',()=>{
 const ui=fs.readFileSync(path.join(__dirname,
  '../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/auditSourceDoubleJiekongCodeConcordance\(row\.stem\)/);
 assert.match(ui,/Cặp chi theo công thức nguồn/);
 assert.match(ui,/chưa xác minh vị trí sao trên lá số Thiên Đồ/);
 assert.match(ui,/Bảng mã Không Vong theo 10 thiên can · nghiên cứu nguồn/);
 assert.match(ui,/<details className=\{styles\.schoolFull\}>/);
});

test('r22: source formula cannot promote pending natal or period patterns for either gender',()=>{
 for(const gender of ['Nam','Nữ']){
  const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
  const before=JSON.stringify(chart);
  for(const row of SOURCE_VOID_STEM_ROWS)assert.equal(
   auditSourceDoubleJiekongCodeConcordance(row.stem).sourceCriterionVerified,false);
  const natal=auditClassicalPatternCandidates(chart);
  const period=auditClassicalDingZaPeriods(chart);
  assert.equal(natal.assessed,28);
  assert.deepEqual(natal.pendingEvidence.map(x=>x.id),['dinh-ban-01','dinh-ban-02']);
  assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false));
  assert.ok(period.items.every(x=>x.sourceCriterionVerified===false));
  assert.equal(JSON.stringify(chart),before);
 }
});
