'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {SCHEMA,REPORT,DATES,HOURS,GENDERS,LIMITATION,
  validateSource,analyzeRootCause,BOUNDARY,civilDateAtOffset,evaluateCalendarBoundary}=require('../infrastructure/scripts/tuvi-r33-evaluate-root-cause.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const fixture=()=>{
 const records=[];
 for(const date of DATES)for(const gender of GENDERS)for(const clockHour of HOURS){
  const c=Engine.calculate({date,hour:clockHour,minute:0,calendar:'solar',gender});
  const pos=name=>c.houses.find(h=>h.stars.includes(name)).branchIndex;
  records.push({
   id:date+'-'+gender+'-'+clockHour,solarDate:date,gender,clockHour,
   hourBranch:Math.floor(((clockHour+1)%24)/2),
   source:{
    lunarYear:c.lunar.year,lunarMonth:c.lunar.month,lunarDay:c.lunar.day,
    isLeapMonth:c.lunar.leap===true,yearStem:STEMS.indexOf(c.yearCanChi.split(' ')[0]),
    yearBranch:BRANCHES.indexOf(c.yearCanChi.split(' ')[1]),
    leapMonthPolicy:'split',wuxingJu:c.cuc.number,ziweiPos:BRANCHES.indexOf(c.ziWei),
    mingGongBranch:BRANCHES.indexOf(c.menh),
    liemTrinhBranch:pos('Liêm Trinh'),thatSatBranch:pos('Thất Sát'),
    huaLocBranch:c.transformations.find(x=>x.name==='Hóa Lộc').branch,
    dingPin01:false,dingPin02:false,dingZa03Count:0
   }
  });
 }
 return {
  schema:SCHEMA,
  provenance:{
   repository:'Renhuai123/ziwei-doushu',
   commit:'7922285d947b36610e7e31c232d8f1e2a0d0871d',
   iztroVersion:'2.6.1',
   functions:['generateChart','detectDingPin','detectDingZa'],
   syntheticOnly:true,sourceExecuted:true
  },
  records
 };
};
test('r33: 30 deterministic samples across 1988-1990, adjacent 1989 dates, 3 clock hours and 2 genders',()=>{
 const x=fixture();
 assert.equal(DATES.length,5);
 assert.equal(x.records.length,30);
 assert.doesNotThrow(()=>validateSource(x));
 assert.equal(x.records[0].solarDate,'1988-08-15');
 assert.equal(x.records.at(-1).solarDate,'1990-08-15');
 const out=analyzeRootCause(x);
 assert.equal(out.compared,30);
 assert.equal(out.failures,0);
 assert.equal(out.schema,REPORT);
 assert.equal(out.records.filter(x=>x.firstDifference==='matched').length,30);
 assert.deepEqual(Object.values(out.differences),Array(11).fill(0));
 assert.equal(out.semanticEquivalenceVerified,false);
 assert.equal(out.localPatternVerdictsVerified,false);
 assert.equal(out.engineChanged,false);
 assert.match(LIMITATION,/Không suy ra trường phái đúng hơn/);
});

