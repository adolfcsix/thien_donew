'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../packages/astrology-engine/src/bazi-jie-hko-days-v111498.cjs');
const P=require('../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const oldDay=require('../packages/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs');
const oldMinute=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const report=require('../infrastructure/scripts/audit-hko-jie-days-v111498.cjs');
const root=path.resolve(__dirname,'..');
test('Official HKO day-only series contains seven complete years and 84 correctly named minor Jie',()=>{
 assert.deepEqual(D.YEARS,[2017,2018,2019,2020,2021,2022,2023]);
 assert.equal(D.EVENTS.length,84);assert.deepEqual(D.AUDIT.errors,[]);
 for(let i=0;i<84;i++){
  assert.equal(D.EVENTS[i].year,2017+Math.floor(i/12));
  assert.equal(D.EVENTS[i].month,1+i%12);
  assert.equal(D.EVENTS[i].term,oldMinute.JIE_TERMS[i%12]);
  assert.match(D.EVENTS[i].sourceUrl,/hko\.gov\.hk/);
 }
});
test('Seven independent annual PDF witness anchors agree with official HKO table',()=>{
 const anchors=[
 ['2017-02-03','Lập Xuân'],['2018-06-06','Mang Chủng'],
 ['2019-08-08','Lập Thu'],['2020-07-06','Tiểu Thử'],
 ['2021-02-03','Lập Xuân'],['2022-05-05','Lập Hạ'],
 ['2023-03-06','Kinh Trập']];
 for(const [date,term] of anchors){
  const e=D.EVENTS.find(x=>x.localHktDate===date);
  assert.equal(e?.term,term,`HKO PDF date ${date}`);
  assert.equal(D.resolveOfficialHkoJieDay({instantIso:date+'T12:00:00+08:00'}).status,'ON_JIE_DATE');
 }
});
test('12 Jie each year but NO invented ingress hour, minute or timestamp',()=>{
 for(const e of D.EVENTS){
  assert.deepEqual(Object.keys(e).sort(),['day','localHktDate','month','solarLongitudeDegrees','sourceUrl','term','year']);
  assert.ok(e.day>=3&&e.day<=9);
 }
 assert.equal(D.AUDIT.verifiedMinuteTimes,0);
});
test('Vietnam UTC+7 and HKT UTC+8 map to same calendar date and same evidence',()=>{
 const a=D.resolveOfficialHkoJieDay({instantIso:'2023-03-05T23:10:00+07:00'});
 const b=D.resolveOfficialHkoJieDay({instantIso:'2023-03-06T00:10:00+08:00'});
 assert.deepEqual(a,b);assert.equal(a.status,'ON_JIE_DATE');
});
test('No inference of exact Jie arrival on the same day',()=>{
 const before=D.resolveOfficialHkoJieDay({instantIso:'2017-02-03T00:00:00+08:00'});
 const after=D.resolveOfficialHkoJieDay({instantIso:'2017-02-03T23:59:59+08:00'});
 for(const r of [before,after]){
  assert.equal(r.status,'ON_JIE_DATE');assert.equal(r.canResolveJieInstant,false);
  assert.equal(r.canCalculateYearMonthPillars,false);assert.equal(r.canCalculateDaYun,false);
  assert.equal(r.researchOnly,true);
 }
});
test('Day-only date sequence never invents previous-year Jie in early January',()=>{
 const jan=D.resolveOfficialHkoJieDay({instantIso:'2019-01-01T00:00:00+08:00'});
 assert.equal(jan.active,null);assert.equal(jan.next.term,'Tiểu Hàn');
 assert.equal(jan.status,'DATE_ONLY_CONTEXT');
 const dec=D.resolveOfficialHkoJieDay({instantIso:'2022-12-24T00:00:00+08:00'});
 assert.equal(dec.active.term,'Đại Tuyết');assert.equal(dec.next,null);
});
test('Explicit offset required; outside year range fails closed',()=>{
 assert.throws(()=>D.resolveOfficialHkoJieDay({instantIso:'2019-03-06T12:00:00'}));
 for(const y of [2016,2024,2028])assert.equal(D.resolveOfficialHkoJieDay({instantIso:`${y}-03-06T12:00:00+08:00`}).status,'OUT_OF_COVERAGE');
});
test('Tampering event type, date precision, incomplete rows or sources fails audit',()=>{
 const input=require('../packages/astrology-engine/src/reference/hko-jie-official-days-2017-2023.json');
 for(const mutate of [
  d=>{d.records[0].hour=0},d=>{d.records.splice(0,1)},
  d=>{d.records[1].day=32},d=>{d.sources['2020']='https://attacker.example/2020'},
  d=>{d.allowAutomaticPillarPromotion=true}
 ]){
  const o=structuredClone(input);mutate(o);
  assert.equal(D.auditOfficialDayLedger(o).status,'BLOCKED');
 }
});
test('Content integrity SHA256 locks the official date transcript',()=>{
 const data=fs.readFileSync(path.join(root,'packages/astrology-engine/src/reference/hko-jie-official-days-2017-2023.json'));
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),D.DATA_SHA256);
 assert.equal(report.audit().status,'SOURCE_WITNESS_PASS');
});
test('Old HKO official 2013–16 minutes and 2024/28 date-only witnesses stay separate',()=>{
 assert.equal(P.EVENTS.length,48);assert.equal(oldDay.TERM_DATES.length,24);
 assert.equal(oldMinute.EVENTS.length,36);
 assert.equal(P.resolvePrimaryHkoJie({instantIso:'2018-02-04T12:00:00+08:00'}).status,'OUT_OF_COVERAGE');
 assert.equal(oldDay.resolveJieDayEvidence({instantIso:'2018-02-04T12:00:00+08:00'}).status,'OUT_OF_COVERAGE');
});
test('Bát Tự only shows official dates as research data in the Chuyên sâu layer',()=>{
 const s=fs.readFileSync(path.join(root,'apps/web/src/app/bazi/page.tsx'),'utf8');
 assert.match(s,/resolveOfficialHkoJieDay/);
 assert.match(s,/calendarDayEvidence/);
 assert.match(s,/không phải thời điểm giao tiết có giờ\/phút/);
 assert.ok(s.indexOf('calendarDayEvidence.status')>s.indexOf('<ExpertOnly'));
});
test('CI source-only and full-stack jobs require date audit and tests',()=>{
 for(const f of ['source-integrity.yml','ci.yml']){
  const y=fs.readFileSync(path.join(root,'.github/workflows',f),'utf8');
  assert.match(y,/audit:hko-jie-days:1498/);assert.match(y,/v111498-hko-official-days\.test\.cjs/);
 }
});
