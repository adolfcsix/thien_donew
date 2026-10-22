'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {auditTemporalIntegrity,AUDIT_ID}=require('../packages/interpretation/src/temporal-integrity-audit.cjs');
const {listLunarMonths,getSubannualResearch}=require('../packages/interpretation/src/temporal-explorer.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Lunar=require('../packages/astrology-engine/src/lunar.js');
const sample=Engine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});
const full=auditTemporalIntegrity();
test('V11.23: calendar audit checks all 201 years without internal inconsistencies',()=>{
 assert.equal(full.auditId,AUDIT_ID);
 assert.equal(full.status,'PASS');
 assert.deepEqual(full.issues,[]);
 assert.equal(full.stats.years,201);
 assert.ok(full.stats.roundTripDates>73000);
 assert.ok(full.stats.solarContinuityChecks>73000);
 assert.equal(full.yearRecords.length,201);
});
test('V11.23: at most one leap month, with 2025 leap-six and 2026 regular calendar',()=>{
 const a=full.yearRecords.find(r=>r.year===2025),b=full.yearRecords.find(r=>r.year===2026);
 assert.equal(a.months,13);assert.equal(a.leapMonths,1);
 assert.equal(b.months,12);assert.equal(b.leapMonths,0);
 const months=listLunarMonths(2025);
 const leap=months.find(m=>m.leap);
 assert.equal(leap.key,'6-1');assert.equal(leap.firstSolarDate,'2025-07-25');
 assert.equal(months[months.findIndex(m=>m.key==='6-0')+1].key,'6-1');
});
test('V11.23: 2100 explicitly reports a partial last month and other years do not',()=>{
 const prior=full.yearRecords.filter(r=>r.year<2100);
 assert.ok(prior.every(r=>r.partialMonths===0));
 assert.ok(full.yearRecords.find(r=>r.year===2100).partialMonths>0);
});
test('V11.23: explicit historical and recent ranges run without manual date patching',()=>{
 for(const [a,b] of [[1900,1901],[1983,1984],[2024,2026],[2099,2100]]){
  const report=auditTemporalIntegrity({startYear:a,endYear:b});
  assert.equal(report.status,'PASS');assert.equal(report.stats.years,b-a+1);
  assert.equal(report.yearRecords.length,b-a+1);
 }
});
test('V11.23: audit refuses years outside supported window or a reversed window',()=>{
 for(const args of [{startYear:1899,endYear:1901},{startYear:2099,endYear:2101},{startYear:2026,endYear:2025},{startYear:2026.5,endYear:2030}])
  assert.throws(()=>auditTemporalIntegrity(args),RangeError);
});
test('V11.23: subannual research remains opt-in and must never claim verified flowing stars',()=>{
 const a=getSubannualResearch(sample,2025,6,true,1,23);
 assert.equal(a.status,'research-only');
 assert.equal(a.coverage.monthlyStars,false);
 assert.equal(a.coverage.dailyStars,false);
 assert.equal(a.coverage.hourlyStars,false);
 assert.equal(a.coverage.independentExpertReview,false);
 assert.equal(a.leapPolicy,'repeat-regular-month');
 assert.equal(a.monthIsLeap,true);
 assert.match(a.caution,/chưa an sao lưu/i);
});
test('V11.23: calendar day reference can round-trip independently of the house calculation',()=>{
 const reference=[{solar:'2025-07-25',lunar:{year:2025,month:6,day:1,leap:true}},
  {solar:'2025-07-26',lunar:{year:2025,month:6,day:2,leap:true}}];
 for(const c of reference){
  const [y,m,d]=c.solar.split('-').map(Number);
  assert.deepEqual(Lunar.solarToLunar(y,m,d),c.lunar);
  assert.deepEqual(Lunar.lunarToSolar(c.lunar.year,c.lunar.month,c.lunar.day,true),{year:y,month:m,day:d});
 }
});
test('V11.23: 201-year audit report never claims astronomical or school certification',()=>{
 assert.equal(full.scope,'internal-consistency-not-independent-domain-review');
 assert.ok(full.limitations.length>=4);
 assert.equal(full.generatedAt,null);
 const script=fs.readFileSync('infrastructure/scripts/audit-temporal-integrity.cjs','utf8');
 assert.match(script,/docs','validation/);
 const ui=fs.readFileSync('apps/web/src/features/chart/components/temporal-detail.tsx','utf8');
 assert.doesNotMatch(ui,/temporal-integrity-audit|V11_23_TEMPORAL_INTEGRITY|validation\/V11_23/);
});
