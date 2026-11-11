'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {isStudyOpenFor,toggleStudyFor}=require('../apps/web/src/features/chart/lib/late-zi-visibility.cjs');
const birth={date:'2024-02-09',hour:23,minute:0,calendar:'solar',gender:'Nam'};
test('r39: optional comparison is closed until the current chart opens it',()=>{
 const chart=Engine.calculate(birth);
 assert.equal(isStudyOpenFor(null,chart),false);
 assert.equal(isStudyOpenFor(toggleStudyFor(null,chart),chart),true);
 assert.equal(toggleStudyFor(chart,chart),null);
 assert.equal(isStudyOpenFor(chart,null),false);
});
test('r39: changing even one birth minute or reconstructing the same chart resets comparison',()=>{
 const a=Engine.calculate(birth);
 const b=Engine.calculate({...birth,minute:59});
 const sameValuesNewObject=Engine.calculate({...birth});
 assert.notEqual(a,b);
 assert.notEqual(a,sameValuesNewObject);
 assert.equal(isStudyOpenFor(a,b),false);
 assert.equal(isStudyOpenFor(a,sameValuesNewObject),false);
 assert.equal(toggleStudyFor(a,b),b);
 assert.equal(isStudyOpenFor(b,b),true);
 assert.equal(isStudyOpenFor(b,a),false);
});
test('r39: the current-day scenario never opens at another birth hour',()=>{
 const a=Engine.calculate(birth);
 const b=Engine.calculate({...birth,hour:22});
 assert.equal(toggleStudyFor(a,b),null);
 assert.equal(toggleStudyFor(null,b),null);
 assert.equal(isStudyOpenFor(a,b),false);
 assert.equal(isStudyOpenFor(b,b),false);
});
test('r39: study toggles preserve chart output and do not change default calendar rules',()=>{
 const a=Engine.calculate(birth),before=JSON.stringify(a);
 let opened=null;
 for(let i=0;i<5;i++)opened=toggleStudyFor(opened,a);
 assert.equal(isStudyOpenFor(opened,a),true);
 assert.equal(JSON.stringify(a),before);
 assert.equal(a.lunar.year,2023);
 assert.equal(a.lunar.month,12);
});
