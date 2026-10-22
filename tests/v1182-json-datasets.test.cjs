/** V11.82 data audit regression with malformed fixture. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const auditUrl=pathToFileURL(path.join(root,'infrastructure/scripts/audit-json-datasets.mjs')).href;

test('V11.82: all shipped JSON source and documentation datasets parse',async()=>{
 const {auditJsonDatasets}=await import(auditUrl);
 const result=auditJsonDatasets(root);
 assert.equal(result.status,'PASS',result.errors.join('\n'));
 // Do not require generated historical CI reports in the runnable source package.
 assert.equal(result.scanned,result.files.length);
 assert.equal(new Set(result.files).size,result.scanned);
 for (const required of [
  'packages/knowledge/src/reference-star-crosswalk.json',
  'packages/knowledge/src/method-coverage.json',
  'packages/knowledge/src/tarot-depth-78.json',
  'infrastructure/db/baselines/migrations-001-018.json',
  'infrastructure/db/baselines/migrations-019-027.json',
  'infrastructure/db/baselines/migrations-028-029.json',
  'infrastructure/db/baselines/migration-030.json',
  'packages/knowledge/src/research-disciplines.json',
  'packages/knowledge/src/star-identity-registry.json',
  'tests/fixtures/validation/css-components-sha256.json',
 ]) assert.ok(result.files.includes(required),`Missing required dataset: ${required}`);
});

test('V11.82: integrity audit fails closed when malformed JSON is present',async()=>{
 const {auditJsonDatasets}=await import(auditUrl);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-json-audit-'));
 try {
   fs.mkdirSync(path.join(temp,'packages'));
   fs.writeFileSync(path.join(temp,'packages','valid.json'),'{"ok":true}');
   fs.writeFileSync(path.join(temp,'packages','bad.json'),'{invalid json');
   const broken=auditJsonDatasets(temp,['packages']);
   assert.equal(broken.status,'FAIL');
   assert.equal(broken.scanned,2);
   assert.match(broken.errors.join('\n'),/bad\.json/);
   fs.rmSync(path.join(temp,'packages','bad.json'));
   const repaired=auditJsonDatasets(temp,['packages']);
   assert.equal(repaired.status,'PASS');
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
