'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildPalaceEvidenceLenses,createTwelvePalaceStudy}=require('../packages/interpretation/src/index.cjs');
const corpus=require('../packages/knowledge/src/palace-evidence-lenses.json');
const chart=()=>engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const lens=(result,id)=>result.lenses.find(x=>x.id===id);

test('V11.47 twelve independent palace profiles with four distinct questions each',()=>{
 const topics=require('../packages/knowledge/src/palace-topics.json').topics;
 assert.deepEqual(Object.keys(corpus.profiles).sort(),Object.keys(topics).sort());
 const all=[];for(const p of Object.values(corpus.profiles))for(const id of ['main','support','challenge','transformation']){
  assert.ok(p[id].length>=50);all.push(p[id]);
 }
 assert.equal(new Set(all).size,48);
 assert.equal(corpus.expertReviewed,false);
});
test('V11.47 each of 12 houses has four lenses with source-backed objects, chart stays unchanged',()=>{
 const c=chart(),snap=JSON.stringify(c);
 for(const house of c.houses){const r=buildPalaceEvidenceLenses(c,house.branchIndex);
  assert.equal(r.status,'research-only');assert.equal(r.palace,house.palace);
  assert.deepEqual(r.lenses.map(x=>x.id),['main','support','challenge','transformation']);
  for(const l of r.lenses){assert.ok(l.question.length>45);assert.equal(l.observedCount,l.observed.length);
   assert.equal(l.problemCount,l.problems.length);
   for(const item of l.observed){assert.equal(item.status,'observed');assert.ok(item.sourcePath?.startsWith('houses['));}
  }
 }
 assert.equal(JSON.stringify(c),snap);
});
test('V11.47 correct main strength and natal Hóa evidence is retained',()=>{
 const c=chart(),house=c.houses.find(x=>x.palace==='Mệnh'),r=buildPalaceEvidenceLenses(c,house.branchIndex);
 assert.equal(lens(r,'main').observedCount,2);assert.equal(lens(r,'challenge').observedCount,2);
 assert.ok(lens(r,'main').observed.every(x=>x.strengthStatus==='verified'&&x.strengthPath));
 assert.ok(lens(r,'transformation').observed.some(x=>x.transformation==='Hóa Kỵ'&&x.star==='Thái Dương'));
});
test('V11.47 mismatch in brightness index is identified, never inferred',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length),n=h.stars[0];
 h.mainStarStrengths=h.mainStarStrengths.filter(x=>x.name!==n);
 const r=buildPalaceEvidenceLenses(c,h.branchIndex),s=lens(r,'main');
 assert.equal(s.status,'needs-review');assert.equal(s.problems.find(x=>x.star===n).strengthStatus,'unverified');
});
test('V11.47 contradictory brightness duplicates cannot pass verified gate',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length);
 h.mainStarStrengths.push({...h.mainStarStrengths[0],status:'H'});
 assert.equal(lens(buildPalaceEvidenceLenses(c,h.branchIndex),'main').status,'needs-review');
});
test('V11.47 a main star duplicated in another palace becomes ambiguous, never accepted',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length),other=c.houses.find(x=>x!==h);
 other.stars.push(h.stars[0]);const r=buildPalaceEvidenceLenses(c,h.branchIndex);
 assert.equal(lens(r,'main').problems.find(x=>x.star===h.stars[0]).status,'ambiguous');
});
test('V11.47 a supporting star repeated at two houses cannot count as a verified support',()=>{
 const c=chart(),h=c.houses.find(x=>x.auxiliaryStars.includes('Tả Phụ'));
 const other=c.houses.find(x=>x!==h);other.auxiliaryStars.push('Tả Phụ');
 const r=buildPalaceEvidenceLenses(c,h.branchIndex);
 assert.equal(lens(r,'support').status,'needs-review');
 assert.equal(lens(r,'support').problems.find(x=>x.star==='Tả Phụ').status,'ambiguous');
});
test('V11.47 conflicting Hóa label across houses invalidates target',()=>{
 const c=chart(),h=c.houses.find(x=>x.tuHoa.some(t=>t.name==='Hóa Kỵ'));
 const other=c.houses.find(x=>x!==h);other.tuHoa.push({name:'Hóa Kỵ',star:other.stars[0]??'Tử Vi'});
 const r=buildPalaceEvidenceLenses(c,h.branchIndex);
 assert.equal(lens(r,'transformation').observedCount,0);
 assert.equal(lens(r,'transformation').problems[0].status,'unverified-target');
});
test('V11.47 detached Hóa target and invalid label are marked, not shown as verified',()=>{
 const c=chart(),h=c.houses.find(x=>x.tuHoa.length);
 h.tuHoa.push({name:'Hóa Quyền',star:'Bịa sao'});h.tuHoa.push({name:'Không phải Hóa',star:'X'});
 const l=lens(buildPalaceEvidenceLenses(c,h.branchIndex),'transformation');
 assert.equal(l.status,'needs-review');assert.ok(l.problems.some(x=>x.status==='unverified-target'));
 assert.ok(l.problems.some(x=>x.status==='invalid-label'));
});
test('V11.47 annual-only spoof records do not enter natal lenses',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 const a=engine.annualOverview(c,2026);a.luuStars.items.push({name:'Tả Phụ',branch:h.branchIndex});
 const snap=JSON.stringify([c,a]);
 const result=buildPalaceEvidenceLenses(c,h.branchIndex);
 assert.equal(lens(result,'support').observed.some(x=>x.star==='Tả Phụ'),false);
 assert.equal(JSON.stringify([c,a]),snap);
});
test('V11.47 original chart array index (not branch index) is retained in evidence paths',()=>{
 const c=chart();c.houses.reverse();const h=c.houses[0];
 const r=buildPalaceEvidenceLenses(c,h.branchIndex);
 assert.ok(lens(r,'main').observed.every(item=>item.sourcePath.startsWith('houses[0].')));
});
test('V11.47 deep-mode frontend integration and TypeScript declaration are present',()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/twelve-palace-study-panel.tsx'),'utf8');
 const ts=fs.readFileSync(path.resolve(__dirname,'../packages/interpretation/src/index.d.ts'),'utf8');
 assert.match(ui,/evidenceLenses\.lenses\.map/);assert.match(ui,/Bốn hướng đối chiếu sao bản mệnh/);
 assert.doesNotMatch(ui,/astrology-engine|fetch\(/);assert.match(ts,/interface PalaceEvidenceLenses/);
 const c=chart();const study=createTwelvePalaceStudy(c,c.houses[0].branchIndex);
 assert.equal(study.evidenceLenses.lenses.length,4);
 assert.doesNotMatch(JSON.stringify(study),/houses\[/);
 assert.ok(lens(buildPalaceEvidenceLenses(c,c.houses[0].branchIndex),'main').observed.every(item=>item.sourcePath?.startsWith('houses[')));
});
test('V11.47 fixture audit covers 22 charts and 264 palace observations',()=>{
 const r=require('../infrastructure/scripts/audit-palace-evidence-lenses.cjs').audit();
 assert.equal(r.status,'PASS');assert.equal(r.stats.charts,22);assert.equal(r.stats.palaces,264);
 assert.equal(r.stats.lenses,1056);assert.equal(r.stats.unknownProfile,0);
});
