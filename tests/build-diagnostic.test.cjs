const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const load=()=>import(pathToFileURL(path.join(root,'infrastructure/scripts/diagnose-build-lib.mjs')).href);
test('diagnostic masks database credentials and bearer auth',async()=>{
 const {redactDiagnostic}=await load();
 const input='Connect postgresql://user:secret@localhost:5432/thiendo_test \nAuthorization: Bearer 123abcdef\nDATABASE_URL=postgresql://u:pw@host/test';
 const output=redactDiagnostic(input);
 assert.doesNotMatch(output,/secret|123abcdef|u:pw/);
 assert.match(output,/\[DATABASE_URL_REDACTED\]/);
 assert.match(output,/Bearer \[REDACTED\]/);
});
test('diagnostic defines explicit PASS FAIL SKIPPED states',async()=>{
 const {classifyCheck}=await load();
 assert.equal(classifyCheck(null,0),'PASS');
 assert.equal(classifyCheck(null,1),'FAIL');
 assert.equal(classifyCheck('SKIPPED',0),'SKIPPED');
});
test('diagnostic offers safe non-destructive offline mode',()=>{
 const script=readFileSync(path.join(root,'infrastructure/scripts/diagnose-build.mjs'),'utf8');
 assert.match(script,/--install/);
 assert.match(script,/check\('Source syntax\/imports'/);
 assert.match(script,/check\('Next\.js and NestJS build'/);
 assert.doesNotMatch(script,/\['run','db:migrate'\]|check:e2e-db|test:e2e/);
 assert.match(script,/No PostgreSQL migration/);
});
