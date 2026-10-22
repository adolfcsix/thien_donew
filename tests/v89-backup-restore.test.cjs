"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=part=>fs.readFileSync(path.join(root,part),'utf8');
test('V8.9 backup contract requires explicit import and does not trust client chart IDs or stars',()=>{
  const service=read('apps/api/src/modules/charts/charts.service.ts');
  assert.match(service,/async importBackup\(/);
  assert.match(service,/resultVerified\(input\)/);
  assert.match(service,/validChart\(value\)/);
  assert.match(service,/SELECT pg_advisory_xact_lock/);
  assert.match(service,/this\.db\.transaction/);
  assert.match(service,/existing\.rows\.length \+ toInsert\.length > 100/);
  assert.match(service,/randomUUID\(\)/);
  assert.match(service,/user\.id, input\.label/);
  assert.doesNotMatch(service,/input\.id/);
  assert.match(read('apps/api/src/modules/charts/charts.controller.ts'),/@Post\('import'\)/);
});
test('V8.9 client requires confirmation and enforces JSON file size',()=>{
  const ui=read('apps/web/src/app/collection/page.tsx');
  assert.match(ui,/file\.size > 65536/);
  assert.match(ui,/window\.confirm/);
  assert.match(ui,/Khôi phục JSON/);
  assert.match(ui,/importRequest\.current\?\.abort\(\)/);
  assert.match(read('apps/web/src/lib/api.ts'),/\/api\/charts\/import/);
});
