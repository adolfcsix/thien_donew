'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const D=require('../packages/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs');
const J=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const W=require('../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
const docket=require('../packages/knowledge/src/star-source-docket.json');
test('Two official date-only calendars: 24 Jie dates, no invented minute',()=>{
 assert.deepEqual(D.auditDayLedger().errors,[]);assert.equal(D.TERM_DATES.length,24);
 for(const r of D.TERM_DATES){assert.match(r.sourceUrl,/hko\.gov\.hk/);assert.equal('instantUtc' in r,false);}
});
test('Local HKT day is computed from timestamp offset independent of input zone',()=>{
 const a=D.resolveJieDayEvidence({instantIso:'2024-02-03T17:20:00Z'});
 assert.equal(a.localHktDate,'2024-02-04');assert.equal(a.status,'ON_JIE_DATE');assert.equal(a.active.term,'Lập Xuân');
 assert.equal(a.canCalculateYearMonthPillars,false);
 const b=D.resolveJieDayEvidence({instantIso:'2024-02-04T00:20:00+07:00'});
 assert.equal(b.status,'ON_JIE_DATE');assert.equal(b.active.term,'Lập Xuân');
});
test('Date-only days between Jie carry context but never a computed month pillar',()=>{
 const a=D.resolveJieDayEvidence({instantIso:'2028-08-20T12:00:00+08:00'});
 assert.equal(a.status,'DATE_ONLY_CONTEXT');assert.equal(a.active.term,'Lập Thu');assert.equal(a.next.term,'Bạch Lộ');
 assert.equal(a.canResolveJieInstant,false);assert.equal(a.canCalculateYearMonthPillars,false);
});
test('2025-2027 verified minute research is NOT changed or silently extended',()=>{
 assert.equal(J.COVERAGE.years.length,3);assert.equal(J.resolveJieAt({instantIso:'2028-08-20T04:00:00Z'}).status,'OUT_OF_COVERAGE');
 assert.equal(D.resolveJieDayEvidence({instantIso:'2026-04-10T00:00:00Z'}).status,'OUT_OF_COVERAGE');
});
test('Reject malformed instants and forged minute-level evidence',()=>{
 assert.throws(()=>D.resolveJieDayEvidence({instantIso:'2028-04-04T00:00:00'}));
 const forged=D.TERM_DATES.map(x=>({...x}));forged[0].instantUtc='2024-01-06T00:00:00Z';
 assert.match(D.auditDayLedger(forged).errors.join(' '),/Date-only/);
});
test('All 11 missing stars and 4 aliases stay locked in read-only review',()=>{
 const x=W.auditWitnesses();assert.equal(x.status,'RESEARCH_LOCKED');assert.deepEqual(x.errors,[]);
 assert.equal(x.records.length,15);assert.deepEqual(x.counts,{missing:11,aliases:4,automaticNewPlacements:0,independentApproved:0});
 assert.ok(x.records.every(r=>!r.canPlaceAutomatically&&!r.canMergeAlias));
});
test('Tampered docket must not be approved',()=>{
 const data=structuredClone(docket);data.records[0].automaticPlacement=true;
 assert.equal(W.auditWitnesses(data).status,'BLOCKED');
});
test('Unresolved variant differences are explicit, never merged by matching names',()=>{
 const x=W.auditWitnesses();assert.ok(x.records.some(r=>r.status==='CONFLICTING_METHODS'));
 assert.ok(x.records.every(r=>r.requiresIndependentFixture));
});

test('Both browser-facing research pages expose date-only and star lock notices',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const bazi=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/bazi/page.tsx'),'utf8');
 const star=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/research/star-audit/page.tsx'),'utf8');
 assert.match(bazi,/dayEvidence\.canCalculateYearMonthPillars|không tự tính trụ tháng/);
 assert.match(bazi,/(?:calendarDayEvidence|dayEvidence)\.sourceUrl/);assert.match(star,/auditWitnesses/);
 assert.match(star,/Không gộp dị danh/);
});
test('CI source and fullstack workflows enforce new audit',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const f of ['source-integrity.yml','ci.yml']){
  const s=fs.readFileSync(path.join(__dirname,'../.github/workflows',f),'utf8');
  assert.match(s,/(audit-star-jie-witness-v111496|audit:star-jie-witness:1496)/);assert.match(s,/v111496-jie-day-star-witness\.test\.cjs/);
 }
});
