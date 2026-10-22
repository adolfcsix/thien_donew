'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../infrastructure/scripts/lib/test-shard-groups.mjs');
test('known 201-year audit runs alone while every other file runs exactly once',async()=>{
 const {buildTestGroups}=await load();const files=Array.from({length:178},(_,i)=>`tests/file-${i}.test.cjs`);files.splice(80,0,'tests/v1123-temporal-audit.test.cjs');
 const groups=buildTestGroups(files);assert.equal(groups.length,6);assert.deepEqual(groups[0],['tests/v1123-temporal-audit.test.cjs']);
 assert.deepEqual(groups.flat().sort(),files.slice().sort());assert.equal(new Set(groups.flat()).size,files.length);
 assert.ok(Math.max(...groups.slice(1).map(g=>g.length))-Math.min(...groups.slice(1).map(g=>g.length))<=1);
});
test('small inventories never create empty shards or lose the isolated audit',async()=>{
 const {buildTestGroups}=await load();
 for(const files of [['tests/a.test.cjs'],['tests/v1123-temporal-audit.test.cjs'],['tests/a.test.cjs','tests/v1123-temporal-audit.test.cjs']]){
  const groups=buildTestGroups(files);assert.ok(groups.every(g=>g.length));assert.deepEqual(groups.flat().sort(),files.slice().sort());
 }
});
test('ordinary test inventories retain six balanced partitions',async()=>{
 const {buildTestGroups}=await load();const files=Array.from({length:31},(_,i)=>`tests/${i}.test.cjs`);const groups=buildTestGroups(files);
 assert.equal(groups.length,6);assert.deepEqual(groups.flat().sort(),files.slice().sort());assert.deepEqual(groups.map(g=>g.length),[6,5,5,5,5,5]);
});
test('duplicate, missing and invalid names cannot result in apparent test coverage',async()=>{
 const {buildTestGroups}=await load();for(const files of [[],null,['a','a'],['a',''],['a',1]])assert.throws(()=>buildTestGroups(files),TypeError);
});

test('outer release deadline covers every bounded group plus process overhead',async()=>{
 const {MAX_TEST_GROUPS,TEST_GROUP_TIMEOUT_MS,TEST_RUNNER_TIMEOUT_MS}=await load();
 assert.equal(MAX_TEST_GROUPS,6);assert.equal(TEST_GROUP_TIMEOUT_MS,90000);
 assert.equal(TEST_RUNNER_TIMEOUT_MS,MAX_TEST_GROUPS*TEST_GROUP_TIMEOUT_MS+60000);
 const fs=require('node:fs');const path=require('node:path');
 const gate=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/verify-release.mjs'),'utf8');
 assert.match(gate,/verify-test-shards\.mjs'\], TEST_RUNNER_TIMEOUT_MS/);
 assert.match(gate,/TEST_RUNNER_TIMEOUT_MS=RUN_TIMEOUT_MS\+30000/);
});
