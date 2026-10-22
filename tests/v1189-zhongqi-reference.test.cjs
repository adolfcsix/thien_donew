'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const M=require('../packages/astrology-engine/src/da-liu-ren-zhongqi.cjs');
const {monthGeneralAfterZhongQi,BRANCHES}=require('../packages/astrology-engine/src/da-liu-ren-plates.cjs');
const usno=JSON.parse(readFileSync(resolve(__dirname,'fixtures/v1189-usno-seasons-2026.json'),'utf8'));
const at=(instantIso)=>M.resolveMonthGeneralAt({instantIso});
const iso=(t)=>new Date(t).toISOString();
test('Curated three-year dataset is complete, documented and frozen',()=>{
 assert.equal(M.EVENTS.length,36);
 assert.equal(M.EVENTS.filter(e=>e.year===2026).length,12);
 assert.equal(M.EVIDENCE.urls.length,3);
 assert.ok(M.EVIDENCE.urls.every(u=>u.startsWith('https://www.hko.gov.hk/')));
 assert.ok(Object.isFrozen(M.EVENTS)&&Object.isFrozen(M.EVENTS[0]));
 assert.equal(M.COVERAGE.fromInclusive,M.EVENTS[0].instantUtc);
 for(const event of M.EVENTS){assert.equal(event.monthGeneral,monthGeneralAfterZhongQi(event.term));}
});
for(const year of [2025,2026,2027]){
 test(`All 12 official HKO middle terms in ${year} match UTC conversion and prior/next branches`,()=>{
  const terms=M.EVENTS.filter(e=>e.year===year);
  assert.equal(terms.length,12);
  for(const e of terms){
   assert.equal(iso(e.localHkt),e.instantUtc);
   assert.equal(e.instantUtc,iso(e.epochMs));
   assert.equal(new Date(e.localHkt).getTime(),e.epochMs);
   assert.equal(e.solarLongitudeDegrees,(300+30*M.YEAR_TERMS.indexOf(e.term))%360);
   assert.ok(Object.isFrozen(e));
  }
 });
}
test('USNO 2026 independent seasonal checkpoints match official HKO to within one minute',()=>{
 for(const entry of usno.events){
  const e=M.EVENTS.find(x=>x.year===2026&&x.term===entry.term);
  assert.ok(e,entry.term);
  assert.ok(Math.abs(e.epochMs-Date.parse(entry.utc))<=60000,entry.term);
 }
});
test('2026 Rain Water local HKT date and UTC are distinct, Vietnamese +07 also resolves',()=>{
 const hko=M.EVENTS.find(e=>e.year===2026&&e.term==='Vũ Thủy');
 assert.equal(hko.localHkt,'2026-02-18T23:52:00+08:00');
 assert.equal(hko.instantUtc,'2026-02-18T15:52:00.000Z');
 assert.equal(at('2026-02-18T22:00:00+07:00').monthGeneral,'Tý');
 assert.equal(at('2026-02-18T23:10:00+07:00').monthGeneral,'Hợi');
 assert.equal(at('2026-02-18T16:30:00Z').monthGeneral,'Hợi');
});
test('Nearest previous major term applies, not 12 minor solar terms',()=>{
 assert.equal(at('2026-02-05T02:00:00Z').term,'Đại Hàn'); // despite Feb 4 spring commencement
 assert.equal(at('2026-03-05T15:00:00Z').term,'Vũ Thủy'); // despite Mar 5 insect awakening
 assert.equal(at('2026-12-25T12:00:00Z').term,'Đông Chí');
});
for(const name of M.YEAR_TERMS){
 test(`Reference ambiguity is fail-closed within ±60 seconds of ${name} (2026)`,()=>{
  const t=M.EVENTS.find(x=>x.year===2026&&x.term===name);
  for(const dt of [-60000,-30000,0,30000,60000]){
   const r=at(iso(t.epochMs+dt));
   assert.equal(r.status,'boundary-needs-verification');
   assert.equal(r.monthGeneral,null);
   assert.equal(r.nearTerm,name);
  }
  const before=at(iso(t.epochMs-61000)),after=at(iso(t.epochMs+61000));
  assert.equal(before.status,'reference-resolved-only');
  assert.equal(after.status,'reference-resolved-only');
  assert.equal(after.monthGeneral,t.monthGeneral);
  assert.notEqual(before.monthGeneral,after.monthGeneral);
 });
}
test('No extrapolation beyond first HKO term and Dec 31 2027',()=>{
 assert.equal(at('2025-01-15T12:00:00Z').status,'unsupported-date');
 assert.equal(at('2028-01-01T00:00:00Z').status,'unsupported-date');
 assert.equal(at('2030-02-19T00:00:00Z').status,'unsupported-date');
 assert.equal(at('2027-12-31T23:59:59Z').monthGeneral,'Sửu');
});
test('Cross-year from Dec 2025 to Jan 2026 respects latest 中气',()=>{
 assert.equal(at('2025-12-31T12:00:00Z').monthGeneral,'Sửu');
 assert.equal(at('2026-01-10T00:00:00Z').monthGeneral,'Sửu');
 assert.equal(at('2026-01-21T00:00:00Z').monthGeneral,'Tý');
});
test('Explicit time zones are equivalent instant; no process timezone dependency',()=>{
 const a=at('2026-09-23T01:00:00+08:00');
 const b=at('2026-09-22T17:00:00Z');
 const c=at('2026-09-23T00:00:00+07:00');
 assert.equal(a.instantUtc,b.instantUtc);
 assert.equal(c.instantUtc,b.instantUtc);
 assert.equal(a.term,b.term);
});
test('Invalid, vague, rollover and malicious temporal inputs are rejected',()=>{
 for(const input of ['2026-02-18','2026-02-18T16:00:00','2026-02-30T16:00:00Z',
  '2026-13-20T00:00:00Z','2026-02-18T24:00:00Z','2026-02-18T16:60:00Z',
  '2026-02-18T16:00:60Z','2026-02-18T16:00:00+14:30',
  '2026-02-18T16:00:00+15:00','2026-02-18T16:00:00+7:00',
  '2026-02-18T16:00:00Zjunk','__proto__',null,Infinity,{}])
   assert.throws(()=>at(input),input===null?'null':String(input));
 assert.throws(()=>M.resolveMonthGeneralAt({instantIso:'2026-05-21T00:00:00Z',monthGeneral:'Dậu'}));
});
test('Standalone plate wrapper uses checked date and explicit branch, and declines boundaries',()=>{
 const good=M.buildHeavenEarthPlatesAt({instantIso:'2026-02-19T10:00:00+07:00',divinationHour:'Ngọ'});
 assert.equal(good.status,'research-reference-only');
 assert.equal(good.plate.monthGeneral,'Hợi');
 assert.equal(good.plate.positions.find(p=>p.earth==='Ngọ').heaven,'Hợi');
 assert.ok(Object.isFrozen(good));
 const bad=M.buildHeavenEarthPlatesAt({instantIso:'2026-02-18T23:52:00+08:00',divinationHour:'Tý'});
 assert.equal(bad.status,'boundary-needs-verification');assert.equal(bad.plate,null);
 const out=M.buildHeavenEarthPlatesAt({instantIso:'2024-01-01T00:00:00Z',divinationHour:'Tý'});
 assert.equal(out.status,'unsupported-date');assert.equal(out.plate,null);
 for(const hour of [undefined,'Tý ', '子'])assert.throws(()=>M.buildHeavenEarthPlatesAt({instantIso:'2026-02-19T10:00:00Z',divinationHour:hour}));
 assert.throws(()=>M.buildHeavenEarthPlatesAt({instantIso:'2026-02-19T10:00:00Z',divinationHour:'Tý',extra:1}));
});
test('Manual plate engine remains unchanged and requires manual month general',()=>{
 const code=readFileSync(resolve(__dirname,'../packages/astrology-engine/src/da-liu-ren-plates.cjs'),'utf8');
 assert.doesNotMatch(code,/da-liu-ren-zhongqi/);
 assert.equal(BRANCHES.length,12);
});
