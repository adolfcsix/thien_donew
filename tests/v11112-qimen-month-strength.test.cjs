'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const fixture=require('./fixtures/qimen-v11112-month-strength-independent.json');
const {monthFromTerm,strengthForElement,analyzeMonthStrength}=require('../apps/web/src/features/ky-mon/month-strength.cjs');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
test('50 independent element/month cells keep Cuu Tinh and generic rules separate',()=>{
 for(const [row,element] of fixture.elementOrder.entries())for(const [col,month] of fixture.elementOrder.entries()){
  assert.equal(strengthForElement(element,month).state,fixture.genericRows[row][col]);
  assert.equal(strengthForElement(element,month,'baojian-star-month').state,fixture.starRows[row][col]);
 }
 assert.equal(strengthForElement('Mộc','Mộc').state,'vượng');assert.equal(strengthForElement('Mộc','Mộc','baojian-star-month').state,'tướng');
 assert.equal(strengthForElement('Thủy','Mộc','baojian-star-month').state,'vượng');
});
test('all 24 terms map to independent Jie-month branches including winter wrap and Earth months',()=>{
 for(let index=0;index<24;index++){
  const m=monthFromTerm(index);assert.equal(m.branch,fixture.termBranches[index]);assert.equal(m.element,fixture.branchElements[m.branch]);
 }
 for(const value of [-1,24,2.5,'3',null,NaN])assert.throws(()=>monthFromTerm(value),RangeError);
 for(const args of [['bad','Mộc'],['Mộc',null],['Mộc','Thủy','unverified']])assert.throws(()=>strengthForElement(...args),RangeError);
});
test('17280 boards evaluate actual moved doors/stems/stars and exactly one lodged Tian Qin',()=>{
 const expected=(element,month,star)=>fixture[star?'starRows':'genericRows'][fixture.elementOrder.indexOf(element)][fixture.elementOrder.indexOf(month)];
 const terms=new Set(),states=new Set();let count=0;
 for(let term=0;term<24;term++)for(let day=0;day<60;day++)for(let branch=0;branch<12;branch++){
  const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index}),plate=buildRotatingHourPlate(base);
  const before=JSON.stringify({base,plate}),report=analyzeMonthStrength(base,plate);assert.equal(JSON.stringify({base,plate}),before);
  const month=fixture.branchElements[fixture.termBranches[term]];assert.equal(report.month.element,month);assert.equal(report.interpretation,null);terms.add(term);
  let stars=0,lodged=0;
  for(const cell of plate.palaces){const e=report.byPalace[cell.number];
   if(cell.number===5){assert.equal(e.status,'convention');assert.equal(e.stars.length,0);assert.equal(e.stem.state,null);assert.equal(e.door.state,null);assert.equal(e.lodgedStarHost,plate.palaces.find(p=>p.lodgedTianQin).number);continue;}
   assert.equal(e.door.symbol,cell.door);assert.equal(e.stem.symbol,cell.heavenStem);
   assert.equal(e.door.state,expected(fixture.doorElements[cell.door],month,false));assert.equal(e.stem.state,expected(fixture.stemElements[cell.heavenStem],month,false));
   assert.equal(e.stars[0].symbol,cell.star);
   for(const star of e.stars){assert.equal(star.state,expected(fixture.starElements[star.symbol],month,true));states.add(star.state);stars++;if(star.lodged){lodged++;assert.equal(star.symbol,'Thiên Cầm');assert.equal(cell.lodgedTianQin,true);}}
   states.add(e.door.state);states.add(e.stem.state);
  }
  assert.equal(stars,9);assert.equal(lodged,1);assert.ok(Object.isFrozen(report.byPalace[1].stars));count++;
 }
 assert.equal(count,17280);assert.equal(terms.size,24);assert.equal(states.size,6);
});
test('no hour never substitutes home layers; forged and mismatched boards fail closed',()=>{
 const base=makeBaseFormation({solarTermIndex:3,dayCycleIndex:0}),r=analyzeMonthStrength(base);
 assert.ok(r.entries.every(e=>e.status==='not-computed'&&e.stars.length===0&&e.door.state===null&&e.stem.state===null));
 const full=makeBaseFormation({solarTermIndex:3,dayCycleIndex:0,hourCycleIndex:2}),plate=buildRotatingHourPlate(full);
 assert.throws(()=>analyzeMonthStrength(full),TypeError);
 assert.throws(()=>analyzeMonthStrength({...full,solarTermIndex:4},plate),RangeError);
 assert.throws(()=>analyzeMonthStrength(full,{...plate,method:'Phi Bàn'}),RangeError);
 assert.throws(()=>analyzeMonthStrength(full,{...plate,byPalace:{...plate.byPalace,1:{...plate.byPalace[1],star:'bad'}}}),RangeError);
});
test('V11.111 patterns and V11.112 month reports are connected to the actual page',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/ky-mon/page.tsx'),'utf8');
 for(const name of ['analyzePatternSignals','PatternEvidencePanel','analyzeMonthStrength','MonthStrengthPanel'])assert.match(source,new RegExp(name));
 assert.match(source,/<PatternEvidencePanel report=\{patternReport\}/);assert.match(source,/<MonthStrengthPanel report=\{monthReport\}/);
});
