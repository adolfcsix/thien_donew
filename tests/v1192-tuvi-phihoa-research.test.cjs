'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const Phi=require('../packages/astrology-engine/src/tuvi-phihoa-research.cjs');
const Legacy=require('../packages/astrology-engine/src/tuhoa.js');
const TuVi=require('../packages/astrology-engine/src/tuvi.js');
const {gateSchoolExecution,getSchool}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const chart=()=>TuVi.calculate({date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30}).houses;

test('Baseline 10 can x 4 Hoa byte-for-byte matches the unchanged natal table',()=>{
 assert.equal(Phi.PROFILES['toan-tap-common'].rows.length,10);
 for(let stem=0;stem<10;stem++){
  assert.deepEqual(Phi.lookupFour(stem).map(x=>x.star),Legacy.ROWS[stem]);
  assert.deepEqual(Phi.lookupFour(Phi.STEMS[stem]).map(x=>x.type),Phi.TYPES);
 }
});
test('10x4x3 variant registry contains nonempty valid distinct stars',()=>{
 for(const p of Object.values(Phi.PROFILES)){
  assert.equal(p.rows.length,10);
  for(const row of p.rows){assert.equal(row.length,4);assert.equal(new Set(row).size,4);}
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.rows)&&Object.isFrozen(p.rows[0]));
 }
});
test('Canh Toan Thu differs at Khoa/Ky only; other rows unchanged',()=>{
 const diff=Phi.compareProfiles('toan-tap-common','toan-thu-research');
 assert.equal(diff.count,2);
 assert.deepEqual(diff.changes.map(x=>[x.stem,x.type,x.left,x.right]),[
  ['Canh','Hóa Khoa','Thái Âm','Thiên Đồng'],
  ['Canh','Hóa Kỵ','Thiên Đồng','Thái Âm']
 ]);
});
test('Trung Chau has Mậu/Canh/Nhâm Khoa divergence only',()=>{
 const d=Phi.compareProfiles('toan-tap-common','trung-chau-research');
 assert.equal(d.count,3);
 assert.deepEqual(d.changes.map(x=>[x.stem,x.type,x.right]),[
  ['Mậu','Hóa Khoa','Thái Dương'],['Canh','Hóa Khoa','Thiên Phủ'],['Nhâm','Hóa Khoa','Thiên Phủ']
 ]);
});
test('Source location uses actual chart branches and returns four deterministic edges',()=>{
 const p=chart(),source=p[0].branchIndex;
 const result=Phi.buildFlights({palaces:p,scope:'palace-stem',sourceBranchIndex:source});
 assert.equal(result.flights.length,4);assert.equal(result.sourceStem,p[0].stem);assert.equal(result.complete,true);
 for(const f of result.flights){
  const house=p.find(x=>x.branchIndex===f.targetBranchIndex);
  assert.ok(house.stars.includes(f.star)||house.auxiliaryStars.includes(f.star));
  assert.equal(f.targetPalace,house.palace);
  assert.equal(f.selfTransformation, f.targetBranchIndex===source);
  assert.equal(f.oppositePalace, (f.targetBranchIndex-source+12)%12===6);
 }
 assert.equal(result.researchOnly,true);
});
test('Every one of twelve palace stems computes exactly four distinct flights',()=>{
 const houses=chart();for(let i=0;i<12;i++){
  const r=Phi.buildFlights({palaces:houses,scope:'palace-stem',sourceBranchIndex:i});
  assert.equal(r.flights.length,4);assert.equal(r.complete,true);
 }
});
test('Natal and annual layers cannot masquerade as palace stem flights',()=>{
 const p=chart(),a=Phi.buildFlights({palaces:p,scope:'birth-year',sourceStem:'Giáp'}),b=Phi.buildFlights({palaces:p,scope:'annual-year',sourceStem:'Giáp'});
 assert.deepEqual(a.flights.map(x=>x.star),b.flights.map(x=>x.star));
 assert.equal(a.sourceBranchIndex,null);assert.equal(b.sourceBranchIndex,null);
 assert.ok(a.flights.every(x=>x.selfTransformation===false&&x.oppositePalace===false));
 assert.notEqual(a.scope,b.scope);
});
test('Missing location remains unresolved, never invented',()=>{
 const p=chart().map(x=>({...x,stars:[],auxiliaryStars:[]}));
 const r=Phi.buildFlights({palaces:p,scope:'birth-year',sourceStem:0});
 assert.equal(r.complete,false);
 assert.ok(r.flights.every(x=>x.reason==='STAR_NOT_LOCATED'&&x.targetBranchIndex===null));
});
test('Duplicate position in another palace must be flagged as ambiguous',()=>{
 const p=chart().map(x=>({...x,stars:[...x.stars],auxiliaryStars:[...x.auxiliaryStars]}));
 const star='Liêm Trinh',current=p.find(x=>x.stars.includes(star));
 p.find(x=>x!==current).stars.push(star);
 const result=Phi.buildFlights({palaces:p,scope:'birth-year',sourceStem:0});
 assert.equal(result.flights[0].reason,'STAR_MULTIPLE_PALACES');assert.equal(result.flights[0].targetBranchIndex,null);
});
test('Repeated star in two categories of same palace is not mistaken for two palaces',()=>{
 const p=chart().map(x=>({...x,stars:[...x.stars],auxiliaryStars:[...x.auxiliaryStars]}));
 const current=p.find(x=>x.stars.includes('Liêm Trinh'));current.auxiliaryStars.push('Liêm Trinh');
 const result=Phi.buildFlights({palaces:p,scope:'birth-year',sourceStem:0});
 assert.equal(result.flights[0].status,'located');
});
test('Invalid stems and unknown variants reject input instead of silent fallback',()=>{
 for(const bad of ['Cành','甲',null,undefined,NaN,Infinity,-1,10,3.5,'6',{},[]])assert.throws(()=>Phi.lookupFour(bad));
 assert.throws(()=>Phi.lookupFour('Canh','fictional'),RangeError);
 assert.throws(()=>Phi.compareProfiles('x','toan-tap-common'),RangeError);
});
test('Palace validation rejects duplicate/partial/invalid positions and missing lists',()=>{
 const p=chart();
 for(const bad of [p.slice(1),[...p.slice(0,11),p[0]],p.map((x,i)=>i===0?{...x,branchIndex:-1}:x),p.map((x,i)=>i===0?{...x,stars:null}:x)]){
  assert.throws(()=>Phi.buildFlights({palaces:bad,scope:'birth-year',sourceStem:0}));
 }
});
test('Never implicitly compute an annual or natal stem from a Gregorian date',()=>{
 const p=chart();
 assert.throws(()=>Phi.buildFlights({palaces:p,scope:'annual-year'}));
 assert.throws(()=>Phi.buildFlights({palaces:p,scope:'birth-year',sourceBranchIndex:0,sourceStem:0}));
 assert.throws(()=>Phi.buildFlights({palaces:p,scope:'palace-stem',sourceBranchIndex:0,sourceStem:5}));
 assert.throws(()=>Phi.buildFlights({palaces:p,scope:'something',sourceStem:0}));
});
test('Registry authorizes research subroutine only, never switches main engine',()=>{
 const school=getSchool('tu-vi-phi-tinh');
 assert.equal(school.status,'deterministic-subroutine-only');
 assert.equal(school.engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution(school.id).verdict,'RESEARCH_SUBROUTINE_ONLY');
 for(const f of ['packages/astrology-engine/src/tuvi.js','packages/astrology-engine/src/tuhoa.js','apps/api/src/app.module.ts']){
  assert.doesNotMatch(readFileSync(resolve(__dirname,'..',f),'utf8'),/tuvi-phihoa-research/);
 }
});
test('Research only output records model and provenance without predicting events',()=>{
 const r=Phi.buildFlights({palaces:chart(),scope:'palace-stem',sourceBranchIndex:0,profileId:'toan-thu-research'});
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.flights)&&Object.isFrozen(r.flights[0]));
 assert.equal(r.profileStatus,'research-comparison');
 assert.equal(Object.hasOwn(r,'prediction'),false);
 assert.equal(Object.hasOwn(r,'fortuneScore'),false);
});
