'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../packages/astrology-engine/src/tuvi.js');
const D=require('../packages/interpretation/src/classical-condition-diagnostics.cjs');
const {compareClassicalPositionLenses}=require('../packages/interpretation/src/classical-position-lenses.cjs');
const {classicalFamilies}=require('../packages/knowledge/src/index.cjs');
const catalog=require('../packages/knowledge/src/classical-position-lenses.json');
const sample=require('../packages/knowledge/src/classical-position-examples.json');
const previous=require('../packages/knowledge/src/classical-review-examples.json');
const create=input=>E.calculate(input);
const inspect=(chart,id)=>{const m=chart.houses.find(h=>h.palace==='Mệnh');return D.describeClassicalCandidateCriteria(chart,m.branchIndex).find(r=>r.id===id);};

test('V11.64 has four editorial profiles and three distinct position lenses, never expert certification',()=>{
 assert.deepEqual(Object.keys(catalog.families),classicalFamilies.map(x=>x.id));
 assert.equal(catalog.schoolReviewed,false);assert.equal(catalog.editorialPolicy.noFortuneScore,true);
 for(const rule of classicalFamilies){const p=catalog.families[rule.id];
  assert.deepEqual(p.lenses.map(x=>x.id),['four-court','triad-only','focus-anchored']);
  assert.ok(p.question.length>40);assert.ok(p.counterexample.length>40);
  assert.ok(p.lenses.every(x=>x.explanation.length>65));
 }
});
test('V11.64 13 cases (eight inherited, five additive) reproduce from real engine, no duplicate fixture IDs',()=>{
 const cases=[...previous.cases,...sample.cases];assert.equal(cases.length,13);
 assert.equal(new Set(cases.map(x=>x.id)).size,13);
 for(const x of cases){
  const chart=create(x.input),original=JSON.stringify(chart),m=chart.houses.find(h=>h.palace==='Mệnh');
  const doc=inspect(chart,x.familyId).reviewMatrix;
  assert.equal(m.branchIndex,x.focusBranchIndex);
  assert.equal(doc.schoolLenses.tests.length,3);
  assert.equal(doc.schoolLenses.expertReviewed,false);
  if(x.id.endsWith('-anchor')||x.id.endsWith('-contrast')){
   assert.deepEqual(doc.schoolLenses.tests.map(t=>({id:t.id,status:t.status,geometryMatches:t.geometryMatches})),x.statuses);
   assert.deepEqual(doc.required.map(y=>({star:y.star,branchIndex:y.branchIndex,relation:y.relation})),x.observed);
   if(x.id.endsWith('-anchor'))assert.ok(doc.schoolLenses.tests.every(t=>t.geometryMatches));
   else assert.ok(doc.schoolLenses.tests[0].geometryMatches&&!doc.schoolLenses.tests[1].geometryMatches);
  }else assert.equal(doc.structuralCriteriaMet,x.expectedStructural);
  assert.equal(JSON.stringify(chart),original);
 }
});
test('V11.64 broad family coverage does NOT imply strict Tử Phủ same-palace anchor',()=>{
 const x=previous.cases.find(x=>x.id==='tu-phu-vu-tuong-match');
 const lenses=inspect(create(x.input),x.familyId).reviewMatrix.schoolLenses;
 assert.equal(lenses.tests[0].geometryMatches,true);
 assert.equal(lenses.tests[2].geometryMatches,false);
 assert.ok(lenses.tests[2].anchorMissing.includes('Tử Vi'));
});
test('V11.64 missing required star OR invalid anchor prevents broad pattern recognition',()=>{
 for(const x of previous.cases.filter(x=>!x.expectedStructural)){
  const r=inspect(create(x.input),x.familyId).reviewMatrix.schoolLenses;
  assert.equal(r.tests[0].geometryMatches,false);assert.ok(r.tests[0].notObserved.length>=1 || r.tests[0].reasons.some(y=>y.includes('điểm tựa')));
 }
});

