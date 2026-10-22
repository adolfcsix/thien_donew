'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const naoj=require('../packages/astrology-engine/src/bazi-jie-naoj-minute-v111499.cjs');
const hko=require('../packages/astrology-engine/src/bazi-jie-hko-days-v111498.cjs');
const primary=require('../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const star=require('../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
const period=require('../infrastructure/scripts/audit-star-period-evidence-v111495.cjs');
const audit=require('../infrastructure/scripts/audit-naoj-jie-v111499.cjs');
const ledger=require('../packages/astrology-engine/src/reference/naoj-jie-primary-minute-2017-2023.json');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps/web/src/app/bazi/page.tsx'),'utf8');
test('84 official NAOJ minute events cross-match all 84 HKO civil-day dates and 12 Jie per year',()=>{
 assert.deepEqual(naoj.AUDIT.errors,[]);assert.equal(naoj.EVENTS.length,84);assert.equal(naoj.AUDIT.matchedHkoCalendarDates,84);
 for(let i=0;i<84;i++){
  assert.equal(naoj.EVENTS[i].year,2017+Math.floor(i/12));
  assert.equal(naoj.EVENTS[i].month,1+i%12);
  assert.equal(naoj.EVENTS[i].solarLongitudeDegrees,(285+30*(i%12))%360);
  assert.equal(naoj.EVENTS[i].localHkt.slice(0,10),hko.EVENTS[i].localHktDate);
 }
});
test('Authoritative cross-zone cases: 2017 Feb 3 HKT, 2018 Mar 5 HKT, 2021 Feb 3 HKT, 2023 Mar 6',()=>{
 const expected=[
 ['2017-02','2017-02-03T23:34:00+08:00'],
 ['2018-03','2018-03-05T23:28:00+08:00'],
 ['2021-02','2021-02-03T22:59:00+08:00'],
 ['2023-03','2023-03-06T04:36:00+08:00']];
 for(const [key,when] of expected){assert.equal(naoj.EVENTS.find(x=>`${x.year}-${String(x.month).padStart(2,'0')}`===key).localHkt,when);}
});
test('Timezone invariance: HKT, JST and Vietnam express the same instant',()=>{
 const a=naoj.resolveNaOJJie({instantIso:'2018-03-05T23:35:00+08:00'});
 const b=naoj.resolveNaOJJie({instantIso:'2018-03-06T00:35:00+09:00'});
 const c=naoj.resolveNaOJJie({instantIso:'2018-03-05T22:35:00+07:00'});
 assert.deepEqual(a,b);assert.deepEqual(b,c);assert.equal(a.status,'RESOLVED_RESEARCH_ONLY');assert.equal(a.active.term,'Kinh Trập');
});
test('±120 seconds around ingress requires review and never certifies natal year/month or Da Yun',()=>{
 const event=naoj.EVENTS.find(x=>x.year===2018&&x.month===3);
 for(const d of [-120000,0,120000]){
  const r=naoj.resolveNaOJJie({instantIso:new Date(event.epochMs+d).toISOString()});
  assert.equal(r.status,'BOUNDARY_REVIEW');assert.equal(r.active,null);assert.equal(r.canCalculateYearMonthPillars,false);assert.equal(r.canCalculateDaYun,false);
  assert.equal(r.boundary.term,'Kinh Trập');
 }
 assert.equal(naoj.resolveNaOJJie({instantIso:new Date(event.epochMs+121000).toISOString()}).status,'RESOLVED_RESEARCH_ONLY');
});
test('Outside coverage and first January gap fail closed; no inferred previous-year Jie',()=>{
 assert.equal(naoj.resolveNaOJJie({instantIso:'2016-12-29T12:00:00Z'}).status,'OUT_OF_COVERAGE');
 assert.equal(naoj.resolveNaOJJie({instantIso:'2024-01-02T12:00:00Z'}).status,'OUT_OF_COVERAGE');
 assert.equal(naoj.resolveNaOJJie({instantIso:'2017-01-01T12:00:00Z'}).status,'OUT_OF_COVERAGE');
 assert.throws(()=>naoj.resolveNaOJJie({instantIso:'2019-05-06T15:30:00'}));
});
test('NAOJ transcript ledger lacks invented seconds, and source URL points to the selected year',()=>{
 for(const r of ledger.records){assert.equal(r.localJst.slice(17,19),'00');assert.ok(r.localJst.endsWith('+09:00'));
  assert.equal(Object.keys(r).sort().join(','),'localJst,month,year');}
 for(const event of naoj.EVENTS){assert.equal(event.sourceUrl,ledger.sources[event.year]);assert.ok(event.hkoDayWitnessUrl.endsWith(event.year+'e.pdf'));}
});
test('Tampering dates, partial years, source, auto-promotion, original offset, nonexistent instant blocks audit',()=>{
 const mutations=[d=>{d.records.pop()},d=>{d.records[0].localJst='2017-01-05T00:00:00+09:00'},
  d=>{d.records[0].localJst='2017-01-32T12:56:00+09:00'},d=>{d.records[0].localHkt='2017-01-05T00:00:00+08:00'},
  d=>{d.sources[2017]='https://example.org/fake'},d=>{d.allowAutomaticPillarPromotion=true},
  d=>{d.utcOffsetMinutes=480},d=>{d.records[15].localJst=d.records[14].localJst}];
 for(const mutation of mutations){const copy=structuredClone(ledger);mutation(copy);assert.equal(naoj.auditNaOJMinuteLedger(copy).status,'BLOCKED');}
});
test('Frozen ledger SHA is review-gated and source audit passes',()=>{
 const data=fs.readFileSync(path.join(root,'packages/astrology-engine/src/reference/naoj-jie-primary-minute-2017-2023.json'));
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),audit.FROZEN_SHA256);
 assert.equal(audit.audit().status,'CROSS_SOURCE_AUDIT_PASS');
});
test('NAOJ UI module loads without filesystem or other Node built-ins',()=>{
 const vm=require('node:vm');
 const {createRequire}=require('node:module');
 const file=path.join(root,'packages/astrology-engine/src/bazi-jie-naoj-minute-v111499.cjs');
 const localRequire=createRequire(file),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,require:id=>{
  assert.ok(!id.startsWith('node:'),'UI module must not import '+id);
  assert.ok(!['fs','crypto','path'].includes(id),'UI module must not import '+id);
  return localRequire(id);
 }},{filename:file});
 assert.equal(module.exports.DATA_SHA256,audit.FROZEN_SHA256);
 assert.equal(module.exports.resolveNaOJJie({instantIso:'2018-03-05T22:35:00+07:00'}).status,'RESOLVED_RESEARCH_ONLY');
});
test('Separate earlier HKO 2013–2016 minute data and 2017–2023 day witnesses survive',()=>{
 assert.equal(primary.EVENTS.length,48);assert.equal(hko.EVENTS.length,84);
 assert.equal(primary.resolvePrimaryHkoJie({instantIso:'2018-03-05T23:40:00+08:00'}).status,'OUT_OF_COVERAGE');
 assert.equal(hko.resolveOfficialHkoJieDay({instantIso:'2018-03-05T23:40:00+08:00'}).status,'ON_JIE_DATE');
});
test('Tử Vi retained 104 names, 12 palaces, 12 annual stars and 4 annual transformations',()=>{
 const a=period.audit();assert.equal(a.status,'SOURCE_AUDIT_PASS');assert.equal(a.coverage.natalAndCycle,104);
 assert.equal(a.coverage.palaces,12);assert.equal(a.coverage.annualStars,12);assert.equal(a.coverage.annualTransformations,4);
 const s=star.auditWitnesses();assert.equal(s.status,'RESEARCH_LOCKED');assert.equal(s.counts.missing,11);assert.equal(s.counts.aliases,4);
 assert.equal(s.counts.automaticNewPlacements,0);
});
test('Bát Tự expert-only copy distinguishes NAOJ exact minute from HKO day-only, no engine promotion',()=>{
 assert.match(source,/resolveNaOJJie/);assert.match(source,/naojMinuteEvidence\.status/);
 assert.match(source,/Đối chiếu thiên văn NAOJ — 2017–2023/);assert.match(source,/không tự thay đổi trụ tháng, Đại vận/);
 assert.ok(source.indexOf('naojMinuteEvidence.status')>source.indexOf('<ExpertOnly'));
 assert.ok(!/zipingDeepResearch\(\{[^}]*naojMinuteEvidence/.test(source));
});
test('GitHub Actions gates require the NAOJ source audit and regression',()=>{
 for(const workflow of ['ci.yml','source-integrity.yml']){
  const y=fs.readFileSync(path.join(root,'.github/workflows',workflow),'utf8');
  assert.match(y,/audit:naoj-jie:1499/);assert.match(y,/v111499-naoj-jie-witness\.test\.cjs/);
 }
});
