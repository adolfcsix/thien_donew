'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const original=require('../packages/knowledge/src/reference-star-crosswalk.json');
const dossier=require('../packages/knowledge/src/expanded-star-research.json');
const {starIdentityRegistry,expandedStarResearch}=require('../packages/knowledge/src/index.cjs');
const {auditResearch}=require('../infrastructure/scripts/audit-star-research.cjs');
const byName=new Map(dossier.records.map(x=>[x.name,x]));
const currentStarNames=new Set(starIdentityRegistry.listStarIdentities().filter(r=>['natal','cycle'].includes(r.layer)).map(r=>r.name));

test('V11.37: 15 named research dossiers are structured, human-review gated and non-executable',()=>{
 assert.equal(dossier.records.length,15);
 assert.equal(new Set(dossier.records.map(r=>r.id)).size,15);
 assert.equal(dossier.researchOnly,true);
 for(const r of dossier.records){
   assert.equal(r.expertReviewed,false,r.name);assert.equal(r.placementEnabled,false,r.name);
   assert.ok(r.placementInputsToVerify.length>40 && r.readingContext.length>80,r.name);
   assert.ok(r.verificationExercise.length>90 && r.commonMisreading.length>60,r.name);
   assert.ok(r.reviewGates.length>=4,r.name);
 }
 assert.equal(expandedStarResearch.records.length,dossier.records.length);
});

test('V11.37: Tướng Tiền twelve names have independent ordered identity, no computed placements',()=>{
 const expected=['Tướng Tinh','Phan An','Tuế Dịch','Tức Thần','Hoa Cái','Kiếp Sát','Tai Sát','Thiên Sát','Chỉ Bối','Hàm Trì','Nguyệt Sát','Vong Thần'];
 assert.deepEqual(dossier.circle.orderedNames,expected);
 assert.equal(dossier.circle.algorithmImplemented,false);
 assert.ok(dossier.circle.separateFrom.includes('Vòng Thái Tuế'));
 for(const n of expected) assert.ok(byName.has(n),n);
});

test('V11.37: 13 researched names are absent from natal/cycle identities, two are overlap-only',()=>{
 const researchMissing=dossier.records.filter(r=>r.state==='research-only-no-placement');
 assert.equal(researchMissing.length,13);
 for(const r of researchMissing) assert.ok(!currentStarNames.has(r.name),r.name);
 const overlap=dossier.records.filter(r=>r.state!=='research-only-no-placement');
 assert.deepEqual(overlap.map(r=>r.name),['Hoa Cái','Kiếp Sát']);
 for(const r of overlap) assert.ok(currentStarNames.has(r.name));
});

test('V11.37: two circle stars not present in initial 121-name reference are recognized',()=>{
 const names=new Set(original.records.map(r=>r.name));
 assert.deepEqual(dossier.circle.sourceNamesNotIn121Crosswalk,['Tuế Dịch','Hàm Trì']);
 for(const name of dossier.circle.sourceNamesNotIn121Crosswalk){
  assert.ok(!names.has(name));assert.ok(byName.has(name));
 }
 assert.equal(original.records.length,121,'must not rewrite V11.36 reference silently');
});

test('V11.37: Quán Sách not confused with Tướng Tiền circle, Hồng Diễm methods scoped',()=>{
 assert.ok(!dossier.circle.orderedNames.includes('Quán Sách'));
 assert.match(byName.get('Quán Sách').verificationExercise,/Tuế Tiền/);
 assert.match(byName.get('Hồng Diễm').placementInputsToVerify,/can năm sinh/);
 assert.match(byName.get('Hồng Diễm').placementInputsToVerify,/can ngày/);
 assert.match(byName.get('Lưu Niên Văn Tinh').commonMisreading,/overlay lưu niên/);
});

test('V11.37: proposed aliases are not automatically engine identities',()=>{
 assert.equal(dossier.aliases.length,4);
 for(const a of dossier.aliases){
  assert.ok(original.records.find(r=>r.name===a.name && r.status==='possible-alias'));
  assert.ok(!currentStarNames.has(a.name));
  assert.ok(a.resolution.length>=75);
 }
});

test('V11.37: structural audit reports clean and detects unsafe enabled flag',()=>{
 const baseline=auditResearch();assert.deepEqual(baseline.errors,[]);
 assert.equal(baseline.notInEngineDossiers,13);
 const tampered=structuredClone(dossier);
 tampered.records[0].placementEnabled=true;
 const report=auditResearch(tampered);
 assert.ok(report.errors.some(e=>e.includes('unsafe placement')));
});

test('V11.37: structural audit rejects crosswalk drift and invalid circle order',()=>{
 const altered=structuredClone(dossier);
 altered.circle.orderedNames.reverse();
 assert.ok(auditResearch(altered).errors.some(e=>e.includes('order mismatch')));
 const stale=structuredClone(original);
 stale.records.find(r=>r.name==='Hồng Diễm').status='engine-name';
 assert.ok(auditResearch(dossier,stale).errors.some(e=>e.includes('reference status drift')));
});

test('V11.37: research UI exposes dossiers while keeping the old star atlas and engine alone',()=>{
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 const css=fs.readFileSync(path.join(root,'apps/web/src/app/research/research.css'),'utf8');
 assert.match(page,/expanded-star-research\.json/);
 assert.match(page,/ResearchDetails/);
 assert.match(page,/filteredExtra\.map/);
 assert.match(page,/không an tự động lên lá số/);
 assert.match(css,/research-dossier/);
 const p=path.join(root,'packages/astrology-engine/src');
 const files=fs.readdirSync(p,{recursive:true}).filter(x=>/\.([cm]?js|ts)$/.test(x));
 for(const file of files){const data=fs.readFileSync(path.join(p,file),'utf8');assert.doesNotMatch(data,/expanded-star-research\.json/,file);}
});
