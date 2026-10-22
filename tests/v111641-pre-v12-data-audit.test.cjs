'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const load=(p)=>JSON.parse(readFileSync(join(root,p),'utf8'));
const {inspectData}=require('../infrastructure/scripts/audit-pre-v12-data.cjs');
const {buildInventory}=require('../packages/star-audit/src/index.cjs');
const base=()=>({methods:load('packages/knowledge/src/method-coverage.json'),stars:load('packages/knowledge/src/star-identity-registry.json'),tarot:load('packages/knowledge/src/tarot-depth-78.json'),portal:load('apps/web/src/lib/portal-v11163-content.json'),crosswalk:load('packages/knowledge/src/reference-star-crosswalk.json'),starInventory:buildInventory()});
test('pre-V12 data structure is internally consistent, but not approved for release',()=>{
 const r=inspectData(base());assert.deepEqual(r.errors,[]);assert.equal(r.verdict,'STRUCTURE_PASS_RELEASE_BLOCKED');assert.equal(r.counts.disciplines,21);assert.equal(r.counts.methodsIndependentlyAccepted,0);assert.equal(r.counts.starNamesNatal,68);assert.equal(r.counts.starNamesCycles,36);assert.equal(r.counts.starNamesCombined,104);assert.equal(r.counts.tarotCards,78);assert.equal(r.counts.referenceNotInEngine,11);assert.equal(r.counts.referencePossibleAliases,4);assert.equal(r.counts.guideCategories,15);assert.equal(r.counts.policyDrafts,8);assert.equal(r.counts.guideScreenshotRefs,0);
});
test('missing method implementation is a structural failure',()=>{
 const x=base();x.methods.disciplines[0].implementation='packages/astrology-engine/src/does-not-exist.js';assert.ok(inspectData(x).errors.some(e=>e.code==='MISSING_METHOD_PATH'));
});
test('duplicate tarot card is detected',()=>{
 const x=base();x.tarot.cards[1].id=x.tarot.cards[0].id;assert.ok(inspectData(x).errors.some(e=>e.code==='TAROT_DECK'));
});
test('star count drift is detected rather than silently relabeling 104 as natal stars',()=>{
 const x=base();x.stars.counts.natal=104;assert.ok(inspectData(x).errors.some(e=>e.code==='STAR_COUNT_MISMATCH'));
});
test('missing guide route is detected',()=>{
 const x=base();x.portal.find(p=>p.kind==='guide').tool='/not-a-route';assert.ok(inspectData(x).errors.some(e=>e.code==='GUIDE_ROUTE'));
});
test('unreviewed policies cannot be represented as legally approved',()=>{
 const r=inspectData(base());assert.ok(r.blockers.some(e=>e.code==='LEGAL_DRAFT'));
});

test('reference catalogue counts are checked without asserting a universal 121-star standard',()=>{
 const x=base();x.crosswalk.counts['not-in-engine']=10;assert.ok(inspectData(x).errors.some(e=>e.code==='REFERENCE_CROSSWALK_DRIFT'));
});
