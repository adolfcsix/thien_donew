'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildWholeChartWalkthrough,buildPalaceArgumentMap}=require('../packages/interpretation/src/index.cjs');
const make=(date='2004-08-15',gender='Nam',hour=8)=>Engine.calculate({date,calendar:'solar',gender,hour,minute:30});
const read=buildWholeChartWalkthrough;

test('V11.62 full 12 palace / 3 threads / 48 conditional cases, 12 distinct palaces',()=>{
 const c=make(),r=read(c);
 assert.equal(r.status,'research-only');assert.equal(r.scope,'natal-whole-chart');
 assert.equal(r.expertReviewed,false);assert.equal(r.confirmedClassicalFormation,false);
 assert.equal(r.summary.palaceCount,12);assert.equal(r.steps.length,12);assert.equal(r.threads.length,3);
 assert.equal(new Set(r.steps.map(x=>x.palace)).size,12);
 assert.equal(r.steps.flatMap(x=>x.cases).length,48);
 for(const x of r.steps){assert.equal(x.paragraphs.length,4);assert.equal(x.cases.length,4);
  assert.deepEqual(x.cases.map(y=>y.id),['toa-doi','hoi-tam-hop','hoa-dich','doi-trong']);
  assert.equal(x.expertReviewed,false);assert.equal(x.confirmedClassicalFormation,false);
  assert.ok(x.paragraphs.every(v=>v.length>45));
  const source=buildPalaceArgumentMap(c,x.branchIndex);
  assert.deepEqual(x.cases.map(z=>z.status),source.arguments.map(z=>z.status));
  for(const item of x.cases){if(item.status==='observed')assert.ok(item.checks.every(z=>z.met)&&!item.issues.length);
   assert.ok(item.evidence.every(v=>[x.branchIndex,(x.branchIndex+4)%12,(x.branchIndex+8)%12,(x.branchIndex+6)%12].includes(v.branchIndex)));
  }
 }
 assert.equal(r.threads[0].geometryVerified,true);assert.equal(r.threads[1].geometryVerified,true);
 assert.equal(r.threads[2].geometryVerified,null);
});
test('V11.62 multiple actual chart inputs, no annual, no source paths or fortune labels; no input mutation',()=>{
 for(const date of ['2004-08-15','1979-06-16','2026-10-10','1997-12-27'])for(const gender of ['Nam','Nữ'])for(const hour of [1,8,20]){
  const c=make(date,gender,hour),original=JSON.stringify(c);const r=read(c);
  assert.equal(r.steps.length,12);assert.equal(JSON.stringify(c),original);
  assert.doesNotMatch(JSON.stringify(r),/sourcePath|strengthPath|targetPath|annual-only|luuTuHoa|luuStars|fortuneScore/);
  assert.ok(r.steps.every(s=>['needs-review','fully-observed','partly-observed','no-data'].includes(s.status)));
 }
});
test('V11.62 order-independent; chart annual overlays do not change natal report',()=>{
 const c=make();const previous=read(c);
 c.houses.reverse();assert.deepEqual(read(c),previous);
 c.houses[0].luuStars=['Thiên Cơ'];c.houses[0].luuTuHoa=[{name:'Hóa Lộc',star:'Tử Vi'}];
 assert.deepEqual(read(c),previous);
});
test('V11.62 charts with invalid 12 palace names are rejected rather than rendered',()=>{
 const c=make();c.houses[1].palace=c.houses[0].palace;
 assert.throws(()=>read(c),/thiếu hoặc trùng/);
});
test('V11.62 corrupted natal brightness becomes needs-review; not a confirmed formation',()=>{
 const c=make();const h=c.houses.find(h=>h.stars.length),star=h.stars[0];
 h.mainStarStrengths=h.mainStarStrengths.filter(v=>v.name!==star);
 const r=read(c);const flagged=r.steps.filter(s=>s.geometry.triad.includes(h.palace)||s.geometry.opposite===h.palace||s.palace===h.palace);
 assert.ok(flagged.length>=4);assert.ok(flagged.every(s=>s.status==='needs-review'));
 assert.ok(r.steps.every(s=>s.expertReviewed===false));
});
test('V11.62 UI lazy mounting, no engine in component, css isolated, no source leakage',()=>{
 const dir=path.resolve(__dirname,'../apps/web/src/features/chart/components');
 const result=fs.readFileSync(path.join(dir,'chart-result.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(dir,'whole-chart-walkthrough.tsx'),'utf8');
 assert.match(result,/<div id="thiendo-whole-chart">{showWholeChart&&<WholeChartWalkthroughPanel chart={result}/);
 assert.match(ui,/buildWholeChartWalkthrough\(chart\)/);
 assert.doesNotMatch(ui,/astrology-engine|sourcePath|strengthPath|targetPath/);
 const css=fs.readFileSync(path.join(dir,'whole-chart-walkthrough.module.css'),'utf8');
 assert.match(css,/focus-visible/);
});
