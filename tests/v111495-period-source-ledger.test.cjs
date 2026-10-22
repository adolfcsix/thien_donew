'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const TuHoa=require('../packages/astrology-engine/src/tuhoa.js');
const {buildPeriodEvidence}=require('../packages/interpretation/src/period-evidence-v111495.cjs');
const {comparePeriods}=require('../packages/interpretation/src/period-timeline.cjs');
const baseline=require('../packages/star-audit/fixtures/chart-baselines.json');
const docket=require('../packages/knowledge/src/star-source-docket.json');
const chart=()=>Engine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});
const build=(c,y)=>buildPeriodEvidence(c,Engine.annualOverview(c,y));

test('60-year Can-Chi cycle: 10 stems, 12 branches, 4 transforms and 12 yearly stars each',()=>{
 const c=chart(), stems=new Set(), branches=new Set(),keys=new Set();
 for(let y=2024;y<2084;y++){
  const e=build(c,y);stems.add(e.yearStem);branches.add(e.yearBranch);keys.add(`${e.yearStem}-${e.yearBranch}`);
  assert.equal(e.entries.length,16,`year ${y}`);
  assert.equal(e.entries.filter(x=>x.kind==='annual-star').length,12);
  assert.equal(e.entries.filter(x=>x.kind==='annual-transformation').length,4);
  assert.ok(e.entries.every(x=>x.expertReviewed===false));
 }
 assert.equal(stems.size,10);assert.equal(branches.size,12);assert.equal(keys.size,60);
});
test('Hóa uses one explicit table row and the REAL host-star branch, not a new star',()=>{
 const c=chart();
 for(let y=2024;y<2084;y++){
  const e=build(c,y),stem=(y-4)%10;
  const natal=new Map(c.houses.flatMap(h=>[...h.stars,...h.auxiliaryStars].map(n=>[n,h.branchIndex])));
  const t=e.entries.filter(x=>x.kind==='annual-transformation');
  assert.deepEqual(t.map(x=>x.hostStar),TuHoa.ROWS[stem]);
  for(const s of t){assert.equal(s.branchIndex,natal.get(s.hostStar));assert.equal(s.ruleSet,TuHoa.RULESET);assert.equal(s.inputValue,e.yearStem);}
 }
});
test('12 annual stars have explicit stem/branch, versioned rule and actual palace; never mixed with natal',()=>{
 const c=chart();for(const y of [2024,2026,2033,2045,2066]){
  const e=build(c,y),houseByBranch=new Map(c.houses.map(h=>[h.branchIndex,h.palace]));
  for(const s of e.entries.filter(x=>x.kind==='annual-star')){
   assert.ok(s.name.startsWith('Lưu '));assert.equal(houseByBranch.get(s.branchIndex),s.palace);
   assert.ok(s.ruleSet.length>8);assert.equal(s.inputValue,s.inputKind==='heavenly-stem'?e.yearStem:e.yearBranch);
  }
 }
});
test('tamper tests: reject false transformation host, false annual branch and missing source rule',()=>{
 const c=chart(), e=Engine.annualOverview(c,2026);
 const copy=()=>structuredClone(e);
 {const a=copy();a.luuTuHoa.items[0].star='Thái Hóa Đoán';assert.throws(()=>buildPeriodEvidence(c,a),/bảng Tứ Hóa/);}
 {const a=copy();a.luuStars.items[0].branch=99;assert.throws(()=>buildPeriodEvidence(c,a),/ngoài 12 cung/);}
 {const a=copy();a.luuStars.items[0].ruleSet='';assert.throws(()=>buildPeriodEvidence(c,a),/thiếu phiên bản/);}
 {const a=copy();a.luuStars.items[0].basis='không rõ';assert.throws(()=>buildPeriodEvidence(c,a),/không rõ/);}
 {const a=copy();a.luuTuHoa.yearStemIndex=7;assert.throws(()=>buildPeriodEvidence(c,a),/can năm/);}
});
test('pending 11 stars + 4 aliases remain research-only, all gates closed',()=>{
 assert.equal(docket.records.filter(x=>x.category==='missing').length,11);
 assert.equal(docket.records.filter(x=>x.category==='alias').length,4);
 for(const r of docket.records){assert.equal(r.automaticPlacement,false,r.name);assert.equal(r.automaticAlias,false,r.name);assert.equal(r.gates.independentChartFixture,false,r.name);assert.equal(r.gates.schoolReview,false,r.name);}
});
test('22 baseline charts: ledger exactly matches chosen 12 houses and 16 overlays',()=>{
 for(const x of baseline.cases){
  const c=Engine.calculate(x.input),y=Math.max(2026,c.lunar.year);const t=comparePeriods(c,y);
  assert.equal(t.annualTrace.selectedLunarYear,y,x.id);
  assert.equal(t.houses.flatMap(h=>h.annualEvidence).length,16,x.id);
  for(const h of t.houses){
   const traces=h.annualEvidence;
   assert.ok(traces.every(e=>e.branchIndex===h.branchIndex&&e.palace===h.palace),x.id);
   assert.deepEqual(traces.filter(e=>e.kind==='annual-star').map(e=>e.name),h.annualStars,x.id);
   assert.deepEqual(traces.filter(e=>e.kind==='annual-transformation').map(e=>e.name),h.annualTransformations.map(e=>e.name),x.id);
  }
 }
});
test('UI includes year, source rules, original host star and open pending gate; not a prediction',()=>{
 const view=fs.readFileSync('apps/web/src/features/chart/components/period-timeline.tsx','utf8');
 for(const key of ['annualEvidence','annualTrace.yearStem','annualTrace.yearBranch','hostStar','ruleSet','unresolvedNames','unresolvedAliases'])assert.ok(view.includes(key),key);
 const ts=fs.readFileSync('packages/interpretation/src/period-timeline.d.ts','utf8');
 assert.match(ts,/annualEvidence/);assert.match(ts,/annualTrace/);
 assert.equal(comparePeriods(chart(),2026).coverage.fullLuuNien,false);
});
