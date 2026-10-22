'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {calculate}=require('../packages/astrology-engine/src/tuvi.js');
const {buildStarEvidenceMatrix,getNatalNames}=require('../packages/interpretation/src/star-evidence-matrix.cjs');
const registry=require('../packages/knowledge/src/star-identity-registry.json');
const dossiers=require('../packages/knowledge/src/star-dossiers.json').profiles;
const critical=require('../packages/knowledge/src/star-critical-readings.json').records;
const mainGuide=require('../packages/knowledge/src/primary-star-palace-guidance.json').records;
const rules=require('../packages/knowledge/src/combination-rules.json').rules;
function chart(hour=8,year=2004,gender='Nam'){
 return calculate({date:`${year}-03-15`,hour,minute:30,calendar:'solar',leap:false,gender});
}
test('V11.69 available 104 natal/cycle names have real editorial dossiers or main guidance, no silent invented star',()=>{
 const names=[...new Set(registry.records.filter(r=>['natal','cycle'].includes(r.layer)).map(r=>r.name))];
 assert.equal(names.length,104);
 assert.deepEqual(names.filter(name=>!Object.hasOwn(dossiers,name)&&!Object.hasOwn(mainGuide,name)),[]);
 assert.equal(Object.keys(critical).length,66);
 assert.equal(rules.length,9); // Don't misrepresent volume of automatic rules.
});
test('V11.69 four courts use only actual positions, never mutate a calculated chart',()=>{
 const original=chart(), before=JSON.stringify(original);
 for(const house of original.houses){
  const names=getNatalNames(house);
  assert.ok(names.length>0);
  const e=buildStarEvidenceMatrix(original.houses,house.branchIndex,names[0]);
  assert.deepEqual(e.courts.map(c=>c.branchIndex),[0,4,8,6].map(offset=>(house.branchIndex+offset)%12));
  assert.equal(e.courts[0].palace,house.palace);
  assert.equal(e.courts[0].names.includes(names[0]),true);
  assert.equal(e.courts[0].starCount,e.courts[0].names.length);
  for(const c of e.courts){
   const actual=original.houses.find(h=>h.branchIndex===c.branchIndex);
   assert.deepEqual(c.mainStars,actual.stars);
   assert.deepEqual(c.transformations.map(t=>t.name),actual.tuHoa.map(t=>t.name));
   assert.deepEqual(c.obstructions,actual.obstructionMarkers??[]);
  }
  assert.ok(!JSON.stringify(e).includes('Lưu Lộc Tồn'));
 }
 assert.equal(JSON.stringify(original),before);
});
test('V11.69 selected transformed star is verified only against the real natal placement',()=>{
 const c=chart();
 const house=c.houses.find(h=>h.tuHoa.length);
 const target=house.tuHoa[0].star;
 const e=buildStarEvidenceMatrix(c.houses,house.branchIndex,target);
 assert.ok(e.selectedTransformations.some(t=>t.name===house.tuHoa[0].name&&t.target===target&&t.verified));
 const forged=structuredClone(c.houses);
 forged.find(h=>h.branchIndex===house.branchIndex).tuHoa.push({name:'Hóa Kỵ',star:'Không có thực'});
 const suspicious=buildStarEvidenceMatrix(forged,house.branchIndex,target);
 assert.ok(suspicious.issues.some(s=>s.includes('Không có thực')));
 assert.ok(!suspicious.selectedTransformations.some(t=>t.target==='Không có thực'));
});
test('V11.69 inputs reject repeated branches, phantom stars and unexpected lengths',()=>{
 const c=chart(),h=c.houses[0],star=getNatalNames(h)[0];
 assert.throws(()=>buildStarEvidenceMatrix(c.houses,h.branchIndex,'sao bịa'),/không hiện diện/);
 assert.throws(()=>buildStarEvidenceMatrix(c.houses.slice(1),h.branchIndex,star),/12 cung/);
 const duplicate=structuredClone(c.houses);duplicate[1].branchIndex=duplicate[0].branchIndex;
 assert.throws(()=>buildStarEvidenceMatrix(duplicate,h.branchIndex,star),/trùng/);
 assert.throws(()=>buildStarEvidenceMatrix(c.houses,12,star),/Địa chi/);
});
test('V11.69 natal invariants across 12 birth-years, both genders and hour branches',()=>{
 for(const gender of ['Nam','Nữ'])for(let year=1999;year<=2010;year++){
  const c=chart((year%12)*2,year,gender),all=c.houses.flatMap(h=>h.stars);
  assert.equal(all.length,14,`${year}/${gender}`);
  assert.equal(new Set(all).size,14,`${year}/${gender}`);
  for(const house of c.houses){
   for(const key of ['thaiTue','bacSi','trangSinh'])assert.equal(house.cycleStars[key].length,1);
   const star=getNatalNames(house)[0];
   const e=buildStarEvidenceMatrix(c.houses,house.branchIndex,star);
   assert.equal(e.courts.length,4);
  }
 }
});
test('V11.69 UI exposes critical notes and real four-court study without adding predictions',()=>{
 const s=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/star-context-explorer.tsx'),'utf8');
 const p=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/star-four-court-evidence.tsx'),'utf8');
 assert.match(s,/star-critical-readings\.json/);
 assert.match(s,/<StarFourCourtEvidence houses=\{houses\}/);
 assert.match(s,/names\.filter\(name => name !== chosen\)/);
 for(const field of ['distinction','caseStudy','counterExample','inquiry'])assert.match(s,new RegExp('critical\\.'+field));
 assert.match(p,/buildStarEvidenceMatrix\(houses,branchIndex,star\)/);
 assert.doesNotMatch(p,/annualOverview|Math\.random|window\./);
});
