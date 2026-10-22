'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const root=resolve(__dirname,'..');
const load=(relative)=>JSON.parse(readFileSync(resolve(root,relative),'utf8'));
const raw=(relative)=>readFileSync(resolve(root,relative),'utf8');
const dossier=load('packages/knowledge/src/star-dossiers.json');
const symbols=load('packages/knowledge/src/star-symbols.json').records;
const cycleStudy=load('packages/knowledge/src/star-cycle-study.json');
const originalHashes=load('tests/fixtures/v1156-dossier-baseline-hashes.json');
const cycles=require('../packages/astrology-engine/src/cycles.js');
const knowledge=require('../packages/knowledge/src/index.cjs');
const hash=(data)=>createHash('sha256').update(JSON.stringify(data,Object.keys(data).sort())).digest('hex');

test('V11.57 covers all 90 public secondary-star entries, retains 24 earlier studies',()=>{
 assert.equal(dossier.edition,'11.57.0');
 assert.equal(dossier.expertReviewed,false);
 assert.deepEqual(Object.keys(dossier.profiles),Object.keys(symbols));
 assert.equal(Object.keys(dossier.profiles).length,90);
 assert.equal(Object.keys(originalHashes).length,24);
 assert.equal(Object.values(dossier.profiles).filter(item=>item.editorialLevel==='guided-structure-not-independent-review').length,66);
 for(const [name,original] of Object.entries(originalHashes)){
  assert.equal(hash(dossier.profiles[name]),original,`${name} historical dossier changed`);
 }
});

test('V11.57 remaining 66 entries provide distinct axes, real crosslinks, qualified scenarios and counterexamples',()=>{
 const axes=new Set(); const readings=new Set();
 for(const [name,item] of Object.entries(dossier.profiles)){
  assert.ok(typeof symbols[name].family==='string');
  for(const [field,limit] of Object.entries({interpretiveAxis:90,workedReading:95,counterEvidence:95,practiceQuestion:80,boundary:58})){
   assert.ok(typeof item[field]==='string'&&item[field].length>=limit,`${name}: ${field}`);
  }
  assert.match(item.workedReading,/^(Nếu|Khi|Giả sử|Ví dụ)/);
  assert.equal(item.crossCheckStars.length,3,`${name} links`);
  assert.equal(new Set(item.crossCheckStars).size,3);
  assert.ok(item.crossCheckStars.every(other=>other!==name && Object.hasOwn(symbols,other)));
  assert.ok(!('placement' in item) && !('branch' in item) && !('rule' in item));
  assert.ok(!axes.has(item.interpretiveAxis),`Duplicated axis: ${name}`);
  assert.ok(!readings.has(item.workedReading),`Duplicated scenario: ${name}`);
  axes.add(item.interpretiveAxis);readings.add(item.workedReading);
  assert.equal(knowledge.lookupStarDossier(name),knowledge.starDossiers.profiles[name]);
 }
 assert.equal(knowledge.lookupStarDossier('__proto__'),null);
});

test('Three editorial cycles match the computation engine name order and each has 12 unique names',()=>{
 assert.equal(cycleStudy.expertReviewed,false);
 assert.equal(cycleStudy.scope,'educational-cycle-order-not-placement');
 assert.equal(cycleStudy.cycles.length,3);
 const expected=[cycles.THAI_TUE,cycles.BAC_SI,cycles.TRANG_SINH];
 const names=new Set();
 cycleStudy.cycles.forEach((cycle,i)=>{
  assert.equal(cycle.count,12);
  assert.deepEqual(cycle.orderedNames,expected[i]);
  assert.equal(new Set(cycle.orderedNames).size,12);
  for(const name of cycle.orderedNames){ assert.ok(Object.hasOwn(dossier.profiles,name)); assert.ok(!names.has(name)); names.add(name); }
 });
 assert.equal(names.size,36);
});

test('Cycle study navigation uses no branch placement, live annual data or invented geometries',()=>{
 const ui=raw('apps/web/src/features/star-atlas/expanded-star-library.tsx');
 assert.match(ui,/cycleStudy\.cycles\.flatMap/);
 assert.match(ui,/selectedCycle\.previous/);
 assert.match(ui,/selectedCycle\.next/);
 assert.match(ui,/Nhịp .?selectedCycle\.order/);
 assert.match(ui,/không phải vị trí địa chi/);
 assert.match(ui,/Sao trong ba vòng/);
 const data=raw('packages/knowledge/src/star-cycle-study.json');
 assert.doesNotMatch(data,/"placement"\s*:/);
 assert.doesNotMatch(data,/"branch"\s*:/);
 assert.doesNotMatch(raw('packages/astrology-engine/src/tuvi.js'),/star-cycle-study|star-dossiers/);
});
