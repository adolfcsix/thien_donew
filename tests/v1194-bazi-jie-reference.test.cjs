'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const J=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Base=require('../packages/astrology-engine/src/bazi-time-research.cjs');
const Legacy=require('../packages/astrology-engine/src/bazi.js');
const School=require('../packages/knowledge/src/phase2-school-methods.cjs');
const raw=require('../packages/astrology-engine/src/reference/hko-jie-2025-2027.json');
const fixed={date:'2026-05-18',hour:10,minute:20,utcOffsetMinutes:420,longitudeDeg:105};
const byTerm=(year,term)=>J.EVENTS.find(e=>e.year===year&&e.term===term);
const nearest=(event,seconds)=>new Date(event.epochMs+seconds*1000).toISOString();
test('12 Jie names and corresponding longitudes are unique and cyclic',()=>{
 assert.equal(J.JIE_TERMS.length,12);
 assert.equal(new Set(J.JIE_TERMS).size,12);
 assert.deepEqual(J.EVENTS.slice(0,12).map(x=>x.solarLongitudeDegrees),[285,315,345,15,45,75,105,135,165,195,225,255]);
});
test('HKT source minutes have 36 ordered records, 2025-2027 inclusive',()=>{
 assert.equal(J.EVENTS.length,36);
 assert.deepEqual(J.EVENTS.filter(x=>x.term==='Lập Xuân').map(x=>x.year),[2025,2026,2027]);
 assert.ok(J.EVENTS.every(x=>x.localHkt.endsWith('+08:00')&&x.instantUtc.endsWith('Z')));
 assert.ok(J.EVENTS.every((x,i)=>i===0||x.epochMs>J.EVENTS[i-1].epochMs));
});
test('Source transparency requires secondary provenance and precision labels',()=>{
 assert.match(raw.sourceKind,/secondary/i);
 assert.equal(raw.boundaryGuardSeconds,60);
 assert.equal(raw.sources.length,3);
 assert.ok(raw.limits.some(x=>/Secondary/.test(x)));
 assert.match(J.COVERAGE.provenance,/pending/);
});
test('2025 Li Chun HKT 22:10 is 14:10 UTC',()=>assert.equal(byTerm(2025,'Lập Xuân').instantUtc,'2025-02-03T14:10:00.000Z'));
test('2026 Li Chun HKT 04:02 is previous UTC day 20:02',()=>assert.equal(byTerm(2026,'Lập Xuân').instantUtc,'2026-02-03T20:02:00.000Z'));
test('2027 Li Chun HKT 09:46 is 01:46 UTC',()=>assert.equal(byTerm(2027,'Lập Xuân').instantUtc,'2027-02-04T01:46:00.000Z'));
test('Published-minute ±60-second guard returns no active month for every Jie',()=>{
 for(const ev of J.EVENTS)for(const offset of [-60,-31,0,31,60]){
   const r=J.resolveJieAt({instantIso:nearest(ev,offset)});
   assert.equal(r.status,'BOUNDARY_REVIEW',ev.term+' '+offset);
   assert.equal(r.active,null);
   assert.equal(r.boundary.term,ev.term);
 }
});
test('At 61 seconds either side of every Jie resolves distinct adjacent months',()=>{
 for(let i=1;i<J.EVENTS.length;i++){
  const prev=J.resolveJieAt({instantIso:nearest(J.EVENTS[i],-61)});
  const post=J.resolveJieAt({instantIso:nearest(J.EVENTS[i],61)});
  assert.equal(prev.status,'RESOLVED');assert.equal(post.status,'RESOLVED');
  assert.equal(prev.active.term,J.EVENTS[i-1].term);
  assert.equal(post.active.term,J.EVENTS[i].term);
  assert.notEqual(prev.active.monthIndex,post.active.monthIndex);
 }
});
test('Exact rollover changes the BaZi solar year at Li Chun, not Gregorian Jan 1',()=>{
 const prior=J.evaluateWithReferenceJie({date:'2026-02-04',hour:3,minute:59,utcOffsetMinutes:480,longitudeDeg:120});
 const after=J.evaluateWithReferenceJie({date:'2026-02-04',hour:4,minute:5,utcOffsetMinutes:480,longitudeDeg:120});
 assert.equal(prior.pillars.year.name,'Ất Tỵ');
 assert.equal(prior.pillars.month.name,'Kỷ Sửu');
 assert.equal(after.pillars.year.name,'Bính Ngọ');
 assert.equal(after.pillars.month.name,'Canh Dần');
 assert.equal(prior.monthIndex,11);assert.equal(after.monthIndex,0);
});
test('At exactly Li Chun the year and month must NOT be guessed',()=>{
 const r=J.evaluateWithReferenceJie({date:'2026-02-04',hour:4,minute:2,utcOffsetMinutes:480,longitudeDeg:120});
 assert.equal(r.status,'BOUNDARY_REVIEW');assert.equal(r.pillars.year,null);assert.equal(r.pillars.month,null);
 assert.equal(r.relations,null);assert.equal(r.comparisonWithLegacy,null);
 assert.ok(r.pillars.day.name&&r.pillars.hour.name);
});
test('Year/month do not fall back to approximate legacy outside reference',()=>{
 const r=J.evaluateWithReferenceJie({date:'2004-08-15',hour:10,minute:30,utcOffsetMinutes:420,longitudeDeg:105});
 assert.equal(r.status,'OUT_OF_COVERAGE');assert.equal(r.pillars.year,null);assert.equal(r.pillars.month,null);
 assert.equal(r.relations,null);
});
test('No reference before first January Jie or after 2027 ends',()=>{
 assert.equal(J.resolveJieAt({instantIso:'2025-01-01T00:00:00Z'}).status,'OUT_OF_COVERAGE');
 assert.equal(J.resolveJieAt({instantIso:'2028-01-01T00:00:00Z'}).status,'OUT_OF_COVERAGE');
});
test('Same UTC instant 2026 cross the Vietnam / Hong Kong clock matches solar pillars',()=>{
 const hkt=J.evaluateWithReferenceJie({date:'2026-02-04',hour:4,minute:5,utcOffsetMinutes:480,longitudeDeg:120});
 const vn=J.evaluateWithReferenceJie({date:'2026-02-04',hour:3,minute:5,utcOffsetMinutes:420,longitudeDeg:105});
 assert.equal(vn.actualUtc,hkt.actualUtc);
 assert.equal(vn.pillars.year.name,hkt.pillars.year.name);
 assert.equal(vn.pillars.month.name,hkt.pillars.month.name);
});
test('Astronomical UTC month/year do not drift when day/hour clock choice changes',()=>{
 const a=J.evaluateWithReferenceJie(fixed),b=J.evaluateWithReferenceJie({...fixed,timeMode:'apparent-solar',longitudeDeg:110,dayBoundary:'late-zi'});
 assert.equal(a.pillars.year.name,b.pillars.year.name);
 assert.equal(a.pillars.month.name,b.pillars.month.name);
});
test('Day/hour and dayMaster are identical to prior V11.93 clock correction',()=>{
 for(const mode of Base.MODES)for(const boundary of Base.DAY_BOUNDARIES){
  const inp={...fixed,timeMode:mode,dayBoundary:boundary};
  const r=J.evaluateWithReferenceJie(inp),base=Base.evaluate(inp);
  assert.deepEqual(r.pillars.day,base.pillars.day);
  assert.deepEqual(r.pillars.hour,base.pillars.hour);
  assert.deepEqual(r.dayMaster,base.dayMaster);
 }
});
test('Year/month use ten gods tied to V11.93 day master (no stale relations)',()=>{
 const r=J.evaluateWithReferenceJie(fixed),stem=r.pillars.day.stemIndex;
 for(const key of ['year','month']){
   assert.equal(r.pillars[key].tenGod,Legacy.tenGod(stem,r.pillars[key].stemIndex));
   assert.deepEqual(r.pillars[key].hiddenStems,Legacy.hiddenStems(r.pillars[key].branchIndex,stem));
 }
 assert.deepEqual(r.relations,Legacy.detectRelations(r.pillars));
});
test('Strict ISO timestamps require an explicit UTC offset, reject invalid days',()=>{
 for(const ts of ['2026-02-04T04:05:00','2026-02-29T04:00:00+08:00','bad',null]){
   assert.throws(()=>J.resolveJieAt({instantIso:ts}));
 }
});
test('Invalid dates, nonexistent civil days and offsets fail closed',()=>{
 for(const data of [{...fixed,date:'2026-02-29'},{...fixed,utcOffsetMinutes:null},{...fixed,longitudeDeg:NaN}])
   assert.throws(()=>J.evaluateWithReferenceJie(data));
});
test('Existing BaZi remains untouched and research entry stays fenced',()=>{
 assert.equal(School.gateSchoolExecution('bat-tu-tiet-khi').verdict,'RESEARCH_SUBROUTINE_ONLY');
 for(const file of ['packages/astrology-engine/src/bazi.js','apps/api/src/main.ts','apps/web/src/app/bazi/page.tsx']){
  const source=readFileSync(resolve(__dirname,'..',file),'utf8');
  assert.doesNotMatch(source,/bazi-jie-reference/);
 }
});
