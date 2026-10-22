'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {describeClassicalCandidateCriteria}=require('../packages/interpretation/src/classical-condition-diagnostics.cjs');
const makeChart=()=>({houses:Array.from({length:12},(_,i)=>({branchIndex:i,branch:String(i),palace:i===0?'Mệnh':`Cung ${i}`,stars:[],auxiliaryStars:[],mainStarStrengths:[]}))});
test('V11.39: missing stars are identified without claims of a formed classical configuration',()=>{
 const result=describeClassicalCandidateCriteria(makeChart(),0);assert.equal(result.length,4);
 assert.equal(result.every(x=>!x.structuralCandidate&&!x.classicalFormationConfirmed),true);
 assert.ok(result.find(x=>x.id==='sat-pha-tham').missing.length===3);
});
test('V11.39: full Tử Phủ Vũ Tướng configuration is merely structural, never expert certified',()=>{
 const chart=makeChart();chart.houses[0].stars=['Tử Vi'];chart.houses[4].stars=['Thiên Phủ'];
 chart.houses[8].stars=['Vũ Khúc'];chart.houses[6].stars=['Thiên Tướng'];
 chart.houses[6].auxiliaryStars=['Tả Phụ'];
 const rule=describeClassicalCandidateCriteria(chart,0).find(x=>x.id==='tu-phu-vu-tuong');
 assert.equal(rule.structuralCandidate,true);assert.equal(rule.classicalFormationConfirmed,false);
 assert.deepEqual(rule.missing,[]);assert.ok(rule.supportPresent.includes('Tả Phụ'));
 assert.equal(rule.strengths.every(s=>s.status===null),true);
});
test('V11.39: natal duplicates invalidate candidacy rather than choosing an arbitrary palace',()=>{
 const chart=makeChart();chart.houses[0].stars=['Tử Vi'];chart.houses[4].stars=['Thiên Phủ','Tử Vi'];
 chart.houses[8].stars=['Vũ Khúc'];chart.houses[6].stars=['Thiên Tướng'];
 const rule=describeClassicalCandidateCriteria(chart,0).find(x=>x.id==='tu-phu-vu-tuong');
 assert.equal(rule.structuralCandidate,false);assert.equal(rule.missing.find(s=>s.star==='Tử Vi').status,'ambiguous-duplicate');
});
test('V11.39: cannot trigger a candidate when focus is not Mệnh or star is outside Tứ chính',()=>{
 const chart=makeChart();chart.houses[0].stars=['Tử Vi'];chart.houses[1].stars=['Thiên Phủ'];
 chart.houses[8].stars=['Vũ Khúc'];chart.houses[6].stars=['Thiên Tướng'];
 assert.equal(describeClassicalCandidateCriteria(chart,0).find(x=>x.id==='tu-phu-vu-tuong').structuralCandidate,false);
 assert.equal(describeClassicalCandidateCriteria(chart,6).every(x=>!x.structuralCandidate),true);
});
test('V11.39: annual overlay does not satisfy missing classical natal main stars',()=>{
 const chart=makeChart();chart.houses[0].stars=['Tử Vi'];chart.houses[4].stars=['Thiên Phủ'];
 chart.houses[8].stars=['Vũ Khúc'];chart.houses[6].yearStars=['Thiên Tướng'];
 assert.equal(describeClassicalCandidateCriteria(chart,0).find(x=>x.id==='tu-phu-vu-tuong').structuralCandidate,false);
});
test('V11.39: damaged 12 palace structure is rejected early',()=>{
 assert.throws(()=>describeClassicalCandidateCriteria({houses:[]},0),RangeError);
 assert.throws(()=>describeClassicalCandidateCriteria(makeChart(),12),RangeError);
});
test('V11.39: the existing public palace reading exposes criteria only for Mệnh and never mutates natal input',()=>{
 const Engine=require('../packages/astrology-engine/src/tuvi.js');
 const {buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
 const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const original=JSON.stringify(chart);
 const menh=chart.houses.find(h=>h.palace==='Mệnh');
 const result=buildPalaceReading({chart,branchIndex:menh.branchIndex});
 assert.equal(result.classicalCriteria.length,4);
 assert.ok(result.classicalCriteria.every(x=>x.classicalFormationConfirmed===false));
 const others=chart.houses.filter(h=>h.palace!=='Mệnh');
 assert.ok(others.every(h=>buildPalaceReading({chart,branchIndex:h.branchIndex}).classicalCriteria.length===0));
 assert.equal(JSON.stringify(chart),original);
});
