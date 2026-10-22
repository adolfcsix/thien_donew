'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Derived=require('../packages/astrology-engine/src/derived-stars.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Audit=require('../packages/star-audit/src/index.cjs');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const Svg=require('../packages/chart-export/src/index.cjs');
const Baselines=require('../packages/star-audit/fixtures/chart-baselines.json').cases;
const names=['Thiên Tài','Thiên Thọ','Đường Phù'];
const sample=()=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'});
const read=x=>fs.readFileSync(path.resolve(__dirname,'..',x),'utf8');
test('V11.18: correct three uniquely named derived stars with versioned rule identifiers',()=>{
 const chart=sample();assert.deepEqual(Derived.NAMES,names);
 assert.deepEqual(chart.derivedStars.map(x=>x.name),names);
 assert.ok(chart.derivedStars.every(x=>x.ruleSet===Derived.RULESET && x.branch>=0 && x.branch<=11));
});
test('V11.18: independent anchor arithmetic — Giáp Tý with different Mệnh and Thân',()=>{
 const result=Derived.calculate({yearStem:0,yearBranch:0,menhBranch:7,thanBranch:11,locTonBranch:2});
 assert.deepEqual(result.map(x=>x.branch),[7,11,7]);
});
test('V11.18: Thiên Tài moves with Mệnh, Thiên Thọ with Thân, Đường Phù with Lộc Tồn',()=>{
 const a=Derived.calculate({yearStem:0,yearBranch:2,menhBranch:1,thanBranch:7,locTonBranch:2});
 const b=Derived.calculate({yearStem:0,yearBranch:2,menhBranch:3,thanBranch:7,locTonBranch:2});
 const c=Derived.calculate({yearStem:0,yearBranch:2,menhBranch:1,thanBranch:8,locTonBranch:2});
 assert.equal(b[0].branch,(a[0].branch+2)%12);assert.equal(a[1].branch,b[1].branch);assert.equal(a[2].branch,b[2].branch);
 assert.equal(c[1].branch,(a[1].branch+1)%12);assert.equal(a[0].branch,c[0].branch);
});
test('V11.18: all 60 valid Can/Chi combinations and all anchors produce well-formed output',()=>{
 for(let stem=0;stem<10;stem++)for(let branch=0;branch<12;branch++){
  const input={yearStem:stem,yearBranch:branch,menhBranch:branch,thanBranch:(branch+3)%12,locTonBranch:Derived.LOC_TON_BY_STEM[stem]};
  if(stem%2!==branch%2){assert.throws(()=>Derived.calculate(input),RangeError);continue;}
  const s=Derived.calculate(input);assert.deepEqual(s.map(x=>x.name),names);
  assert.equal(s[0].branch,(branch*2)%12);assert.equal(s[1].branch,(branch*2+3)%12);
  assert.equal(s[2].branch,(input.locTonBranch+5)%12);
 }
});
test('V11.18: malformed input, mismatched Can/Chi or forged Lộc Tồn rejected',()=>{
 const base={yearStem:0,yearBranch:0,menhBranch:0,thanBranch:0,locTonBranch:2};
 for(const bad of [{...base,yearStem:10},{...base,yearBranch:1},{...base,menhBranch:-1},{...base,thanBranch:12},{...base,locTonBranch:3},{...base,yearStem:1.5},{...base,yearBranch:undefined}])assert.throws(()=>Derived.calculate(bad),RangeError);
});
test('V11.18: all 22 baseline charts have exactly three derived names mirrored in houses',()=>{
 for(const item of Baselines){const c=Engine.calculate(item.input);assert.equal(Verify.check(c).passed,true,item.id);
  assert.deepEqual(c.houses.flatMap(h=>h.derivedStars).sort(),[...names].sort(),item.id);
  for(const s of c.derivedStars)assert.deepEqual(c.houses.filter(h=>h.derivedStars.includes(s.name)).map(h=>h.branchIndex),[s.branch]);
 }
});
test('V11.18: checker rejects forged branch, ruleset or wrong mirrored house',()=>{
 for(const key of ['branch','ruleSet','house']){const c=structuredClone(sample());const s=c.derivedStars[0];
  if(key==='branch')s.branch=(s.branch+1)%12;
  if(key==='ruleSet')s.ruleSet='tampered';
  if(key==='house'){c.houses[s.branch].derivedStars=[];c.houses[(s.branch+1)%12].derivedStars.push(s.name);}
  const output=Verify.check(c);assert.equal(output.passed,false,key);
  assert.ok(output.checks.find(t=>t.name.includes('Tài–Thọ–Đường Phù')&&!t.passed));
 }
});
test('V11.18: inventory updated to 100, no missing explanations and no leftover completed backlog',()=>{
 const inv=Audit.buildInventory();assert.equal(inv.totals.implementedNatalAndCycleNames,104);
 assert.equal(inv.totals.editorialProfilesMatched,104);assert.equal(inv.totals.pendingNatalCandidates,0);
 assert.equal(inv.totals.annualStarOverlays,12);assert.equal(inv.groups.find(g=>g.id==='derived').count,3);
 for(const name of names){assert.ok(inv.records.some(r=>r.name===name));assert.ok(!inv.gaps.pendingNatal.some(r=>r.name===name));}
});
test('V11.18: new editorial descriptions are independent and cautions non-fatalistic',()=>{
 for(const name of names){const x=Knowledge.lookupSymbol(name);assert.ok(x&&x.context.length>100);assert.ok(x.caution.length>60);}
});
test('V11.18: new stars included in SVG and in contextual palace research',()=>{
 const c=sample();const svg=Svg.renderChartSvg(c,'Tài–Thọ–Phù');
 for(const name of names)assert.ok(svg.includes(name),name);
 for(const s of c.derivedStars){const r=Engine.palaceResearch(c,null,s.branch);
  assert.ok(r.perspectives[0].layers.find(l=>l.id==='derived').records.some(x=>x.name===s.name));
  assert.ok(Engine.traceableFindings(r).findings.length>0);
 }
});
test('V11.18: dedicated layer wired across web search, UI, export, interpretation and contracts',()=>{
 for(const p of ['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx',
 'apps/web/src/features/chart/lib/chart-explorer.ts','apps/web/src/features/chart/lib/twelve-palace-ledger.ts',
 'packages/interpretation/src/chart-reading.cjs','packages/chart-export/src/index.cjs',
 'packages/shared-types/index.d.ts','packages/astrology-engine/src/verify.js'])assert.match(read(p),/derivedStars|DerivedStar/,p);
});
test('V11.18: comparison of legacy layers remains unchanged for 22 baseline samples',()=>{
 for(const item of Baselines){const c=Engine.calculate(item.input);
  assert.equal(c.houses.flatMap(h=>h.stars).length,14);assert.equal(c.cycles.daiHan.length,12);
  assert.equal(c.positionalStars.length,4);assert.equal(c.natalExtensionStars.length,3);
  assert.equal(c.advancedStars.length,4);assert.equal(c.traditionalStars.length,11);
 }
});
