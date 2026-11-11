'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPeriodPreflight:audit}=require('../packages/interpretation/src/classical-period-preflight.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const original=gender=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
const copy=x=>JSON.parse(JSON.stringify(x));

test('r18 observes 12 decade periods for male and female engine charts, with no Ding Za verdict',()=>{
 for(const gender of ['Nam','Nữ']){
  const c=original(gender),before=JSON.stringify(c);
  const report=audit(c);
  assert.equal(report.geometryVerified,true,report.reason);
  assert.equal(report.natalLayersVerified,true);
  assert.equal(report.sourceCriteriaVerified,false);
  assert.equal(report.periods.length,12);
  assert.deepEqual(report.candidates.map(x=>x.id),['dinh-tap-01','dinh-tap-02','dinh-tap-03','dinh-tap-08']);
  assert.ok(report.candidates.every(x=>x.sourceCriterionVerified===false));
  assert.ok(report.periods.every(x=>Object.isFrozen(x)&&Object.isFrozen(x.sharpStarsAtPeriod)&&
   typeof x.locTonAndHorseInCourt==='boolean'&&typeof x.sevenKillingInCourt==='boolean'));
  assert.deepEqual(report.periods.map(x=>x.fromAge),[...report.periods.map(x=>x.fromAge)].sort((a,b)=>a-b));
  assert.equal(JSON.stringify(c),before);
  assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.periods));
 }
});
test('r18 damaged decade geometry and source layers are fail-closed',()=>{
 const c=original('Nam');
 const variants=[
  x=>{x.cycles.daiHan[0].fromAge+=10;},
  x=>{x.auxiliaryRuleSet='incorrect';},
  x=>{x.yearStarRuleSet='incorrect';},
  x=>{x.advancedStarRuleSet='incorrect';},
  x=>{x.mainStarStrengthRuleSet='incorrect';},
  x=>{x.auxiliaries[0].branch=(x.auxiliaries[0].branch+1)%12;},
  x=>{x.yearStars[0].branch=(x.yearStars[0].branch+1)%12;},
  x=>{x.advancedStars[0].branch=(x.advancedStars[0].branch+1)%12;},
  x=>{x.houses[0].auxiliaryStars.push('Lộc Tồn');},
  x=>{x.houses[0].yearStars.push('Thiên Mã');},
  x=>{x.houses[0].advancedStars.push('Địa Không');},
  x=>{x.houses[0].mainStarStrengths[0]&& (x.houses[0].mainStarStrengths[0].status='M');},
  x=>{x.houses[0].stars.push('Thất Sát');}
 ];
 for(const variant of variants){
  const damaged=copy(c);variant(damaged);
  const out=audit(damaged);
  assert.equal(out.periods.length,0,String(variant).slice(0,100));
  assert.equal(out.sourceCriteriaVerified,false);
  assert.equal(out.natalLayersVerified,false);
 }
});
test('r18 does not promote period formations, alter natal research count or create new tabs',()=>{
 const c=original('Nam'),r=audit(c);
 const catalog=summarizeClassicalCatalog(auditClassicalPatternCandidates(c).records.map(x=>x.id));
 assert.equal(catalog.assessed,28);
 assert.equal(r.candidates.length,4);
 assert.equal(catalog.groups.find(x=>x.key==='dinh-tap').assessed,0);
 const component=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(component,/auditClassicalPeriodPreflight\(chart\)/);
 assert.match(component,/group\.key==='dinh-tap'/);
 assert.match(component,/không phán định cách cục/);
 assert.match(component,/periodPreflight\.periods/);
 assert.doesNotMatch(component,/setDingZaVerdict|enablePeriodJudgment/);
});
