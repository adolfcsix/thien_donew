'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const K=require('../packages/knowledge/src/index.cjs');
const {records,status}=K.primaryStarPalaceGuidance;
test('14 primary stars and 12 distinct palaces are mapped',()=>{
 assert.equal(Object.keys(records).length,14);
 for(const [star,palaces] of Object.entries(records)){
   assert.deepEqual(Object.keys(palaces).sort(),[...K.palaceNames].sort(),star);
   for(const [palace,entry] of Object.entries(palaces)){
     assert.ok(entry.interpretation.includes(star)&&entry.interpretation.includes(palace));
     assert.equal(entry.status,'editorial-unreviewed');
     assert.ok(entry.reflection.length>50);
   }
 }
 assert.equal(status,'editorial-unreviewed');
});
test('lookup returns only approved pairs, never prototype keys',()=>{
 assert.equal(K.lookupPrimaryStarPalace('Tử Vi','Mệnh').status,'editorial-unreviewed');
 for(const [star,palace] of [['__proto__','Mệnh'],['Tử Vi','constructor'],['Nope','Mệnh'],[null,'Mệnh']])assert.equal(K.lookupPrimaryStarPalace(star,palace),null);
});