test('V11.64 one real Cự Nhật case has a valid opposite-star contrast (four-court yes, triad no)',()=>{
 const x=sample.cases.find(x=>x.id==='cu-nhat-contrast');
 const l=inspect(create(x.input),x.familyId).reviewMatrix.schoolLenses.tests;
 assert.equal(l[0].geometryMatches,true);
 assert.equal(l[1].geometryMatches,false);
 assert.deepEqual(l[1].outside,['Thái Dương']);
 assert.ok(l[1].reasons.some(x=>x.includes('đối cung')));
});
test('V11.64 duplicate main star in one house fails CLOSED in every lens',()=>{
 const x=sample.cases[3],c=create(x.input),h=c.houses.find(h=>h.branchIndex===x.observed[0].branchIndex);
 h.stars.push(x.observed[0].star);
 const lens=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 assert.ok(lens.tests.every(t=>t.status==='data-needs-review'&&!t.geometryMatches));
});
test('V11.64 corrupt natal transformation invalidates geometry outcomes until cleaned',()=>{
 const x=sample.cases[2],c=create(x.input);
 c.houses.find(h=>h.palace==='Mệnh').tuHoa.push({name:'Hóa Lộc',star:'Không là sao bản mệnh'});
 const lens=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 assert.ok(lens.tests.every(t=>t.status==='data-needs-review'&&!t.geometryMatches));
 assert.ok(lens.contextSignals.transformationConflicts>0);
});
test('V11.64 missing star strength preserves observational geometry but blocks stronger reading',()=>{
 const x=sample.cases[0],c=create(x.input),v=x.observed[0];
 const h=c.houses.find(h=>h.branchIndex===v.branchIndex);
 h.mainStarStrengths=h.mainStarStrengths.filter(y=>y.name!==v.star);
 const lens=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 assert.ok(lens.tests.every(t=>t.geometryMatches&&t.status==='geometry-only-needs-strength'));
 assert.equal(lens.contextSignals.strengthIncomplete,true);
});
test('V11.64 annual data, obstructing markers and Hóa Kỵ never decide a classical formation',()=>{
 const x=sample.cases[0],c=create(x.input),m=c.houses.find(h=>h.palace==='Mệnh');
 const before=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 m.luuStars=['Cự Môn'];m.luuTuHoa=[{name:'Hóa Kỵ',star:'Cự Môn'}];
 assert.deepEqual(inspect(c,x.familyId).reviewMatrix.schoolLenses,before);
 m.obstructionMarkers=['Tuần','Triệt'];
 const after=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 assert.ok(after.tests.every(t=>t.geometryMatches));
 assert.ok(after.contextSignals.obstructions.includes('Tuần'));assert.ok(after.contextSignals.obstructions.includes('Triệt'));
 assert.ok(after.tests.every(t=>t.confirmedClassicalFormation===false));
});
test('V11.64 ignores order of house array; no comparison tests when invalid scope payload',()=>{
 const x=sample.cases[1],c=create(x.input),pre=inspect(c,x.familyId).reviewMatrix.schoolLenses;
 c.houses.reverse();assert.deepEqual(inspect(c,x.familyId).reviewMatrix.schoolLenses,pre);
 const r=classicalFamilies.find(r=>r.id===x.familyId);
 assert.throws(()=>compareClassicalPositionLenses(r,{scope:'wrong'},{}),TypeError);
 assert.throws(()=>compareClassicalPositionLenses({...r,id:'n/a'},{scope:'natal-four-courts',required:[],branches:[]},{}),RangeError);
});
test('V11.64 UI uses the existing deep mode, no placement engine, and no public reference URLs',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-review-panel.tsx'),'utf8');
 assert.match(file,/review\.schoolLenses\.tests\.map/);
 assert.match(file,/positionCases\.cases\.filter/);
 assert.match(file,/chưa thẩm định trường phái/);
 assert.doesNotMatch(file,/http:\/\/|https:\/\/|astrology-engine|fetch\(/);
 const json=JSON.stringify(catalog.families);
 assert.doesNotMatch(json,/đã thành cách|chắc chắn phát tài/);
});
