'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const B=require('../packages/astrology-engine/src/bazi.js');
const Jie=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Z=require('../packages/astrology-engine/src/ziping-depth.cjs');
const T=require('../packages/astrology-engine/src/trach-nhat-specialized.cjs');
const A=require('../packages/astrology-engine/src/almanac.js');
const E=require('../packages/astrology-engine/src/tuvi.js');
const sample=(date='2026-05-18',sex='male')=>({date,hour:10,minute:30,utcOffsetMinutes:420,longitudeDeg:105,sex});
function localInputFromJie(e){
 // Offset +7:00, same UTC instant as reference, tests fail-close around boundary.
 const dt=new Date(e.epochMs+7*3600e3);
 return {date:dt.toISOString().slice(0,10),hour:dt.getUTCHours(),minute:dt.getUTCMinutes(),utcOffsetMinutes:420,longitudeDeg:105};
}
test('V11.134 Zi Ping: three distinct school methods and transparent evidence',()=>{
 const x=Z.evaluate(sample());
 assert.equal(x.methods.status,'PROVISIONAL');
 assert.deepEqual(x.methods.methods.map(y=>y.method),['ge-ju','fu-yi','diao-hou']);
 assert.equal(x.methods.methods[0].status,'CANDIDATE_ONLY');
 assert.equal(x.verifiedUsefulGod,null);assert.equal(x.verifiedPattern,null);
 assert.equal(x.methods.conclusion,null);assert.equal(x.methods.evidence.transformedElementAsserted,false);
 assert.ok(x.methods.methods.every(x=>x.pending&&x.observations.length>=2));
});
test('V11.134 reference-gate denies out-of-coverage year without fallback to V9.8',()=>{
 const x=Z.evaluate(sample('2004-08-15'));
 assert.equal(x.calendar.sourceStatus,'OUT_OF_COVERAGE');
 assert.equal(x.methods.status,'BLOCKED');assert.deepEqual(x.methods.methods,[]);
 assert.equal(x.luck.status,'BLOCKED');assert.equal(x.verifiedUsefulGod,null);
});
test('V11.134 near documented Jie minute is explicitly blocked',()=>{
 const term=Jie.EVENTS.find(e=>e.term==='Lập Xuân'&&e.year===2026);
 assert.ok(term);
 const x=Z.evaluate({...localInputFromJie(term),sex:'female'});
 assert.equal(x.calendar.sourceStatus,'BOUNDARY_REVIEW');
 assert.equal(x.methods.status,'BLOCKED');assert.equal(x.luck.status,'BLOCKED');
});
test('V11.134 Dayun direction is from YEAR stem parity plus requested conventional sex',()=>{
 const male=Z.evaluate(sample()),female=Z.evaluate(sample('2026-05-18','female'));
 assert.equal(male.luck.status,'PROVISIONAL');assert.equal(female.luck.status,'PROVISIONAL');
 assert.notEqual(male.luck.direction,female.luck.direction);
 assert.ok(male.luck.startingAge.decimalYears>=0&&male.luck.startingAge.decimalYears<13);
 assert.ok(female.luck.startingAge.decimalYears>=0&&female.luck.startingAge.decimalYears<13);
 assert.equal(male.luck.cycles.length,8);
 for(const [i,c] of male.luck.cycles.entries()){
  assert.equal(c.stemIndex,(E.baziCalculate({date:'2026-05-18',hour:10,minute:30}).pillars.month.stemIndex+(male.luck.direction==='forward'?i+1:-(i+1))+100)%10);
  assert.ok(c.endingAgeYears>c.startingAgeYears);
 }
});
test('V11.134 extrapolation is never asserted as verified astronomy',()=>{
 const x=Z.evaluate(sample());
 assert.equal(x.researchOnly,true);assert.match(x.luck.limitation,/2025–2027/);
 assert.match(x.luck.startingAge.conversion,/3 ngày/);
 assert.equal(x.calendar.sourceId,Jie.SOURCE_ID);
});
test('V11.134 invalid sex or cycle count rejected',()=>{
 assert.throws(()=>Z.evaluate({...sample(),sex:'other'}),RangeError);
 assert.throws(()=>Z.evaluate({...sample(),count:0}),RangeError);
});
test('V11.134 month Qi and ten god agree with reference calculation',()=>{
 const x=Z.evaluate(sample());
 const c=Jie.evaluateWithReferenceJie(sample());
 const first=B.hiddenStems(c.pillars.month.branchIndex,c.pillars.day.stemIndex)[0];
 assert.equal(x.methods.methods[0].candidate,first.tenGod);
 assert.equal(x.pillarNames.day,c.pillars.day.name);
});
test('V11.134 Trạch Nhật exposes four named independent policy lenses',()=>{
 const x=T.evaluate({date:'2026-05-18',purpose:'khai-truong',ageBranchIndex:0,hour:10});
 assert.deepEqual(x.lenses.map(y=>y.policy),T.POLICIES.map(y=>y.id));
 assert.equal(x.overallVerdict,null);assert.equal(x.score,null);
 assert.equal(x.visualReference.evaluated,false);
 assert.ok(x.lenses.every(y=>y.basis.length>=1&&y.limitation));
});
test('V11.134 day clash precisely six branch positions opposite',()=>{
 const date='2026-05-18';const b=B.BRANCHES.indexOf(A.dayInfo(2026,5,18).dayCanChi.split(' ').at(-1));
 assert.ok(b>=0);
 const clashing=T.evaluate({date,ageBranchIndex:(b+6)%12});
 const same=T.evaluate({date,ageBranchIndex:b});
 assert.equal(clashing.lenses[2].signal,'SYMBOLIC_CLASH');
 assert.equal(same.lenses[2].signal,'NO_SYMBOLIC_CLASH');
 assert.equal(clashing.lenses[2].status,'REFERENTIAL');
});
test('V11.134 purpose and lunar hour are not inferred when missing',()=>{
 const x=T.evaluate({date:'2026-05-18',purpose:'dong-tho'});
 assert.equal(x.lenses[2].status,'NEEDS_INPUT');assert.equal(x.lenses[2].signal,null);
 assert.equal(x.lenses[3].status,'NEEDS_INPUT');assert.equal(x.lenses[3].signal,null);
});
test('V11.134 all twenty-four clock-hours map to 12 Earthly Branches',()=>{
 for(let h=0;h<24;h++){
  const x=T.evaluate({date:'2026-05-18',hour:h});
  assert.equal(x.hourBranch,B.BRANCHES[Math.floor((h+1)/2)%12]);
  assert.ok(['LISTED_HOUR','NOT_LISTED_HOUR'].includes(x.lenses[3].signal));
 }
});
test('V11.134 invalid inputs and unknown purpose do not silently default',()=>{
 for(const date of ['2026-13-01','2026-02-31','20-2-2','2026-00-01'])assert.throws(()=>T.evaluate({date}),Error);
 assert.throws(()=>T.evaluate({date:'2026-05-18',purpose:'unknown'}),RangeError);
 assert.throws(()=>T.evaluate({date:'2026-05-18',hour:24}),RangeError);
 assert.throws(()=>T.evaluate({date:'2026-05-18',ageBranchIndex:-1}),RangeError);
});
test('V11.134 Trạch Nhật result leaves older V9.3 classifier untouched',()=>{
 const day=A.dayInfo(2026,5,18);
 const old=require('../packages/astrology-engine/src/good-days.js').evaluateDay(day,'cuoi-hoi');
 const current=T.evaluate({date:'2026-05-18',purpose:'cuoi-hoi'});
 assert.equal(old.grade,current.lenses[0].signal);
});
test('V11.134 public engine exports and client page integration are available',()=>{
 assert.equal(typeof E.zipingDeepResearch,'function');assert.equal(typeof E.trachNhatEvaluate,'function');
 const root=path.resolve(__dirname,'..');
 assert.match(fs.readFileSync(path.join(root,'apps/web/src/app/bazi/page.tsx'),'utf8'),/zipingDeepResearch/);
 assert.match(fs.readFileSync(path.join(root,'apps/web/src/app/good-days/page.tsx'),'utf8'),/trachNhatEvaluate/);
});
test('V11.134 original V9.8 four pillars and 12-Trực output stay deterministic',()=>{
 const b=B.calculate({date:'2026-05-18',hour:10,minute:30});
 assert.equal(b.pillars.day.name,B.calculate({date:'2026-05-18',hour:10,minute:30}).pillars.day.name);
 const x=require('../packages/astrology-engine/src/good-days.js').searchMonth(2026,5,'khai-truong');
 assert.equal(x.days.length,31);
});
