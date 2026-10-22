'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{resolve}=require('node:path');
const {hexagramFromBits}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const {manualContext,BRANCHES}=require('../apps/web/src/features/luc-hao/temporal.cjs');
const {getSchool,gateSchoolExecution}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const {EVENTS}=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const {QUESTION_GUIDES}=require('../apps/web/src/features/luc-hao/question-evidence.cjs');
const R=require('../apps/web/src/features/luc-hao/multiple-useful-god-research.cjs');
const chart=bits=>makeNaJiaChart(hexagramFromBits(bits));
const tru=()=>chart('100010');
const opts=(id='office-position')=>({questionId:id,confirmedFamily:QUESTION_GUIDES[id].family});
const iso=t=>new Date(t).toISOString();
test('V11.99: manual multiple visible candidates preserve both without selecting a Dụng Thần',()=>{
 const e=R.analyzeMultiple(tru(),{...opts(),context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),movingPositions:[5]});
 assert.equal(e.status,'EVIDENCE_ONLY');assert.equal(e.candidateCount,2);assert.deepEqual(e.candidates.map(x=>x.position),[3,5]);
 assert.equal(e.multiple,true);assert.equal(e.candidates[0].moving,'ABSENT');assert.equal(e.candidates[1].moving,'PRESENT');
 assert.equal(e.conflicts.length,1);assert.ok(e.conflicts[0].differingSignals.includes('moving'));
 assert.equal(e.decision.usefulGod,null);assert.equal(e.chosenUsefulGodLine,null);assert.equal(e.candidates[1].chosen,null);
});
test('V11.99: mixed Tuần Không and Nguyệt Phá become independent conflicting signals, not rankings',()=>{
 const e=R.analyzeMultiple(tru(),{...opts(),context:manualContext({dayStem:'Giáp',dayBranch:'Ngọ',monthBranch:'Tý'})});
 assert.equal(e.candidates.length,2);assert.equal(e.conflicts[0].selected,null);
 assert.deepEqual(e.candidates.map(x=>x.priority),[null,null]);
 assert.ok(e.candidates.every(x=>x.emergence===null&&x.prosperity===null));
});
test('V11.99: hidden candidate preserves flying movement and signals without calling hidden line moving',()=>{
 const e=R.analyzeMultiple(tru(),{...opts('money-owned-assets'),context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Tý'}),movingPositions:[3]});
 assert.equal(e.candidates.length,1);const x=e.candidates[0];
 assert.equal(x.candidateKind,'HIDDEN');assert.equal(x.moving,'NOT_APPLICABLE');assert.equal(x.flying.flyingMoving,'PRESENT');
 assert.equal(x.stemBranch,'MậuNgọ');assert.equal(x.flying.stemBranch,'CanhThìn');assert.equal(x.monthBreak,'PRESENT');
 assert.equal(x.emergence,null);assert.equal(x.flying.flyingMonthBreak,'ABSENT');assert.equal(e.decision.emergence,null);
});
test('V11.99: no date/month does not manufacture false flags',()=>{
 const e=R.analyzeMultiple(tru(),opts('money-owned-assets'));
 assert.equal(e.calendar,null);assert.equal(e.calendarQuality,'NOT_SUPPLIED');assert.equal(e.candidates[0].xunVoid,'UNKNOWN');
 assert.equal(e.candidates[0].monthBreak,'UNKNOWN');assert.equal(e.candidates[0].flying.flyingMonthBreak,'UNKNOWN');
});
test('V11.99: Jie resolves a month branch from 2026 Lập Xuân only outside uncertainty',()=>{
 const ev=EVENTS.find(x=>x.year===2026&&x.term==='Lập Xuân');assert.ok(ev);
 const before=R.monthFromJie({instantIso:iso(ev.epochMs-120_000)});
 const after=R.monthFromJie({instantIso:iso(ev.epochMs+120_000)});
 assert.equal(before.monthBranch,'Sửu');assert.equal(after.monthBranch,'Dần');
 assert.equal(after.activeTerm,'Lập Xuân');assert.equal(before.verified,false);assert.equal(after.verified,false);
 assert.match(after.quality,/SECONDARY/);
});
test('V11.99: all 36 Jie boundaries stay undefined for -60/+60 seconds',()=>{
 for(const event of EVENTS){for(const d of [-60_000,-30_000,0,30_000,60_000]){
  const x=R.monthFromJie({instantIso:iso(event.epochMs+d)});
  assert.equal(x.status,'BOUNDARY_REVIEW');assert.equal(x.monthBranch,null);assert.equal(x.verified,false);
 }}
});
test('V11.99: same UTC instant in VN/HKT must return identical month reference',()=>{
 for(const ev of EVENTS){const ms=ev.epochMs+4*60000;
  const u=R.monthFromJie({instantIso:iso(ms)});
  const h=new Date(ms+8*3600_000),v=new Date(ms+7*3600_000);
  const withOffset=(d,offset)=>`${d.toISOString().slice(0,19)}${offset}`;
  const hko=R.monthFromJie({instantIso:withOffset(h,'+08:00')});
  const vn=R.monthFromJie({instantIso:withOffset(v,'+07:00')});
  assert.deepEqual([u.monthBranch,u.activeTerm],[hko.monthBranch,hko.activeTerm]);
  assert.deepEqual([u.monthBranch,u.activeTerm],[vn.monthBranch,vn.activeTerm]);
 }
});
test('V11.99: exact UTC boundary suppresses entire reading rather than inferring a month',()=>{
 const t=EVENTS.find(x=>x.year===2026&&x.term==='Lập Xuân');
 const a=R.analyzeMultiple(tru(),{...opts(),instantIso:iso(t.epochMs),context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'})});
 assert.equal(a.status,'CALENDAR_REVIEW');assert.equal(a.reading,null);assert.equal(a.candidates.length,0);assert.equal(a.decision.usefulGod,null);
});
test('V11.99: out-of-coverage instant produces no month or reading',()=>{
 for(const instantIso of ['2024-07-20T00:00:00Z','2028-08-20T00:00:00Z']){
  const a=R.analyzeMultiple(tru(),{...opts(),instantIso});assert.equal(a.status,'CALENDAR_REVIEW');
  assert.equal(a.calendar.status,'OUT_OF_COVERAGE');assert.equal(a.calendar.monthBranch,null);
 }
});
test('V11.99: matching manual calendar and minute-resolution reference results in CONSISTENCY, not verified status',()=>{
 const t=EVENTS.find(x=>x.year===2026&&x.term==='Lập Xuân');
 const x=R.analyzeMultiple(tru(),{...opts(),instantIso:iso(t.epochMs+3e5),
  context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'})});
 assert.equal(x.status,'EVIDENCE_ONLY');assert.equal(x.calendar.monthBranch,'Dần');
 assert.equal(x.calendarQuality,'REFERENCE_CONSISTENT_NOT_CERTIFIED');assert.equal(x.calendar.verified,false);
 assert.equal(x.chosenUsefulGodLine,null);
});
test('V11.99: mismatch between manual Month Jian and Jie REJECTS rather than silently correcting',()=>{
 const t=EVENTS.find(x=>x.year===2026&&x.term==='Lập Xuân');
 assert.throws(()=>R.analyzeMultiple(tru(),{...opts(),instantIso:iso(t.epochMs+3e5),
  context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Sửu'})}),RangeError);
});
test('V11.99: month JIE cannot invent Can Chi day or accept coarse calendar approximation',()=>{
 const t=EVENTS.find(x=>x.year===2026&&x.term==='Lập Xuân');
 assert.throws(()=>R.analyzeMultiple(tru(),{...opts(),instantIso:iso(t.epochMs+3e5)}),TypeError);
 const ctx={...manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'}),source:'calendar-utc7-noon-approx',date:'2026-02-04'};
 assert.throws(()=>R.analyzeMultiple(tru(),{...opts(),instantIso:iso(t.epochMs+3e5),context:ctx}),TypeError);
});
test('V11.99: invalid instants fail closed; RFC3339 timezone mandatory',()=>{
 for(const instantIso of ['2026-02-04T12:00:00','2026-02-30T12:00:00Z','invalid','',null]){
  if(instantIso===null)continue;
  assert.throws(()=>R.monthFromJie({instantIso}));
 }
});
test('V11.99: all 64 quẻ and five family types retain exactly existing 320 visible/hidden split',()=>{
 let v=0,h=0,multi=0;
 for(let i=0;i<64;i++){const c=chart(i.toString(2).padStart(6,'0'));
  for(const [questionId,g] of Object.entries(QUESTION_GUIDES)){
   const x=R.analyzeMultiple(c,{questionId,confirmedFamily:g.family});
   assert.ok(x.candidates.length>0);assert.equal(x.multiple,x.candidates.length>1);
   assert.equal(x.conflicts.length,x.candidates.length*(x.candidates.length-1)/2);
   assert.equal(x.decision.usefulGod,null);assert.ok(Object.isFrozen(x.candidates));
   if(x.candidates[0].candidateKind==='VISIBLE')v++;else h++;
   if(x.multiple)multi++;
  }
 }
 assert.equal(v,264);assert.equal(h,56);assert.ok(multi>0);
});
test('V11.99: cannot forge chart, category, movement list or contradictory void data',()=>{
 const c=structuredClone(tru());c.lines[0].stemBranch='Fake';
 assert.throws(()=>R.analyzeMultiple(c,opts()),TypeError);
 assert.throws(()=>R.analyzeMultiple(tru(),{questionId:'marriage',confirmedFamily:'Thê Tài'}),RangeError);
 assert.throws(()=>R.analyzeMultiple(tru(),{...opts(),movingPositions:[3,3]}),RangeError);
 assert.throws(()=>R.analyzeMultiple(tru(),{...opts(),context:{...manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),voidBranches:['Dần','Mão']}}),TypeError);
});
test('V11.99: production engine and earlier modules do not import research code',()=>{
 for(const path of ['apps/web/src/app/luc-hao/page.tsx','apps/web/src/features/luc-hao/na-jia.cjs','apps/web/src/features/luc-hao/question-evidence.cjs','apps/api/src/main.ts'])
  assert.doesNotMatch(readFileSync(resolve(__dirname,'..',path),'utf8'),/multiple-useful-god-research/);
 assert.equal(getSchool(R.SCHOOL).status,'deterministic-subroutine-only');
 assert.equal(gateSchoolExecution(R.SCHOOL).verdict,'RESEARCH_SUBROUTINE_ONLY');
});
test('V11.99: no unsupported predictive field or conflicting school autoselection',()=>{
 assert.ok(R.SOURCES.multi.startsWith('https://'));
 const a=R.analyzeMultiple(tru(),opts());assert.equal(a.decision.timing,null);
 assert.equal(a.decision.auspiciousness,null);assert.ok(a.conflicts.every(c=>c.selected===null));
 assert.ok(a.notes.some(s=>s.includes('không tự')));
});
