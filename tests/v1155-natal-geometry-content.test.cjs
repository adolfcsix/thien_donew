'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {calculate}=require('../packages/astrology-engine/src/tuvi.js');
const knowledge=require('../packages/knowledge/src/index.cjs');
const {matchNatalGeometry,buildPalaceReading,matchCombinations,createTwelvePalaceStudy}=require('../packages/interpretation/src/index.cjs');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const deep=require('../packages/knowledge/src/palace-deep-dives.json');
const work=resolve(__dirname,'..');
const chart=(year,month=6,hour=8)=>calculate({date:`${year}-${String(month).padStart(2,'0')}-15`,calendar:'solar',leap:false,gender:'Nam',hour,minute:30});
const matchAll=c=>c.houses.flatMap(h=>matchNatalGeometry(c,h.branchIndex));
test('V11.55 forbidden same-palace combinations cannot be presented as valid rules',()=>{
 assert.equal(knowledge.combinationRules.length,9);
 const ids=new Set(knowledge.combinationRules.map(x=>x.id));
 for(const id of ['khoi-viet-dong-cung','kinh-da-dong-cung','loan-hy-dong-cung'])assert.equal(ids.has(id),false);
 assert.deepEqual(knowledge.natalGeometryRules.map(x=>x.id).sort(),
  ['kinh-da-giap-loc-ton','khoi-viet-vet-vi-tri','loan-hy-xung-chieu'].sort());
});
test('V11.55 verify actual natal geometry for ten yearly stems, twelve months, two hour classes',()=>{
 let checked=0;
 for(let year=1984;year<1994;year++)for(let month=1;month<=12;month++)for(const hour of [0,18]){
  const c=chart(year,month,hour),hits=matchAll(c);
  for(const id of ['kinh-da-giap-loc-ton','loan-hy-xung-chieu','khoi-viet-vet-vi-tri']){
   const expected=id==='kinh-da-giap-loc-ton'?1:2;
   assert.equal(hits.filter(x=>x.id===id).length,expected,`${year}-${month} ${hour} ${id}`);
  }
  assert.equal(hits.some(x=>x.relation==='Vị trí khác cung'),false);
  const f=c.houses.find(h=>h.auxiliaryStars.includes('Lộc Tồn'));
  assert.ok(f && hits.find(x=>x.id==='kinh-da-giap-loc-ton').evidence.find(x=>x.star==='Lộc Tồn').branchIndex===f.branchIndex);
  for(const house of c.houses){
   const reading=buildPalaceReading({chart:c,branchIndex:house.branchIndex,guide});
   assert.deepEqual(reading.geometryMatches,matchNatalGeometry(c,house.branchIndex));
   assert.equal(reading.combinations.some(item=>['khoi-viet-dong-cung','kinh-da-dong-cung','loan-hy-dong-cung'].includes(item.id)),false);
  }
  checked++;
 }
 assert.equal(checked,240);
});
test('V11.55 fail closed for missing or duplicated natal positions; annual overlays are ignored',()=>{
 const c=chart(2004),a=matchAll(c);
 // Extra annual overlay must never count as a natal placement.
 const withAnnual=structuredClone(c);withAnnual.houses[0].luuStars=['Lưu Hồng Loan','Lưu Thiên Hỷ'];
 assert.deepEqual(matchAll(withAnnual),a);
 const duplicate=structuredClone(c);
 const original=duplicate.houses.find(h=>h.yearStars.includes('Hồng Loan'));
 const other=duplicate.houses.find(h=>h.branchIndex!==original.branchIndex);
 other.yearStars.push('Hồng Loan');
 assert.equal(matchAll(duplicate).some(x=>x.id==='loan-hy-xung-chieu'),false);
 const removed=structuredClone(c);
 for(const h of removed.houses)h.auxiliaryStars=h.auxiliaryStars.filter(x=>x!=='Đà La');
 assert.equal(matchAll(removed).some(x=>x.id==='kinh-da-giap-loc-ton'),false);
});
test('V11.55 all geometry rule star names link to natal identities and rule references',()=>{
 for(const rule of knowledge.natalGeometryRules){
  for(const star of [...rule.stars,...(rule.anchor?[rule.anchor]:[])]){
   const id=knowledge.starIdentityRegistry.resolveStarIdentity(star,{layer:'natal'});
   assert.ok(id,star);
   assert.ok(knowledge.starIdentityRegistry.getRulesReferencingStar(id.id).some(x=>x.kind==='geometry'&&x.id===rule.id));
  }
 }
});
test('V11.55 12 cung have three distinct deep-dive topics, with linked actual evidence',()=>{
 assert.equal(Object.keys(deep.profiles).length,12);
 const c=chart(2004);
 const subjects=new Set();
 for(const h of c.houses){
  const profiles=deep.profiles[h.palace];assert.equal(profiles.length,3,h.palace);
  const study=createTwelvePalaceStudy(c,h.branchIndex);
  assert.equal(study.deepDives.length,3,h.palace);
  for(const item of study.deepDives){
   assert.ok(item.discussion.length>170,`${h.palace} ${item.title}: depth`);
   assert.ok(item.question.length>35,`${h.palace} ${item.title}: question`);
   assert.ok(item.related.length>=2);
   for(const place of item.related){
    const real=c.houses.find(x=>x.palace===place.palace);assert.ok(real);
    assert.equal(place.branch,real.branch);
    assert.deepEqual(place.stars,real.stars);
    assert.deepEqual(place.transformations,real.tuHoa.map(x=>`${x.name} (${x.star})`));
   }
   const key=`${h.palace}:${item.title}`;assert.equal(subjects.has(key),false);subjects.add(key);
  }
 }
 assert.equal(subjects.size,36);
 const ui=readFileSync(resolve(work,'apps/web/src/features/chart/components/twelve-palace-study-panel.tsx'),'utf8');
 assert.match(ui,/study\.deepDives\.map/);
 assert.match(ui,/item\.related\.map/);
});

