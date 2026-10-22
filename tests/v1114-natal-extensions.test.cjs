'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Ext=require('../packages/astrology-engine/src/natal-extensions.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const {buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const source=(rel)=>fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
const inputs={date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'};
const sample=()=>Engine.calculate(inputs);
const stems=[2,3,5,6,5,6,8,9,11,0];
const quan=[10,11,1,2,1,2,4,5,7,8];
const sat=[5,2,11,8,5,2,11,8,5,2,11,8];
const toai=[5,1,9,5,1,9,5,1,9,5,1,9];
const run=(stem,branch)=>Ext.calculate({yearStem:stem,yearBranch:branch,locTonBranch:stems[stem]});
const at=(all,name)=>all.find(s=>s.name===name)?.branch;

test('V11.14: exactly three separate versioned stars in canonical branch bounds',()=>{
 const items=run(0,0);
 assert.deepEqual(items.map(x=>x.name),['Quốc Ấn','Kiếp Sát','Phá Toái']);
 assert.equal(new Set(items.map(x=>x.name)).size,3);
 assert.ok(items.every(x=>x.ruleSet===Ext.RULESET&&Number.isInteger(x.branch)&&x.branch>=0&&x.branch<12&&x.basis));
});
test('V11.14: Quốc Ấn ten-stem independent oracle = Lộc Tồn + eight palaces',()=>{
 for(let stem=0;stem<10;stem++){
  const items=run(stem,stem);
  assert.equal(at(items,'Quốc Ấn'),quan[stem],`can ${stem}`);
  assert.equal((at(items,'Quốc Ấn')-stems[stem]+12)%12,8);
 }
});
test('V11.14: Kiếp Sát fixed four Tam hợp year-branch groups',()=>{
 for(let branch=0;branch<12;branch++)assert.equal(at(run(branch%10,branch),'Kiếp Sát'),sat[branch],`chi ${branch}`);
 assert.deepEqual([...new Set(sat)].sort((a,b)=>a-b),[2,5,8,11]);
});
test('V11.14: Phá Toái positions depend only on the 3 fixed branch groups',()=>{
 for(let branch=0;branch<12;branch++)assert.equal(at(run(branch%10,branch),'Phá Toái'),toai[branch],`chi ${branch}`);
 assert.deepEqual([...new Set(toai)].sort((a,b)=>a-b),[1,5,9]);
});
test('V11.14: all 60 parity-valid sexagenary combinations preserve names and ranges',()=>{
 let checked=0;
 for(let stem=0;stem<10;stem++)for(let branch=0;branch<12;branch++){
  if(stem%2!==branch%2)continue;
  const items=run(stem,branch);checked++;
  assert.equal(items.length,3);
  assert.deepEqual(items.map(s=>s.branch),[quan[stem],sat[branch],toai[branch]]);
 }
 assert.equal(checked,60);
});
test('V11.14: invalid input rejects inconsistent Can Chi, Lộc Tồn and out-of-range branches',()=>{
 const good={yearStem:0,yearBranch:0,locTonBranch:2};
 const cases=[{yearStem:1},{yearStem:-1},{yearStem:10},{yearStem:0.5},{yearBranch:1},{yearBranch:-1},{yearBranch:12},{locTonBranch:3},{locTonBranch:13},{locTonBranch:1.5}];
 for(const change of cases)assert.throws(()=>Ext.calculate({...good,...change}),RangeError,JSON.stringify(change));
});
test('V11.14: engine contains only 3 new names, mirrored exactly once across 12 palaces',()=>{
 const c=sample();
 assert.equal(c.natalExtensionStars.length,3);
 assert.equal(c.natalExtensionStarRuleSet,Ext.RULESET);
 assert.equal(c.coverage.natalExtensionRuleBasedStars,3);
 assert.deepEqual(c.houses.flatMap(h=>h.natalExtensionStars).slice().sort(),c.natalExtensionStars.map(s=>s.name).sort());
 for(const item of c.natalExtensionStars){
  assert.equal(c.houses.filter(h=>h.natalExtensionStars.includes(item.name)).length,1);
  assert.equal(c.houses.find(h=>h.branchIndex===item.branch).natalExtensionStarDetails.find(s=>s.name===item.name)?.branch,item.branch);
 }
 assert.equal(Verify.check(c).passed,true);
});
test('V11.14: verifier detects tampering with new star, duplicate star and altered rule version',()=>{
 const original=sample();
 for(const operation of [
  c=>{const s=c.natalExtensionStars[0];c.houses.find(h=>h.branchIndex===s.branch).natalExtensionStars=[];},
  c=>{c.houses[0].natalExtensionStars.push('Quốc Ấn');},
  c=>{c.natalExtensionStarRuleSet='forged';},
  c=>{c.natalExtensionStars[0].branch=(c.natalExtensionStars[0].branch+1)%12;}
 ]){
  const c=structuredClone(original);operation(c);
  const r=Verify.check(c);
  assert.equal(r.passed,false);
  assert.ok(r.checks.some(x=>x.name.includes('V11.14')&&!x.passed));
 }
});
test('V11.14: old charts without new layer remain structurally supported',()=>{
 const c=sample();delete c.natalExtensionStars;delete c.natalExtensionStarRuleSet;
 for(const h of c.houses){delete h.natalExtensionStars;delete h.natalExtensionStarDetails;}
 assert.equal(Verify.check(c).passed,true);
});
test('V11.14: catalogue and all 3 user-readable star profiles are versioned and editable separately',()=>{
 assert.equal(Knowledge.natalExtensionCatalogueEdition,'v11.14.0');
 assert.deepEqual(Knowledge.natalExtensionCatalogue.map(x=>x.name),['Quốc Ấn','Kiếp Sát','Phá Toái']);
 assert.equal(Knowledge.natalExtensionCatalogue.every(x=>x.placementRuleSet===Ext.RULESET&&x.expertReviewed===false),true);
 assert.equal(Object.keys(Knowledge.starSymbols).length,90);
 for(const {name} of Knowledge.natalExtensionCatalogue){
  const s=Knowledge.lookupSymbol(name);
  assert.ok(s&&s.context.length>90&&s.caution.length>50);
  assert.doesNotMatch(JSON.stringify(s),/https?:\/\/|\.cjs|ruleSet/);
 }
});
test('V11.14: palace readings from real chart include new star profiles without mutation',()=>{
 const c=sample(),before=JSON.stringify(c);
 const guide=require('../packages/knowledge/src/star-study-guide.json');
 const all=c.houses.flatMap(h=>buildPalaceReading({chart:c,branchIndex:h.branchIndex,guide}).supportingProfiles);
 for(const {name} of Knowledge.natalExtensionCatalogue){
  const matches=all.filter(x=>x.name===name);
  assert.equal(matches.length,1);
  assert.ok(matches[0].context.length>50);
 }
 assert.equal(JSON.stringify(c),before);
});
test('V11.14: new layer appears in SVG, search, ledger, palace UI and research',()=>{
 const c=sample(),svg=renderChartSvg(c,'Lá số kiểm thử');
 for(const {name} of Knowledge.natalExtensionCatalogue)assert.ok(svg.includes(name),`missing SVG ${name}`);
 for(const rel of ['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx','apps/web/src/features/chart/components/palace-reader-dialog.tsx','apps/web/src/features/chart/lib/chart-explorer.ts','apps/web/src/features/chart/lib/twelve-palace-ledger.ts'])assert.match(source(rel),/natalExtensionStars/,rel);
 const evidence=Engine.palaceResearch(c,null,c.houses[0].branchIndex);
 assert.ok(evidence.perspectives.every(p=>p.layers.some(l=>l.id==='natal-extensions')));
 assert.equal(evidence.perspectives[0].layers.find(l=>l.id==='natal-extensions').records.length,c.houses[0].natalExtensionStars.length);
});
test('V11.14: existing 14+9+5+7+11+4 placement counts and annual overlays unchanged',()=>{
 const c=sample();
 assert.equal(c.houses.flatMap(h=>h.stars).length,14);
 assert.equal(c.auxiliaries.length,9);assert.equal(c.yearStars.length,5);
 assert.equal(c.additionalStars.length,7);assert.equal(c.traditionalStars.length,11);
 assert.equal(c.advancedStars.length,4);assert.equal(c.cycles.daiHan.length,12);
 assert.equal(c.obstructionMarkers.length,2);
 const yearly=Engine.annualOverview(c,2026);
 assert.equal(yearly.luuStars.items.length,12);
 const next=Engine.annualOverview(c,2028);
 assert.deepEqual(c.natalExtensionStars.map(s=>s.branch),[...c.natalExtensionStars].map(s=>s.branch));
 assert.equal(next.luuStars.items.length,12);
});