test('r33: classify first actual difference instead of guessing or silently fixing either engine',()=>{
 const base=fixture();
 const scenarios=[
  ['lunarDay',x=>{x.lunarDay=x.lunarDay===30?29:x.lunarDay+1},'calendar-difference'],
  ['wuxingJu',x=>{x.wuxingJu=x.wuxingJu===6?5:6},'cuc-difference'],
  ['ziweiPos',x=>{x.ziweiPos=(x.ziweiPos+1)%12},'ziwei-anchor-difference'],
  ['liemTrinhBranch',x=>{x.liemTrinhBranch=(x.liemTrinhBranch+1)%12},'major-star-difference'],
  ['huaLocBranch',x=>{x.huaLocBranch=(x.huaLocBranch+1)%12},'four-hua-difference']
 ];
 for(const [key,mutate,reason] of scenarios){
  const src=clone(base);
  mutate(src.records.find(x=>x.solarDate==='1989-08-15').source);
  const before=JSON.stringify(src);
  const result=analyzeRootCause(src);
  assert.equal(result.failures,0,key);
  assert.equal(result.records.find(x=>x.id==='1989-08-15-Nam-0').firstDifference,reason);
  const countKey={liemTrinhBranch:'liemTrinh',huaLocBranch:'huaLoc'}[key]||key;
  assert.equal(result.differences[countKey],1);
  assert.equal(result.records.filter(x=>x.firstDifference!=='matched').length,1);
  assert.equal(JSON.stringify(src),before);
 }
});
test('r33: NASA August 1 1989 new moon straddles Vietnam UTC+7 and China UTC+8 midnight',()=>{
 assert.equal(BOUNDARY.newMoonUtc,'1989-08-01T16:06:00Z');
 assert.equal(civilDateAtOffset(BOUNDARY.newMoonUtc,7),'1989-08-01');
 assert.equal(civilDateAtOffset(BOUNDARY.newMoonUtc,8),'1989-08-02');
 assert.match(BOUNDARY.reference,/eclipse\.gsfc\.nasa\.gov/);
 const local={lunarYear:1989,lunarMonth:7,lunarDay:15,isLeapMonth:false};
 const source={lunarYear:1989,lunarMonth:7,lunarDay:14,isLeapMonth:false};
 const a=evaluateCalendarBoundary('1989-08-15',source,local);
 assert.equal(a.status,'compatible-with-civil-timezone-boundary');
 assert.equal(a.provenSchoolEquivalence,false);
 assert.equal(evaluateCalendarBoundary('1989-08-15',{...source,lunarDay:15},local).status,'not-established');
 assert.equal(evaluateCalendarBoundary('1988-08-15',source,local).status,'control-date');
});

