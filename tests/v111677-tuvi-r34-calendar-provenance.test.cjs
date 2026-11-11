'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {SCHEMA,VERSION,validateFixture,validateSource,
 dayAtOffset,expectedFromDay,classCalendar,analyzeBoundaryMatrix
}=require('../infrastructure/scripts/tuvi-r34-evaluate-calendar-provenance.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tuvi-r34-nasa-boundaries.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
function syntheticLocalMirror(){
 const records=[];
 for(const e of fixture.cases)for(const offsetDays of fixture.offsetsDays)
 for(const gender of fixture.genders)for(const clockHour of fixture.clockHours){
  const date=expectedFromDay(e.utcNewMoon,offsetDays);
  const c=Engine.calculate({date,hour:clockHour,minute:0,gender,calendar:'solar'});
  records.push({
   id:[e.id,offsetDays,gender,clockHour].join('-'),eventId:e.id,offsetDays,
   solarDate:date,gender,clockHour,hourBranch:Math.floor(((clockHour+1)%24)/2),
   source:{
    lunarYear:c.lunar.year,lunarMonth:c.lunar.month,lunarDay:c.lunar.day,
    isLeapMonth:c.lunar.leap===true,
    yearStem:STEMS.indexOf(c.yearCanChi.split(' ')[0]),
    yearBranch:BRANCHES.indexOf(c.yearCanChi.split(' ')[1]),
    wuxingJu:c.cuc.number,ziweiPos:BRANCHES.indexOf(c.ziWei),
    mingGongBranch:BRANCHES.indexOf(c.menh)
   }
  });
 }
 // Unit-only local mirror to exercise contracts; NOT pinned source evidence.
 return {
  schema:SCHEMA,
  provenance:{
   repository:'Renhuai123/ziwei-doushu',
   commit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
   iztroVersion:VERSION,generator:'generateChart',
   sourceExecuted:true,syntheticOnly:true,nasaSource:fixture.source.url
  },records
 };
}
test('r34: four pinned NASA UT instants cross UTC+7/UTC+8 midnight, not a hand-waved day shift',()=>{
 assert.doesNotThrow(()=>validateFixture(fixture));
 const expected=[
  ['1984-05','1984-05-30','1984-05-31'],
  ['1986-12','1986-12-01','1986-12-02'],
  ['1989-08','1989-08-01','1989-08-02'],
  ['1996-07','1996-07-15','1996-07-16']
 ];
 for(const [id,vietnam,china] of expected){
  const e=fixture.cases.find(x=>x.id===id);
  assert.equal(dayAtOffset(e.utcNewMoon,7),vietnam);
  assert.equal(dayAtOffset(e.utcNewMoon,8),china);
  assert.equal(expectedFromDay(e.utcNewMoon,14).slice(5),new Date(Date.parse(e.utcNewMoon.slice(0,10)+'T12:00:00Z')+14*86400000).toISOString().slice(5,10));
 }
 assert.match(fixture.source.url,/eclipse\.gsfc\.nasa\.gov/);
});

test('r34: strict source observation manifest requires all 48 unique controlled cases',()=>{
 const source=syntheticLocalMirror();
 assert.equal(source.records.length,48);
 assert.equal(new Set(source.records.map(x=>x.id)).size,48);
 assert.doesNotThrow(()=>validateSource(source,fixture));
 const bad=[
  x=>{x.records.pop();},
  x=>{x.records[0].id=x.records[1].id;},
  x=>{x.records[0].offsetDays=21;},
  x=>{x.records[0].source.wuxingJu=7;},
  x=>{x.records[0].source.lunarMonth=0;},
  x=>{x.records[0].clockHour=13;},
  x=>{x.provenance.commit='latest';},
  x=>{x.provenance.iztroVersion='2.7';},
  x=>{x.provenance.sourceExecuted=false;},
  x=>{x.provenance.nasaSource='unknown';}
 ];
 for(const change of bad){
  const c=clone(source);change(c);assert.throws(()=>validateSource(c,fixture));
 }
 const tampered=clone(fixture);
 tampered.cases[0].utcNewMoon='1984-05-30T15:48:00Z';
 assert.throws(()=>validateFixture(tampered));
});

test('r34: comparisons report actual differences without treating them as program failures',()=>{
 assert.equal(classCalendar({lunarYear:1989,lunarMonth:7,lunarDay:14,isLeapMonth:false},
  {lunarYear:1989,lunarMonth:7,lunarDay:15,isLeapMonth:false}),'local-one-day-ahead');
 assert.equal(classCalendar({lunarYear:1989,lunarMonth:7,lunarDay:15,isLeapMonth:false},
  {lunarYear:1989,lunarMonth:7,lunarDay:14,isLeapMonth:false}),'source-one-day-ahead');
 assert.equal(classCalendar({lunarYear:1989,lunarMonth:7,lunarDay:14,isLeapMonth:false},
  {lunarYear:1989,lunarMonth:7,lunarDay:14,isLeapMonth:false}),'same-lunar-day');
 assert.equal(classCalendar({lunarYear:1989,lunarMonth:6,lunarDay:30,isLeapMonth:false},
  {lunarYear:1989,lunarMonth:7,lunarDay:1,isLeapMonth:false}),'different-month-or-year');
 const o=syntheticLocalMirror(),before=JSON.stringify(o);
 const report=analyzeBoundaryMatrix(o,fixture);
 assert.equal(report.checked,48);
 assert.equal(report.failures,0);
 assert.equal(report.counts.byClass['same-lunar-day'],48);
 assert.equal(report.counts.matchingCuc,48);
 assert.equal(report.counts.matchingMenh,48);
 assert.equal(report.counts.matchingZiWei,48);
 assert.equal(report.verifiedSchoolEquivalence,false);
 assert.equal(report.localPatternVerdictsVerified,false);
 assert.equal(report.catalogMappedConditionsUnchanged,31);
 assert.equal(JSON.stringify(o),before);
 const altered=clone(o);
 altered.records.find(x=>x.eventId==='1989-08'&&x.offsetDays===14).source.lunarDay--;
 const observed=analyzeBoundaryMatrix(altered,fixture);
 assert.equal(observed.failures,0);
 assert.equal(observed.counts.byClass['local-one-day-ahead'],1);
 assert.equal(observed.counts.compatibleWithBoundary,1);
});

test('r34: read-only source branch and conclusion gates preserve 31/49 technical mappings',()=>{
 const result=summarizeClassicalCatalog([]);
 assert.equal(result.referenceTotal,49);
 const code=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r34-evaluate-calendar-provenance.cjs'),'utf8');
 assert.match(code,/verifiedSchoolEquivalence:false/);
 assert.match(code,/localPatternVerdictsVerified:false/);
 assert.match(code,/catalogMappedConditionsUnchanged:31/);
 assert.match(code,/auditClassicalVoidSemanticGates\(local\)/);
 const probe=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r34-source-calendar-probe.ts.template'),'utf8');
 assert.match(probe,/generateChart\(/);
 assert.match(probe,/new Set\(records\.map\(x=>x\.id\)\)\.size!==48/);
});

test('r34: source-generated observations are mandatory in isolated pinned-source CI',()=>{
 if(process.env.THIENDO_R34_REQUIRE_GENUINE!=='1')return;
 const p=path.join(__dirname,'../.r34-source-calendar-boundaries.json');
 assert.ok(fs.existsSync(p),'Missing genuinely executed pinned source chart observations');
 const source=JSON.parse(fs.readFileSync(p,'utf8'));
 const result=analyzeBoundaryMatrix(source,fixture);
 assert.equal(result.checked,48,JSON.stringify(result.errors));
 assert.equal(result.failures,0,JSON.stringify(result.errors));
 assert.equal(result.records.length,48);
 assert.equal(result.counts.byClass['local-one-day-ahead'],48,
  'All 4 NASA new-moon civil-day offsets must remain reproducible by exact source');
 assert.equal(result.counts.compatibleWithBoundary,48);
 assert.equal(result.counts.matchingCuc,48);
 assert.equal(result.counts.matchingMenh,48);
 assert.equal(result.counts.matchingZiWei,6,
  'A one-day lunar difference does not imply every Tử Vi anchor must differ');
 for(const key of ['1984-05','1986-12','1989-08','1996-07']){
  assert.equal(result.byEvent[key].records,12);
  assert.equal(result.byEvent[key].byClass['local-one-day-ahead'],12);
 }
 assert.equal(result.verifiedSchoolEquivalence,false);
});
