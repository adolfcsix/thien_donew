'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const {analyzeHourSignals}=require('../apps/web/src/features/ky-mon/hour-signals.cjs');
const {buildPalaceLedger}=require('../apps/web/src/features/ky-mon/palace-ledger.cjs');
const field=(row,key)=>row.fields.find(f=>f.key===key);
function fixture(term=3,day=52,branch=5){const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index});return {base,plate:buildRotatingHourPlate(base)};}
test('ledger retains all nine palaces and nine distinguishable evidence fields',()=>{
 const {base,plate}=fixture();const ledger=buildPalaceLedger(base,plate);
 assert.equal(ledger.entries.length,9);assert.equal(new Set(ledger.entries.map(p=>p.number)).size,9);
 for(const row of ledger.entries){assert.equal(row.fields.length,9);assert.equal(new Set(row.fields.map(f=>f.key)).size,9);assert.equal(row,ledger.byPalace[row.number]);}
 assert.equal(ledger.status,'research-only');
});
test('earth-only formation never supplies time signs as absent or present',()=>{
 const base=makeBaseFormation({solarTermIndex:12,dayCycleIndex:14});const ledger=buildPalaceLedger(base);
 assert.equal(ledger.status,'earth-only');assert.equal(ledger.steps.length,3);
 for(const row of ledger.entries){assert.equal(field(row,'earth').value,base.plate.byPalace[row.number]);for(const f of row.fields.filter(f=>f.key!=='earth')){assert.equal(f.value,null);assert.equal(f.status,'not-computed');assert.equal(f.sourcePalace,null);}}
});
test('changing periods retains existing layer values and source links across all 24 terms',()=>{
 for(let term=0;term<24;term++)for(const day of [0,14,29,52])for(const branch of [0,5,8,11]){
  const {base,plate}=fixture(term,day,branch);const signals=analyzeHourSignals(base,plate);const ledger=buildPalaceLedger(base,plate);
  for(const row of ledger.entries){const c=plate.byPalace[row.number];
   assert.deepEqual(['earth','heaven','star','door','deity'].map(k=>field(row,k).value),[c.earthStem,c.heavenStem,c.star,c.door,c.deity]);
   assert.equal(field(row,'heaven').sourcePalace,c.starFromPalace);
   assert.equal(field(row,'door').sourcePalace,c.doorFromPalace);
   assert.equal(field(row,'void').status,c.voidAtPalace?'present':'absent');
   assert.equal(field(row,'hourHorse').status,signals.byPalace[row.number].hourHorse?'present':'absent');
   assert.equal(field(row,'dayHorse').status,signals.byPalace[row.number].dayHorse?'present':'absent');
   assert.equal(field(row,'striking').status,signals.byPalace[row.number].strikingInstruments.length?'present':'absent');
   for(const f of row.fields)if(f.sourcePalace!==null)assert.ok(ledger.byPalace[f.sourcePalace]);
  }
 }
});
test('center has no independently assigned heaven stem, star, door or deity',()=>{
 const {base,plate}=fixture();const center=buildPalaceLedger(base,plate).byPalace[5];
 for(const k of ['heaven','star','door','deity']){assert.equal(field(center,k).value,null);assert.equal(field(center,k).status,'convention');}
});
test('Tian Qin host follows moved Tian Rui, not a hardcoded current palace 2',()=>{
 let moved=0;
 for(let branch=0;branch<12;branch++){
  const {base,plate}=fixture(3,52,branch);const host=plate.palaces.find(p=>p.lodgedTianQin);
  const ledger=buildPalaceLedger(base,plate);const f=field(ledger.byPalace[5],'star');
  assert.equal(f.sourcePalace,host.number);assert.ok(f.explanation.includes(`cung ${host.number}`));
  assert.equal(ledger.byPalace[host.number].lodgedTianQin,true);assert.equal(host.star,'Thiên Nhuế');
  if(host.number!==2)moved++;
 }
 assert.ok(moved>0);
});
test('Giáp hour uses its hidden instrument in step explanation',()=>{
 const {base,plate}=fixture(0,0,0);assert.equal(base.chief.hourName,'Giáp Tý');
 const steps=buildPalaceLedger(base,plate).steps.join('\n');assert.ok(steps.includes('Can giờ Mậu'));assert.ok(!steps.includes('Can giờ Giáp'));
});
test('chief-star and chief-door targets are existing output flags, not reassigned',()=>{
 for(const term of [0,12]){const {base,plate}=fixture(term);const ledger=buildPalaceLedger(base,plate);assert.equal(ledger.entries.filter(p=>p.chiefStarLanding).length,1);assert.equal(ledger.byPalace[plate.chiefStarLanding].chiefStarLanding,true);assert.equal(ledger.byPalace[plate.chiefDoorLanding].chiefDoorLanding,true);}
});
test('hour/day horses remain separately named even if they land in the same palace',()=>{
 const {base,plate}=fixture(0,0,0);const ledger=buildPalaceLedger(base,plate);
 const hour=ledger.entries.find(p=>field(p,'hourHorse').status==='present');const day=ledger.entries.find(p=>field(p,'dayHorse').status==='present');
 assert.equal(hour.number,day.number);assert.notEqual(field(hour,'hourHorse').label,field(day,'dayHorse').label);
});
test('rejects inconsistent base or altered hour metadata rather than explaining a forged board',()=>{
 const {base,plate}=fixture();assert.throws(()=>buildPalaceLedger({...base,ju:99},plate),RangeError);
 assert.throws(()=>buildPalaceLedger(base,{...plate,starShift:99}),RangeError);
 const cells={...plate.byPalace,4:{...plate.byPalace[4],heavenStem:'fake'}};
 assert.throws(()=>buildPalaceLedger(base,{...plate,byPalace:cells}),RangeError);
});
test('missing layer pairs are rejected and invalid day cannot be silently normalized',()=>{
 const {base,plate}=fixture();assert.throws(()=>buildPalaceLedger(base),TypeError);
 assert.throws(()=>buildPalaceLedger(makeBaseFormation({solarTermIndex:0,dayCycleIndex:0}),plate),TypeError);
 assert.throws(()=>buildPalaceLedger({...base,day:'bad'},plate),RangeError);assert.throws(()=>buildPalaceLedger(null),TypeError);
});
test('ledger does not mutate source layers and exposed field arrays are immutable',()=>{
 const {base,plate}=fixture();const before=JSON.stringify({base,plate});const ledger=buildPalaceLedger(base,plate);
 assert.equal(JSON.stringify({base,plate}),before);assert.ok(Object.isFrozen(ledger));assert.ok(Object.isFrozen(ledger.entries));
 assert.throws(()=>{ledger.byPalace[1].fields[0].value='fake'},TypeError);assert.throws(()=>ledger.steps.push('fake'),TypeError);
 assert.equal(JSON.stringify({base,plate}),before);
});
test('does not add a predicted outcome or auspicious score to the ledger',()=>{
 const {base,plate}=fixture();const ledger=buildPalaceLedger(base,plate);assert.equal('score' in ledger,false);assert.equal('outcome' in ledger,false);assert.match(ledger.note,/Không suy cát hung/);
});
