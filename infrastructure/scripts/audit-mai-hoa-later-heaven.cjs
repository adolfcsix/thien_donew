#!/usr/bin/env node
'use strict';
/** Independent 8x8x12 finite-space structural audit. Not a divination accuracy test. */
const assert=require('node:assert/strict');
const {castByLaterHeaven,compareLaterHeavenWithTwoNumbers}=require('../../apps/web/src/features/mai-hoa/casting.cjs');
const {TRIGRAMS,hexagramFromBits}=require('../../apps/web/src/features/iching/hexagrams.cjs');
const {compareElements}=require('../../apps/web/src/features/wuxing/elements.cjs');
const IDS={Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'};
let cases=0,differentLines=0,differentBodies=0,differentHexagrams=0;
const allOriginals=new Set(), eachMovingByPair=new Map();
for(let objectTrigram=1;objectTrigram<=8;objectTrigram++)for(let directionTrigram=1;directionTrigram<=8;directionTrigram++){
 const changes=new Set();
 for(let hourBranch=1;hourBranch<=12;hourBranch++){
  const input={objectTrigram,directionTrigram,hourBranch};
  const cast=castByLaterHeaven(input),comparison=compareLaterHeavenWithTwoNumbers(input);
  const original=TRIGRAMS[directionTrigram-1].bits+TRIGRAMS[objectTrigram-1].bits;
  const changedLine=((objectTrigram+directionTrigram+hourBranch-1)%6)+1;
  const bits=original.split('');bits[changedLine-1]=bits[changedLine-1]==='1'?'0':'1';
  const nuclear=original.slice(1,4)+original.slice(2,5);
  const expectedBody=changedLine<=3?TRIGRAMS[objectTrigram-1]:TRIGRAMS[directionTrigram-1];
  const expectedUse=changedLine<=3?TRIGRAMS[directionTrigram-1]:TRIGRAMS[objectTrigram-1];
  assert.equal(cast.original.bits,original);
  assert.equal(cast.original.number,hexagramFromBits(original).number);
  assert.equal(cast.nuclear.bits,nuclear);
  assert.equal(cast.transformed.bits,bits.join(''));
  assert.equal(cast.changingLine,changedLine);
  assert.equal(cast.upper.bits,TRIGRAMS[objectTrigram-1].bits);
  assert.equal(cast.lower.bits,TRIGRAMS[directionTrigram-1].bits);
  assert.equal(cast.body.id,expectedBody.id);assert.equal(cast.use.id,expectedUse.id);
  assert.equal(cast.relation.kind,compareElements(IDS[expectedBody.element],IDS[expectedUse.element]).kind);
  assert.equal(comparison.verdict,null);assert.equal(comparison.sameOriginal,true);
  assert.equal(comparison.difference.movingSeedDelta,hourBranch);
  assert.equal(comparison.simple.changingLine,((objectTrigram+directionTrigram-1)%6)+1);
  assert.equal(comparison.sameMovingLine,((hourBranch%6)===0));
  assert.equal(comparison.sameTransformed,comparison.sameMovingLine);
  allOriginals.add(cast.original.number);changes.add(changedLine);cases++;
  if(!comparison.sameMovingLine)differentLines++;
  if(comparison.difference.bodyChanged)differentBodies++;
  if(!comparison.sameTransformed)differentHexagrams++;
 }
 eachMovingByPair.set(`${objectTrigram}-${directionTrigram}`,changes.size);
}
assert.equal(cases,768);assert.equal(allOriginals.size,64);
assert.equal([...eachMovingByPair.values()].filter(x=>x===6).length,64);
assert.equal(differentLines,640);assert.equal(differentHexagrams,640);
const outcome={status:'PASS',method:'mai-hoa-later-heaven',combinationCases:cases,originalHexagrams:allOriginals.size,pairsWithAllSixMovingLines:64,alternativeDifferentMovingLines:differentLines,alternativeDifferentChangedHexagrams:differentHexagrams,alternativeDifferentBodyUse:differentBodies,scope:'STRUCTURAL_RESEARCH_ONLY'};
console.log('Mai Hoa Hậu Thiên audit:',JSON.stringify(outcome));
