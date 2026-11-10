'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Cycles=require('../packages/astrology-engine/src/cycles.js');
const {auditClassicalPeriodGeometry:audit}=require('../packages/interpretation/src/classical-period-geometry.cjs');
const chart=(gender='Nam')=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
const clone=source=>JSON.parse(JSON.stringify(source));

test('r16 verifies 12 internal decade periods for real female and male engine charts without claiming Ding Za',()=>{
 for(const gender of ['Nam','Nữ']){
  const c=chart(gender),original=JSON.stringify(c),result=audit(c);
  assert.equal(result.verifiedGeometry,true,result.reason);
  assert.equal(result.matchedPeriods,12);
  assert.equal(result.sourceInterpretationVerified,false);
  assert.equal(result.ruleSet,Cycles.RULESET);
  assert.equal(JSON.stringify(c),original);
  assert.ok(Object.isFrozen(result));
 }
});
test('r16 is fail-closed on missing or mis-versioned period data',()=>{
 const c=chart();
 for(const mutate of [
  x=>{delete x.cycles;},
  x=>{x.cycles.daiHan.pop();},
  x=>{x.cycles.ruleSet='unknown-school';},
  x=>{x.coverage.daiHan=11;},
  x=>{x.cuc.number=0;},
  x=>{x.yearCanChi='Giáp Tý';},
  x=>{x.auxiliaries=x.auxiliaries.filter(s=>s.name!=='Lộc Tồn');}
 ]){
  const broken=clone(c);mutate(broken);
  const result=audit(broken);
  assert.equal(result.verifiedGeometry,false,result.reason);
  assert.equal(result.sourceInterpretationVerified,false);
  assert.equal(result.matchedPeriods,0);
 }
 assert.equal(audit(null).verifiedGeometry,false);
});
test('r16 rejects wrong age bounds, mismatched projections and reversed sequence',()=>{
 const c=chart();
 for(const mutate of [
  x=>{x.cycles.daiHan[0].fromAge+=10;},
  x=>{x.cycles.daiHan[3].toAge+=1;},
  x=>{const a=x.cycles.daiHan[0];x.cycles.daiHan[0]=x.cycles.daiHan[1];x.cycles.daiHan[1]=a;},
  x=>{x.houses[0].daiHan.fromAge-=10;},
  x=>{x.houses[2].daiHan.branch=0;},
  x=>{x.cycles.direction*=-1;},
  x=>{x.houses[11].branchIndex=0;},
  x=>{x.houses[1].daiHan=null;}
 ]){
  const broken=clone(c);mutate(broken);
  assert.equal(audit(broken).verifiedGeometry,false,JSON.stringify(mutate).slice(0,100));
 }
 assert.equal(audit(c).verifiedGeometry,true);
});
test('r16 reuses the existing 49-pattern catalog, never enabling period verdicts',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/conditional-pattern-evidence.module.css'),'utf8');
 assert.match(ui,/auditClassicalPeriodGeometry\(chart\)/);
 assert.match(ui,/group\.key==='dinh-tap'/);
 assert.match(ui,/periodGeometry\.verifiedGeometry/);
 assert.match(ui,/không xác nhận các cách cục Định tạp/);
 assert.match(css,/\.periodGeometry/);
 assert.doesNotMatch(ui,/setPeriodVerdict|enableDingZa|periodMatchCount/);
});
