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

test('r12 real natal chart exposes branch-specific contrast without changing classical verdicts or inputs',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart);
 const data=research(chart);
 const school=data.brightnessComparison;
 const bell=chart.advancedStars.find(s=>s.name==='Linh Tinh');
 assert.equal(data.assessed,28);
 assert.match(data.edition,/r12$/);
 assert.equal(school.available,true);
 assert.equal(school.chartLinhComparison.branchIndex,bell.branch);
 assert.equal(school.chartLinhComparison,linhReconciliation.rows[bell.branch]);
 assert.equal(school.mayConfirmClassicalPattern,false);
 assert.equal(data.records.find(x=>x.id==='dinh-quy-17').status!=='structural-match',true);
 assert.equal(JSON.stringify(chart),before);
});
test('r12 invalid or duplicated natal Linh evidence fails closed without losing source metadata',()=>{
 const natal=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const a=compareQSBrightness(natal,{verified:false,reason:'mismatched source'},null,null);
 assert.equal(a.available,false);
 assert.equal(a.chartLinhComparison,null);
 assert.equal(a.linhReconciliation.differenceCount,5);
 const bell=natal.advancedStars.find(x=>x.name==='Linh Tinh');
 const b=compareQSBrightness({...natal,advancedStars:natal.advancedStars.concat({...bell})},{verified:true,branchIndex:2},null,null);
 assert.equal(b.available,false);
 assert.equal(b.mayConfirmClassicalPattern,false);
});
test('r12 layout presents a concise five-cung table and a folded complete twelve-cung table',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const ui=read('apps/web/src/features/chart/components/classical-pattern-research.tsx');
 assert.match(ui,/linhReconciliation\.differences\.map/);
 assert.match(ui,/linhReconciliation\.rows\.map/);
 assert.match(ui,/chartLinhComparison/);
 assert.match(ui,/scope="col"/);
 assert.match(ui,/scope="row"/);
 assert.match(ui,/Xem đủ 12 cung/);
 const css=read('apps/web/src/features/chart/components/conditional-pattern-evidence.module.css');
 assert.match(css,/\.schoolTableWrap/);
 assert.match(css,/overflow-x:auto/);
 const rules=read('packages/interpretation/src/classical-pattern-research.cjs');
 const start=rules.indexOf("result('dinh-quy-17'");
 const end=rules.indexOf("result('dinh-quy-18'",start);
 assert.ok(start!==-1&&end>start);
 assert.doesNotMatch(rules.slice(start,end),/linhReconciliation|brightnessComparison/);
});
