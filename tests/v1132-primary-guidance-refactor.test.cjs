'use strict';
/** Regression contract for lossless normalization of the editorial star-palace grid. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const compactPath=path.join(root,'packages/knowledge/src/primary-star-palace-guidance.json');
const compact=require(compactPath);
const {buildGuidance}=require('../packages/knowledge/src/primary-guidance.cjs');
const {primaryStarPalaceGuidance,lookupPrimaryStarPalace,palaceNames}=require('../packages/knowledge/src/index.cjs');
// Frozen baseline from the original V11.31 FULL_SOURCE.zip (unmodified JSON.stringify output).
const V1131_PUBLIC_DATA_SHA256='b079927ff887de03aa38021e3ce07daacc899b97fa32049fc9ffb355b0a04876';

test('V11.32 entire expanded public data is byte-identical to V11.31',()=>{
  const hash=crypto.createHash('sha256').update(JSON.stringify(primaryStarPalaceGuidance)).digest('hex');
  assert.equal(hash,V1131_PUBLIC_DATA_SHA256);
  assert.equal(primaryStarPalaceGuidance.status,'editorial-unreviewed');
});
test('V11.32 each of 168 star/palace pairs hydrates and lookups stay safe',()=>{
  assert.equal(compact.schemaVersion,'2.0');
  assert.equal(Object.keys(compact.starShared).length,14);
  assert.equal(Object.keys(compact.records).length,14);
  let pairs=0;
  for (const [star,all] of Object.entries(compact.records)){
    assert.deepEqual(Object.keys(all),palaceNames);
    for (const [palace,entry] of Object.entries(all)){
      pairs++;
      assert.equal(Object.hasOwn(entry,'tradeoff'),false);
      assert.equal(Object.hasOwn(entry,'reflection'),false);
      assert.equal(lookupPrimaryStarPalace(star,palace).status,compact.defaults.status);
    }
  }
  assert.equal(pairs,168);
  assert.equal(lookupPrimaryStarPalace('__proto__','Mệnh'),null);
});
test('V11.32 hydration rejects missing or malformed star-level metadata',()=>{
  const malformed=structuredClone(compact);
  delete malformed.starShared['Tử Vi'];
  assert.throws(()=>buildGuidance(malformed),/Missing common entry/);
  const malformed2=structuredClone(compact);
  malformed2.starShared['Tử Vi'].reflectionTemplate='not a valid template';
  assert.throws(()=>buildGuidance(malformed2),/Malformed common entry/);
});
test('V11.32 records do not share mutable array references',()=>{
  const expanded=buildGuidance();
  const a=expanded.records['Tử Vi']['Mệnh'];
  const b=expanded.records['Tử Vi']['Phụ Mẫu'];
  const before=[...b.requiredContext];
  a.requiredContext.push('test mutation');
  assert.deepEqual(b.requiredContext,before);
  assert.equal(primaryStarPalaceGuidance.records['Tử Vi']['Mệnh'].requiredContext.includes('test mutation'),false);
});
test('V11.32 normalized source is smaller without deleting unique content',()=>{
  assert.ok(fs.statSync(compactPath).size<180000);
  const r=primaryStarPalaceGuidance.records;
  assert.equal(Object.values(r).flatMap(x=>Object.values(x)).length,168);
});
