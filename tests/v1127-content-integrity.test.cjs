'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const K=require('../packages/knowledge/src/index.cjs');
test('168 distinct primary-star / palace narratives have correct singular palace',()=>{
 let count=0;
 for (const [star, palaces] of Object.entries(K.primaryStarPalaceGuidance.records)) {
  for (const [palace, entry] of Object.entries(palaces)) {
   count++;
   assert.ok(entry.interpretation.includes(`Ở cung ${palace}, ${star}`));
   assert.ok(!entry.interpretation.includes("['Mệnh'"),'no serialized list placeholder');
   assert.ok(entry.potential.length>35&&entry.tradeoff.length>40);
   assert.equal(entry.evidence,'editorial-heuristic-not-traditionally-validated');
   assert.equal(entry.status,'editorial-unreviewed');
   assert.equal(entry.requiredContext.length,4);
  }
 }
 assert.equal(count,168);
});
test('knowledge lookup rejects inherited keys',()=>{
 assert.equal(K.lookupPrimaryStarPalace('toString','Mệnh'),null);
 assert.equal(K.lookupPrimaryStarPalace('Tử Vi','__proto__'),null);
});