test('r33: reject provenance, swapped hours, missing controls, invalid branches and duplicated chart IDs',()=>{
 const base=fixture();
 const mutations=[
  x=>{x.provenance.commit='latest';},
  x=>{x.provenance.iztroVersion='3.0';},
  x=>{x.provenance.sourceExecuted=false;},
  x=>{x.provenance.functions=['generateChart'];},
  x=>{x.records.pop();},
  x=>{x.records[0].id=x.records[1].id;},
  x=>{x.records[0].hourBranch=8;},
  x=>{x.records[0].source.ziweiPos=12;},
  x=>{x.records[0].source.lunarMonth=0;},
  x=>{x.records[0].source.wuxingJu=7;},
  x=>{x.records[0].source.dingPin02='true';}
 ];
 for(const mutate of mutations){
  const c=clone(base);
  mutate(c);
  assert.throws(()=>validateSource(c));
 }
});
test('r33: genuine source execution may only be claimed in isolated pinned-source workflow',()=>{
 const template=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r33-source-root-cause-probe.ts.template'),'utf8');
 assert.match(template,/generateChart\(/);
 assert.match(template,/detectDingPin\(/);
 assert.match(template,/detectDingZa\(/);
 assert.match(template,/lunarInfo\.lunarDay/);
 assert.match(template,/chart\.wuxingJu/);
 assert.match(template,/chart\.ziweiPos/);
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const p=path.resolve(__dirname,'../.r33-source-1989-root-cause-observations.json');
 assert.ok(fs.existsSync(p),'Missing genuinely executed reference observation');
 const out=analyzeRootCause(JSON.parse(fs.readFileSync(p,'utf8')));
 assert.equal(out.compared,30,JSON.stringify(out.errors));
 assert.equal(out.failures,0,JSON.stringify(out.errors));
 assert.equal(out.records.filter(x=>x.solarDate==='1989-08-15').length,6);
 assert.equal(out.calendarBoundaryCount,18,'All 1989 controls must be explained by one-day timezone-compatible lunar-day offset');
 assert.equal(out.differences.lunarDay,18);
 assert.equal(out.differences.wuxingJu,0);
 assert.equal(out.differences.ziweiPos,18);
 assert.equal(out.semanticEquivalenceVerified,false);
 assert.equal(out.localPatternVerdictsVerified,false);
});


test('r57: local unmodified chart recalculated from pinned input is an isolated lunar-day counterfactual',()=>{
 const {SCHEMA:r57Schema,TARGET,localPoint,counterfactualForRecord,auditR57}=
  require('../infrastructure/scripts/tuvi-r33-r57-lunar-day-counterfactual.cjs');
 const source=fixture(),original=JSON.stringify(source);
 const direct=analyzeRootCause(source),report=auditR57(source);
 assert.equal(report.schema,r57Schema);
 assert.equal(report.caseCount,30);
 assert.equal(report.rows.length,30);
 assert.equal(report.targetCase.id,TARGET);
 assert.equal(report.mappedResearchCount,31);
 assert.equal(report.referenceTotal,49);
 assert.equal(report.rootCauseVerified,false);
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.sourceCalendarTimezoneVerified,false);
 assert.equal(report.mayChangeChartRules,false);
 assert.equal(report.mayIncreaseMapping,false);
 assert.deepEqual(Object.values(report.dateStrata).map(x=>x.cases),[6,6,6,6,6]);
 assert.equal(report.originalR33LunarDayDifferences,0);
 assert.ok(report.rows.every(r=>r.originalLunarMatches&&r.dayOnlyDifferent===false&&
  r.inputToCounterfactual.sameInstantAsOriginalBirth===false&&
  r.comparison.directLiemTrinhDiffers===false&&
  r.resultClass==='context-or-calendar-not-isolated'&&
  r.rootCauseVerified===false&&r.mayChangeChartRules===false));
 assert.deepEqual(report,auditR57(source),'Counterfactual must be deterministic');
 assert.equal(JSON.stringify(source),original,'R57 must not edit source observations');
 const target=source.records.find(r=>r.id===TARGET);
 const prior=direct.records.find(r=>r.id===TARGET);
 const p=localPoint(Engine.calculate({date:target.solarDate,hour:0,gender:'Nam',calendar:'solar'}));
 assert.equal(p.liemTrinhBranch,(p.ziweiPos+4)%12);
 assert.equal(counterfactualForRecord(target,prior).originalLocal.lunarDay,target.source.lunarDay);
});

test('r57: simulated one-day SOURCE lunar input cannot be mistaken for a genuine original birth chart',()=>{
 const {TARGET,auditR57}=
  require('../infrastructure/scripts/tuvi-r33-r57-lunar-day-counterfactual.cjs');
 const src=fixture(),changed=src.records.find(r=>r.id===TARGET);
 changed.source.lunarDay=changed.source.lunarDay===30?29:changed.source.lunarDay+1;
 const before=JSON.stringify(src),out=auditR57(src),target=out.targetCase;
 assert.equal(target.dayOnlyDifferent,true);
 assert.equal(target.comparison.directLunarDayDiffers,true);
 assert.equal(target.inputToCounterfactual.calendar,'lunar');
 assert.equal(target.inputToCounterfactual.sameInstantAsOriginalBirth,false);
 assert.equal(target.inputToCounterfactual.date,
  [changed.source.lunarYear,String(changed.source.lunarMonth).padStart(2,'0'),
   String(changed.source.lunarDay).padStart(2,'0')].join('-'));
 assert.ok(['source-lunar-input-reproduces-source-anchor-and-liem-in-local-model',
  'source-lunar-input-does-not-reproduce-both-branches',
  'context-or-calendar-not-isolated','counterfactual-unavailable'].includes(target.resultClass));
 assert.equal(target.rootCauseVerified,false);
 assert.equal(out.mayIncreaseMapping,false);
 assert.equal(JSON.stringify(src),before);
 const invalid=clone(src);invalid.provenance.commit='unpinned';
 assert.throws(()=>auditR57(invalid));
 const incomplete=clone(src);incomplete.records.pop();
 assert.throws(()=>auditR57(incomplete));
});

test('r57: genuine R33 source dates must be executed under pinned source CI',()=>{
 const {auditR57,TARGET}=require('../infrastructure/scripts/tuvi-r33-r57-lunar-day-counterfactual.cjs');
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const pathToSource=path.resolve(__dirname,'../.r33-source-1989-root-cause-observations.json');
 assert.ok(fs.existsSync(pathToSource),'R57 requires actual pinned-source R33 runtime output');
 const source=JSON.parse(fs.readFileSync(pathToSource,'utf8'));
 const out=auditR57(source);
 assert.equal(out.caseCount,30);
 assert.equal(out.originalR33LunarDayDifferences,18);
 assert.equal(out.originalR33ZiweiDifferences,18);
 assert.equal(out.originalR33CucDifferences,0);
 assert.equal(out.targetCase.id,TARGET);
 assert.equal(out.targetCase.astronomicalBoundaryClass,'compatible-with-civil-timezone-boundary');
 assert.equal(out.targetCase.dayOnlyDifferent,true);
 assert.equal(out.targetCase.rootCauseVerified,false);
 assert.equal(out.targetCase.comparison.sourceLiêmTrinhObeysLocalAnchorOffset,true);
 assert.equal(out.classCounts['source-lunar-input-reproduces-source-anchor-and-liem-in-local-model'],18);
 assert.equal(out.classCounts['context-or-calendar-not-isolated'],12);
 assert.deepEqual([out.targetCase.source.lunarYear,out.targetCase.source.lunarMonth,
  out.targetCase.source.lunarDay],[1989,7,14]);
 assert.deepEqual([out.targetCase.originalLocal.lunarYear,out.targetCase.originalLocal.lunarMonth,
  out.targetCase.originalLocal.lunarDay],[1989,7,15]);
 assert.equal(out.targetCase.source.wuxingJu,4);
 assert.equal(out.targetCase.originalLocal.wuxingJu,4);
 assert.equal(out.targetCase.source.mingGongBranch,8);
 assert.equal(out.targetCase.originalLocal.mingGongBranch,8);
 assert.deepEqual([out.targetCase.source.ziweiPos,out.targetCase.source.liemTrinhBranch],[7,11]);
 assert.deepEqual([out.targetCase.originalLocal.ziweiPos,
  out.targetCase.originalLocal.liemTrinhBranch],[4,8]);
 assert.deepEqual([out.targetCase.localCounterfactual?.ziweiPos,
  out.targetCase.localCounterfactual?.liemTrinhBranch],[7,11]);
 assert.equal(out.targetCase.comparison.counterfactualPreservesSourceCuc,true);
 assert.equal(out.targetCase.comparison.counterfactualPreservesSourceMing,true);
 assert.equal(out.mayChangeChartRules,false);
 assert.equal(out.mayIncreaseMapping,false);
 console.log('R57: 30 genuine source inputs; 18 lunar-day divergences; target='+out.targetCase.resultClass+
  '; counterfactual sensitivity only, never algorithm-school equivalence');
});


test('r58: genuine source library timezone matrix is complete, provenance-locked and fail-closed',()=>{
 const {TZ,ALL_IDS,validateProbe,buildR58TimezoneMatrix}=
  require('../infrastructure/scripts/tuvi-r33-r58-evaluate-timezone-calendar.cjs');
 assert.deepEqual(TZ,['UTC','Asia/Ho_Chi_Minh','Asia/Shanghai']);
 assert.equal(ALL_IDS.length,32);
 assert.equal(new Set(ALL_IDS).size,32);
 assert.throws(()=>validateProbe(null,'UTC'));
 assert.throws(()=>buildR58TimezoneMatrix(null,null));
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const makePath=zone=>path.resolve(__dirname,'../.r58-source-tz-'+
  zone.replaceAll('/','_')+'.json');
 const observations=TZ.map(zone=>{
  const file=makePath(zone);
  assert.ok(fs.existsSync(file),'R58 genuine source TZ observation missing: '+zone);
  return JSON.parse(fs.readFileSync(file,'utf8'));
 });
 const sourcePath=path.resolve(__dirname,'../.r33-source-1989-root-cause-observations.json');
 assert.ok(fs.existsSync(sourcePath),'R58 source R33 observations absent');
 const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
 const original=JSON.stringify(observations);
 const report=buildR58TimezoneMatrix(observations,source);
 assert.equal(report.comparedCalendars,96);
 assert.equal(report.uniqueBirthControls,32);
 assert.equal(report.baseR33CaseCount,30);
 assert.equal(report.rows.length,32);
 assert.equal(report.target1989.lunarDayByZone.UTC,14);
 assert.equal(report.target1989.sourceChartByZone.UTC.ziweiPos,7);
 assert.equal(report.target1989.sourceChartByZone.UTC.liemTrinhBranch,11);
 assert.equal(report.mappedResearchCount,31);
 assert.equal(report.referenceTotal,49);
 assert.equal(report.sourceBySolarAndLunarJavascriptBothExecuted,true);
 assert.equal(report.observedLunarJavascriptAndIztroAgreementOn32Cases,true);
 assert.equal(report.processTimezoneStableOn32Cases,true);
 assert.deepEqual(report.fieldDifferenceCounts['Asia/Ho_Chi_Minh'],
  {lunarJavascriptRaw:0,sourceEffective:0,sourceGetLunarInfo:0,
   iztroBySolar:0,sourceGenerateChart:0});
 assert.deepEqual(report.fieldDifferenceCounts['Asia/Shanghai'],
  {lunarJavascriptRaw:0,sourceEffective:0,sourceGetLunarInfo:0,
   iztroBySolar:0,sourceGenerateChart:0});
 assert.equal(report.rows.find(x=>x.id==='1989-08-01-Nam-0')
  .lunarJavascriptByZone.UTC.month,6);
 assert.equal(report.rows.find(x=>x.id==='1989-08-02-Nam-0')
  .lunarJavascriptByZone.UTC.month,7);
 assert.equal(report.rootCauseVerified,false);
 assert.equal(report.sourceCalendarTimeZoneInferred,false);
 assert.equal(report.mayChangeChartRules,false);
 assert.equal(report.mayEnableCalendarSchoolMode,false);
 assert.equal(report.semanticEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.mayIncreaseMapping,false);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.rows));
 for(const zone of TZ.slice(1)){
  assert.ok(report.fieldDifferenceCounts[zone]);
  for(const count of Object.values(report.fieldDifferenceCounts[zone]))
   assert.ok(Number.isInteger(count)&&count>=0&&count<=32);
 }
 assert.equal(JSON.stringify(observations),original,'R58 mutated immutable source observations');
 assert.deepEqual(report,buildR58TimezoneMatrix(observations,source));
 const wrongCommit=clone(observations);
 wrongCommit[0].provenance.commit='HEAD';
 assert.throws(()=>buildR58TimezoneMatrix(wrongCommit,source));
 const missing=clone(observations);
 missing[1].results.pop();
 assert.throws(()=>buildR58TimezoneMatrix(missing,source));
 const forged=clone(observations);
 forged[0].results[0].sourceGetLunarInfo.day++;
 assert.throws(()=>buildR58TimezoneMatrix(forged,source));
 const brokenIztro=clone(observations);
 brokenIztro[0].results[0].iztroBySolar.rawLunarDate.lunarDay++;
 assert.throws(()=>buildR58TimezoneMatrix(brokenIztro,source));
 const brokenStar=clone(observations);
 brokenStar[0].results[0].iztroBySolar.ziweiBranchName='非法';
 assert.throws(()=>buildR58TimezoneMatrix(brokenStar,source));
 const duplicated=clone(observations);
 duplicated[2].results[1].id=duplicated[2].results[0].id;
 assert.throws(()=>buildR58TimezoneMatrix(duplicated,source));
 console.log('R58: 3 source runtime TZ settings x 32 cases; no school/timezone inference, 31/49 unchanged');
});


