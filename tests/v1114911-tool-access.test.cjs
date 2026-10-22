'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {requiresToolLogin,safeToolReturn}=require('../apps/web/src/lib/tool-access.cjs');
test('Calculators and personal tools require login, public learning remains accessible',()=>{
 for(const p of ['/chart','/bazi','/calendar','/good-days','/mai-hoa','/luc-hao','/ky-mon/depth','/tarot','/western-astrology/relationship','/study','/collection','/birth-profiles'])assert.equal(requiresToolLogin(p),true,p);
 for(const p of ['/','/login','/huyen-hoc','/academy','/library','/research','/star-atlas','/chartroom'])assert.equal(requiresToolLogin(p),false,p);
});
test('Return destination retains entry/query while rejecting external and malformed redirects',()=>{
 assert.equal(safeToolReturn('/bazi?entry=abc#result'),'/bazi?entry=abc#result');
 assert.equal(safeToolReturn('/western-astrology/relationship?entry=abc'),'/western-astrology/relationship?entry=abc');
 for(const p of [null,'https://evil.invalid/','//evil.invalid/','/\\evil.invalid/','/login?next=/login','/chart\n','/chart/../../login','/%2f%2fevil.invalid','/not-a-tool','/chart?'+'x'.repeat(2048)])assert.equal(safeToolReturn(p),'/chart');
});
