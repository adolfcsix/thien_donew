'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalDingZaPeriods:audit,IDS}=require('../packages/interpretation/src/classical-dingza-period-research.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const chart=(gender='Nam')=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
const clone=x=>JSON.parse(JSON.stringify(x));
test('r18 shows twelve age-scoped decades for each of four Ding Za rules, never a natal verdict',()=>{
 for(const gender of ['Nam','Nữ']){
  const c=chart(gender),before=JSON.stringify(c),v=audit(c);
  assert.equal(v.verifiedGeometry,true,v.reason);
  assert.equal(v.checkedPeriods,12);
  assert.equal(v.sourceInterpretationVerified,false);
  assert.deepEqual(v.items.map(x=>x.id),[...IDS]);
  assert.equal(v.items.length,4);
  assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.items));
  for(const rule of v.items){
   assert.equal(rule.unit,'đại hạn');
   assert.equal(rule.sourceCriterionVerified,false);
   assert.equal(rule.status,'partial-evidence');
   assert.equal(rule.periods.length,12);
   assert.ok(Object.isFrozen(rule.periods));
   assert.ok(rule.periods.every((p,i)=>p.index===i&&p.fromAge===c.cuc.number+10*i&&
     p.toAge===p.fromAge+9&&p.checks.length>=3));
   assert.ok(rule.periods.every(p=>Object.isFrozen(p)&&Object.isFrozen(p.checks)&&
     p.checks.every(check=>['met','not-met','unknown'].includes(check.state))));
  }
  assert.equal(JSON.stringify(c),before);
  const natal=auditClassicalPatternCandidates(c);
  assert.equal(natal.records.length,28);
  assert.equal(summarizeClassicalCatalog(natal.records.map(x=>x.id)).assessed,28);
 }
});
test('r18 every period keeps source-dependent disputed gates unresolved, no false match',()=>{
 const v=audit(chart());
 for(const rule of v.items)for(const p of rule.periods){
  assert.ok(p.checks.some(check=>check.state==='unknown'));
  assert.equal(rule.sourceCriterionVerified,false);
 }
 for(const p of v.items[2].periods){
  assert.equal(p.checks.find(x=>x.label.includes('Lộc Tồn tọa đủ sáu')).state,'unknown');
  assert.equal(p.checks.find(x=>x.label.includes('Thiên Mã tọa đủ sáu')).state,'unknown');
 }
});
test('r18 malformed geometry is fail-closed, not a phantom period',()=>{
 const c=chart();
 for(const mutate of [
  x=>{x.cycles.daiHan[0].fromAge+=1;},
  x=>{x.cycles.daiHan[3].branch=(x.cycles.daiHan[3].branch+1)%12;},
  x=>{x.houses[0].daiHan.toAge+=3;},
  x=>{x.cycles.ruleSet='school-without-version';}
 ]){
  const broken=clone(c);mutate(broken);
  const r=audit(broken);
  assert.equal(r.verifiedGeometry,false);
  assert.equal(r.checkedPeriods,0);
  assert.ok(r.items.every(x=>x.periods.length===0));
 }
 assert.equal(audit(null).verifiedGeometry,false);
});
test('r18 unsafe strength or aux evidence is unknown, cannot authorize a classical judgment',()=>{
 const src=chart();
 for(const mutate of [
  x=>{x.mainStarStrengthRuleSet='other';},
  x=>{x.houses[2].mainStarStrengths[0].status='M';},
  x=>{x.auxiliaryRuleSet='unknown';},
  x=>{x.auxiliaries[0].branch=(x.auxiliaries[0].branch+1)%12;},
  x=>{x.yearStarRuleSet='invalid';},
  x=>{x.tuHoaRuleSet='invalid';}
 ]){
  const c=clone(src);mutate(c);
  const r=audit(c);
  assert.equal(r.sourceInterpretationVerified,false);
  assert.ok(r.items.every(x=>x.sourceCriterionVerified===false));
 }
 const noStrength=clone(src);noStrength.mainStarStrengthRuleSet='wrong';
 const x=audit(noStrength).items[3].periods[0].checks;
 assert.equal(x.find(c=>c.label.startsWith('Cung Mệnh yếu')).state,'unknown');
 assert.equal(x.find(c=>c.label.startsWith('Cung đại hạn mạnh')).state,'unknown');
});
test('r19 preserves a verified Loc Ton result even when Hoa Loc origin is unavailable',()=>{
 const c=chart('Nam');
 const loc=c.auxiliaries.find(x=>x.name==='Lộc Tồn');
 assert.ok(loc);
 const unverified=clone(c);
 unverified.tuHoaRuleSet='unknown-year-hua-rule';
 const a=audit(unverified).items.find(x=>x.id==='dinh-tap-01');
 const source=audit(c).items.find(x=>x.id==='dinh-tap-01');
 assert.equal(a.sourceCriterionVerified,false);
 assert.equal(a.periods.length,12);
 let locMet=0, unknown=0;
 for(const period of a.periods){
  const b=period.branchIndex, four=[b,(b+4)%12,(b+8)%12,(b+6)%12];
  const check=period.checks.find(x=>x.label.includes('Lộc Tồn hoặc Hóa Lộc'));
  assert.ok(check);
  if(four.includes(loc.branch)){
   assert.equal(check.state,'met');
   assert.match(check.detail,/Lộc Tồn đã được xác minh/);
   locMet++;
  }else{
   assert.equal(check.state,'unknown');
   assert.match(check.detail,/Hóa Lộc chưa đủ chứng cứ/);
   unknown++;
  }
 }
 assert.equal(locMet,4);
 assert.equal(unknown,8);
 // Failing the year-hua gate never authorizes any classical period verdict.
 assert.ok(a.periods.every(p=>p.checks.some(c=>c.state==='unknown')));
 assert.equal(source.sourceCriterionVerified,false);
});

test('r19 source alternatives are not converted into an unjustified negative',()=>{
 const clean=chart('Nữ'),broken=clone(clean);
 broken.tuHoaRuleSet='not-verified';
 const loc=clean.auxiliaries.find(s=>s.name==='Lộc Tồn').branch;
 const rs=audit(broken).items.find(x=>x.id==='dinh-tap-01');
 assert.ok(rs.periods.some(p=>p.checks[1].state==='met'));
 assert.ok(rs.periods.some(p=>p.checks[1].state==='unknown'));
 assert.ok(rs.periods.every(p=>p.checks[1].state!=='not-met'));
 for(const p of rs.periods){
  const b=p.branchIndex;
  const court=[b,(b+4)%12,(b+8)%12,(b+6)%12];
  assert.equal(p.checks[1].state,court.includes(loc)?'met':'unknown');
 }
});
test('r18 period entries are opened within existing 49-catalog, not added to natal results',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/auditClassicalDingZaPeriods\(chart\)/);
 assert.match(ui,/dingZaById\.has\(entry\.id\)/);
 assert.match(ui,/Đối chiếu đại hạn từng kỳ · chưa ánh xạ/);
 assert.match(ui,/period\.fromAge/);
 assert.match(ui,/Không dùng làm kết luận Định tạp/);
});
