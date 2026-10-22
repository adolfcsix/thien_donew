'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fixture=require('./fixtures/qimen-v11111-patterns-independent.json');
const {observePatternPair,analyzePatternSignals}=require('../apps/web/src/features/ky-mon/pattern-signals.cjs');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
test('six independently recorded xun tables: all 486 ordered stem pairs and both directions',()=>{
 let cases=0;
 for(const row of fixture.rows)for(const heaven of fixture.stemOrder)for(const earth of fixture.stemOrder){
  const result=observePatternPair(row.xun,heaven,earth);
  for(const key of ['dragon','bird'])assert.equal(result[key],row[key][0]===heaven&&row[key][1]===earth?'present':'absent');
  cases++;
 }
 assert.equal(cases,486);
 for(const row of fixture.rows.slice(1))assert.equal(observePatternPair(row.xun,'Mậu','Bính').dragon,'absent');
});
test('no hour stays not-computed; invalid pair identifiers fail',()=>{
 const base=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0});const r=analyzePatternSignals(base);
 assert.ok(r.entries.every(e=>e.dragon==='not-computed'&&e.bird==='not-computed'));
 assert.ok(r.patterns.every(p=>p.status==='not-computed'));
 for(const args of [['Giáp Tý','Giáp','Bính'],['bad','Mậu','Bính'],['Giáp Tý',null,'Bính']])assert.throws(()=>observePatternPair(...args),RangeError);
});
test('17280 live boards cover six xun, both dun, center missing and ordered matches',()=>{
 const xuns=new Set(),duns=new Set(),missing=new Set(),positive=new Set();let cases=0;
 for(let term=0;term<24;term++)for(let day=0;day<60;day++)for(let branch=0;branch<12;branch++){
  const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index});const plate=buildRotatingHourPlate(base);
  const before=JSON.stringify({base,plate});const r=analyzePatternSignals(base,plate);assert.equal(JSON.stringify({base,plate}),before);
  const row=fixture.rows.find(row=>row.xun===base.chief.xunHead);assert.ok(row);xuns.add(row.xun);duns.add(base.dun);
  assert.equal(r.hiddenStem,row.hidden);assert.equal(r.interpretation,null);
  for(const cell of plate.palaces)for(const key of ['dragon','bird']){
   assert.equal(r.byPalace[cell.number][key],cell.number===5?'convention':cell.heavenStem===row[key][0]&&cell.earthStem===row[key][1]?'present':'absent');
  }
  for(const p of r.patterns){
   const represented=plate.palaces.find(c=>c.number!==5&&c.heavenStem===row[p.id][0]);
   assert.equal(p.status,!represented?'not-represented':represented.earthStem===row[p.id][1]?'present':'absent');
   assert.equal(p.palaceNumber,represented?.number??null);
   if(p.status==='not-represented'){missing.add(p.id);assert.equal(plate.centerEarthStem,row[p.id][0]);}
   if(p.status==='present')positive.add(p.id);
  }
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.entries[0]));cases++;
 }
 assert.equal(cases,17280);assert.equal(xuns.size,6);assert.equal(duns.size,2);assert.equal(missing.size,2);assert.equal(positive.size,2);
});
test('forged board layers, missing plate and changed xun are rejected',()=>{
 const base=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0,hourCycleIndex:2});const plate=buildRotatingHourPlate(base);
 assert.throws(()=>analyzePatternSignals(base),TypeError);
 assert.throws(()=>analyzePatternSignals({...base,chief:{...base.chief,xunHead:'Giáp Tuất'}},plate));
 assert.throws(()=>analyzePatternSignals(base,{...plate,method:'Phi Bàn'}));
 assert.throws(()=>analyzePatternSignals(base,{...plate,byPalace:{...plate.byPalace,1:{...plate.byPalace[1],earthStem:'bad'}}}));
});
