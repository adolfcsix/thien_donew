'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const BaZi=require('../packages/astrology-engine/src/bazi.js');
const Jie=require('../packages/astrology-engine/src/bazi-jie-reference.cjs');
const Pattern=require('../packages/astrology-engine/src/bazi-pattern-evidence.cjs');
const {getSchool,gateSchoolExecution}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const sample={date:'2026-05-18',hour:10,minute:20,utcOffsetMinutes:420,longitudeDeg:105};
const build=()=>Pattern.evaluatePatternEvidence(sample);
const legacy=()=>Jie.evaluateWithReferenceJie(sample);
const file=x=>readFileSync(resolve(__dirname,'..',x),'utf8');
// These are deliberately SYNTHETIC structural fixtures, not historical birth charts.
// Always align ten-god, element, stem parity and hidden-stem data with legacy tables.
function crafted(branches){
 const chart=structuredClone(legacy());
 for(const [key,b] of Object.entries(branches)){
  const p=chart.pillars[key];p.branchIndex=b;
  if(p.stemIndex%2!==b%2)p.stemIndex=b%2;
  p.stem=BaZi.STEMS[p.stemIndex];p.branch=BaZi.BRANCHES[b];
  p.name=`${p.stem} ${p.branch}`;p.element=BaZi.ELEMENTS[p.stemIndex];
 }
 const day=chart.pillars.day.stemIndex;
 for(const [key,p] of Object.entries(chart.pillars)){
  p.hiddenStems=BaZi.hiddenStems(p.branchIndex,day);
  p.tenGod=key==='day'?null:BaZi.tenGod(day,p.stemIndex);
 }
 chart.dayMaster.stem=BaZi.STEMS[day];chart.dayMaster.element=BaZi.ELEMENTS[day];
 chart.dayMaster.polarity=day%2===0?'Dương':'Âm';
 return chart;
}
test('V11.96: pattern ledger consumes actual V11.94/Jie and V11.95 season model',()=>{
 const x=build();assert.equal(x.status,'PROVISIONAL');assert.equal(x.monthBranch,'Tỵ');
 assert.equal(x.exposure.length,3);assert.equal(x.researchOnly,true);
 assert.equal(x.ruleSet,Pattern.RULESET);
});
test('V11.96: method never fills formation, breakage, strength or Useful God even when relations present',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:6,hour:7}));
 for(const k of ['pattern','formation','breakage','dayMasterStrength','usefulGod'])assert.equal(x.decision[k],null);
 assert.equal(x.methodChecks.length,3);assert.ok(x.methodChecks.every(m=>m.verdict==='UNDETERMINED'));
});
test('V11.96: Jan/Feb Jie boundary is BLOCKED without partial evidence',()=>{
 const x=Pattern.evaluatePatternEvidence({date:'2026-02-04',hour:3,minute:2,utcOffsetMinutes:420,longitudeDeg:105});
 assert.equal(x.status,'BLOCKED');assert.equal(x.monthBranch,null);assert.equal(x.branchGroups.length,0);
 assert.equal(x.decision.pattern,null);
});
test('V11.96: out of coverage does not use approximate calendar fallback',()=>{
 const x=Pattern.evaluatePatternEvidence({...sample,date:'2004-05-18'});
 assert.equal(x.status,'BLOCKED');assert.equal(x.reason,'Jie_OUT_OF_COVERAGE');
});
test('V11.96: cannot bypass upstream ruleset / research gating',()=>{
 assert.throws(()=>Pattern.buildPatternEvidence(BaZi.calculate({date:'2026-05-18',hour:10,minute:20})),TypeError);
 assert.throws(()=>Pattern.buildPatternEvidence({}),TypeError);
});
test('V11.96: mutated hidden stem, parity, month index or ten gods fails closed',()=>{
 for(const mutate of [
  x=>x.pillars.month.hiddenStems[0].stemIndex=9,
  x=>x.pillars.hour.branchIndex=4,
  x=>x.pillars.day.tenGod='Thực Thần',
  x=>x.monthIndex=4,
  x=>x.pillars.year.stem='Nhâm']){
  const c=structuredClone(legacy());mutate(c);
  assert.throws(()=>Pattern.buildPatternEvidence(c),TypeError);
 }
});
test('V11.96: month exposed candidates match canonical hidden stem ordering',()=>{
 const x=build();assert.deepEqual(x.exposure.map(c=>c.stemIndex),BaZi.HIDDEN_STEM_INDICES[5]);
 assert.deepEqual(x.exposure.map(c=>c.qi),['main','secondary','residual']);
});
test('V11.96: day-master tautology is excluded from effective exposed stems',()=>{
 const c=crafted({year:6,day:4,hour:7});
 // month is Tỵ => hidden Bính Canh Mậu; set day-master to Bính on Thìn (parity 0)
 c.pillars.day.stemIndex=2;c.pillars.day.stem='Bính';
 c.pillars.year.stemIndex=0;c.pillars.year.stem='Giáp';c.pillars.year.name='Giáp Ngọ';
 c.dayMaster.stem='Bính';c.dayMaster.element='Hỏa';c.dayMaster.polarity='Dương';
 for(const [key,p] of Object.entries(c.pillars)){p.tenGod=key==='day'?null:BaZi.tenGod(2,p.stemIndex);p.hiddenStems=BaZi.hiddenStems(p.branchIndex,2);}
 const x=Pattern.buildPatternEvidence(c);
 assert.equal(x.exposure[0].stem,'Bính');assert.equal(x.exposure[0].isDayMasterOnly,true);
 assert.deepEqual(x.exposure[0].exposedAt,[]);
 assert.equal(x.exposure[0].exposedAt.includes('day'),false);
});
test('V11.96: actual branch meeting Tỵ Ngọ Mùi in distinct pillars is only a symbolic complete group',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:6,hour:7}));
 const found=x.branchGroups.find(g=>g.kind==='TAM_HOI'&&g.symbolicElement==='Hỏa');
 assert.ok(found);assert.equal(found.includesMonth,true);
 assert.deepEqual(new Set(found.branches),new Set(['Tỵ','Ngọ','Mùi']));
 assert.equal(found.transformed,false);
 assert.ok(x.possibleTransformations.some(e=>e.mechanism==='HOI_CHI'));
});
test('V11.96: actual triad Tỵ Dậu Sửu is not silently declared metal transformation',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:9,hour:1}));
 const found=x.branchGroups.find(g=>g.kind==='TAM_HOP'&&g.symbolicElement==='Kim');
 assert.ok(found);assert.deepEqual(found.branches,['Tỵ','Dậu','Sửu']);
 assert.equal(found.transformed,false);assert.equal(x.decision.formation,null);
});
test('V11.96: duplicate branch or incomplete three-member group cannot count',()=>{
 const a=Pattern.buildPatternEvidence(crafted({year:6,hour:6}));
 assert.equal(a.branchGroups.some(g=>g.kind==='TAM_HOI'&&g.symbolicElement==='Hỏa'),false);
 const b=Pattern.buildPatternEvidence(crafted({year:6,hour:4}));
 assert.equal(b.branchGroups.some(g=>g.kind==='TAM_HOI'&&g.symbolicElement==='Hỏa'),false);
});
test('V11.96: full group not involving month does not propose month transformation',()=>{
 // Month Tỵ; other three can be Thân Tý Thìn (water triad), never an influence of the month branch.
 const x=Pattern.buildPatternEvidence(crafted({year:8,day:0,hour:4}));
 const found=x.branchGroups.find(g=>g.kind==='TAM_HOP'&&g.symbolicElement==='Thủy');
 assert.ok(found);assert.equal(found.includesMonth,false);
 assert.equal(x.possibleTransformations.some(t=>t.mechanism==='HOI_CHI'),false);
});
test('V11.96: full metal triad with opposing Mão is flagged for review without automatic phá cục',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:9,day:3,hour:1}));
 const found=x.branchGroups.find(g=>g.kind==='TAM_HOP'&&g.symbolicElement==='Kim');
 assert.ok(found);assert.equal(found.status,'CONFLICT_REVIEW');
 assert.ok(found.clashEvidence.length>0);assert.equal(x.decision.breakage,null);
});
test('V11.96: opposite branch clashes and combinations preserve pillar identity',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:9,day:3,hour:1}));
 assert.ok(x.branchContacts.some(c=>c.kind==='LUC_XUNG'&&c.branches.includes('Dậu')));
 assert.ok(x.branchContacts.every(c=>c.transformed===false));
});
test('V11.96: stems combine only symbolically; never infer a transformed element',()=>{
 const x=Pattern.buildPatternEvidence(crafted({year:9,day:3,hour:1}));
 assert.ok(x.stemContacts.every(c=>c.transformed===false));
 assert.equal(x.decision.pattern,null);
});
test('V11.96: method must not have a numeric element-scoring output or a certified-formation label',()=>{
 const x=build();assert.ok(!('score' in x));assert.ok(!('strengthScore' in x));
 assert.equal(x.pendingConditions.length,6);assert.ok(Object.isFrozen(x));
});
test('V11.96: research only school gate, no production integration',()=>{
 assert.equal(getSchool('bat-tu-bien-cach').engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution('bat-tu-bien-cach').verdict,'RESEARCH_SUBROUTINE_ONLY');
 assert.equal(gateSchoolExecution('bat-tu-do-tho').verdict,'BLOCKED');
});
test('V11.96: main engine, production page and API do not import pattern module',()=>{
 for(const f of ['packages/astrology-engine/src/bazi.js','apps/web/src/app/bazi/page.tsx','apps/api/src/main.ts'])
  assert.doesNotMatch(file(f),/bazi-pattern-evidence/);
});
test('V11.96: docs, type contract and new release gate exist',()=>{
 assert.match(file('docs/research/schools/bat-tu-bien-cach.md'),/Chưa đủ điều kiện/);
 assert.match(file('packages/astrology-engine/src/bazi-pattern-evidence.d.cts'),/breakage:null/);
 assert.match(file('infrastructure/scripts/verify-release.mjs'),/audit-bazi-pattern-evidence.cjs/);
});
test('V11.96: no substitution of pending checklist for validated transformation',()=>{
 const x=build();assert.ok(x.notes.some(n=>n.includes('không chứng nhận')));
 assert.ok(x.methodChecks.every(m=>m.verdict==='UNDETERMINED'));
});
