'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join,resolve} = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const root = resolve(__dirname,'..');
const read = path => readFileSync(join(root,path),'utf8');
const ts = require('./helpers-typeloader.cjs');
function loadTypeScript(path,deps={}) {
  const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{if(Object.hasOwn(deps,name))return deps[name];throw new Error(`Unexpected import ${name}`);}});
  return module.exports;
}
const relations=loadTypeScript('apps/web/src/features/chart/lib/palace-relations.ts');
const {palaceFocusItems,annualMarkersAt,nextAnnualYear}=loadTypeScript('apps/web/src/features/chart/lib/palace-focus.ts',{'./palace-relations':relations});
const result=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30,leap:false});
const annual=Engine.annualOverview(result,2026);
const selected=result.houses.find(h=>h.palace==='Mệnh');

test('insight: correct geographic scope, unique branches and roles',()=>{
  const branch=selected.branchIndex;
  const expected=relations.relatedBranches(branch);
  const compact=xs=>Array.from(xs,item=>item.house.branchIndex);
  assert.deepEqual(compact(palaceFocusItems(result.houses,branch,'single')),[branch]);
  assert.deepEqual(compact(palaceFocusItems(result.houses,branch,'tam-hop')),[branch,...expected.tamHop]);
  assert.deepEqual(compact(palaceFocusItems(result.houses,branch,'tu-chinh')),[branch,...expected.tamHop,expected.doiCung]);
  assert.deepEqual(Array.from(palaceFocusItems(result.houses,branch,'tu-chinh'),item=>item.role),['current','tam-hop','tam-hop','doi-cung']);
  assert.equal(new Set(compact(palaceFocusItems(result.houses,branch,'tu-chinh'))).size,4);
});
test('insight: lookup maps by branchIndex, independent of house array order',()=>{
  const a=palaceFocusItems(result.houses,selected.branchIndex,'tu-chinh');
  const b=palaceFocusItems([...result.houses].reverse(),selected.branchIndex,'tu-chinh');
  assert.deepEqual(Array.from(a,x=>x.house.palace),Array.from(b,x=>x.house.palace));
});
test('insight: partial lists do not invent unavailable palaces',()=>{
  const found=palaceFocusItems([selected],selected.branchIndex,'tu-chinh');
  assert.equal(found.length,1);
  assert.equal(found[0].house.palace,'Mệnh');
});
test('insight: annual markers reflect engine source locations',()=>{
  for(let branch=0;branch<12;branch++) {
    const markers=annualMarkersAt(annual,branch);
    assert.equal(markers.includes('Lưu Thái Tuế'),annual.luuThaiTueBranchIndex===branch);
    assert.equal(markers.includes('Đại hạn'),annual.activeDaiHan?.branchIndex===branch);
    assert.equal(markers.includes('Tiểu hạn'),annual.tieuHan.branchIndex===branch);
  }
});
test('insight: comparison stays presentation-only and never mutates natal or annual calculations',()=>{
  const before=JSON.stringify({result,annual});
  palaceFocusItems(result.houses,selected.branchIndex,'tu-chinh');
  annualMarkersAt(annual,selected.branchIndex);
  assert.equal(JSON.stringify({result,annual}),before);
});
test('insight: bounded year navigation handles lower and upper limits',()=>{
  assert.equal(nextAnnualYear(2026,-1,2004),2025);
  assert.equal(nextAnnualYear(2004,-1,2004),2004);
  assert.equal(nextAnnualYear(2100,1,2004),2100);
  assert.equal(nextAnnualYear(2000,-1,1890),1999);
});
test('insight: dedicated side panel is wired to board state, CSS and accessibility controls',()=>{
  const board=read('apps/web/src/features/chart/components/chart-board.tsx');
  const dock=read('apps/web/src/features/chart/components/palace-insight-dock.tsx');
  const layout=read('apps/web/src/app/layout.tsx');
  const css=read('apps/web/src/app/palace-insight-dock.css');
  for(const token of ['<PalaceInsightDock','scope={focusScope}','onScopeChange={setFocusScope}','onYearChange={chooseYear}','className="chart-room-layout"','focusBranches.has(house.branchIndex)'])assert.ok(board.includes(token),`Missing ${token}`);
  for(const token of ['aria-pressed={scope === option.value}','aria-controls="thiendo-palace-details"','aria-label="Năm trước"','aria-label="Năm sau"','palaceFocusItems(houses,house.branchIndex,scope)'])assert.ok(dock.includes(token),`Missing ${token}`);
  assert.ok(layout.includes("import '" + [".","/palace-insight-dock.css"].join("") + "'"));
  assert.match(css,/@media\(max-width:670px\)/);
  assert.match(css,/position:sticky/);
});
