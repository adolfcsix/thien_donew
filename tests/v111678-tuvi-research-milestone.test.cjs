'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {summarizeClassicalCatalog,ALL}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');
const {PENDING,REVIEW_GATES,summarizeClassicalResearchMilestone}=
 require('../packages/interpretation/src/classical-research-milestone.cjs');
function sourceInput(){
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const natal=auditClassicalPatternCandidates(chart);
 const bridge=auditClassicalDingZaSourceBridge(chart);
 const catalog=summarizeClassicalCatalog([...natal.records.map(r=>r.id),...bridge.mappedIds]);
 const readiness=summarizeClassicalResearchReadiness(catalog);
 return {chart,natal,bridge,catalog,readiness};
}
const clone=o=>JSON.parse(JSON.stringify(o));
test('R60 milestone is 31 research mappings (28 natal + 3 decade), not 31 verified formations',()=>{
 const x=sourceInput(),original=JSON.stringify(x.chart);
 const r=summarizeClassicalResearchMilestone(x);
 assert.equal(r.schema,'thiendo-r60-classical-milestone-v1');
 assert.deepEqual(r.mappedByScope,{natal:28,period:3});
 assert.equal(r.total,49);
 assert.equal(r.conditionMapped,31);
 assert.deepEqual(r.remaining,{mapped:31,pending:3,disputed:9,unreachable:6,unmapped:18});
 assert.equal(r.sourceCandidatesStillDerivable,3);
 assert.equal(ALL.filter(x=>x.sourceStatus==='derivable').length,34);
 assert.equal(r.expertConfirmed,0);
 assert.equal(r.mayRaiseMilestone,false);
 assert.equal(r.sourceSchoolParityVerified,false);
 assert.equal(r.semanticEquivalenceVerified,false);
 assert.equal(r.chartResultIndependent,true);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.nextCandidates)&&Object.isFrozen(r.mappedByScope));
 assert.equal(JSON.stringify(x.chart),original,'Milestone must not alter a birth chart');
});
test('R60 next three research gates are explicit, pinned, source-specific and never promissory',()=>{
 const x=sourceInput();
 const r=summarizeClassicalResearchMilestone(x);
 assert.deepEqual(r.nextCandidates.map(c=>c.id),PENDING);
 assert.deepEqual(r.nextCandidates.map(c=>c.scope),
  ['natal-research','natal-research','period-research']);
 assert.ok(r.nextCandidates.every(c=>c.requiredChecks.length===3&&
  c.readyToPromote===false&&c.semanticEquivalenceVerified===false&&
  c.sourceRuleVerifiedForLocalChart===false&&
  c.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/')));
 assert.equal(Object.keys(REVIEW_GATES).length,3);
 assert.deepEqual(r,summarizeClassicalResearchMilestone(x));
});
test('R60 fails closed against forged milestone, mapped period IDs and expert attribution',()=>{
 const baseline=sourceInput();
 const altered=clone(baseline);
 altered.catalog.assessed=32;
 assert.throws(()=>summarizeClassicalResearchMilestone(altered),/incomplete|promotion/);
 const wrong=clone(baseline);
 wrong.bridge.mappedIds.push('dinh-tap-03');
 assert.throws(()=>summarizeClassicalResearchMilestone(wrong));
 const fake=clone(baseline);
 fake.natal.records[0].expertReviewed=true;
 assert.throws(()=>summarizeClassicalResearchMilestone(fake));
 const double=clone(baseline);
 double.natal.records[1].id=double.natal.records[0].id;
 assert.throws(()=>summarizeClassicalResearchMilestone(double));
 const fabricated=clone(baseline);
 fabricated.readiness.byId['dinh-ban-01'].blocker='Verified by AI';
 assert.throws(()=>summarizeClassicalResearchMilestone(fabricated));
 const disputed=clone(baseline);
 const entry=disputed.catalog.groups.flatMap(g=>g.entries).find(x=>x.id==='dinh-ban-03');
 entry.assessed=true;
 assert.throws(()=>summarizeClassicalResearchMilestone(disputed));
 const noSource=clone(baseline);
 noSource.catalog.groups[0].entries[1].sourceUrl='unverified';
 assert.throws(()=>summarizeClassicalResearchMilestone(noSource));
});
