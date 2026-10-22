'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {describeClassicalCandidateCriteria}=require('../packages/interpretation/src/classical-condition-diagnostics.cjs');
const {buildClassicalReviewMatrix}=require('../packages/interpretation/src/classical-review-matrix.cjs');
const catalogue=require('../packages/knowledge/src/classical-review-questions.json');
const examples=require('../packages/knowledge/src/classical-review-examples.json');
const {classicalFamilies}=require('../packages/knowledge/src/index.cjs');
const make=(date='2004-08-15',gender='Nam',hour=8)=>Engine.calculate({date,calendar:'solar',gender,hour,minute:15});
const review=(c,id)=>{const m=c.houses.find(x=>x.palace==='Mệnh');return describeClassicalCandidateCriteria(c,m.branchIndex).find(x=>x.id===id).reviewMatrix;};

test('V11.63 exactly four distinct family profiles and eight paired, reproducible natal cases',()=>{
 assert.equal(classicalFamilies.length,4);assert.deepEqual(Object.keys(catalogue.profiles),classicalFamilies.map(x=>x.id));
 assert.equal(examples.cases.length,8);assert.equal(new Set(examples.cases.map(x=>x.id)).size,8);
 for(const r of classicalFamilies){
  const cases=examples.cases.filter(x=>x.familyId===r.id);
  assert.equal(cases.length,2);assert.deepEqual(cases.map(x=>x.expectedStructural),[true,false]);
  assert.ok(catalogue.profiles[r.id].interpretiveFrame.length>85);
  assert.ok(catalogue.profiles[r.id].counterexample.length>65);
 }
});
test('V11.63 engine-generated cases recompute position, completeness and exclusions exactly',()=>{
 for(const item of examples.cases){
  const c=Engine.calculate(item.input),orig=JSON.stringify(c),m=c.houses.find(x=>x.palace==='Mệnh');
  assert.equal(m.branchIndex,item.focusBranchIndex);
  const actual=review(c,item.familyId);
  assert.equal(actual.status,item.expectedStatus,item.id);
  assert.equal(actual.structuralCriteriaMet,item.expectedStructural,item.id);
  assert.deepEqual(actual.required.filter(x=>x.status==='observed').map(x=>({star:x.star,branchIndex:x.branchIndex})),item.observed,item.id);
  assert.deepEqual(actual.required.filter(x=>x.status!=='observed').map(x=>x.star),item.absent,item.id);
  assert.equal(actual.confirmedClassicalFormation,false);assert.equal(actual.expertReviewed,false);
  assert.equal(JSON.stringify(c),orig);
 }
});
test('V11.63 four candidate profiles remain study-only across varying real charts; arrays are order-independent',()=>{
 for(const date of ['1998-01-15','1999-06-15','2004-08-15','1979-05-15'])for(const gender of ['Nam','Nữ'])for(const hour of [2,8,14,20]){
  const c=make(date,gender,hour),m=c.houses.find(x=>x.palace==='Mệnh'),first=describeClassicalCandidateCriteria(c,m.branchIndex);
  assert.equal(first.length,4);
  assert.ok(first.every(x=>x.reviewMatrix.checks.length===6&&x.reviewMatrix.schoolStatus==='unreviewed'&&x.reviewMatrix.confirmedClassicalFormation===false));
  c.houses.reverse();const again=describeClassicalCandidateCriteria(c,m.branchIndex);
  assert.deepEqual(again.map(x=>x.reviewMatrix),first.map(x=>x.reviewMatrix));
 }
});
test('V11.63 duplicate main star in one house is NOT a clean structural candidate',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input),v=item.observed[0],h=c.houses.find(x=>x.branchIndex===v.branchIndex);
 h.stars.push(v.star);
 const x=review(c,'cu-nhat');assert.equal(x.status,'needs-review');
 assert.equal(x.structuralCriteriaMet,false);assert.ok(x.blockers.some(p=>p.id==='integrity'));
});
test('V11.63 duplicated required main star at other palace is rejected as ambiguity',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input),v=item.observed[0],other=c.houses.find(x=>x.branchIndex!==(v.branchIndex));
 other.stars.push(v.star);
 const x=review(c,'cu-nhat');assert.equal(x.status,'needs-review');assert.equal(x.structuralCriteriaMet,false);
 assert.ok(x.required.find(p=>p.star===v.star).status==='ambiguous');
});
test('V11.63 missing or invalid brightness blocks complete reading, not absence of required stars',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input),v=item.observed[0],h=c.houses.find(x=>x.branchIndex===v.branchIndex);
 h.mainStarStrengths=h.mainStarStrengths.filter(x=>x.name!==v.star);
 const x=review(c,'cu-nhat');assert.equal(x.status,'incomplete-evidence');
 assert.equal(x.structuralCriteriaMet,true);assert.ok(x.blockers.some(y=>y.id==='strength'));
});
test('V11.63 missing, outside or supporting-only required stars cannot be promoted to a match',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input),v=item.observed[0],h=c.houses.find(x=>x.branchIndex===v.branchIndex);
 h.stars=h.stars.filter(x=>x!==v.star);h.auxiliaryStars.push(v.star);
 const x=review(c,'cu-nhat');assert.equal(x.structuralCriteriaMet,false);assert.equal(x.status,'conditions-not-met');
 assert.equal(x.required.find(y=>y.star===v.star).reason,'not-main-star');
});
test('V11.63 corrupted natal Hóa target is not accepted and forces data review',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input);c.houses.find(x=>x.palace==='Mệnh').tuHoa.push({name:'Hóa Lộc',star:'Sao không tồn tại'});
 const x=review(c,'cu-nhat');assert.equal(x.status,'needs-review');assert.ok(x.rejectedTransformations>0);
 assert.equal(x.checks.find(y=>y.id==='transformations').met,false);
});
test('V11.63 Hóa Kỵ and obstruction are cautions, not automatic "phá cách" claims',()=>{
 const item=examples.cases.find(x=>x.familyId==='cu-nhat'&&x.expectedStructural);
 const c=Engine.calculate(item.input),menh=c.houses.find(x=>x.palace==='Mệnh');
 // Only force the obstruction; inherited genuine Tứ Hóa remain separately validated.
 menh.obstructionMarkers=['Tuần'];
 const x=review(c,'cu-nhat');assert.equal(x.structuralCriteriaMet,true);
 assert.ok(['qualified-candidate','structural-candidate'].includes(x.status));
 assert.ok(x.qualifiers.some(y=>y.kind==='obstruction'&&y.name==='Tuần'));
 assert.ok(x.qualifiers.every(y=>!(/phá cách chắc chắn|tai họa chắc chắn/.test(y.explanation))));
});
test('V11.63 annual overlay cannot satisfy required stars, transformations or qualifiers',()=>{
 const c=make();const m=c.houses.find(x=>x.palace==='Mệnh');
 const before=describeClassicalCandidateCriteria(c,m.branchIndex).map(x=>x.reviewMatrix);
 c.houses[0].luuStars=['Thái Dương'];c.houses[0].luuTuHoa=[{name:'Hóa Kỵ',star:'Thái Dương'}];
 assert.deepEqual(describeClassicalCandidateCriteria(c,m.branchIndex).map(x=>x.reviewMatrix),before);
});
test('V11.63 detects wrong anchor or stale evidence instead of reusing another chart',()=>{
 const c=make();const m=c.houses.find(x=>x.palace==='Mệnh');const criteria=describeClassicalCandidateCriteria(c,m.branchIndex)[0];
 assert.throws(()=>buildClassicalReviewMatrix(c,m,classicalFamilies[0],{scope:'natal-four-courts',anchorBranchIndex:1,required:[]}),TypeError);
 assert.throws(()=>buildClassicalReviewMatrix(c,m,{id:'unknown',conditions:classicalFamilies[0].conditions},criteria.evidenceReview),RangeError);
});
test('V11.63 UI only inside Chuyên sâu Mệnh, includes explicit research boundaries and no new placement engine',()=>{
 const root=path.resolve(__dirname,'../apps/web/src/features/chart/components');
 const page=fs.readFileSync(path.join(root,'palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.join(root,'classical-review-panel.tsx'),'utf8');
 assert.match(page,/level==='deep'/);assert.match(page,/reading\.palace==='Mệnh'/);assert.match(page,/ClassicalReviewPanel/);
 assert.match(page,/classicalMatches\.map\(item=>reading\.classicalCriteria\.find\(criteria=>criteria\.id===item\.id\)\?\.reviewMatrix\.structuralCriteriaMet&&/);
 assert.match(panel,/review\.counterexample/);assert.match(panel,/review\.practice/);
 assert.match(panel,/referenceCases\.cases\.filter/);
 assert.doesNotMatch(panel,/astrology-engine|calculate\(|fetch\(|sourcePath|confirmedClassicalFormation\s*:\s*true/);
});
