'use strict';
const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {readFileSync}=require('node:fs');
let classifyTap,missingRuntimeDependencies;
before(async()=>({classifyTap,missingRuntimeDependencies}=await import('../infrastructure/scripts/classify-node-test-failures.mjs')));
test('A71: Node TAP classifier counts all missing dependencies but never marks failures as passing',()=>{
 const log=`# Error: Cannot find module 'pg'\n# Subtest: tests/fixture-a.test.cjs\nnot ok 1 - tests/fixture-a.test.cjs\n# Subtest: runtime assertion\nnot ok 2 - runtime assertion\n  error: |-\n    Cannot find module 'react'\n# Subtest: launcher conflict\nnot ok 3 - launcher conflict\n# Subtest: independent test\nok 4 - independent test\n1..4\n# tests 4\n# pass 1\n# fail 3\n# cancelled 0\n# skipped 0`;
 const r=classifyTap(log);
 assert.equal(r.summary.fail,3);
 assert.equal(r.missingModules.pg,1);
 assert.equal(r.missingModules.react,1);
 assert.equal(r.unresolvedWithoutModuleEvidence,1);
 assert.equal(r.integrityOk,true);
});
test('A71: classifier identifies invalid or incomplete TAP summaries',()=>{
 const r=classifyTap('not ok 1 - failure\n# tests 2\n# pass 1\n# fail 0');
 assert.equal(r.integrityOk,false);
});
test('A71: all five blocked dependency names are declared in immutable lockfile',()=>{
 const rows=missingRuntimeDependencies();
 assert.equal(rows.length,5);
 assert.equal(rows.every(r=>r.locked),true);
 assert.equal(new Set(rows.map(r=>r.name)).size,5);
});
