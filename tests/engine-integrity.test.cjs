'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../packages/astrology-engine/src/tuvi.js');
const verify=require('../packages/astrology-engine/src/verify.js');
const cases=[
 {date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'},
 {date:'2000-02-29',hour:23,minute:40,calendar:'solar',leap:false,gender:'Nữ'},
 {date:'2023-01-22',hour:1,minute:0,calendar:'solar',leap:false,gender:'Nam'},
 {date:'2026-02-17',hour:12,minute:0,calendar:'solar',leap:false,gender:'Nữ'},
];
for(const input of cases)test(`V8 engine regression ${input.date} ${input.gender}`,()=>{const chart=engine.calculate(input);assert.equal(chart.houses.length,12);assert.equal(chart.houses.reduce((n,h)=>n+h.stars.length,0),14);assert.equal(verify.check(chart).passed,true);});
test('reject invalid dates',()=>{assert.throws(()=>engine.calculate({...cases[0],date:'2026-02-30'}));});
test('engine unchanged name and rule set',()=>{assert.equal(engine.RULESET,'tam-hop-core-v6.0');});
