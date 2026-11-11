'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {
 SOURCE_NAMES,NORMALIZED_NAMES,SOURCE_ALIASES,SOURCE_VARIANTS,
 SOURCE_VOID_NOTICE,CATALOG_AUDIT,reconcileClassicalVoidVocabulary
}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaPeriods}=require('../packages/interpretation/src/classical-dingza-period-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');

test('r20 pins six source labels but distinguishes legacy names from the four normalized labels',()=>{
 assert.deepEqual(SOURCE_NAMES,['旬空','副旬','截路','截空','空亡','副截']);
 assert.deepEqual(NORMALIZED_NAMES,['旬空','副旬','截空','副截']);
 assert.deepEqual(SOURCE_ALIASES.map(p=>[p.legacy,p.normalized]),
  [['截路','截空'],['空亡','副截']]);
 assert.deepEqual(SOURCE_VARIANTS,['single','double','zhanyan']);
 assert.equal(CATALOG_AUDIT.recognized.length,6);
 assert.deepEqual(CATALOG_AUDIT.normalizedNames,NORMALIZED_NAMES);
 assert.equal(new Set(CATALOG_AUDIT.normalizedNames).size,4);
 assert.equal(CATALOG_AUDIT.sourceCriterionVerified,false);
 assert.equal(CATALOG_AUDIT.sourcePlacementVerified,false);
 assert.equal(CATALOG_AUDIT.schoolVariantVerified,false);
 assert.ok(CATALOG_AUDIT.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/algorithm.ts'));
 assert.ok(Object.isFrozen(CATALOG_AUDIT)&&Object.isFrozen(CATALOG_AUDIT.recognized));
});

test('r20 aliases normalize exactly and Tuần/Triệt never masquerade as source void placements',()=>{
 const input=['截路','截空','空亡','副截','旬空','副旬','Tuần','Triệt'];
 const snapshot=JSON.stringify(input);
 const report=reconcileClassicalVoidVocabulary(input);
 assert.deepEqual(report.normalizedNames,['截空','副截','旬空','副旬']);
 assert.deepEqual(report.unresolved,['Tuần','Triệt']);
 assert.equal(report.sourceCriterionVerified,false);
 assert.equal(report.sourcePlacementVerified,false);
 assert.equal(JSON.stringify(input),snapshot);
 assert.ok(Object.isFrozen(report.normalizedNames)&&Object.isFrozen(report.unresolved));
 assert.equal(reconcileClassicalVoidVocabulary(['Tuần','Triệt']).recognized.length,0);
 assert.throws(()=>reconcileClassicalVoidVocabulary(null),/Expected array/);
 assert.throws(()=>reconcileClassicalVoidVocabulary(['旬空',99]),/Expected array/);
});

test('r20 source reconciliation never promotes Ding Pin or Ding Za to verified',()=>{
 for(const gender of ['Nam','Nữ']){
  const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
  const original=JSON.stringify(chart);
  const natal=auditClassicalPatternCandidates(chart);
  const period=auditClassicalDingZaPeriods(chart);
  assert.equal(natal.assessed,28);
  assert.equal(summarizeClassicalCatalog(natal.records.map(x=>x.id)).assessed,28);
  assert.deepEqual(natal.pendingEvidence.map(x=>x.id),['dinh-ban-01','dinh-ban-02']);
  assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false&&
    x.checks.at(-1).state==='unknown'&&x.checks.at(-1).detail===SOURCE_VOID_NOTICE));
  const rule=period.items.find(x=>x.id==='dinh-tap-03');
  assert.ok(rule);
  assert.equal(rule.sourceCriterionVerified,false);
  assert.ok(rule.periods.every(p=>p.checks.at(1).state==='unknown'&&
    p.checks.at(2).state==='unknown'&&
    p.checks.at(1).detail===SOURCE_VOID_NOTICE&&p.checks.at(2).detail===SOURCE_VOID_NOTICE));
  assert.equal(JSON.stringify(chart),original);
 }
});

test('r20 invalid or incomplete lexical source labels cannot establish school parity',()=>{
 for(const labels of [[],['旬空'],['截路','空亡'],['Tiếng Việt khác']]){
  const result=reconcileClassicalVoidVocabulary(labels);
  assert.equal(result.lexicalOnly,true);
  assert.equal(result.schoolVariantVerified,false);
  assert.equal(result.sourcePlacementVerified,false);
  assert.equal(result.sourceCriterionVerified,false);
 }
});
