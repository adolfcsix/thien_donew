'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const families=require('../packages/knowledge/src/classical-families.json').rules;
const study=require('../packages/knowledge/src/four-court-research.json');
const engine=require('../packages/astrology-engine/src/tuvi.js');
const {inspectFourCourtEvidence,buildFourCourtStudyGuide,buildPalaceReading,describeClassicalCandidateCriteria}=require('../packages/interpretation/src/index.cjs');
const sample=()=>({houses:Array.from({length:12},(_,branchIndex)=>({branchIndex,branch:`Chi ${branchIndex}`,palace:branchIndex===0?'Mệnh':`Cung ${branchIndex}`,stars:[],auxiliaryStars:[],yearStars:[],tuHoa:[],mainStarStrengths:[],obstructionMarkers:[]}))});
const rule={conditions:{requiredStars:['Tử Vi','Thiên Phủ'],supportAny:['Tả Phụ'],reviewAny:['Kình Dương']}};
const select=(chart,ctx={focusIsMenh:true,focusStarPresent:true})=>buildFourCourtStudyGuide('tu-phu-vu-tuong',inspectFourCourtEvidence(chart,0,rule),ctx);
test('V11.41: every family has one distinct editorial profile and three authored case studies',()=>{
 assert.equal(study.families.length,4);
 assert.deepEqual(study.families.map(s=>s.id).sort(),families.map(s=>s.id).sort());
 assert.equal(new Set(study.families.map(s=>s.focus)).size,4);
 for(const f of study.families){
  assert.equal(f.studySteps.length,3);assert.equal(new Set(f.studySteps).size,3);
  assert.deepEqual(Object.keys(f.cases).sort(),['gap','review','support']);
  for(const c of Object.values(f.cases)){ assert.ok(c.title.length>8); for(const field of ['question','action'])assert.ok(c[field].length>35); }
 }
});
test('V11.41: absent required main stars produce only traceable missing-evidence case',()=>{
 const result=select(sample());assert.deepEqual(result.cases.map(x=>x.id),['tu-phu-vu-tuong:gap']);
 assert.equal(result.evidenceSummary.requiredObserved,0);
 assert.deepEqual(result.evidenceSummary.missing,['Tử Vi','Thiên Phủ']);
 assert.equal(result.expertReviewed,false);assert.equal(result.studyOnly,true);
});
test('V11.41: supports are tied to natal location, never to annual overlays',()=>{
 const c=sample();c.houses[8].auxiliaryStars=['Tả Phụ'];c.houses[8].luuStars=['Kình Dương'];
 const result=select(c);assert.deepEqual(result.cases.map(x=>x.id),['tu-phu-vu-tuong:gap','tu-phu-vu-tuong:support']);
 assert.match(result.cases[1].observations[0],/Cung 8/);assert.ok(result.cases.every(x=>x.status==='editorial-question'));
});
test('V11.41: a real natal review star generates a case without fictional predictions',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[4].stars=['Thiên Phủ'];c.houses[6].auxiliaryStars=['Kình Dương'];
 const result=select(c);assert.deepEqual(result.cases.map(x=>x.id),['tu-phu-vu-tuong:review']);
 assert.match(result.cases[0].observations[0],/Kình Dương/);assert.equal(result.studyOnly,true);
});
test('V11.41: invalid Tứ Hóa becomes uncertainty, never accepted Hóa Kỵ',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[0].tuHoa=[{name:'Hóa Kỵ',star:'Không tồn tại'}];
 const result=select(c);assert.equal(result.evidenceSummary.rejectedTransformations,1);
 assert.ok(result.cases.some(x=>x.id.endsWith(':review')));
 assert.ok(result.cases.flatMap(x=>x.observations).some(x=>x.includes('chưa xác minh')));
 assert.ok(result.cases.every(x=>!x.observations.some(y=>y.includes('Hóa Kỵ (Không tồn tại)'))));
});
test('V11.41: no focus main star results in gap even if required stars are otherwise present',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[4].stars=['Thiên Phủ'];
 const result=select(c,{focusIsMenh:true,focusStarPresent:false});
 assert.deepEqual(result.evidenceSummary.missing,[]);assert.ok(result.cases.some(x=>x.id.endsWith(':gap')));
});
test('V11.41: gate respects invalid input and unknown family ID',()=>{
 assert.throws(()=>buildFourCourtStudyGuide('not-a-family',{},{}),RangeError);
 assert.throws(()=>buildFourCourtStudyGuide('tu-phu-vu-tuong',{},{}),TypeError);
 assert.throws(()=>buildFourCourtStudyGuide('tu-phu-vu-tuong',inspectFourCourtEvidence(sample(),0,rule),{focusIsMenh:1,focusStarPresent:true}),TypeError);
});
test('V11.41: real engine cases retain chart immutable and labels never certify formation',()=>{
 const fixtures=require('../packages/star-audit/fixtures/chart-baselines.json');
 assert.equal(fixtures.cases.length,22);
 for(const fixture of fixtures.cases){
  const chart=engine.calculate(fixture.input);const before=JSON.stringify(chart);
  const menh=chart.houses.find(h=>h.palace==='Mệnh');const rows=describeClassicalCandidateCriteria(chart,menh.branchIndex);
  assert.equal(rows.length,4);assert.ok(rows.every(x=>x.studyGuide && x.studyGuide.studyOnly && x.studyGuide.expertReviewed===false));
  assert.ok(rows.every(x=>x.studyGuide.familyId===x.id));assert.equal(JSON.stringify(chart),before);
 }
});
test('V11.41: palace reading exposes editorial guide to deep UI without editing chart engine',()=>{
 const chart=engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const menh=chart.houses.find(h=>h.palace==='Mệnh');const reading=buildPalaceReading({chart,branchIndex:menh.branchIndex});
 assert.equal(reading.classicalCriteria.length,4);
 assert.ok(reading.classicalCriteria.every(x=>x.studyGuide.studySteps.length===3));
 const root=path.resolve(__dirname,'../apps/web/src/features/chart/components');
 const panel=fs.readFileSync(path.join(root,'four-court-study-panel.tsx'),'utf8');
 const parent=fs.readFileSync(path.join(root,'palace-reading.tsx'),'utf8');
 assert.match(parent,/level==='deep'/);assert.match(parent,/FourCourtStudyPanel/);
 assert.match(panel,/study\.notice/);assert.doesNotMatch(panel,/fetch\(|\.calculate\(|astrology-engine/);
});
