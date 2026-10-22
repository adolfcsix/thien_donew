'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {readFileSync}=require('node:fs');
const root=resolve(__dirname,'..');
const E=require('../packages/astrology-engine/src/method-evidence-v11152.cjs');
const chart=require('../packages/astrology-engine/src/tuvi.js');
const bazi=require('../packages/astrology-engine/src/bazi.js');
const lunar=require('../packages/astrology-engine/src/lunar.js');
const coverage=require('../packages/knowledge/src/method-coverage.json');
const tuvi=()=>chart.calculate({date:'2004-07-12',hour:10,minute:30,gender:'Nam',calendar:'solar',leap:false});
const meta=methodId=>({repositoryRoot:root,methodId,school:E.methodFor(methodId).methodScope});
test('phase-3 method inventory tracks 21 separate disciplines without false acceptance',()=>{
 assert.equal(coverage.disciplines.length,21);
 assert.deepEqual(Object.fromEntries(['V11.152','V11.153','V11.154'].map(p=>[p,coverage.disciplines.filter(x=>x.phase===p).length])),{'V11.152':3,'V11.153':3,'V11.154':15});
 for(const m of coverage.disciplines){assert.equal(m.verifiedByIndependentWitness,false);assert.equal(m.acceptance,'NOT_ACCEPTED');for(const ok of Object.values(m.pathsPresent))assert.equal(ok,true);}
});
test('deterministic canonical JSON digest does not depend on key order',()=>{
 assert.equal(E.digestOf({a:1,b:{x:3,y:[true,null]}}),E.digestOf({b:{y:[true,null],x:3},a:1}));
 assert.notEqual(E.digestOf({a:1}),E.digestOf({a:2}));
});
test('canonicalization rejects unstable/dangerous objects',()=>{
 for(const x of [NaN,Infinity,undefined,()=>1,BigInt(9),new Date(),[,2],JSON.parse('{"__proto__": 7}')])assert.throws(()=>E.strictStringify(x));
 const shared={a:1},tree={a:shared,b:shared};assert.equal(E.strictStringify(tree),JSON.stringify({a:{a:1},b:{a:1}}))
 const obj={};obj.self=obj;assert.throws(()=>E.strictStringify(obj));
});
test('Tử Vi witness structural invariants: 12 palaces, 14 unique principal stars, 4 Tứ Hóa',()=>{
 for(const birth of [{date:'2004-07-12',hour:10,minute:30,gender:'Nam'},{date:'1996-02-19',hour:23,minute:0,gender:'Nữ'},{date:'2026-02-18',hour:1,minute:0,gender:'Nam'}]){
  const r=chart.calculate(birth),p=r.houses.flatMap(h=>h.stars);
  assert.equal(r.houses.length,12);assert.equal(new Set(r.houses.map(h=>h.branchIndex)).size,12);
  assert.equal(p.length,14);assert.equal(new Set(p).size,14);
  assert.deepEqual(r.transformations.map(x=>x.name).sort(),['Hóa Khoa','Hóa Kỵ','Hóa Lộc','Hóa Quyền'].sort());
  assert.ok(r.ruleSet&&r.tuHoaRuleSet);assert.equal(r.houses.filter(x=>x.isThan).length,1);
 }
});
test('Bát Tự snapshot is independent of Tử Vi inputs; day pillars advance cyclically',()=>{
 const a=bazi.calculate({date:'2026-06-01',hour:9}),b=bazi.calculate({date:'2026-06-02',hour:9});
 assert.equal(b.pillars.day.stemIndex,(a.pillars.day.stemIndex+1)%10);
 assert.equal(b.pillars.day.branchIndex,(a.pillars.day.branchIndex+1)%12);
 const s=require('../packages/astrology-engine/src/bazi-study-snapshot.cjs');
 const record=s.createBaziSnapshot({date:'2026-06-01',hour:9,minute:0,sex:'female',dayBoundary:'midnight'});
 assert.equal(record.methodId,s.METHOD_ID);assert.ok(!('tuvi' in record));
});
test('lunar-solar direct roundtrip and leap-day invalid input guard',()=>{
 for(const x of [{year:2000,month:2,day:29},{year:2024,month:2,day:29},{year:2026,month:10,day:15}]){
  const l=lunar.solarToLunar(x.year,x.month,x.day);
  assert.deepEqual(lunar.lunarToSolar(l.year,l.month,l.day,l.leap),x);
 }
 assert.throws(()=>lunar.solarToLunar(2100,2,29),RangeError);
});
test('internal evidence envelope detects stale algorithm sources, inputs and outputs without mutating saved data',()=>{
 const result=tuvi(),input={date:'2004-07-12',hour:10,gender:'Nam'};
 const e=E.createEvidence({...meta('tam-hop-core-v6.0'),input,calculated:result,referenceRecordId:'school-tam-hop-internal'});
 const original=JSON.stringify(e);
 assert.equal(E.verifyEvidence(e,{repositoryRoot:root,input,calculated:result}).status,'MATCHES_FROZEN_METHOD');
 assert.deepEqual(E.verifyEvidence(e,{repositoryRoot:root,input:{...input,hour:11}}),{status:'REVIEW_REQUIRED',reason:'INPUT_CHANGED'});
 assert.deepEqual(E.verifyEvidence(e,{repositoryRoot:root,calculated:{...result,yearCanChi:'TEST'}}),{status:'REVIEW_REQUIRED',reason:'RESULT_CHANGED'});
 assert.throws(()=>E.verifyEvidence({...e,sourceSha256:'0'.repeat(64)},{repositoryRoot:root}),/EVIDENCE_TAMPERED/);
 assert.ok(!JSON.stringify(e).includes('2004-07-12'));
 assert.equal(JSON.stringify(e),original);
});
test('never auto-accept unregistered methods or falsified school',()=>{
 assert.throws(()=>E.createEvidence({...meta('tam-hop-core-v6.0'),methodId:'unknown',input:{},calculated:{}}),/Unknown/);
 assert.throws(()=>E.createEvidence({...meta('tam-hop-core-v6.0'),school:'another school',input:{},calculated:{}}),/School/);
});
test('reference sources are tracked as explicit file+lockfile SHA, not AI-written truth',()=>{
 const e=E.createEvidence({...meta('bazi-civil-time-utc7-v11.142'),input:{one:1},calculated:{two:2}});
 assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.match(e.lockfileSha256,/^[a-f0-9]{64}$/);
 assert.equal(e.independentlyVerified,false);assert.equal(e.precisionGate,'astronomical-ingress-witness-required');
});

test('all 21 method envelopes pin first-party dependency closure instead of only a headline file',()=>{
 for(const m of coverage.disciplines){
  assert.equal(Object.isFrozen(E.methodFor(m.methodId)),true);
  const envelope=E.createEvidence({...meta(m.methodId),input:{symbol:'demo'},calculated:{result:'internal witness only'}});
  assert.equal(envelope.discipline,m.id);assert.ok(envelope.sourceClosureCount>=1);
  assert.equal(E.verifyEvidence(envelope,{repositoryRoot:root}).status,'MATCHES_FROZEN_METHOD');
 }
 const x=E.createEvidence({...meta('tam-hop-core-v6.0'),input:{a:1},calculated:{b:2}});
 assert.ok(x.sourceClosureCount>20, 'Tử Vi must hash dependencies, not just tuvi.js');
 const drift={...x,sourceSha256:'0'.repeat(64)};
 delete drift.evidenceSha256;drift.evidenceSha256=E.digestOf(drift);
 assert.deepEqual(E.verifyEvidence(drift,{repositoryRoot:root}),{status:'REVIEW_REQUIRED',reason:'METHOD_SOURCE_CHANGED'});
});
