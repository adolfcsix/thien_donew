'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {auditReferenceVerification,getReferenceVerification}=require('../packages/knowledge/src/reference-verification.cjs');
const docket=require('../packages/knowledge/src/reference-verification-docket.json');
const crosswalk=require('../packages/knowledge/src/reference-star-crosswalk.json');
const expanded=require('../packages/knowledge/src/expanded-star-research.json');
const starIDs=require('../packages/knowledge/src/star-identity-registry.cjs');
const schools=require('../packages/knowledge/src/school-review-registry.json');
const audit=(d=docket,c=crosswalk)=>auditReferenceVerification(d,c,expanded,starIDs,schools);
test('V11.65 covers exactly 11 missing names + 4 unresolved aliases, no executable rules',()=>{
 const result=audit();assert.deepEqual(result.errors,[]);assert.equal(result.status,'PASS');
 assert.equal(result.checked,15);assert.equal(result.missing,11);assert.equal(result.aliases,4);assert.equal(result.engineReady,0);
 assert.equal(docket.researchOnly,true);assert.equal(docket.engineIntegrationsAllowed,false);
});
test('V11.65 each unresolved name has a distinct positive and negative source-comparison question',()=>{
 for(const item of docket.records){assert.ok(item.positiveComparison.length>45,item.name);assert.ok(item.negativeComparison.length>40,item.name);assert.notEqual(item.positiveComparison,item.negativeComparison);assert.equal(getReferenceVerification(item.name),item);}
 assert.equal(getReferenceVerification('__unknown__'),null);
});
test('V11.65 duplicate dossiers fail closed',()=>{const c=structuredClone(docket);c.records.push({...c.records[0]});c.counts.records++;assert.match(audit(c).errors.join(' '),/duplicate dossier/);});
test('V11.65 cannot suppress a still-unresolved name',()=>{const c=structuredClone(docket);c.records.pop();c.counts.records--;assert.match(audit(c).errors.join(' '),/has no verification dossier/);});
test('V11.65 wrong alias candidate is rejected, including a plausible but different star',()=>{const c=structuredClone(docket);c.records.find(x=>x.name==='Tuần Không').candidateName='Triệt';assert.match(audit(c).errors.join(' '),/alias cross-link mismatch/);});
test('V11.65 cannot invent an alias for genuinely missing stars',()=>{const c=structuredClone(docket);c.records.find(x=>x.name==='Hồng Diễm').candidateName='Hồng Loan';assert.match(audit(c).errors.join(' '),/fabricated alias candidate/);});
test('V11.65 no name may have an unreviewed formula enabled or validation count fabricated',()=>{const c=structuredClone(docket);c.records[0].placementEnabled=true;c.records[1].approvedAlias=true;c.records[2].sourcesValidated=2;const result=audit(c);assert.ok(result.errors.some(x=>x.includes('cannot be enabled')));assert.ok(result.errors.some(x=>x.includes('invent external validation')));});
test('V11.65 mismatched school rule IDs and status drift are blocked',()=>{const d=structuredClone(docket);d.records.find(x=>x.name==='Hồng Diễm').relatedReviewId='not-a-real-rule';assert.match(audit(d).errors.join(' '),/broken school review link/);const c=structuredClone(crosswalk);c.records.find(x=>x.name==='Thai Phụ').status='engine-name';assert.match(audit(docket,c).errors.join(' '),/status drift|no unresolved crosswalk record/);});
test('V11.65 verifies distinct domain boundaries for method-critical names',()=>{
 assert.match(getReferenceVerification('Hồng Diễm').researchQuestion,/can ngày/);
 assert.match(getReferenceVerification('Lưu Niên Văn Tinh').researchQuestion,/năm sinh/);
 assert.match(getReferenceVerification('Quán Sách').referenceScope,/Tuế Tiền/);
 assert.match(getReferenceVerification('Tướng Tinh').negativeComparison,/Thiên Tướng/);
});
test('V11.65 UI remains read-only, with dedicated review panel and no new placement engine imports',()=>{
 const root=path.resolve(__dirname,'..');const ui=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 assert.match(ui,/reference-verification-docket\.json/);assert.match(ui,/ResearchVerification name=\{item\.name\}/);
 assert.match(ui,/phản chứng/);assert.doesNotMatch(ui,/astrology-engine|http:\/\/|https:\/\//);
 const engine=fs.readFileSync(path.join(root,'packages/astrology-engine/src/tuvi.js'),'utf8');assert.doesNotMatch(engine,/reference-verification/);
});
