'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs');
const {studyHref,readStudyInput,validSnapshot}=require('../apps/web/src/features/study-room/study-links.cjs');
const src=fs.readFileSync(require('node:path').join(__dirname,'../apps/api/src/modules/study/study-validation.ts'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext('(function(require,module,exports){'+js+'})')(name=>{if(name==='@thiendo/astrology-engine/src/tarot-rws.cjs')return require('../packages/astrology-engine/src/tarot-rws.cjs');if(name==='@thiendo/astrology-engine/src/qimen-profile.cjs')return require('../packages/astrology-engine/src/qimen-profile.cjs');if(name==='@thiendo/astrology-engine/src/luc-hao-profile.cjs')return require('../packages/astrology-engine/src/luc-hao-profile.cjs');if(name==='@thiendo/astrology-engine/src/mai-hoa-profile.cjs')return require('../packages/astrology-engine/src/mai-hoa-profile.cjs');if(name==='@thiendo/astrology-engine/src/western-relationship.cjs')return require('../packages/astrology-engine/src/western-relationship.cjs');if(name==='@thiendo/astrology-engine/src/western-natal.cjs')return require('../packages/astrology-engine/src/western-natal.cjs');if(name==='@thiendo/astrology-engine/src/numerology-pythagorean.cjs')return require('../packages/astrology-engine/src/numerology-pythagorean.cjs');if(name.startsWith('@thiendo/astrology-engine/src/')){const file=name.slice('@thiendo/astrology-engine/src/'.length);if(!/^[a-z0-9-]+\.cjs$/.test(file))throw Error(name);return require('../packages/astrology-engine/src/'+file);}if(name==='../../common/profile-identifiers'){const source=fs.readFileSync(require('node:path').join(__dirname,'../apps/api/src/common/profile-identifiers.ts'),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const profile={exports:{}};vm.runInNewContext('(function(require,module,exports){'+output+'})')(n=>{if(n==='@nestjs/common')return {BadRequestException:class extends Error{}};throw Error(n)},profile,profile.exports);return profile.exports;}if(name==='@nestjs/common')return {BadRequestException:class extends Error{}};throw Error(name)},mod,mod.exports);
const {studySnapshot}=mod.exports;
const base={mode:'auto',withHour:true,date:'2026-10-12',hour:23,minute:15,dayBoundary:'late-zi'};
for(const acknowledged of [true,false])test(`API and reopen preserve late-Zi confirmation ${acknowledged}`,()=>{
 const input={...base,lateZiAcknowledged:acknowledged};
 const stored=JSON.parse(JSON.stringify(studySnapshot('ky-mon',input)));
 const restored=readStudyInput('ky-mon',new URL(studyHref('ky-mon',stored),'http://localhost').search);
 assert.deepEqual(stored,input);assert.deepEqual(restored,input);
});
test('legacy snapshot has no invented confirmation',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(studySnapshot('ky-mon',base))),base);
 assert.deepEqual(readStudyInput('ky-mon',new URL(studyHref('ky-mon',base),'http://localhost').search),base);
});
for(const value of ['true','1',1,null])test(`invalid confirmation is rejected: ${JSON.stringify(value)}`,()=>{
 assert.throws(()=>studySnapshot('ky-mon',{...base,lateZiAcknowledged:value}));
 assert.equal(validSnapshot('ky-mon',{...base,lateZiAcknowledged:value}),false);
});
for(const query of ['withHour=oops','withHour=','withHour=2',''])test(`malformed withHour cannot silently disable time plate: ${query}`,()=>{
 const suffix='?restore=1&mode=auto&date=2026-10-12&hour=23&minute=15&dayBoundary=late-zi&'+query;
 assert.equal(readStudyInput('ky-mon',suffix),null);
});
test('URL confirmation must use explicit 0/1',()=>{
 const link=studyHref('ky-mon',{...base,lateZiAcknowledged:true});
 assert.equal(readStudyInput('ky-mon',new URL(link.replace('lateZiAcknowledged=1','lateZiAcknowledged=true'),'http://localhost').search),null);
});
test('manual board and signals survive archive round trip',()=>{
 const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
 const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
 const {analyzeHourSignals}=require('../apps/web/src/features/ky-mon/hour-signals.cjs');
 for(const withHour of [true,false]){
  const input={mode:'manual',withHour,solarTermIndex:3,dayCycleIndex:52,hourBranchIndex:5};
  const restored=readStudyInput('ky-mon',new URL(studyHref('ky-mon',JSON.parse(JSON.stringify(studySnapshot('ky-mon',input)))),'http://localhost').search);
  const make=s=>makeBaseFormation({solarTermIndex:s.solarTermIndex,dayCycleIndex:s.dayCycleIndex,hourCycleIndex:s.withHour?hourForDayBranch(s.dayCycleIndex,s.hourBranchIndex).index:null});
  assert.deepEqual(make(input),make(restored));
  if(withHour)assert.deepEqual(analyzeHourSignals(make(input),buildRotatingHourPlate(make(input))),analyzeHourSignals(make(restored),buildRotatingHourPlate(make(restored))));
 }
});

for(const dayBoundary of ['midnight','late-zi'])test(`restored auto board at 23:15 is identical (${dayBoundary})`,()=>{
 const engine=require('../packages/astrology-engine/src/tuvi.js');
 const {suggestKymonContext}=require('../apps/web/src/features/ky-mon/calendar-context.cjs');
 const {makeBaseFormation}=require('../apps/web/src/features/ky-mon/formation.cjs');
 const input={...base,dayBoundary,lateZiAcknowledged:true};
 const restored=readStudyInput('ky-mon',new URL(studyHref('ky-mon',JSON.parse(JSON.stringify(studySnapshot('ky-mon',input)))),'http://localhost').search);
 const decision=s=>{const result=engine.baziCalculate(s);return suggestKymonContext({...s,longitudeDeg:result.solarTerm.longitudeDeg,dayCanChi:result.pillars.day.name,hourCanChi:result.pillars.hour.name,lateZiAcknowledged:s.lateZiAcknowledged??false});};
 const original=decision(input),again=decision(restored);
 assert.equal(original.canAutoForm,true);assert.deepEqual(again,original);
 const form=d=>makeBaseFormation({solarTermIndex:d.solarTerm.index,dayCycleIndex:d.dayCycleIndex,hourCycleIndex:d.hourCycleIndex});
 assert.deepEqual(form(original),form(again));
 assert.equal(decision({...input,lateZiAcknowledged:false}).canAutoForm,false);
 assert.equal(decision({...input,lateZiAcknowledged:undefined}).canAutoForm,false);
});

test('reused lunar-month enumeration cannot be corrupted by a caller',()=>{
 const {listLunarMonths}=require('../packages/interpretation/src/temporal-explorer.cjs');
 for(const year of [1900,2025,2026,2100]){
  const baseline=listLunarMonths(year);const original=JSON.parse(JSON.stringify(baseline));
  baseline[0].days[0].solarDate='corrupted';baseline[0].days.pop();baseline[0].displayName='changed';baseline.pop();
  assert.deepEqual(listLunarMonths(year),original);
 }
 assert.throws(()=>listLunarMonths('2025'),RangeError);
 assert.throws(()=>listLunarMonths(2101),RangeError);
});
