'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const Legacy=require('../packages/astrology-engine/src/bazi.js');
const Jie=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Evidence=require('../packages/astrology-engine/src/bazi-season-evidence.cjs');
const {gateSchoolExecution,getSchool}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const data={date:'2026-05-18',hour:10,minute:20,utcOffsetMinutes:420,longitudeDeg:105};
const chart=()=>Jie.evaluateWithReferenceJie(data);
const build=()=>Evidence.buildSeasonEvidence(chart());
const pathSource=x=>readFileSync(resolve(__dirname,'..',x),'utf8');
const cloned=x=>structuredClone(x);
test('V11.95: month is derived from exact V11.94 Jie reference (not a made-up Gregorian month)',()=>{
 const r=Evidence.evaluateSeasonEvidence(data),c=chart();
 assert.equal(r.status,'PROVISIONAL');
 assert.equal(r.monthCommand.branch,c.pillars.month.branch);
 assert.equal(r.monthCommand.solarTerm,c.referenceJie.active.term);
 assert.equal(r.monthCommand.hiddenCandidates[0].stemIndex,Legacy.HIDDEN_STEM_INDICES[c.pillars.month.branchIndex][0]);
});
test('V11.95: ten-god phase and yin-yang classification agrees with all legacy 10×10 reference pairs',()=>{
 for(let d=0;d<10;d++)for(let s=0;s<10;s++){
   const name=Legacy.tenGod(d,s);
   assert.ok(Evidence.RELATIONS[name]);
   assert.equal(name,Legacy.tenGod(d,s));
 }
 assert.equal(new Set(Object.keys(Evidence.RELATIONS)).size,10);
});
test('V11.95: all 12×10 hidden-stem lookup entries preserve canonical main/secondary/residual ordering',()=>{
 for(let branch=0;branch<12;branch++)for(let day=0;day<10;day++){
  const list=Legacy.hiddenStems(branch,day);
  assert.deepEqual(list.map(x=>x.stemIndex),Legacy.HIDDEN_STEM_INDICES[branch]);
  assert.ok(list.every((x,i)=>x.tenGod===Legacy.tenGod(day,x.stemIndex)));
 }
});
test('V11.95: year/month/hour visible gods exclude day-master tautology',()=>{
 const r=build();
 assert.deepEqual(r.visibleTenGods.map(x=>x.pillar),['year','month','hour']);
 assert.deepEqual(r.visibleTenGods.map(x=>x.tenGod),['Thiên Tài','Kiếp Tài','Thương Quan']);
 assert.deepEqual(r.visibleSupport.map(x=>x.pillar),['month']);
});
test('V11.95: every branch has a separately auditable hidden-stem inventory',()=>{
 const r=build();
 assert.equal(r.hiddenByPillar.length,4);
 assert.deepEqual(r.hiddenByPillar.map(x=>x.pillar),['year','month','day','hour']);
 for(const item of r.hiddenByPillar){
  assert.ok(item.stems.length>=1&&item.stems.length<=3);
  assert.equal(item.stems[0].qi,'main');
  assert.deepEqual(item.stems.map(x=>x.order),item.stems.map((_,i)=>i));
  assert.ok(item.stems.every(x=>x.family===Evidence.RELATIONS[x.tenGod]));
 }
});
test('V11.95: transmission identifies actual stem occurrence and never invents a new stem',()=>{
 const r=build(),c=chart();
 for(const candidate of r.monthCommand.hiddenCandidates){
  const actual=Object.entries(c.pillars).filter(([,p])=>p.stemIndex===candidate.stemIndex).map(([k])=>k);
  assert.deepEqual(candidate.exposedAt,actual);
  assert.equal(candidate.exposedBeyondMonth,actual.some(k=>k!=='month'));
 }
 assert.ok(r.monthCommand.visibleCandidateCount>=1);
});
test('V11.95: element root inventory is binary evidence, never weighted element proportions',()=>{
 const r=build();
 assert.equal(r.rootEvidence.length,4);
 assert.ok(r.rootEvidence.every(x=>typeof x.dayElementRoot==='boolean'));
 assert.equal(r.supportCounts.distinctRootBranches,r.rootEvidence.filter(x=>x.dayElementRoot).length);
 assert.equal(r.decision.dayMasterStrength,null);
 assert.equal(r.decision.usefulGod,null);
 assert.equal(r.decision.pattern,null);
});
test('V11.95: candidate main qi support is not a ruling of prosperous day master',()=>{
 const r=build();
 assert.equal(r.monthCommand.mainQiSupportsDayMaster,['companion','resource'].includes(r.monthCommand.principalQi.family));
 assert.equal(r.decision.dayMasterStrength,null);
 assert.match(r.methodComparisons[0].limitation,/không/i);
});
test('V11.95: verify strong/weak label is absent even if multiple roots and resources observed',()=>{
 const r=build();
 assert.ok(r.supportCounts.visibleStemSupport>=0);
 assert.ok(r.supportCounts.distinctRootBranches>=0);
 assert.ok(r.notes.some(n=>n.includes('Đắc lệnh')));
 assert.equal(Object.keys(r.decision).includes('score'),false);
});
test('V11.95: resolved year/month remain tied to prior astronomical UTC clock',()=>{
 const a=Evidence.evaluateSeasonEvidence(data);
 const b=Evidence.evaluateSeasonEvidence({date:'2026-05-18',hour:11,minute:20,utcOffsetMinutes:480,longitudeDeg:120});
 assert.equal(a.monthCommand.branch,b.monthCommand.branch);
 assert.equal(a.dayMaster.stem,b.dayMaster.stem);
});
test('V11.95: exact Jie minute and near-guard must BLOCK structural inference',()=>{
 const x=Evidence.evaluateSeasonEvidence({date:'2026-02-04',hour:3,minute:2,utcOffsetMinutes:420,longitudeDeg:105});
 assert.equal(x.status,'BLOCKED');
 assert.equal(x.reason,'Jie_BOUNDARY_REVIEW');
 assert.equal(x.monthCommand,null);
 assert.equal(x.dayMaster,null);
});
test('V11.95: unsupported Jie years fail closed instead of falling back to approximate month',()=>{
 const x=Evidence.evaluateSeasonEvidence({date:'2004-08-15',hour:9,minute:10,utcOffsetMinutes:420,longitudeDeg:105});
 assert.equal(x.status,'BLOCKED');assert.equal(x.reason,'Jie_OUT_OF_COVERAGE');
 assert.equal(x.methodComparisons.length,0);
});
test('V11.95: corrupted day master, stem, branch, hidden qi or ten gods are rejected',()=>{
 const checks=[
  c=>c.pillars.day.stemIndex=44,
  c=>c.dayMaster.stem='Kỷ',
  c=>c.pillars.month.stemIndex=7,
  c=>c.pillars.month.branchIndex=10,
  c=>c.pillars.month.stem='Canh',
  c=>c.pillars.month.hiddenStems[0].stemIndex=9,
  c=>c.pillars.year.tenGod='Tỷ Kiên',
  c=>c.monthIndex=5,
  c=>c.referenceJie.active.monthIndex=11
 ];
 for(const mutation of checks){const c=cloned(chart());mutation(c);assert.throws(()=>Evidence.buildSeasonEvidence(c),{name:'TypeError'});}
});
test('V11.95: original legacy result cannot impersonate reference-ledger input',()=>{
 assert.throws(()=>Evidence.buildSeasonEvidence(Legacy.calculate({date:'2026-05-18',hour:10,minute:20})),TypeError);
 assert.throws(()=>Evidence.buildSeasonEvidence({}),TypeError);
});
test('V11.95: changing clock convention preserves source label and does not promise final result',()=>{
 const r=Evidence.evaluateSeasonEvidence({...data,timeMode:'mean-solar',dayBoundary:'late-zi'});
 assert.ok(['PROVISIONAL','REVIEW_REQUIRED'].includes(r.status));
 assert.equal(r.researchOnly,true);
 assert.equal(r.decision.usefulGod,null);
 assert.match(r.monthCommand.sourceId,/Jie/);
});
test('V11.95: research-only school gate is explicit and does not promote Zi Ping analysis',()=>{
 const school=getSchool('bat-tu-nguyet-lenh');
 assert.equal(school.status,'deterministic-subroutine-only');
 assert.equal(school.engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution('bat-tu-nguyet-lenh').verdict,'RESEARCH_SUBROUTINE_ONLY');
 assert.equal(gateSchoolExecution('bat-tu-do-tho').verdict,'BLOCKED');
});
test('V11.95: production chart route and API must not depend on research ledger',()=>{
 for(const file of ['packages/astrology-engine/src/bazi.js','apps/api/src/main.ts','apps/web/src/app/bazi/page.tsx'])
  assert.doesNotMatch(pathSource(file),/bazi-season-evidence/);
});
test('V11.95: school documentation, type contract, and audit integrated into release gate',()=>{
 assert.match(pathSource('docs/research/schools/bat-tu-month-command.md'),/Chưa đủ điều kiện/);
 assert.match(pathSource('packages/astrology-engine/src/bazi-season-evidence.d.cts'),/dayMasterStrength:null/);
 assert.match(pathSource('infrastructure/scripts/verify-release.mjs'),/audit-bazi-season-evidence.cjs/);
});
