'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const knowledge=require('../packages/knowledge/src/index.cjs');
const dossiers=knowledge.starDossiers;
const symbols=knowledge.starSymbols;
const names=Object.keys(dossiers.profiles);
const read=path=>readFileSync(resolve(root,path),'utf8');

test('V11.56 star dossiers are an explicit editorial layer, not placement or verified predictions',()=>{
 assert.equal(dossiers.schemaVersion,'1.0.0');
 assert.ok(/^11\.(56|57)\.0$/.test(dossiers.edition));
 assert.equal(dossiers.scope,'editorial-deep-dossiers-no-placement');
 assert.equal(dossiers.expertReviewed,false);
 assert.ok(names.length>=24);
 assert.equal(new Set(names).size,names.length);
 for(const name of names){
   assert.ok(Object.hasOwn(symbols,name),`Missing original star: ${name}`);
   assert.ok((knowledge.starIdentityRegistry.resolveStarIdentity(name,{layer:'natal'}) || knowledge.starIdentityRegistry.resolveStarIdentity(name,{layer:'cycle'})),`Missing natal engine identity: ${name}`);
 }
});

test('V11.56 each deep dossier has distinct explanatory content and real cross-reference links',()=>{
 const seen=new Set();
 for(const name of names){
   const d=knowledge.lookupStarDossier(name);
   assert.equal(d,dossiers.profiles[name]);
   for(const [field,min] of Object.entries({interpretiveAxis:90,workedReading:95,counterEvidence:95,practiceQuestion:80,boundary:58})){
     assert.ok(typeof d[field]==='string' && d[field].length>=min,`${name} ${field} incomplete (${d[field]?.length})`);
   }
   assert.ok(/^(Nếu|Khi|Giả sử|Ví dụ)/.test(d.workedReading),`${name} scenario must be conditional`);
   assert.equal(d.crossCheckStars.length,3,`${name} cross checks`);
   assert.equal(new Set(d.crossCheckStars).size,3);
   assert.ok(d.crossCheckStars.every(star=>star!==name && Object.hasOwn(symbols,star)),`${name} dangling cross reference`);
   assert.ok(!('branch' in d) && !('placement' in d) && !('rule' in d),`${name} invented placement field`);
   assert.ok(!seen.has(d.interpretiveAxis),`${name} duplicated editorial axis`);
   seen.add(d.interpretiveAxis);
 }
 assert.equal(knowledge.lookupStarDossier('Tử Vi'),null);
 assert.equal(knowledge.lookupStarDossier('__proto__'),null);
 assert.equal(knowledge.lookupStarDossier(null),null);
});

test('V11.56 full coverage remains 90 indexed star profiles, 24 with deeper editorial content',()=>{
 const publicStarNames=Object.keys(symbols);
 assert.equal(publicStarNames.length,90);
 assert.ok(publicStarNames.filter(name=>knowledge.lookupStarDossier(name)).length>=24);
 assert.ok(publicStarNames.filter(name=>!knowledge.lookupStarDossier(name)).length<=66);
});

test('V11.56 UI supports search by deep content, specific depth filters and controlled related star navigation',()=>{
 const ui=read('apps/web/src/features/star-atlas/expanded-star-library.tsx');
 assert.match(ui,/star-dossiers\.json/);
 assert.match(ui,/const \[kind, setKind\]/);
 assert.match(ui,/row\.dossier\?\.interpretiveAxis/);
 assert.match(ui,/setKind\('all'\)/);
 assert.match(ui,/chosenDossier\.crossCheckStars\.map/);
 assert.match(ui,/chosenDossier\.counterEvidence/);
 assert.match(ui,/chosenDossier\.practiceQuestion/);
 assert.match(ui,/chưa thẩm định chuyên gia/);
 assert.match(ui,/Chưa có chuyên khảo riêng/);
});

test('V11.56 deep dossier module does not leak into computational engine or annual star rules',()=>{
 const knowledgeSrc=read('packages/knowledge/src/index.cjs');
 assert.match(knowledgeSrc,/lookupStarDossier/);
 assert.match(read('packages/knowledge/src/index.d.ts'),/interface StarDossier/);
 const engine=read('packages/astrology-engine/src/tuvi.js');
 assert.doesNotMatch(engine,/star-dossiers/);
 const transformations=read('packages/astrology-engine/src/tuhoa.js');
 assert.doesNotMatch(transformations,/star-dossiers/);
});


test('V11.56 chart palace links show only dossiers for actual natal stars, excluding annual overlays',()=>{
 const ui=read('apps/web/src/features/chart/components/palace-details.tsx');
 assert.match(ui,/const natalNames = new Set/);
 assert.match(ui,/Object\.hasOwn\(starDossiers\.profiles, name\)/);
 assert.match(ui,/deepStudyStars\.map/);
 assert.doesNotMatch(ui,/\.\.\.annualStars/);
 assert.match(ui,/không bao gồm sao lưu năm xem/);
});
