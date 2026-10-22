'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {relationshipPatterns}=require('../packages/knowledge/src/index.cjs');
const {matchRelationshipPatterns,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const original=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
function cleared(){const c=structuredClone(original);for(const h of c.houses){for(const key of ['stars','auxiliaryStars','yearStars','additionalStars','advancedStars','tuHoa'])h[key]=[];}return c;}
function house(chart,i){return chart.houses.find(h=>h.branchIndex===i);}
function place(chart,name,branch){house(chart,branch).auxiliaryStars.push(name);}
function arrange(rule){
 const c=cleared(),branches=rule.conditions.scope==='tam-hop'?[0,4,8]:[0,4,8,6];
 rule.conditions.all.forEach((name,i)=>place(c,name,branches[i%Math.max(rule.conditions.minDistinctPalaces,2)]));
 return c;
}
test('V11.9: independently editable catalogue of ten declared multi-star relations',()=>{
 assert.equal(relationshipPatterns.length,10);
 assert.equal(new Set(relationshipPatterns.map(r=>r.id)).size,relationshipPatterns.length);
 for(const r of relationshipPatterns){
  assert.ok(['tam-hop','tu-chinh'].includes(r.conditions.scope));
  assert.equal(r.conditions.requiresFocusPresence,true);
  assert.ok(r.conditions.all.length>=2);
  assert.equal(new Set(r.conditions.all).size,r.conditions.all.length);
  assert.ok(r.conditions.minDistinctPalaces>=2 && r.conditions.minDistinctPalaces<=r.conditions.all.length);
  assert.ok(r.interpretation.length>80 && r.caution.length>50);
 }
});
test('V11.9: all declared relationship patterns match exactly when actual star evidence satisfies them',()=>{
 for(const r of relationshipPatterns){
  const c=arrange(r);
  const result=matchRelationshipPatterns(c,0).find(x=>x.id===r.id);
  assert.ok(result,'expected: '+r.id);
  assert.deepEqual(result.evidence.placements.map(p=>p.star),r.conditions.all);
  assert.ok(result.evidence.placements.every(p=>p.branchIndex===0 || [4,8,6].includes(p.branchIndex)));
  assert.equal(new Set(result.evidence.placements.map(p=>p.branchIndex)).size>=r.conditions.minDistinctPalaces,true);
  assert.ok(result.evidence.placements.some(p=>p.relation==='Tọa cung'));
  assert.ok(result.evidence.placements.every(p=>p.palace && p.branch));
 }
});
test('V11.9: dropping any required star prevents false recognition',()=>{
 for(const r of relationshipPatterns){
  const c=arrange(r),removed=r.conditions.all.at(-1);
  for(const h of c.houses)h.auxiliaryStars=h.auxiliaryStars.filter(x=>x!==removed);
  assert.ok(!matchRelationshipPatterns(c,0).some(x=>x.id===r.id),r.id);
 }
});
test('V11.9: star outside Tam hợp / Tứ chính cannot trigger relation',()=>{
 for(const r of relationshipPatterns){
  const c=arrange(r),moved=r.conditions.all.at(-1);
  for(const h of c.houses)h.auxiliaryStars=h.auxiliaryStars.filter(x=>x!==moved);
  place(c,moved,1); // branch 1 is outside focus {0,4,8,6}
  assert.ok(!matchRelationshipPatterns(c,0).some(x=>x.id===r.id),r.id);
 }
});
test('V11.9: two stars co-located do not satisfy distinct-palace requirements',()=>{
 for(const r of relationshipPatterns){
  const c=cleared();for(const name of r.conditions.all)place(c,name,0);
  assert.ok(!matchRelationshipPatterns(c,0).some(x=>x.id===r.id),r.id);
 }
});
test('V11.9: focus must contain at least one of the required stars; unrelated house is not credited',()=>{
 for(const r of relationshipPatterns){
  const c=cleared();const allowed=r.conditions.scope==='tam-hop'?[4,8]:[4,8,6];
  r.conditions.all.forEach((name,i)=>place(c,name,allowed[i%allowed.length]));
  assert.ok(!matchRelationshipPatterns(c,0).some(x=>x.id===r.id),r.id);
 }
});
test('V11.9: duplicated star locations invalidate ambiguous proof',()=>{
 for(const r of relationshipPatterns){
  const c=arrange(r),duplicated=r.conditions.all[0];place(c,duplicated,11);
  assert.ok(!matchRelationshipPatterns(c,0).some(x=>x.id===r.id),r.id);
 }
});
test('V11.9: natal relation is unaffected by year and engine data is never mutated',()=>{
 const before=JSON.stringify(original);
 for(const h of original.houses){
  const r=buildPalaceReading({chart:original,branchIndex:h.branchIndex,guide});
  const a=buildPalaceReading({chart:original,branchIndex:h.branchIndex,guide,includeAnnual:true,annual:Engine.annualOverview(original,2026)});
  const b=buildPalaceReading({chart:original,branchIndex:h.branchIndex,guide,includeAnnual:true,annual:Engine.annualOverview(original,2030)});
  assert.deepEqual(r.relationshipMatches,a.relationshipMatches);
  assert.deepEqual(a.relationshipMatches,b.relationshipMatches);
  assert.equal(r.coverage.relationshipPatternsEvaluated,10);
  assert.equal(r.coverage.formalPatternMatching,false);
 }
 assert.equal(JSON.stringify(original),before);
});
test('V11.9: rejects malformed charts and out-of-range branches',()=>{
 assert.throws(()=>matchRelationshipPatterns({},0),RangeError);
 assert.throws(()=>matchRelationshipPatterns(original,12),RangeError);
 const c=structuredClone(original);c.houses[1].branchIndex=c.houses[0].branchIndex;
 assert.throws(()=>matchRelationshipPatterns(c,0),RangeError);
});
test('V11.9: deep reader offers transparent evidence without internal rule IDs / URLs',()=>{
 const root=path.join(__dirname,'..');
 const comp=readFileSync(path.join(root,'apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 assert.match(comp,/reading\.relationshipMatches\.map/);
 assert.match(comp,/item\.evidence\.placements\.map/);
 assert.match(comp,/item\.evidence\.scope/);
 assert.doesNotMatch(comp,/>\s*\{item\.id\}\s*</);
});
