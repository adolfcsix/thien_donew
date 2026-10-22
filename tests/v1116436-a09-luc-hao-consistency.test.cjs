'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {HEXAGRAMS}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');

test('Na Jia charts for every one of 64 canonical hexagrams stay consistent',()=>{
 assert.equal(HEXAGRAMS.length,64);
 for(const h of HEXAGRAMS){
  const chart=makeNaJiaChart(h);
  assert.equal(chart.hexagram,h);
  assert.equal(chart.lines.length,6);
  assert.deepEqual(makeNaJiaChart({bits:h.bits}).lines,chart.lines);
 }
});

test('Reject mismatched trigram metadata instead of quietly producing incorrect stems and branches',()=>{
 const qian=HEXAGRAMS.find(h=>h.number===1);
 const kun=HEXAGRAMS.find(h=>h.number===2);
 assert.ok(qian&&kun);
 for(const forged of [
  {...qian,lower:kun.lower},
  {...qian,upper:kun.upper},
  {...qian,number:2},
  {...qian,lower:kun.lower,upper:kun.upper},
  {...qian,lower:null},
  {...qian,upper:{...qian.upper,bits:'000'}},
 ]) assert.throws(()=>makeNaJiaChart(forged),/không nhất quán/);
});
