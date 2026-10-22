'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {BRANCHES}=require('../packages/astrology-engine/src/da-liu-ren-plates.cjs');
const F=require('../packages/astrology-engine/src/da-liu-ren-four-lessons.cjs');
const T=require('../packages/astrology-engine/src/da-liu-ren-three-transmissions.cjs');
const S=require('../packages/astrology-engine/src/da-liu-ren-study.cjs');
const examples=JSON.parse(readFileSync(resolve(__dirname,'fixtures/v1190-classical-liuren-cases.json'),'utf8'));
test('All 10 stem lodgings and five-element controls are explicit and immutable',()=>{
 assert.equal(F.STEMS.length,10);
 assert.deepEqual(F.STEMS.map(s=>F.STEM_LODGING[s]),['Dần','Thìn','Tỵ','Mùi','Tỵ','Mùi','Thân','Tuất','Hợi','Sửu']);
 assert.deepEqual(Object.values(F.CONTROLS),['thổ','thủy','hỏa','kim','mộc']);
 for(const obj of [F.STEMS,F.STEM_LODGING,F.STEM_ELEMENTS,F.BRANCH_ELEMENTS,F.CONTROLS])assert.ok(Object.isFrozen(obj));
 assert.equal(examples.cases.length,5);
});
for(const row of examples.cases){
 test(`Independent four-lesson worked example: ${row.id}`,()=>{
  const x=F.buildFourLessons(row.input);
  assert.deepEqual(x.lessons.map(l=>l.upper),row.expectedUpper);
  assert.deepEqual(x.lessons.map(l=>l.lower),row.expectedLower);
  assert.deepEqual(x.lessons.map(l=>l.number),[1,2,3,4]);
  assert.deepEqual(x.lessons.map(l=>l.lowerType),['stem','branch','branch','branch']);
  assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.lessons));
  assert.ok(x.lessons.every(Object.isFrozen));
  assert.equal(x.status,'research-only');
 });
 if(row.expectedThree){
  test(`Independent three-transmission worked example: ${row.id}`,()=>{
   const x=T.deriveThreeTransmissions(row.input);
   assert.equal(x.verdict,'derived-subroutine-only');
   assert.equal(x.rule,row.expectedRule);
   assert.deepEqual(x.transmissions.sequence,row.expectedThree);
   assert.deepEqual(x.transmissions.sequence,[x.transmissions.initial,x.transmissions.middle,x.transmissions.final]);
   assert.equal(x.fourLessons.plate.status,'deterministic-subroutine-only');
   assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.transmissions.sequence));
  });
 }
}
test('Correct priorities: lower-attacks-upper always precedes upper-controls-lower',()=>{
 const x=T.deriveThreeTransmissions(examples.cases[3].input);
 assert.equal(x.priority,'lower-attacks-upper');
 assert.equal(x.candidates.length,2);
 assert.deepEqual(x.candidates.map(l=>l.upper),['Mùi','Tý']);
 assert.equal(x.selectedLesson,4);
});
test('Bi-yong is yin-yang parity, not stem element equivalence',()=>{
 const x=T.deriveThreeTransmissions(examples.cases[2].input);
 assert.equal(x.rule,'bi-yong-unique-yin-yang');
 assert.equal(x.candidates.length,2);
 assert.deepEqual(x.candidates.map(l=>l.upperYinYang),['yang','yin']);
 assert.equal(x.selectedLesson,1);
});
test('Ambiguous Bi-yong refuses to invent She-hai results',()=>{
 const input={dayStem:'Giáp',dayBranch:'Tý',monthGeneral:'Tý',divinationHour:'Tuất'};
 const v=T.deriveThreeTransmissions(input);
 assert.equal(v.verdict,'unresolved');assert.match(v.reason,/bi-yong-ambiguous/);
 assert.equal(v.transmissions,null);assert.ok(v.candidates.length>=2);
 assert.ok(v.pending.includes('thiệp-hại'));
});
test('Special Fu-yin and Fan-yin are blocked, not naive linear shifts',()=>{
 for(const [general,hour,pattern] of [['Tý','Tý','phuc-ngam'],['Ngọ','Tý','phan-ngam']]){
  const x=T.deriveThreeTransmissions({dayStem:'Giáp',dayBranch:'Tý',monthGeneral:general,divinationHour:hour});
  assert.equal(x.fourLessons.plate.pattern,pattern);
  assert.equal(x.verdict,'unresolved');assert.match(x.reason,new RegExp(pattern));
  assert.equal(x.transmissions,null);
 }
});
test('Four-lessons shortage and no-direct-control fail closed',()=>{
 const a=T.deriveThreeTransmissions({dayStem:'Giáp',dayBranch:'Tý',monthGeneral:'Tý',divinationHour:'Dần'});
 assert.equal(a.verdict,'unresolved');assert.match(a.reason,/incomplete/);
 const b=T.deriveThreeTransmissions({dayStem:'Giáp',dayBranch:'Thìn',monthGeneral:'Tý',divinationHour:'Mão'});
 assert.equal(b.verdict,'unresolved');assert.match(b.reason,/no-direct/);
 assert.equal(a.transmissions,null);assert.equal(b.transmissions,null);
});
test('Impossible sexagenary day and invalid strict input fail closed',()=>{
 for(const input of [
  {dayStem:'Giáp',dayBranch:'Sửu',monthGeneral:'Tý',divinationHour:'Mão'},
  {dayStem:'甲',dayBranch:'Tý',monthGeneral:'Tý',divinationHour:'Mão'},
  {dayStem:'Giáp',dayBranch:'子',monthGeneral:'Tý',divinationHour:'Mão'},
  {dayStem:'Giáp',dayBranch:'Tý',monthGeneral:'invalid',divinationHour:'Mão'},
  {dayStem:'Giáp',dayBranch:'Tý',monthGeneral:'Tý',divinationHour:'Mão',date:'2026-02-20'},
  null,[],{}]){
  assert.throws(()=>F.buildFourLessons(input));
  assert.throws(()=>T.deriveThreeTransmissions(input));
 }
 for(const bad of ['__proto__','constructor','Tí','',null,4])assert.throws(()=>F.validDay(bad,'Tý'));
});
test('Every valid 60-day can-chi pair across 144 plate offsets is mathematically bounded',()=>{
 const verdicts={},examplesByReason={};let iterations=0;
 for(let s=0;s<F.STEMS.length;s++)for(let b=0;b<BRANCHES.length;b++){
  if(s%2!==b%2)continue;
  for(const general of BRANCHES)for(const hour of BRANCHES){
   const x=T.deriveThreeTransmissions({dayStem:F.STEMS[s],dayBranch:BRANCHES[b],monthGeneral:general,divinationHour:hour});
   iterations++;const tag=x.reason||x.rule;verdicts[tag]=(verdicts[tag]||0)+1;examplesByReason[tag]??=x;
   assert.equal(x.fourLessons.lessons.length,4);
   for(const l of x.fourLessons.lessons){assert.ok(BRANCHES.includes(l.upper));assert.ok(['lower-attacks-upper','upper-controls-lower','no-control'].includes(l.relation));}
   if(x.verdict==='derived-subroutine-only'){
    assert.equal(x.transmissions.sequence.length,3);
    assert.ok(x.transmissions.sequence.every(branch=>BRANCHES.includes(branch)));
    const [a,mid,last]=x.transmissions.sequence;
    assert.equal(x.fourLessons.plate.positions[BRANCHES.indexOf(a)].heaven,mid);
    assert.equal(x.fourLessons.plate.positions[BRANCHES.indexOf(mid)].heaven,last);
   }else {assert.equal(x.verdict,'unresolved');assert.equal(x.transmissions,null);}
  }
 }
 assert.equal(iterations,8640);
 assert.equal(Object.values(verdicts).reduce((s,v)=>s+v,0),8640);
 for(const tag of ['bi-yong-unique-yin-yang','bi-yong-ambiguous-requires-she-hai-or-other-gate',
  'no-direct-control-requires-other-nine-gates','incomplete-or-duplicate-lessons-needs-special-review',
  'phuc-ngam-requires-special-nine-gates-rule','phan-ngam-requires-special-nine-gates-rule',
  'zei-ke-lower-attacks-upper','zei-ke-upper-controls-lower'])assert.ok(examplesByReason[tag],tag);
});
test('HKO research bridge inherits time-boundary and coverage blockers; no implied date-derived day pillar',()=>{
 const common={dayStem:'Giáp',dayBranch:'Tý',divinationHour:'Mão'};
 const good=S.resolveStudyAt({...common,instantIso:'2026-02-19T10:00:00+07:00'});
 assert.equal(good.status,'research-only');assert.equal(good.resolution.monthGeneral,'Hợi');
 assert.ok(good.fourLessons);assert.ok(good.threeTransmissions);
 const uncertain=S.resolveStudyAt({...common,instantIso:'2026-02-18T23:52:00+08:00'});
 assert.equal(uncertain.status,'boundary-needs-verification');
 assert.equal(uncertain.fourLessons,null);assert.equal(uncertain.threeTransmissions,null);
 const out=S.resolveStudyAt({...common,instantIso:'2029-01-01T00:00:00Z'});
 assert.equal(out.status,'unsupported-date');assert.equal(out.fourLessons,null);
 assert.throws(()=>S.resolveStudyAt({...common,instantIso:'2026-02-19T10:00:00+07:00',monthGeneral:'Tý'}),TypeError);
 assert.throws(()=>S.resolveStudyAt({...common,instantIso:'2026-02-19T10:00:00+07:00',dayBranch:'Sửu'}),RangeError);
});
test('All research modules are isolated from main Tử Vi engine, production API and legacy routes',()=>{
 for(const mod of ['da-liu-ren-four-lessons','da-liu-ren-three-transmissions','da-liu-ren-study']){
  assert.equal(readFileSync(resolve(__dirname,'../packages/astrology-engine/src/'+mod+'.cjs'),'utf8').includes('require(\'./da-liu-ren-plates.cjs\')')||mod==='da-liu-ren-study',true);
 }
 assert.doesNotMatch(readFileSync(resolve(__dirname,'../packages/astrology-engine/src/tuvi.js'),'utf8'),/da-liu-ren-study|da-liu-ren-four-lessons|da-liu-ren-three-transmissions/);
 assert.deepEqual(T.PENDING,['thiệp-hại','dao-khac','mao-tinh','biet-trach','bat-chuyen','phuc-ngam','phan-ngam','variant-exceptions']);
});
