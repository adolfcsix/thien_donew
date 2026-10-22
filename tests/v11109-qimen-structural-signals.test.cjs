'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const expected=require('./fixtures/qimen-v11109-independent.json');
const {doorObservation,graveObservation,analyzeStructuralSignals,RULE_PROFILE}=require('../apps/web/src/features/ky-mon/structural-signals.cjs');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
function board(term=3,day=52,branch=5){const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index});return {base,plate:buildRotatingHourPlate(base)};}
test('all 64 independently transcribed door cells agree, including 51 negatives',()=>{
 let positives=0;
 expected.doorOrder.forEach((door,row)=>expected.palaces.forEach((palace,column)=>{
  const wanted=expected.doorControlsPalaceRows[row][column]==='1';const actual=doorObservation(door,palace);assert.equal(actual.status,wanted?'present':'absent',`${door} at ${palace}`);positives+=Number(actual.status==='present');
  assert.equal(expected.explicitPositivePalaces[door].includes(palace),wanted);
 }));assert.equal(positives,13);
});
test('palace controlling door is a different direction, not the selected pressure sign',()=>{
 const reverse=doorObservation('Hưu',8);assert.equal(reverse.relation,'palace-controls-door');assert.equal(reverse.status,'absent');
 const forward=doorObservation('Sinh',1);assert.equal(forward.relation,'door-controls-palace');assert.equal(forward.status,'present');
 assert.equal(doorObservation('Hưu',1).relation,'same-element');assert.equal(doorObservation('Hưu',3).relation,'door-generates-palace');assert.equal(doorObservation('Hưu',6).relation,'palace-generates-door');
});
test('all 24 independent Tam Ky position cells agree with the selected 2/6/8 table',()=>{
 expected.threeWonderOrder.forEach((stem,row)=>expected.palaces.forEach((palace,column)=>assert.equal(graveObservation(stem,palace).status,expected.selectedGraveRows[row][column]==='1'?'present':'absent',`${stem} at ${palace}`)));
});
test('Bao Giam Ding 6 variant is recorded explicitly and not silently combined with Ding 8',()=>{
 assert.equal(graveObservation('Đinh',6).status,'absent');assert.equal(graveObservation('Đinh',8).status,'present');
 const row=expected.threeWonderOrder.indexOf('Đinh');assert.equal(expected.baojianComparisonGraveRows[row][expected.palaces.indexOf(6)],'1');assert.equal(expected.baojianComparisonGraveRows[row][expected.palaces.indexOf(8)],'0');
 const variant=RULE_PROFILE.variants.find(v=>v.id==='baojian-ding-6');assert.equal(variant.palace,6);assert.equal(variant.applied,false);assert.match(graveObservation('Đinh',6).explanation,/Bảo Giám/);
});
test('center convention and instruments outside Tam Ky never masquerade as evaluated negatives',()=>{
 assert.equal(doorObservation(null,5).status,'convention');assert.equal(graveObservation(null,5).status,'convention');
 for(const stem of ['Giáp','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'])assert.equal(graveObservation(stem,6).status,'out-of-scope');
 assert.throws(()=>doorObservation('Khai',5),RangeError);assert.throws(()=>graveObservation('Đinh',5),RangeError);
});
test('invalid identifiers and undefined heaven data fail closed',()=>{
 for(const number of [0,10,'2',2.5,null]){assert.throws(()=>doorObservation('Khai',number),RangeError);assert.throws(()=>graveObservation('Ất',number),RangeError);}
 for(const door of ['Khai ',null,undefined,'not-a-door'])assert.throws(()=>doorObservation(door,6),RangeError);
 for(const stem of ['bad',null,undefined])assert.throws(()=>graveObservation(stem,6),RangeError);
});
test('turning off hour marks every local sign and each Tam Ky as not computed',()=>{
 const report=analyzeStructuralSignals(makeBaseFormation({solarTermIndex:12,dayCycleIndex:14}));assert.equal(report.status,'not-computed');
 for(const cell of report.entries){assert.equal(cell.door.status,'not-computed');assert.equal(cell.grave.status,'not-computed');}
 assert.ok(report.graveCoverage.every(s=>s.status==='not-computed'&&s.palaceNumber===null));
});
test('valid boards match independent tables across terms, cycles, all hour branches and both dun directions',()=>{
 let cases=0;const missing=new Set();const signs=new Set();
 for(let term=0;term<24;term++)for(const day of [0,14,29,52])for(let branch=0;branch<12;branch++){
  const {base,plate}=board(term,day,branch);const report=analyzeStructuralSignals(base,plate);cases++;
  for(const cell of plate.palaces){
   const observation=report.byPalace[cell.number];if(cell.number===5){assert.equal(observation.door.status,'convention');assert.equal(observation.grave.status,'convention');continue;}
   const col=expected.palaces.indexOf(cell.number),doorRow=expected.doorOrder.indexOf(cell.door);
   assert.equal(observation.door.status,expected.doorControlsPalaceRows[doorRow][col]==='1'?'present':'absent');
   const stemRow=expected.threeWonderOrder.indexOf(cell.heavenStem);
   assert.equal(observation.grave.status,stemRow===-1?'out-of-scope':expected.selectedGraveRows[stemRow][col]==='1'?'present':'absent');
   signs.add(observation.door.status);signs.add(observation.grave.status);
  }
  for(const coverage of report.graveCoverage){if(coverage.status==='not-represented'){missing.add(coverage.stem);assert.equal(plate.centerEarthStem,coverage.stem);assert.equal(coverage.palaceNumber,null);}else assert.equal(plate.byPalace[coverage.palaceNumber].heavenStem,coverage.stem);}
 }
 assert.equal(cases,1152);assert.deepEqual([...missing].sort(),['Ất','Bính','Đinh'].sort());assert.ok(signs.has('present')&&signs.has('absent')&&signs.has('out-of-scope'));
});
test('earth matches are not reported as heaven matches',()=>{
 let negativeWitness=false;
 for(let branch=0;branch<12;branch++){
  const {base,plate}=board(0,0,branch);const report=analyzeStructuralSignals(base,plate);
  for(const [stem,palace] of [['Ất',2],['Bính',6],['Đinh',8]])if(plate.byPalace[palace].earthStem===stem&&plate.byPalace[palace].heavenStem!==stem){assert.notEqual(report.byPalace[palace].grave.status,'present');negativeWitness=true;}
 }
 // Search additional cycles when the chosen ju cannot supply an earth witness.
 if(!negativeWitness)for(let term=0;term<24&&!negativeWitness;term++)for(const day of [0,14,29,52]){const {base,plate}=board(term,day,5);for(const [stem,palace] of [['Ất',2],['Bính',6],['Đinh',8]])if(plate.byPalace[palace].earthStem===stem&&plate.byPalace[palace].heavenStem!==stem){assert.notEqual(analyzeStructuralSignals(base,plate).byPalace[palace].grave.status,'present');negativeWitness=true;}}
 assert.ok(negativeWitness,'Expected a real earth/heaven disagreement witness');
});
test('forged placements, mismatched method, missing layer pair and partial inputs are rejected',()=>{
 const {base,plate}=board();assert.throws(()=>analyzeStructuralSignals(base),TypeError);assert.throws(()=>analyzeStructuralSignals({...base,ju:99},plate),RangeError);
 assert.throws(()=>analyzeStructuralSignals(base,{...plate,method:'Phi Bàn'}),RangeError);
 assert.throws(()=>analyzeStructuralSignals(base,{...plate,byPalace:{...plate.byPalace,6:{...plate.byPalace[6],heavenStem:plate.byPalace[6].heavenStem==='Đinh'?'Ất':'Đinh'}}}),RangeError);
 assert.throws(()=>analyzeStructuralSignals(null),TypeError);
});
test('source provenance and uncertainty travel with the report and no interpretation is produced',()=>{
 const {base,plate}=board();const report=analyzeStructuralSignals(base,plate);assert.equal(report.profileId,'thien-do-qimen-yanyi-structure-v11109');assert.equal(report.profile.lineageCertification,false);
 assert.ok(report.profile.sources.every(s=>s.type==='primary-work/digital-transcription'&&s.facsimileVerified===false));assert.equal(report.interpretation,null);assert.equal('score' in report,false);assert.equal('outcome' in report,false);
 assert.ok(report.profile.variants.some(v=>v.doorDefinition==='palace-controls-door'&&v.applied===false));
});
test('input layers remain untouched and all report arrays and observations are immutable',()=>{
 const {base,plate}=board();const before=JSON.stringify({base,plate});const report=analyzeStructuralSignals(base,plate);assert.equal(JSON.stringify({base,plate}),before);
 assert.throws(()=>report.entries.push({}),TypeError);assert.throws(()=>report.byPalace[1].door.status='present',TypeError);assert.throws(()=>report.profile.threeWonderGraves[2].palace=6,TypeError);assert.equal(JSON.stringify({base,plate}),before);
});
