'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const root=resolve(__dirname,'..');
const file=p=>readFileSync(join(root,p),'utf8');
const ts = require('./helpers-typeloader.cjs');
const moduleObj={exports:{}};
vm.runInNewContext(ts.transpileModule(file('apps/web/src/features/chart/lib/palace-relations.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:moduleObj.exports,module:moduleObj});
const {relatedBranches}=moduleObj.exports;
const engine=require('../packages/astrology-engine/src/tuvi.js');
const result=engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
test('atlas: tam hợp +4/+8 and opposite +6 are distinct, symmetrical and on the 12-branch ring',()=>{
  for(let b=0;b<12;b++){
    const r=relatedBranches(b);
    assert.equal(new Set([b,...r.tamHop,r.doiCung]).size,4);
    assert.equal(relatedBranches(r.doiCung).doiCung,b);
    assert.ok(r.tamHop.every(index=>relatedBranches(index).tamHop.includes(b)));
    assert.ok([...r.tamHop,r.doiCung].every(index=>index>=0&&index<=11));
  }
});
test('atlas: relations reject out of range and fractional values',()=>{
  for(const n of [-1,12,2.2,NaN,Infinity])assert.throws(()=>relatedBranches(n),error=>error?.name==='RangeError');
});
test('atlas: each related palace exists in actual engine result, no mutable calculations',()=>{
  const before=JSON.stringify(result);
  for(const h of result.houses){
    for(const idx of [...relatedBranches(h.branchIndex).tamHop,relatedBranches(h.branchIndex).doiCung]){
      assert.ok(result.houses.some(x=>x.branchIndex===idx));
    }
  }
  assert.equal(JSON.stringify(result),before);
});
test('atlas: production board shows all source categories without truncating detail, and real center data',()=>{
  const source=['chart-board.tsx','chart-relation-navigation.tsx','palace-tile.tsx','board-summary.tsx','palace-details.tsx'].map(name=>file('apps/web/src/features/chart/components/'+name)).join('\n');
  for(const keyword of ['house.auxiliaryStars','house.yearStars','house.tuHoa','house.cycleStars.trangSinh','house.cycleStars.thaiTue','house.cycleStars.bacSi','house.daiHan','annual.luuTuHoa.items','annual.luuStars.items','result.solar','result.lunar','result.yearCanChi','relatedBranches(','atlas-relations','ĐỐI CHIẾU ĐỊA BÀN']) assert.ok(source.includes(keyword),keyword);
  assert.match(source,/AstrologyGroup label="02 · PHỤ TINH" items={house\.auxiliaryStars}\/>/);
  assert.match(file('apps/web/src/app/chart/page.tsx'),/chart-atlas-workspace/);
  assert.match(file('apps/web/src/app/layout.tsx'),/import '\.\/chart-atlas\.css'/);
});
test('atlas: desktop uses wider chart while mobile retains scrollable board plus list',()=>{
  const css=file('apps/web/src/app/chart-atlas.css');
  assert.match(css,/\.chart-atlas-workspace \{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.atlas-grid \{min-width:1000px/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/\.atlas-details-grid \{display:grid;/);
});
