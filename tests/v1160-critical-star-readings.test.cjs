'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const library=require('../packages/knowledge/src/index.cjs');
const data=require('../packages/knowledge/src/star-critical-readings.json');
const read=p=>fs.readFileSync(path.resolve(root,p),'utf8');
const guided=Object.entries(library.starDossiers.profiles).filter(([,item])=>item.editorialLevel==='guided-structure-not-independent-review').map(([name])=>name);

test('V11.60 covers exactly 66 guided stars, not the 24 earlier bespoke dossiers',()=>{
 assert.equal(data.edition,'11.60.0');assert.equal(data.scope,'educational-counter-reading-no-placement');
 assert.equal(data.expertReviewed,false);
 assert.deepEqual(Object.keys(data.records),guided);
 assert.equal(guided.length,66);
 assert.ok(guided.every(name=>Object.hasOwn(library.starSymbols,name)));
});
test('V11.60 has distinct authored claims, examples, exclusions and questions for each star',()=>{
 const seen={distinction:new Set(),caseStudy:new Set(),counterExample:new Set(),inquiry:new Set()};
 for(const [name,entry] of Object.entries(data.records)){
  assert.equal(entry.reviewStatus,'editorial-unreviewed');
  for(const [field,min] of Object.entries({distinction:55,caseStudy:55,counterExample:49,inquiry:37})){
   assert.ok(typeof entry[field]==='string' && entry[field].length>=min,`${name}:${field}`);
   assert.ok(!seen[field].has(entry[field]),`${name}:${field} repeated`);
   seen[field].add(entry[field]);
  }
  assert.match(entry.caseStudy,/^(Nếu|Giả định)/,`${name}: case is clearly conditional`);
  assert.ok(!Object.keys(entry).some(key=>/branch|placement|forecast|rule|yearIndex/i.test(key)),`${name}: placement leaked`);
  assert.strictEqual(library.lookupStarCriticalReading(name),entry);
 }
});
test('V11.60 API rejects prototype access and missing star names',()=>{
 for(const bad of ['__proto__','constructor','Tử Vi','unlisted',null,1,{},[]])assert.equal(library.lookupStarCriticalReading(bad),null);
});
test('V11.60 cycle and fixed-locator studies are explanatory, never computation changes',()=>{
 const cycleNames=new Set(library.starCycleStudy.cycles.flatMap(c=>c.orderedNames));
 assert.equal([...cycleNames].filter(name=>data.records[name]).length,36);
 for(const name of ['Thiên La','Địa Võng','Thiên Thương','Thiên Sứ'])assert.ok(data.records[name]);
 const engine=read('packages/astrology-engine/src/tuvi.js');
 assert.doesNotMatch(engine,/star-critical-readings|lookupStarCriticalReading/);
 const d=JSON.stringify(data);
 for(const forbidden of ['"branchIndex"','"placement"','"formula"','"rule"','"annualStars"'])assert.ok(!d.includes(forbidden));
});
test('V11.60 search and chosen dossier surfaces all 4 new fields without a duplicate engine',()=>{
 const ui=read('apps/web/src/features/star-atlas/expanded-star-library.tsx');
 for(const field of ['distinction','caseStudy','counterExample','inquiry']){
  assert.match(ui,new RegExp(`chosenCritical\\.${field}`));
  assert.match(ui,new RegExp(`row\\.criticalReading\\?\\.${field}`));
 }
 assert.match(ui,/star-critical-readings\.json/);
 assert.match(ui,/Không dùng ví dụ giả định làm dữ liệu lá số thực/);
});
