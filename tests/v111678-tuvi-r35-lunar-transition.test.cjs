'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const r35=require('../infrastructure/scripts/tuvi-r35-evaluate-transitions.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tuvi-r35-vietnam-lunar-boundaries.json'),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
function localMirrorForContractsOnly(){
  const records=[];
  for(const anchor of fixture.anchors)for(const offsetDays of fixture.offsetsDays)
  for(const gender of fixture.genders)for(const clockHour of fixture.clockHours){
    const solarDate=r35.solarOffset(anchor.date,offsetDays);
    const chart=Engine.calculate({date:solarDate,hour:clockHour,minute:0,gender,calendar:'solar'});
    records.push({
      id:[anchor.id,offsetDays,gender,clockHour].join(':'),
      anchorId:anchor.id,offsetDays,solarDate,gender,clockHour,
      hourBranch:r35.hourBranch(clockHour),
      source:{
        lunarYear:chart.lunar.year,lunarMonth:chart.lunar.month,
        lunarDay:chart.lunar.day,isLeapMonth:chart.lunar.leap===true,
        yearStem:STEMS.indexOf(chart.yearCanChi.split(' ')[0]),
        wuxingJu:chart.cuc.number,ziweiPos:BRANCHES.indexOf(chart.ziWei),
        mingGongBranch:BRANCHES.indexOf(chart.menh)
      }
    });
  }
  // Forged provenance is used only for structural UNIT TESTING. CI must
  // execute the actual pinned source probe for release evidence.
  return {schema:r35.SCHEMA,
    provenance:{repository:'Renhuai123/ziwei-doushu',
     commit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
     iztroVersion:r35.IZTRO,generator:'generateChart',
     sourceExecuted:true,syntheticOnly:true},
    records};
}
test('r35: independent Vietnam leap/new-year dates and three-day windows cannot drift',()=>{
  assert.equal(r35.validateFixture(fixture),true);
  assert.equal(r35.solarOffset('2020-05-23',-1),'2020-05-22');
  assert.equal(r35.solarOffset('2020-05-23',1),'2020-05-24');
  assert.equal(r35.solarOffset('2024-02-10',-1),'2024-02-09');
  assert.deepEqual(fixture.anchors.map(a=>a.date),[
    '2020-05-23','2023-03-22','2024-02-10','2025-01-29']);
  for(const edit of [
    f=>{f.anchors[0].date='2020-05-24';},
    f=>{f.anchors[1].isLeapMonth=false;},
    f=>{f.clockHours=[0,1,22];},
    f=>{f.anchors[0].id=f.anchors[1].id;},
    f=>{f.provenance.leap2023='https://example.org';}
  ]){const f=clone(fixture);edit(f);assert.throws(()=>r35.validateFixture(f));}
});
test('r35: Tý 23:00 and 00:00 share source hour branch, but clock 01:00 is Sửu',()=>{
  assert.equal(r35.hourBranch(23),0);
  assert.equal(r35.hourBranch(0),0);
  assert.equal(r35.hourBranch(1),1);
  assert.throws(()=>r35.hourBranch(24));
  assert.throws(()=>r35.hourBranch(-1));
  const sourceText=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r35-source-transition-probe.ts.template'),'utf8');
  assert.match(sourceText,/generateChart\(/);
  assert.match(sourceText,/clockHour, hourBranch|clockHour,hourBranch/);
  assert.match(sourceText,/records.length!==72/);
  assert.match(sourceText,/sourceExecuted:true/);
});
test('r35: 72 controlled synthetic contracts, strict SHA and data integrity',()=>{
  const input=localMirrorForContractsOnly();
  assert.equal(input.records.length,72);
  assert.doesNotThrow(()=>r35.validateSource(input,fixture));
  const variants=[
    x=>{x.records.pop();},
    x=>{x.records[1].id=x.records[0].id;},
    x=>{x.records[0].offsetDays=-2;},
    x=>{x.records[0].hourBranch=11;},
    x=>{x.records[0].source.wuxingJu=8;},
    x=>{x.records[0].source.lunarMonth=0;},
    x=>{x.provenance.commit='HEAD';},
    x=>{x.provenance.sourceExecuted=false;},
    x=>{x.provenance.iztroVersion='3.0.0';}
  ];
  for(const mut of variants){const v=clone(input);mut(v);assert.throws(()=>r35.validateSource(v,fixture));}
});
test('r35: observations do not mutate charts or turn calendar mismatch into program FAIL',()=>{
  const input=localMirrorForContractsOnly(),before=JSON.stringify(input);
  const report=r35.analyze(input,fixture);
  assert.equal(report.checked,72,JSON.stringify(report.errors));
  assert.equal(report.failures,0,JSON.stringify(report.errors));
  assert.equal(report.summary.classes['same-lunar-date'],72);
  assert.equal(report.summary.matchingMenh,72);
  assert.equal(report.summary.matchingCuc,72);
  assert.equal(report.summary.matchingZiWei,72);
  assert.deepEqual(Object.values(report.byAnchor).map(s=>s.total),[18,18,18,18]);
  assert.deepEqual(Object.values(report.byHour).map(s=>s.total),[24,24,24]);
  assert.equal(JSON.stringify(input),before);
  const alt=clone(input);
  alt.records[0].source.lunarDay=alt.records[0].source.lunarDay===30?29:alt.records[0].source.lunarDay+1;
  const r=r35.analyze(alt,fixture);
  assert.equal(r.checked,72);
  assert.equal(r.failures,0);
  assert.equal(r.summary.classes['different-lunar-day'],1);
  assert.equal(r35.calendarClass({lunarYear:2024,lunarMonth:1,lunarDay:1,isLeapMonth:false},
    {lunarYear:2023,lunarMonth:12,lunarDay:30,isLeapMonth:false}),'different-lunar-year');
});
test('r35: research never promotes mappings, semantic parity or late-Tý date rollover',()=>{
  assert.equal(summarizeClassicalCatalog([]).referenceTotal,49);
  const report=r35.analyze(localMirrorForContractsOnly(),fixture);
  assert.equal(report.catalogMappedConditionsUnchanged,31);
  assert.equal(report.semanticEquivalenceVerified,false);
  assert.equal(report.localPatternVerdictsVerified,false);
  assert.equal(report.sourceSchoolParityVerified,false);
  assert.equal(report.sourceLateZiRolloverVerified,false);
  assert.equal(report.sourceCalendarTimezoneExplicitlyVerified,false);
  assert.match(report.records.find(r=>r.clockHour===23).hourConventionWarning,/not independently verified/);
});
test('r35: pinned source execution required by CI; never substitute local unit mirror',()=>{
  if(process.env.THIENDO_R35_REQUIRE_GENUINE!=='1')return;
  const sourcePath=path.resolve(__dirname,'../.r35-source-lunar-observations.json');
  assert.ok(fs.existsSync(sourcePath),'Missing executed reference checkout evidence');
  const evidence=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  const result=r35.analyze(evidence,fixture);
  assert.equal(result.checked,72,JSON.stringify(result.errors));
  assert.equal(result.failures,0,JSON.stringify(result.errors));
  assert.equal(result.summary.total,72);
  for(const key of fixture.anchors.map(a=>a.id))assert.equal(result.byAnchor[key].total,18);
  assert.equal(result.sourceLateZiRolloverVerified,false);
});
