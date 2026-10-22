'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {audit}=require('../infrastructure/scripts/audit-capabilities.cjs');
const {capabilityRegistry}=require('../packages/knowledge/src/index.cjs');

test('capability inventory is internally consistent and points to existing implementation',()=>{
  assert.deepEqual(audit.errors,[]);
  assert.equal(audit.counts['source-implemented']+audit.counts['internal-partial']+audit.counts['not-implemented'], audit.moduleCount);
});
test('missing modules are never exposed with fake public links',()=>{
  const missing=capabilityRegistry.listCapabilities({status:'not-implemented'});
  for(const id of ['books','forum','gieo-que-nhan-menh'])assert.ok(missing.some(m=>m.id===id),id);
  assert.ok(missing.every(m=>m.route===null && m.evidencePaths.length===0));
  for (const link of capabilityRegistry.publicCapabilityLinks()) {
    assert.equal(capabilityRegistry.getCapability(link.id)?.status,'source-implemented');
    assert.equal(link.href,capabilityRegistry.getCapability(link.id)?.route);
  }
});
test('reference screenshot domains are tracked without invented implementation',()=>{
  for (const id of ['gieo-que-nhan-menh']) {
    const m=capabilityRegistry.getCapability(id);
    assert.equal(m.referenceMenuObserved,true);
    assert.equal(m.status,'not-implemented');
  }
});
test('Ha Lac now has real implementation evidence and keeps research limits',()=>{
 const m=capabilityRegistry.getCapability('ha-lac');
 assert.equal(m.referenceMenuObserved,true);assert.equal(m.status,'source-implemented');assert.equal(m.route,'/ha-lac');
 const fs=require('node:fs'),path=require('node:path');for(const p of m.evidencePaths)assert.ok(fs.existsSync(path.join(__dirname,'..',p)),p);
 const matrix=require('../packages/knowledge/src/development-matrix.json').records.find(r=>r.id==='ha-lac');assert.equal(matrix.analysis,'research-only');assert.ok(matrix.gap);
});
test('internal synthesis is not presented as a finished user-facing screen',()=>{
  const reading=capabilityRegistry.getCapability('deep-interpretation');
  assert.equal(reading.status,'internal-partial');
  assert.equal(reading.route,null);
});
test('stable IDs, immutable evidence and safe lookups',()=>{
  const m=capabilityRegistry.getCapability('tu-vi');
  assert.equal(m.route,'/chart');
  assert.ok(Object.isFrozen(m) && Object.isFrozen(m.evidencePaths));
  assert.equal(capabilityRegistry.getCapability('__proto__'),null);
  assert.equal(capabilityRegistry.getCapability({}),null);
  assert.equal(capabilityRegistry.getCapability('not-a-domain'),null);
  assert.equal(new Set(capabilityRegistry.listCapabilities().map(x=>x.id)).size,audit.moduleCount);
});
test('knowledge inventory distinguishes content records from verified algorithms',()=>{
  const info=require('../infrastructure/scripts/audit-knowledge-coverage.cjs').audit;
  assert.deepEqual(info.warnings,[]);
  assert.equal(info.primaryStarCount,14);
  assert.equal(info.primaryStarPalaceEntries,168);
  assert.equal(info.lessonCount,require('../apps/web/src/features/academy/lessons.json').length);
  assert.ok(info.glossaryCount>=28);
  assert.equal(info.glossaryCount,require('../apps/web/src/features/academy/glossary.json').length);
  assert.ok(info.boundaries.some(x=>x.includes('formulas')));
});
test('publicly recognized capabilities are backed by current navigation',()=>{
  const fs=require('node:fs');
  const nav=fs.readFileSync(require('node:path').join(__dirname,'../apps/web/src/lib/navigation.ts'),'utf8');
  for (const item of capabilityRegistry.publicCapabilityLinks()) {
    assert.ok(nav.includes(`href: '${item.href}'`),`missing navigation entry for ${item.id}`);
  }
});

test("current Mai Hoa/Qimen have public source and Liuren/Taiyi remain internal research",()=>{
 for(const id of ["mai-hoa","ky-mon"])assert.equal(capabilityRegistry.getCapability(id).status,"source-implemented");
 for(const id of ["luc-nham","thai-at"])assert.equal(capabilityRegistry.getCapability(id).status,"internal-partial");
});