test('V11.55 90 supporting star profiles resolve to original engine identities; atlas is linked',()=>{
 const names=Object.keys(knowledge.starSymbols);
 assert.equal(names.length,90);
 assert.equal(new Set(names).size,90);
 for(const name of names){
  const row=knowledge.starIdentityRegistry.resolveStarIdentity(name,{layer:'natal'}) ?? knowledge.starIdentityRegistry.resolveStarIdentity(name,{layer:'cycle'});
  assert.ok(row,`Unlinked public atlas star: ${name}`);
 }
 const atlas=readFileSync(resolve(work,'apps/web/src/app/star-atlas/page.tsx'),'utf8');
 const section=readFileSync(resolve(work,'apps/web/src/features/star-atlas/expanded-star-library.tsx'),'utf8');
 const research=readFileSync(resolve(work,'apps/web/src/app/research/page.tsx'),'utf8');
 assert.match(atlas,/ExpandedStarLibrary/);
 assert.match(atlas,/sao-phu-tinh/);
 assert.match(section,/star-symbols\.json/);
 assert.match(section,/star-identity-registry\.json/);
 assert.match(research,/Đọc hồ sơ sao/);
});
test('V11.55 remaining nine combination rules are reachable in genuine charts, not just mocked houses',()=>{
 const ids=new Map(knowledge.combinationRules.map(rule=>[rule.id,0]));
 for(let year=1984;year<1994;year++)for(let month=1;month<=12;month++)for(let hour=0;hour<24;hour+=2){
  const c=chart(year,month,hour);
  for(const house of c.houses)for(const match of matchCombinations(house))ids.set(match.id,(ids.get(match.id)||0)+1);
 }
 for(const [id,count] of ids)assert.ok(count>0,`${id} never triggers on real engine charts`);
 assert.equal(ids.size,9);
});

test('V11.55 direct placement tables exclude the three retired impossible coincidences',()=>{
 const aux=require('../packages/astrology-engine/src/auxiliary.js');
 const year=require('../packages/astrology-engine/src/year-stars.js');
 const locate=(items,name)=>items.find(item=>item.name===name)?.branch;
 for(let stem=0;stem<10;stem++){
  const stars=aux.calculate({yearStem:stem,lunarMonth:1,hourBranch:0});
  assert.notEqual(locate(stars,'Kình Dương'),locate(stars,'Đà La'));
  assert.notEqual(locate(stars,'Thiên Khôi'),locate(stars,'Thiên Việt'));
  const loc=locate(stars,'Lộc Tồn');
  assert.equal((locate(stars,'Kình Dương')+11)%12,loc);
  assert.equal((locate(stars,'Đà La')+1)%12,loc);
 }
 for(let branch=0;branch<12;branch++){
  const stars=year.calculate(branch);
  const loan=locate(stars,'Hồng Loan'),hy=locate(stars,'Thiên Hỷ');
  assert.notEqual(loan,hy);
  assert.equal((loan+6)%12,hy);
 }
});