test('r59: pinned lunar astronomy internals reproduce R58 civil boundaries without source calendar promotion',()=>{
 const {auditR59,MONTHS,LIBRARIES}=
  require('../infrastructure/scripts/tuvi-r33-r59-evaluate-lunar-boundary-internals.cjs');
 assert.deepEqual(LIBRARIES,['lunar-javascript','lunar-typescript']);
 assert.equal(MONTHS.length,5);
 assert.throws(()=>auditR59(null,null));
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const sourcePath=path.resolve(__dirname,'../.r59-source-lunar-boundary-internals.json');
 const r58Path=path.resolve(__dirname,'../.r58-pinned-timezone-calendar-matrix.json');
 assert.ok(fs.existsSync(sourcePath),'R59 requires both pinned calendar libraries executed');
 assert.ok(fs.existsSync(r58Path),'R59 needs independent R58 source matrix');
 const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
 const baseline=JSON.parse(fs.readFileSync(r58Path,'utf8'));
 const prev=JSON.stringify([source,baseline]);
 const report=auditR59(source,baseline);
 assert.equal(report.schema,'thiendo-r59-pinned-lunar-month-julian-boundary-audit-v1');
 assert.equal(report.sourceLibraries,2);
 assert.equal(report.measuredLunarMonthBoundaries,10);
 assert.equal(report.observedCivilDates,6);
 assert.equal(report.r58SourceCalendarCaseCount,32);
 assert.equal(report.firstDayOf1989SeventhLunarMonth,'1989-08-02');
 assert.equal(report.same1989SeventhMonthFirstDate,true);
 assert.equal(report.same1989SeventhMonthJulianDay,true);
 for(const library of report.libraries){
  const lunar7=library.months.find(m=>m.year===1989&&m.month===7);
  assert.equal(lunar7?.solarFirstDay,'1989-08-02');
  assert.equal(lunar7?.firstJulianDay,2447741);
  assert.equal(lunar7?.dayCount,29);
  assert.equal(library.highMethodOffsetSymbolObserved,true);
  assert.equal(library.lowMethodOffsetSymbolObserved,true);
  assert.equal(library.newMoonOffsetHours,8);
 }
 assert.equal(report.newMoonOffsetHoursInLibraryConstants,8);
 assert.equal(report.alternativeVietnamCalendarVerified,false);
 assert.equal(report.sourceNewMoonTimeConventionFullyVerified,false);
 assert.equal(report.rootCauseVerified,false);
 assert.equal(report.localChartCalendarErrorVerified,false);
 assert.equal(report.mayEnableCalendarSchoolMode,false);
 assert.equal(report.mayChangeChartRules,false);
 assert.equal(report.mappedResearch,31);
 assert.equal(report.referenceTotal,49);
 assert.equal(report.mayIncreaseMapping,false);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.libraries));
 assert.equal(JSON.stringify([source,baseline]),prev,'R59 changed original source evidence');
 assert.deepEqual(report,auditR59(source,baseline),'R59 output nondeterministic');
 const forged=clone(source);
 forged.libraries[0].lunarMonths.find(x=>x.year===1989&&x.month===7).solarFirstDay='1989-08-01';
 assert.throws(()=>auditR59(forged,baseline));
 const wrongOffset=clone(source);
 wrongOffset.libraries[0].declaredOffsetHours=7;
 assert.throws(()=>auditR59(wrongOffset,baseline));
 const wrongDependency=clone(source);
 wrongDependency.provenance.lockedDependencies['lunar-javascript']='0.0.0';
 assert.throws(()=>auditR59(wrongDependency,baseline));
 const incomplete=clone(source);
 incomplete.libraries[1].datedControls.pop();
 assert.throws(()=>auditR59(incomplete,baseline));
 const changedBaseline=clone(baseline);
 changedBaseline.rows.find(x=>x.id==='1989-08-02-Nam-0')
  .lunarJavascriptByZone.UTC.day=2;
 assert.throws(()=>auditR59(source,changedBaseline));
 console.log('R59: 2 genuine pinned libraries x 5 month Julian beginnings; 1989/7 first day 1989-08-02; no automatic policy switch');
});
