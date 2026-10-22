'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildPalaceRelationalSynthesis,createTwelvePalaceStudy}=require('../packages/interpretation/src/index.cjs');
const {NATAL_LAYERS}=require('../packages/interpretation/src/four-court-evidence.cjs');
const catalog=require('../packages/knowledge/src/palace-relational-synthesis.json');
const chart=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const house=(c,branch)=>c.houses.find(h=>h.branchIndex===branch);
const get=(c,at,id)=>buildPalaceRelationalSynthesis(c,at).records.find(row=>row.id===id);
const flankNames=new Set(catalog.eligibleFlankPairs.flat());
function wipeFlanks(c){for(const h of c.houses)for(const layer of NATAL_LAYERS){if(Array.isArray(h[layer]))h[layer]=h[layer].filter(x=>!flankNames.has(x));}}

test('V11.49 full set: 12 distinct palace-specific profiles and 36 independent prompts',()=>{
 assert.deepEqual(new Set(Object.keys(catalog.profiles)),new Set(Object.keys(require('../packages/knowledge/src/palace-topics.json').topics)));
 const prompts=Object.values(catalog.profiles).flatMap(x=>Object.values(x));
 assert.equal(prompts.length,36);assert.equal(new Set(prompts).size,36);
 assert.equal(catalog.expertReviewed,false);
 assert.deepEqual(catalog.patterns.map(p=>p.id),['tam-hop','doi-cung','giap-cung']);
 assert.equal(catalog.eligibleFlankPairs.length,3);
});
test('V11.49 each palace has exactly three scoped, non-predictive records; chart is immutable',()=>{
 const c=chart(),before=JSON.stringify(c);
 for(const h of c.houses){const r=buildPalaceRelationalSynthesis(c,h.branchIndex);
  assert.equal(r.status,'research-only');assert.equal(r.records.length,3);
  for(const row of r.records){assert.ok(row.question.length>45);
   assert.equal(row.expertReviewed,false);
   assert.ok(['observed','partial','no-data','needs-review'].includes(row.status));
   assert.ok(row.evidence.every(e=>e.scope==='natal'));
   if(row.status==='observed')assert.equal(row.checks.every(x=>x.met),true);
  }
 }
 assert.equal(JSON.stringify(c),before);
});
test('V11.49 Tam hợp offsets are +4 and +8, irrespective of chart house ordering',()=>{
 const c=chart(),at=3;const row=get(c,at,'tam-hop');
 assert.deepEqual(row.relatedBranches,[(at+4)%12,(at+8)%12]);
 assert.ok(row.evidence.filter(x=>x.relation==='tam-hop').every(x=>row.relatedBranches.includes(x.branchIndex)));
 c.houses.reverse();const second=get(c,at,'tam-hop');
 assert.deepEqual(second.relatedBranches,row.relatedBranches);
 assert.deepEqual(second.evidence.map(x=>x.star),row.evidence.map(x=>x.star));
});
test('V11.49 opposite primary checks exact +6 branch with verified brightness',()=>{
 const c=chart(),at=0,row=get(c,at,'doi-cung');
 assert.deepEqual(row.relatedBranches,[(at+6)%12]);
 assert.ok(row.evidence.filter(x=>x.relation==='đối cung').every(x=>x.branchIndex===(at+6)%12&&x.strength));
});
test('V11.49 missing opposite strength requires review, never becomes observed',()=>{
 const c=chart();const h=c.houses.find(x=>x.stars?.length);
 const at=(h.branchIndex+6)%12;
 h.mainStarStrengths=h.mainStarStrengths.filter(s=>s.name!==h.stars[0]);
 const r=get(c,at,'doi-cung');assert.equal(r.status,'needs-review');
 assert.ok(r.missing.some(x=>x.includes('độ sáng')));
});
test('V11.49 a duplicated focus main at another branch invalidates Tam hợp',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length);
 c.houses.find(x=>x!==h).stars.push(h.stars[0]);
 assert.equal(get(c,h.branchIndex,'tam-hop').status,'needs-review');
});
test('V11.49 recognized complementary pair across the two neighbors counts as giáp cung',()=>{
 const c=chart(),at=0;wipeFlanks(c);
 const before=house(c,11),after=house(c,1);
 before.auxiliaryStars.push('Tả Phụ');after.auxiliaryStars.push('Hữu Bật');
 const r=get(c,at,'giap-cung');assert.equal(r.status,'observed');
 assert.deepEqual(r.matchedPairs,[['Tả Phụ','Hữu Bật']]);
 assert.equal(r.evidence.length,2);
 assert.ok(r.evidence.some(x=>x.branchIndex===11&&x.side==='trước'));
 assert.ok(r.evidence.some(x=>x.branchIndex===1&&x.side==='sau'));
});
test('V11.49 stars in the SAME flank cannot masquerade as giáp pair',()=>{
 const c=chart();wipeFlanks(c);
 house(c,11).auxiliaryStars.push('Tả Phụ','Hữu Bật');
 const r=get(c,0,'giap-cung');assert.notEqual(r.status,'observed');assert.deepEqual(r.matchedPairs,[]);
});
test('V11.49 an arbitrary non-paired star on each flank is not a complementary pair',()=>{
 const c=chart();wipeFlanks(c);
 house(c,11).auxiliaryStars.push('Tả Phụ');house(c,1).auxiliaryStars.push('Văn Khúc');
 const r=get(c,0,'giap-cung');assert.notEqual(r.status,'observed');assert.deepEqual(r.matchedPairs,[]);
});
test('V11.49 duplicate placement across houses invalidates giáp even with matching pair',()=>{
 const c=chart();wipeFlanks(c);
 house(c,11).auxiliaryStars.push('Tả Phụ');house(c,1).auxiliaryStars.push('Hữu Bật');
 house(c,7).auxiliaryStars.push('Tả Phụ');
 const r=get(c,0,'giap-cung');assert.equal(r.status,'needs-review');assert.equal(r.matchedPairs.length,0);
});
test('V11.49 duplication within one layer is also disallowed',()=>{
 const c=chart();wipeFlanks(c);
 house(c,11).auxiliaryStars.push('Tả Phụ','Tả Phụ');house(c,1).auxiliaryStars.push('Hữu Bật');
 assert.equal(get(c,0,'giap-cung').status,'needs-review');
});
test('V11.49 annual-only stars cannot qualify as natal flank or trinal support',()=>{
 const c=chart();wipeFlanks(c);
 house(c,11).luuStars=['Tả Phụ'];house(c,1).luuStars=['Hữu Bật'];
 const r=get(c,0,'giap-cung');assert.equal(r.status,'no-data');
 assert.equal(r.evidence.length,0);
});
test('V11.49 public output strips paths but raw audit retains exact source',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length);
 const raw=buildPalaceRelationalSynthesis(c,h.branchIndex);
 assert.ok(raw.records.some(r=>r.evidence.some(e=>e.sourcePath?.startsWith('houses['))));
 const ui=createTwelvePalaceStudy(c,h.branchIndex);
 assert.equal(ui.relationalSynthesis.records.length,3);
 assert.doesNotMatch(JSON.stringify(ui),/houses\[/);
});
test('V11.49 malformed chart, invalid branch and unknown palace are rejected safely',()=>{
 assert.throws(()=>buildPalaceRelationalSynthesis({houses:[]},0),RangeError);
 const c=chart();assert.throws(()=>buildPalaceRelationalSynthesis(c,13),RangeError);
 c.houses[0].palace='Không có';assert.equal(buildPalaceRelationalSynthesis(c,c.houses[0].branchIndex).status,'unavailable');
});
test('V11.49 user-facing panel renders relation checks without import from engine',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/twelve-palace-study-panel.tsx'),'utf8');
 assert.match(code,/relationalSynthesis\.records\.map/);
 assert.match(code,/giáp cung/i);
 assert.doesNotMatch(code,/from ['"]@thiendo\/astrology-engine|require\(['"]@thiendo\/astrology-engine/);
 assert.match(fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/index.d.ts'),'utf8'),/interface PalaceRelationalSynthesis/);
});
test('V11.49 audit covers 22 chart fixtures and 792 relation checks',()=>{
 const report=require('../infrastructure/scripts/audit-palace-relations.cjs').audit();
 assert.equal(report.status,'PASS',report.errors.join('\n'));
 assert.equal(report.stats.charts,22);assert.equal(report.stats.palaces,264);
 assert.equal(report.stats.relationChecks,792);
});
