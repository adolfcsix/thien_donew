'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditRuleProfiles,implementations}=require('../infrastructure/scripts/audit-rule-profiles.cjs');
const {CASES,view,generate,verify,outfile}=require('../infrastructure/scripts/chart-baselines-v1112.cjs');
const registry=require('../infrastructure/rules/rule-profiles.v1112.json');
const snap=require('../packages/star-audit/fixtures/chart-baselines.json');
const mod=(n,k)=>((n%k)+k)%k;
function calculateCase(c){const chart=Engine.calculate(c.input);return {chart,annual:Engine.annualOverview(chart,c.annualYear)};}
test('V11.12: six internal profiles match selected engine rule signatures',()=>{
 const result=auditRuleProfiles();assert.equal(result.status,'PASS');assert.equal(result.profileCount,6);assert.equal(result.expertVerified,0);
 assert.equal(Object.keys(implementations).length,6);
});
test('V11.12: alternatives remain unimplemented, cannot be labeled expert-confirmed',()=>{
 assert.equal(registry.editorialStatus,'pending-independent-expert-validation');
 assert.ok(registry.profiles.every(p=>p.requiresExpertReview===true && p.alternatives.length>0));
 assert.equal(snap.status,'engine-regression-only');assert.equal(snap.expertReviewed,false);
});
test('V11.12: all 22 pinned chart baselines match engine outputs byte-independent',()=>{
 assert.equal(verify().caseCount,22);
 assert.deepEqual(generate(),JSON.parse(fs.readFileSync(outfile,'utf8')));
 assert.equal(new Set(CASES.map(c=>c.id)).size,CASES.length);
});
test('V11.12: exactly 12 branches and 12 unique palace topics on every baseline',()=>{
 for(const c of CASES){const {chart}=calculateCase(c);
  assert.deepEqual(chart.houses.map(h=>h.branchIndex),Array.from({length:12},(_,i)=>i),c.id);
  assert.equal(new Set(chart.houses.map(h=>h.palace)).size,12,c.id);
  assert.equal(chart.houses.filter(h=>h.isThan).length,1,c.id);
 }
});
test('V11.12: exactly 14 unique main stars and 4 advanced stars per fully-loaded chart',()=>{
 for(const c of CASES){const {chart}=calculateCase(c);
  const main=chart.houses.flatMap(h=>h.stars),advanced=chart.houses.flatMap(h=>h.advancedStars);
  assert.equal(main.length,14,c.id);assert.equal(new Set(main).size,14,c.id);
  assert.equal(advanced.length,4,c.id);assert.equal(new Set(advanced).size,4,c.id);
 }
});
test('V11.12: Tuần and Triệt each cover exactly two adjacent branches, not independent stars',()=>{
 for(const c of CASES){const {chart}=calculateCase(c);
  assert.equal(chart.obstructionMarkers.length,2,c.id);
  for(const marker of chart.obstructionMarkers){assert.equal(marker.branches.length,2,c.id);
   assert.equal(mod(marker.branches[0]+1,12),marker.branches[1],c.id);
   assert.equal(chart.houses.filter(h=>h.obstructionMarkers.includes(marker.name)).length,2,c.id);
  }
 }
});
test('V11.12: direction and start of Tiểu hạn repeat every 12 lunar years',()=>{
 for(const c of CASES){const chart=Engine.calculate(c.input);const y=chart.lunar.year;
  if(y+12>2100)continue;
  const first=Engine.annualOverview(chart,y).tieuHan;
  const again=Engine.annualOverview(chart,y+12).tieuHan;
  assert.equal(first.branchIndex,again.branchIndex,c.id);
  assert.equal(first.direction,again.direction,c.id);
 }
});
test('V11.12: gender does not alter birth lunar date or 14 main stars at fixed time',()=>{
 const a=Engine.calculate(CASES.find(c=>c.id==='giap-than-nam').input);
 const b=Engine.calculate(CASES.find(c=>c.id==='giap-than-nu').input);
 assert.deepEqual(a.lunar,b.lunar);assert.equal(a.menh,b.menh);assert.equal(a.than,b.than);
 assert.deepEqual(a.houses.map(h=>h.stars),b.houses.map(h=>h.stars));
 assert.notDeepEqual(a.cycles.daiHan,b.cycles.daiHan);
});
test('V11.12: moving between years never mutates natal chart or natal interpretation positions',()=>{
 for(const c of CASES){const chart=Engine.calculate(c.input),before=JSON.stringify(chart);
  const year2=Math.min(2100,c.annualYear+1);
  if(year2<=c.annualYear)continue;
  Engine.annualOverview(chart,c.annualYear);Engine.annualOverview(chart,year2);
  assert.equal(JSON.stringify(chart),before,c.id);
 }
});
test('V11.12: hour 23 maintains supplied civil date and emits explicit policy warning',()=>{
 const x=Engine.calculate({date:'2024-02-09',calendar:'solar',gender:'Nam',hour:23,minute:30});
 assert.deepEqual(x.solar,{year:2024,month:2,day:9});assert.equal(x.hourBranch,'Tý');
 assert.ok(x.warnings.some(w=>w.includes('23:00–23:59')));
});
test('V11.12: Vietnamese lunar-year crossover is based on Tet, not Jan 1',()=>{
 const before=Engine.calculate({date:'2026-02-16',calendar:'solar',gender:'Nam',hour:8});
 const after=Engine.calculate({date:'2026-02-17',calendar:'solar',gender:'Nam',hour:8});
 assert.equal(before.lunar.year,2025);assert.equal(after.lunar.year,2026);
 assert.equal(before.yearCanChi,'Ất Tỵ');assert.equal(after.yearCanChi,'Bính Ngọ');
});
test('V11.12: leap lunar month remains explicit and independently warns',()=>{
 const leap=Engine.calculate({date:'2025-07-27',calendar:'solar',gender:'Nữ',hour:10});
 assert.deepEqual([leap.lunar.month,leap.lunar.leap],[6,true]);
 assert.ok(leap.warnings.some(w=>w.includes('nhuận')));
});
test('V11.12: all documented cases have valid snapshot projections, no accidental drift',()=>{
 for(let i=0;i<CASES.length;i++){
  const {chart,annual}=calculateCase(CASES[i]);
  assert.deepEqual(view(chart,annual),snap.cases[i].expected,CASES[i].id);
 }
});
test('V11.12: internal audit source is never imported into web source',()=>{
 const root=path.resolve(__dirname,'../apps/web/src');
 const filenames=[];
 const walk=dir=>{for(const d of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,d.name);if(d.isDirectory())walk(full);else if(/\.(tsx?|jsx?|css)$/.test(d.name))filenames.push(full);
 }};
 walk(root);
 const leaks=filenames.filter(p=>/rule-profiles\.v1112|audit-rule-profiles|chart-baselines-v1112/.test(fs.readFileSync(p,'utf8')));
 assert.deepEqual(leaks,[]);
});
