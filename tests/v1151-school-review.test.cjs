'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {registry,eligibility,publicReviewCard,getReview}=require('../packages/knowledge/src/school-review-gates.cjs');
const {auditSchoolReview}=require('../infrastructure/scripts/audit-school-review.cjs');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const original=()=>structuredClone(registry);
test('V11.51 exactly four distinct research method scopes, not accredited schools',()=>{
 assert.equal(registry.schools.length,4);assert.equal(new Set(registry.schools.map(x=>x.id)).size,4);
 assert.ok(registry.schools.every(s=>s.expertReviewed===false && s.accredited===false && s.scope.length>60));
 assert.equal(registry.engineIntegrationsAllowed,false);
});
test('V11.51 twelve unique review records link to their school',()=>{
 assert.equal(registry.records.length,12);
 assert.equal(new Set(registry.records.map(x=>x.id)).size,12);
 assert.ok(registry.records.every(x=>registry.schools.some(s=>s.id===x.schoolId)));
});
test('V11.51 unfinished evidence is rejected for every rule',()=>{
 for(const x of registry.records){const gate=eligibility(x);assert.equal(gate.eligible,false,x.id);assert.equal(gate.missing.length,4,x.id);}
});
test('V11.51 false approval status does not pass audit',()=>{
 const bad=original();bad.records[0].reviewStage='expert-approved';
 assert.equal(auditSchoolReview(bad).status,'FAIL');
});
test('V11.51 enabling a rule without a review cannot pass audit',()=>{
 const bad=original();bad.records[0].engineEnabled=true;
 assert.equal(auditSchoolReview(bad).status,'FAIL');
});
test('V11.51 cross-method misclassification is detected',()=>{
 const bad=original();bad.records.find(x=>x.reference.kind==='method-profile').schoolId='tu-vi-structural-research';
 assert.ok(auditSchoolReview(bad).errors.some(e=>e.includes('Mixed methodologies')));
});
test('V11.51 deleted source reference fails even when a title exists',()=>{
 const bad=original();bad.records[0].reference.id='not-an-existing-method';
 assert.ok(auditSchoolReview(bad).errors.some(e=>e.includes('Stale reference')));
});
test('V11.51 collision and missing school fail validation',()=>{
 const bad=original();bad.records[1].id=bad.records[0].id;
 bad.records[2].schoolId='nonexistent';
 const errors=auditSchoolReview(bad).errors;
 assert.ok(errors.some(e=>e.includes('Duplicate review record')));
 assert.ok(errors.some(e=>e.includes('Unknown school')));
});
test('V11.51 one cited source cannot count as independent bibliography',()=>{
 const x=original().records[0];x.review.bibliography=[{author:'A',title:'Example source',locator:'chapter 12',edition:'1'}];
 assert.ok(eligibility(x).missing.includes('documented-independent-bibliography'));
});
test('V11.51 four complete evidence gates are needed for manual release consideration',()=>{
 const x=original().records[0];x.review={
  bibliography:[{author:'Researcher A',title:'Study text alpha',locator:'chapter 1',edition:'first'},{author:'Researcher B',title:'Study text beta',locator:'chapter 2',edition:'second'}],
  independentComparisonCases:[{input:'A',expected:'B',sourceLocator:'p. 1',method:'manual'},{input:'C',expected:'D',sourceLocator:'p. 2',method:'manual'}],
  variantDecision:{status:'accepted',rationale:'Version scope established'},
  expertSignoff:{reviewerId:'reviewer-verified-1',revision:'11.51.0',date:'2026-10-11',decision:'approved'}
 };
 assert.equal(eligibility(x).eligible,true);
 // Fabricated approval never silently changes engine, nor gets auto-released via audit.
 assert.equal(x.engineEnabled,false);
 assert.equal(auditSchoolReview({...original(),records:[x,...original().records.slice(1)]}).status,'FAIL');
});
test('V11.51 public review cards never expose bibliography, hidden paths or auto-placement',()=>{
 for(const x of registry.records){const c=publicReviewCard(x);assert.equal(c.readiness,'research-only');assert.equal(c.engineEnabled,false);assert.ok(!('review' in c));assert.ok(!('sourcePath' in c));}
});
test('V11.51 duplicate bibliography and repeated fixture are rejected',()=>{
 const x=original().records[0];x.review={
 bibliography:[{author:'Same',title:'One Work',locator:'p. 1',edition:'1'},{author:'Same',title:'One Work',locator:'p. 2',edition:'1'}],
 independentComparisonCases:[{input:'A',expected:'B',sourceLocator:'p.1',method:'manual'},{input:'A',expected:'B',sourceLocator:'p.1',method:'manual'}],
 variantDecision:{status:'accepted',rationale:'Documented'},expertSignoff:{reviewerId:'a',revision:'11.51.0',date:'2026-10-11',decision:'approved'}};
 const missing=eligibility(x).missing;
 assert.ok(missing.includes('duplicate-bibliography'));assert.ok(missing.includes('duplicate-comparison-fixtures'));
});
test('V11.51 missing reference object returns a review error rather than throwing',()=>{
 const bad=original();bad.records[0].reference=null;
 assert.ok(auditSchoolReview(bad).errors.some(e=>e.includes('Stale reference')));
});
test('V11.51 lookup returns immutable current research record or null',()=>{
 assert.equal(getReview(registry.records[0].id)?.id,registry.records[0].id);
 assert.equal(getReview('not-defined'),null);
 assert.equal(Knowledge.schoolReview.registry.records.length,12);
});
test('V11.51 all records pass source-only audit, no engine integration',()=>{
 const report=auditSchoolReview();assert.equal(report.status,'PASS',report.errors.join('\n'));assert.equal(report.approvedForEngine,0);assert.equal(report.reviewRecords,12);
});
test('V11.51 frontend visibly distinguishes methodology, review state and no approval',()=>{
 const web=fs.readFileSync(path.join(root,'apps/web/src/app/research/schools/page.tsx'),'utf8');
 assert.match(web,/review\.records\.filter/);assert.match(web,/review\.schools\.map/);assert.match(web,/<details/);
 assert.match(web,/Chưa có hai nguồn độc lập và đủ ca đối chứng/i);
 assert.doesNotMatch(web,/@thiendo\/astrology-engine|sourcePath|houses\[/);
 assert.doesNotMatch(web,/bibliography\.map|\.sources\.map/);
 assert.match(fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8'),/\/research\/schools/);
});
test('V11.51 research style has a mobile breakpoint and controls remain accessible',()=>{
 const css=fs.readFileSync(path.join(root,'apps/web/src/app/research/schools/schools.css'),'utf8');
 assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/min-height:44px/);
});
