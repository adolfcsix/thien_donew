'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {lookupQS,ROWS,REF_COMMIT,discrepancy}=require('../packages/interpretation/src/classical-brightness-comparison.cjs');
const {auditClassicalPatternCandidates:study}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
test('r11 source QS 3x12 numeric matrix is pinned and must not be silently adopted',()=>{
 assert.equal(REF_COMMIT,'7922285d947b36610e7e31c232d8f1e2a0d0871d');
 assert.deepEqual(ROWS['Tham Lang'],[2,1,5,4,1,7,2,1,5,4,1,7]);
 assert.deepEqual(ROWS['Hỏa Tinh'],[7,3,1,4,7,3,1,4,7,3,1,4]);
 assert.deepEqual(ROWS['Linh Tinh'],[7,3,1,4,7,3,1,4,7,3,1,4]);
 assert.equal(discrepancy.unresolved,true);
});
test('r11 QS lookup preserves Tý-based indexing and M/V only',()=>{
 assert.equal(lookupQS('Hỏa Tinh',0).label,'Hãm');
 assert.equal(lookupQS('Hỏa Tinh',2).label,'Miếu');
 assert.equal(lookupQS('Tham Lang',1).isMiaoWang,true);
 assert.equal(lookupQS('Tham Lang',2).isMiaoWang,false);
 assert.equal(lookupQS('Hỏa Tinh',12),null);
 assert.equal(lookupQS('unknown',2),null);
});
test('r11 actual engine chart comparison cannot assert classical formation and does not mutate',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart),result=study(chart);
 assert.equal(result.assessed,28);
 assert.equal(result.fireAudit.verified,true);
 assert.equal(result.brightnessComparison.available,true);
 assert.equal(result.brightnessComparison.discrepancy.unresolved,true);
 assert.equal(result.brightnessComparison.mayConfirmClassicalPattern,false);
 assert.equal(result.records.find(x=>x.id==='dinh-quy-17').status!=='structural-match',true);
 assert.equal(JSON.stringify(chart),before);
});

test('r11 missing or forged source does not create a valid independent brightness comparison',()=>{
 const {compareQSBrightness}=require('../packages/interpretation/src/classical-brightness-comparison.cjs');
 const c=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const audit={verified:true,branchIndex:2};
 const tham={status:'observed',branchIndex:2};
 const fake=compareQSBrightness(c,{verified:false,reason:'wrong version'},tham,{known:true,status:'M'});
 assert.equal(fake.available,false);
 assert.equal(fake.mayConfirmClassicalPattern,false);
 const missing=compareQSBrightness({...c,advancedStars:c.advancedStars.filter(x=>x.name!=='Linh Tinh')},audit,tham,{known:true,status:'M'});
 assert.equal(missing.available,false);
 const twice=compareQSBrightness({...c,advancedStars:c.advancedStars.concat({...c.advancedStars.find(x=>x.name==='Linh Tinh')})},audit,tham,{known:true,status:'M'});
 assert.equal(twice.available,false);
});
test('r11 UI presents versioned comparison in existing expert view without using it for classical verdicts',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/brightnessComparison\.discrepancy\.detail/);
 assert.match(ui,/brightnessComparison\.fire/);
 assert.match(ui,/brightnessComparison\.bell/);
 assert.match(ui,/styles\.comparison/);
 const research=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-pattern-research.cjs'),'utf8');
 const start=research.indexOf("result('dinh-quy-17'");
 const rule=research.slice(start,research.indexOf("result('dinh-quy-18'",start));
 assert.match(rule,/Chưa có bảng độ sáng Hỏa Tinh/);
 assert.doesNotMatch(rule,/brightnessComparison/);
});
