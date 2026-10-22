'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const crosswalk = read('packages/knowledge/src/reference-star-crosswalk.json');
const registry = read('packages/knowledge/src/star-identity-registry.json');
const disciplines = read('packages/knowledge/src/research-disciplines.json');
const glossary = read('apps/web/src/features/academy/glossary.json');
const registryById = new Map(registry.records.map(r=>[r.id,r]));

test('V11.36: catalogue has 121 distinct names with a non-universal reference boundary',()=>{
  assert.equal(crosswalk.records.length,121);
  assert.equal(new Set(crosswalk.records.map(r=>r.name)).size,121);
  assert.match(crosswalk.reference.method,/không.*mẫu số chuẩn/i);
  assert.equal(crosswalk.counts.engineDistinctNatalAndCycle,104);
  assert.equal(crosswalk.counts.engineMainStars,14);
  assert.deepEqual(Object.keys(crosswalk.counts).filter(k=>!['referenceNames','engineDistinctNatalAndCycle','engineMainStars'].includes(k)).sort(),['engine-name','not-in-engine','possible-alias'].sort());
});
test('V11.36: every reference match points to a real generated engine identity',()=>{
  for(const row of crosswalk.records){
    assert.ok(['engine-name','possible-alias','not-in-engine'].includes(row.status),row.name);
    for(const id of row.engineIds){
      const match=registryById.get(id);
      assert.ok(match,`broken identity link: ${row.name}/${id}`);
      assert.ok(row.engineNames.includes(match.name),row.name);
    }
    if(row.status==='not-in-engine'){assert.deepEqual(row.engineIds,[]);assert.equal(row.placementReady,false);}
    if(row.status==='possible-alias'){assert.ok(row.engineIds.length);assert.equal(row.placementReady,false);assert.equal(row.expertReviewed,false);}
    if(row.status==='engine-name') assert.ok(row.engineIds.length);
    assert.equal(row.expertReviewed,false);
  }
});
test('V11.36: every one of the 14 main stars remains in the engine',()=>{
 const main=registry.records.filter(r=>r.layer==='natal'&&r.group==='main');
 assert.equal(main.length,14);
 for(const item of main){
   const match=crosswalk.records.find(r=>r.name===item.name);
   assert.ok(match,item.name);assert.equal(match.status,'engine-name');
   assert.ok(match.engineIds.includes(item.id));
 }
});
test('V11.36: annual overlays are never silently converted into natal engine stars',()=>{
 for(const row of crosswalk.records){
   assert.ok(!row.engineIds.some(id=>id.startsWith('annual:')),`unexpected annual placement: ${row.name}`);
 }
});
test('V11.36: research disciplines have unique stable IDs and honest function status',()=>{
 assert.equal(disciplines.records.length,15);
 assert.equal(new Set(disciplines.records.map(d=>d.id)).size,15);
 for(const d of disciplines.records){
   assert.ok(d.studyWorkflow.length>75 && d.practiceExercise.length>45 && d.boundary.length>60,d.id);
   assert.equal(d.reviewStatus,'editorial-draft-not-expert-reviewed');
   if(d.route){assert.ok(['chart','bazi','calendar','iching','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','numerology','western-astrology','tarot'].includes(d.route.slice(1)),d.id);}
   else assert.ok(['knowledge-only-no-engine','knowledge-with-internal-research-no-public-calculator'].includes(d.implementation));
 }
});
test('V11.36: glossary terms are unique and point to routes that exist',()=>{
 assert.equal(new Set(glossary.map(e=>e.term)).size,glossary.length);
 assert.ok(glossary.length>=55);
 for(const row of glossary){
   assert.ok(row.term && row.meaning && row.caution && row.route);
   const relative=row.route.replace(/^\//,'');
   const page=path.join(root,'apps/web/src/app',relative,'page.tsx');
   const dynamic=relative.startsWith('academy/') ? path.join(root,'apps/web/src/app/academy/[slug]/page.tsx') : null;
   assert.ok(fs.existsSync(page) || (dynamic && fs.existsSync(dynamic)),`missing route: ${row.term}: ${row.route}`);
 }
});
test('V11.36: page imports matching JSON and navigation has a direct route',()=>{
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 const nav=fs.readFileSync(path.join(root,'apps/web/src/lib/navigation.ts'),'utf8');
 assert.match(page,/reference-star-crosswalk\.json/);
 assert.match(page,/research-disciplines\.json/);
 assert.match(page,/not-in-engine/);
 assert.match(nav,/href: '\/research'/);
});
test('V11.36: missing star remains a study-only candidate and cannot be placed',()=>{
 const missing=crosswalk.records.filter(r=>r.status==='not-in-engine');
 assert.equal(missing.length,crosswalk.counts['not-in-engine']);
 for(const row of missing){
  assert.equal(row.placementReady,false); assert.deepEqual(row.layers,[]);
  assert.match(row.note,/chưa có mã an sao/i);
 }
});

test('V11.36: independent reference-coverage audit rejects stale links',()=>{
  const audit=require('../infrastructure/scripts/audit-reference-coverage.cjs').audit;
  assert.deepEqual(audit.errors,[]);
  assert.equal(audit.referenceCount,121);
  assert.equal(audit.mainStars,14);
  assert.equal(audit.natalAndCycleNames,104);
  assert.equal(audit.starFamilies,11);
});
