'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DEFAULT_LINH_DAN_FIRST,DEFAULT_LINH_TY_FIRST,linhReconciliation,ROWS,REF_COMMIT,compareQSBrightness}=require('../packages/interpretation/src/classical-brightness-comparison.cjs');
const {auditClassicalPatternCandidates:research}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');

test('r12 rotates the pinned Dần-first Linh override into Tý-first without changing cells',()=>{
 assert.deepEqual(DEFAULT_LINH_DAN_FIRST,['庙','利','得','得','庙','得','得','得','庙','陷','陷','陷']);
 assert.deepEqual(DEFAULT_LINH_TY_FIRST,['Hãm','Hãm','Miếu','Lợi','Đắc','Đắc','Miếu','Đắc','Đắc','Đắc','Miếu','Hãm']);
 assert.deepEqual(ROWS['Linh Tinh'],[7,3,1,4,7,3,1,4,7,3,1,4]);
 assert.equal(linhReconciliation.sourceCommit,REF_COMMIT);
 assert.equal(linhReconciliation.sourceOrder,'Dần-first to Tý-first');
});

test('r12 branch comparison identifies exactly five disagreements and preserves all 12 branches',()=>{
 const d=linhReconciliation;
 assert.equal(d.totalBranches,12);
 assert.equal(d.rows.length,12);
 assert.equal(d.differenceCount,5);
 assert.deepEqual(d.differingBranches,['Sửu','Thìn','Mùi','Thân','Hợi']);
 assert.deepEqual(d.differences.map(x=>[x.branchName,x.qsLabel,x.defaultLabel]),[
  ['Sửu','Đắc','Hãm'],['Thìn','Hãm','Đắc'],['Mùi','Lợi','Đắc'],
  ['Thân','Hãm','Đắc'],['Hợi','Lợi','Hãm']
 ]);
 assert.equal(d.adopted,false);
 assert.equal(d.expertReviewed,false);
 assert.ok(Object.isFrozen(d.rows));
 assert.ok(Object.isFrozen(d.differences[0]));
});
