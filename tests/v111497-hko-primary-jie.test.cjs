'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const previous=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const D=require('../packages/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs');
test('48 minute-level primary HKO Jie times are audited and chronologically valid',()=>{
 assert.equal(H.AUDIT.status,'SOURCE_TRANSCRIPTION_PASS');assert.deepEqual(H.AUDIT.errors,[]);assert.equal(H.EVENTS.length,48);
 assert.deepEqual(H.YEARS,[2013,2014,2015,2016]);
 for(let i=0;i<48;i++){assert.equal(H.EVENTS[i].term,previous.JIE_TERMS[i%12]);assert.equal(H.EVENTS[i].year,2013+Math.floor(i/12));}
});
test('Reproduce four independent HKO year-source values to minute',()=>{
 const m=[['2013-02-04T00:13:00+08:00','Lập Xuân'],['2014-06-06T02:03:00+08:00','Mang Chủng'],
 ['2015-09-08T07:00:00+08:00','Bạch Lộ'],['2016-07-07T00:03:00+08:00','Tiểu Thử']];
 for(const [clock,term] of m){const evt=H.EVENTS.find(x=>x.localHkt===clock);assert.equal(evt?.term,term);assert.match(evt.sourceUrl,/hko\.gov\.hk/);}
});
test('Research boundary ±60 sec remains unresolved; no silent automatic promotion',()=>{
 const a=H.resolvePrimaryHkoJie({instantIso:'2014-02-04T06:02:01+08:00'});
 const b=H.resolvePrimaryHkoJie({instantIso:'2014-02-04T06:03:59+08:00'});
 for(const r of [a,b]){assert.equal(r.status,'BOUNDARY_REVIEW');assert.equal(r.active,null);assert.equal(r.canCalculateYearMonthPillars,false);assert.equal(r.canCalculateDaYun,false);}
 const c=H.resolvePrimaryHkoJie({instantIso:'2014-02-04T06:04:01+08:00'});
 assert.equal(c.status,'RESOLVED_RESEARCH_ONLY');assert.equal(c.active.term,'Lập Xuân');assert.equal(c.canCalculateYearMonthPillars,false);
});
test('One instant in VN UTC+7 and HK UTC+8 gives identical Jie result',()=>{
 const a=H.resolvePrimaryHkoJie({instantIso:'2014-02-04T05:05:00+07:00'});
 const b=H.resolvePrimaryHkoJie({instantIso:'2014-02-04T06:05:00+08:00'});
 assert.deepEqual(a,b);
});
test('No extrapolation before first Jie or after final HKO year',()=>{
 assert.equal(H.resolvePrimaryHkoJie({instantIso:'2013-01-02T00:00:00+08:00'}).status,'OUT_OF_COVERAGE');
 assert.equal(H.resolvePrimaryHkoJie({instantIso:'2017-01-01T00:00:00+08:00'}).status,'OUT_OF_COVERAGE');
 assert.throws(()=>H.resolvePrimaryHkoJie({instantIso:'2014-02-04T00:00:00'}));
});
test('Legacy 2025–27 and date-only 2024/2028 datasets unchanged and independent',()=>{
 assert.equal(previous.EVENTS.length,36);assert.deepEqual(previous.COVERAGE.years,[2025,2026,2027]);
 assert.equal(D.TERM_DATES.length,24);assert.equal(D.resolveJieDayEvidence({instantIso:'2014-02-04T00:00:00Z'}).status,'OUT_OF_COVERAGE');
});
test('Tampered source metadata blocked, audit checksum is locked',()=>{
 const original=require('../packages/astrology-engine/src/reference/hko-jie-primary-minute-2013-2016.json');
 const changed=structuredClone(original);changed.records[0].year=2040;
 assert.equal(H.auditPrimaryMinuteLedger(changed).status,'BLOCKED');
 assert.deepEqual(require('../infrastructure/scripts/audit-hko-primary-jie-v111497.cjs').audit().errors,[]);
});
test('Web page exposes primary reference only in deep mode and never substitutes year/month engine',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/app/bazi/page.tsx'),'utf8');
 assert.match(s,/resolvePrimaryHkoJie/);assert.match(s,/primaryJie\.status/);
 assert.match(s,/không tự thay đổi trụ tháng/);
 assert.ok(s.indexOf('primaryJie.status')>s.indexOf('<ExpertOnly'));
});
test('CI checks official transcript consistency both in source and full workflows',()=>{
 for(const name of ['source-integrity.yml','ci.yml']){
  const y=fs.readFileSync(path.resolve(__dirname,'../.github/workflows',name),'utf8');
  assert.match(y,/audit:hko-jie-primary:1497/);assert.match(y,/v111497-hko-primary-jie\.test\.cjs/);
 }
});
