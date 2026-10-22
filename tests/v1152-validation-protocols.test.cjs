'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {registry,auditValidationProtocols,getValidationProtocol}=require('../packages/knowledge/src/school-validation-protocols.cjs');
const reviews=require('../packages/knowledge/src/school-review-registry.json');
const {audit}=require('../infrastructure/scripts/audit-review-protocols.cjs');
const {buildWorksheets}=require('../infrastructure/scripts/build-review-worksheets.cjs');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const clone=()=>structuredClone(registry);
test('V11.52 has an individual research protocol for all twelve review records',()=>{
 assert.equal(registry.protocols.length,12);
 assert.equal(new Set(registry.protocols.map(p=>p.ruleId)).size,12);
 assert.deepEqual(new Set(registry.protocols.map(p=>p.ruleId)),new Set(reviews.records.map(r=>r.id)));
});
test('V11.52 each protocol distinguishes positive controls from negative controls',()=>{
 for(const p of registry.protocols){
  assert.notEqual(p.positiveControl.procedure,p.negativeControl.procedure);
  assert.ok(p.inputDimensions.length>=3);
  assert.ok(p.prohibitedShortcut.length>=35);
 }
});
test('V11.52 all protocols are unverified and independent of chart placement',()=>{
 assert.equal(registry.engineIntegrationsAllowed,false);
 for(const p of registry.protocols){assert.equal(p.reviewStatus,'unverified');assert.equal(p.engineEnabled,false);}
 assert.equal(audit().approvedForEngine,0);
});
test('V11.52 audit detects missing review protocol even if no pages reference it',()=>{
 const p=clone();p.protocols.pop();
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('Missing protocol')));
});
test('V11.52 audit rejects duplicated ruleId and stale rule links',()=>{
 const p=clone();p.protocols[1].ruleId=p.protocols[0].ruleId;
 const errors=auditValidationProtocols(p).errors;
 assert.ok(errors.some(e=>e.includes('duplicate ruleId')));
 assert.ok(errors.some(e=>e.includes('Missing protocol')));
 p.protocols[1].ruleId='unknown-rule';
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('stale ruleId')));
});
test('V11.52 audit rejects method-profile cross-contamination from Bát Tự into Tử Vi',()=>{
 const p=clone();p.protocols.find(x=>x.ruleId==='rule-hong-diem-bazi-day-stem').scopeAxis='can-nam-sinh';
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('wrong methodological input axis')));
});
test('V11.52 audit rejects changing record category without renaming it',()=>{
 const p=clone();p.protocols.find(x=>x.ruleId==='pair-ta-huu').category='an-sao';
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('category/reference mismatch')));
});
test('V11.52 audit never accepts a pre-approved protocol or enabled engine status',()=>{
 const p=clone();p.protocols[0].reviewStatus='expert-approved';p.protocols[0].engineEnabled=true;
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('cannot be enabled')));
});
test('V11.52 cannot reduce evidence requirements to a single source and fixture',()=>{
 const p=clone();p.protocols[0].expectedIndependentSources=1;p.protocols[0].expectedIndependentFixtures=1;
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('independent evidence targets reduced')));
});
test('V11.52 missing controls and copied test scenarios fail validation',()=>{
 const p=clone();p.protocols[0].negativeControl.procedure=p.protocols[0].positiveControl.procedure;
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('negative control copied')));
 p.protocols[0].positiveControl.procedure='tiny';
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('incomplete positiveControl')));
});
test('V11.52 leaked internal source paths are prohibited',()=>{
 const p=clone();p.protocols[0].interpretationLimit+=' sourcePath houses[0]';
 assert.ok(auditValidationProtocols(p).errors.some(e=>e.includes('internal path leaked')));
});
test('V11.52 protocol lookup returns correct data and unknown IDs are null',()=>{
 assert.equal(getValidationProtocol(registry.protocols[0].ruleId).ruleId,registry.protocols[0].ruleId);
 assert.equal(getValidationProtocol('no-rule'),null);
 assert.equal(Knowledge.schoolValidationProtocols.registry.protocols.length,12);
});
test('V11.52 worksheets are blank templates and never masquerade as an expert signed review',()=>{
 const md=buildWorksheets();
 assert.equal((md.match(/\*\*Trạng thái: CHƯA THẨM ĐỊNH/g)||[]).length,12);
 assert.equal((md.match(/- \[ \] Chuyên gia thẩm định/g)||[]).length,12);
 assert.ok(!md.includes('**Trạng thái: ĐÃ THẨM ĐỊNH'));
 assert.ok(!md.includes('houses['));
 const written=fs.readFileSync(path.join(root,'tests/fixtures/validation/review-worksheets.md'),'utf8');
 assert.equal(written,md,'committed worksheet must match generator output');
});
test('V11.52 research UI provides independent negative controls without an engine dependency',()=>{
 const f=fs.readFileSync(path.join(root,'apps/web/src/app/research/schools/page.tsx'),'utf8');
 assert.match(f,/school-validation-protocols\.json/);
 assert.match(f,/positiveControl\.procedure/);
 assert.match(f,/negativeControl\.procedure/);
 assert.match(f,/Chưa có hai nguồn độc lập/);
 assert.doesNotMatch(f,/@thiendo\/astrology-engine|sourcePath|houses\[/);
});
test('V11.52 UI meets basic mobile and keyboard focus requirements',()=>{
 const css=fs.readFileSync(path.join(root,'apps/web/src/app/research/schools/schools.css'),'utf8');
 assert.match(css,/focus-visible/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test('V11.52 review protocol audit passes with zero auto-enabled rules',()=>{
 const result=audit();assert.equal(result.status,'PASS',result.errors.join('\n'));
 assert.equal(result.count,12);assert.equal(result.approvedForEngine,0);
});
