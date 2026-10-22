'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Root=path.resolve(__dirname,'..');
const Stars=require('../packages/astrology-engine/src/missing-stars.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const Audit=require('../packages/star-audit/src/index.cjs');
const Svg=require('../packages/chart-export/src/index.cjs');
const Baselines=require('../packages/star-audit/fixtures/chart-baselines.json').cases;
const read=x=>fs.readFileSync(path.join(Root,x),'utf8');
const names=['Thiên Trù','Lưu Hà','Thiên Không','Đẩu Quân'];
const sample=()=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'});

test('V11.19: exactly four names in independent versioned natal layer',()=>{
 assert.deepEqual(Stars.NAMES,names);
 const c=sample();assert.deepEqual(c.missingStars.map(x=>x.name),names);
 assert.equal(c.missingStarRuleSet,Stars.RULESET);
 assert.equal(new Set(c.missingStars.map(x=>x.name)).size,4);
});
test('V11.19: complete independent ten-stem tables, including conflicting Lưu Hà variants documented',()=>{
 assert.deepEqual([...Stars.THIEN_TRU],[5,6,0,5,6,8,2,6,9,10]);
 assert.deepEqual([...Stars.LUU_HA],[9,10,7,8,5,6,4,3,11,2]);
 for(let stem=0;stem<10;stem++){
   const result=Stars.calculate({yearStem:stem,yearBranch:stem%2,lunarMonth:1,hourBranch:0});
   assert.equal(result[0].branch,Stars.THIEN_TRU[stem]);
   assert.equal(result[1].branch,Stars.LUU_HA[stem]);
 }
 assert.match(read('docs/reference/missing-stars.md'),/dị bản/);
});
test('V11.19: Thiên Không is exactly next branch after natal Thái Tuế, never Địa Không',()=>{
 for(let branch=0;branch<12;branch++){
  const stars=Stars.calculate({yearStem:branch%2,yearBranch:branch,lunarMonth:1,hourBranch:0});
  assert.equal(stars[2].branch,(branch+1)%12);
  assert.notEqual(stars[2].name,'Địa Không');
 }
});
test('V11.19: Đẩu Quân month-reverse and hour-forward count, boundary wrap tested',()=>{
 for(let branch=0;branch<12;branch++)for(let month=1;month<=12;month++)for(let hour=0;hour<12;hour++){
   const actual=Stars.calculate({yearStem:branch%2,yearBranch:branch,lunarMonth:month,hourBranch:hour});
   assert.equal(actual[3].branch,(branch-(month-1)+hour+24)%12);
 }
});
test('V11.19: Can Chi parity, invalid month/hour, extra values never silently normalized',()=>{
 const base={yearStem:0,yearBranch:0,lunarMonth:1,hourBranch:0};
 for(const bad of [{...base,yearStem:10},{...base,yearStem:-1},{...base,yearStem:0.5},{...base,yearBranch:1},{...base,lunarMonth:0},{...base,lunarMonth:13},{...base,lunarMonth:'2'},{...base,hourBranch:12},{...base,hourBranch:-1},{...base,hourBranch:null}])assert.throws(()=>Stars.calculate(bad),RangeError);
});
test('V11.19: all 22 existing baseline inputs show exactly 4 new stars mirrored once',()=>{
 for(const item of Baselines){const chart=Engine.calculate(item.input);
   assert.equal(Verify.check(chart).passed,true,item.id);
   assert.deepEqual(chart.houses.flatMap(h=>h.missingStars).sort(),[...names].sort(),item.id);
   for(const star of chart.missingStars){
     assert.deepEqual(chart.houses.filter(h=>h.missingStars.includes(star.name)).map(h=>h.branchIndex),[star.branch],item.id);
   }
 }
});
test('V11.19: change of review year must not move natal four stars',()=>{
 const c=sample(),before=JSON.stringify(c.missingStars);
 for(const year of [2005,2026,2027,2040]){
   const a=Engine.annualOverview(c,year);
   assert.ok(a.luuStars.items.length>0);
   assert.equal(JSON.stringify(c.missingStars),before);
 }
});
test('V11.19: verification fails when placement changed, mirrored into wrong house, or ruleset forged',()=>{
 for(const fault of ['branch','ruleSet','mirror']){
  const c=structuredClone(sample()),s=c.missingStars[0];
  if(fault==='branch')s.branch=(s.branch+1)%12;
  if(fault==='ruleSet')s.ruleSet='tampered';
  if(fault==='mirror'){
    c.houses[s.branch].missingStars=c.houses[s.branch].missingStars.filter(x=>x!==s.name);
    c.houses[(s.branch+1)%12].missingStars.push(s.name);
  }
  const checked=Verify.check(c);
  assert.equal(checked.passed,false,fault);
  assert.ok(checked.checks.some(x=>x.name.includes('V11.19')&&!x.passed),fault);
 }
});
test('V11.19: inventory exactly 104/104, no duplicate names, backlog one annual item',()=>{
 const inv=Audit.buildInventory();
 assert.equal(inv.totals.implementedNatalAndCycleNames,104);
 assert.equal(inv.totals.editorialProfilesMatched,104);
 assert.equal(inv.totals.missingEditorialProfiles,0);
 assert.equal(inv.totals.pendingNatalCandidates,0);
 assert.equal(inv.totals.pendingAnnualCandidates,1);
 assert.equal(inv.groups.find(g=>g.id==='missing_stars').count,4);
 for(const name of names)assert.ok(inv.records.some(x=>x.name===name));
});
test('V11.19: editorial profiles are accessible by UI without technical source references',()=>{
 for(const name of names){const e=Knowledge.lookupSymbol(name);
   assert.ok(e?.context.length>100,name);
   assert.ok(e.caution.length>60,name);
   assert.doesNotMatch(JSON.stringify(e),/https?:\/\/|\.js|ruleSet|sourcePath/);
 }
});
test('V11.19: advanced research, contextual reading, exports and UI all receive actual new stars',()=>{
 const c=sample(),svg=Svg.renderChartSvg(c,'Kiểm thử V11.19');
 for(const name of names){assert.ok(svg.includes(name));
  const s=c.missingStars.find(x=>x.name===name);
  const r=Engine.palaceResearch(c,null,s.branch);
  assert.ok(r.perspectives[0].layers.find(x=>x.id==='missing-stars').records.some(x=>x.name===name));
 }
 for(const file of ['apps/web/src/features/chart/components/palace-tile.tsx',
 'apps/web/src/features/chart/components/palace-details.tsx',
 'apps/web/src/features/chart/lib/chart-explorer.ts',
 'apps/web/src/features/chart/lib/twelve-palace-ledger.ts',
 'packages/chart-export/src/index.cjs',
 'packages/interpretation/src/chart-reading.cjs',
 'packages/shared-types/index.d.ts']) assert.match(read(file),/missingStars|MissingStar/,file);
});
test('V11.19: interactive standalone preview generated from engine rather than hand-written positions',()=>{
 const source=read('infrastructure/scripts/make-v1119-missing-preview.cjs');
 const {html}=require('../infrastructure/scripts/make-v1119-missing-preview.cjs');
 assert.match(source,/engine\.calculate/);
 assert.match(source,/\.missingStars/);
 assert.match(html,/<html lang="vi">/);
 assert.match(html,/<svg class="links"/);
 for(const name of names)assert.ok(html.includes(name),name);
});
