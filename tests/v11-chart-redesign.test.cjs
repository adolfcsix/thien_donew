'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const {calculate,annualOverview}=require('../packages/astrology-engine/src/tuvi.js');
const chart=()=>calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
const ts = require('./helpers-typeloader.cjs');
const vm=require('node:vm');
function loadLines(){
 const memo={};
 function load(name){if(memo[name])return memo[name];
 const code=ts.transpileModule(read('apps/web/src/features/chart/lib/'+name+'.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:x=>{if(!x.startsWith('./'))throw Error('external import');return load(x.slice(2));}});return memo[name]=mod.exports;
 }
 return load('palace-relation-lines');
}
test('V11: heritage paper chart is default and jade style can be selected without changing engine',()=>{
 const board=read('apps/web/src/features/chart/components/chart-board.tsx');
 assert.match(board,/\[boardSkin,setBoardSkin\] = useState<'heritage' \| 'jade'>\('heritage'\)/);
 assert.match(board,/data-board-skin=\{boardSkin\}/);
 assert.match(board,/onBoardSkinChange=\{setBoardSkin\}/);
 const controls=read('apps/web/src/features/chart/components/chart-display-controls.tsx');
 assert.match(controls,/onBoardSkinChange\('jade'\)/);
 assert.match(controls,/onBoardSkinChange\('heritage'\)/);
 assert.match(board,/<PalaceTile key=\{house.branchIndex\}/);
});
test('V11: chart-only stylesheet is scoped to preserve the jade shell and backend',()=>{
 const css=read('apps/web/src/app/chart-heritage.css');
 assert.match(css,/\.chart-room-layout\[data-board-skin="heritage"\] \.atlas-grid/);
 assert.match(css,/--paper-ink/);assert.match(css,/#f6f0df/);
 assert.match(css,/\.chart-room-layout\[data-board-skin="jade"\]/);
 assert.match(read('apps/web/src/app/layout.tsx'),/import '\.\/chart-heritage\.css';/);
 assert.ok(!css.includes('@page{size:A3'), 'app-wide paper size must not impact other pages');
});
test('V11: guide lines are smooth, bounded, and connected to correct house IDs',()=>{
 const {softRelationPath,palaceRelationEdges}=loadLines();
 for(let branch=0;branch<12;branch++){
  const edges=palaceRelationEdges(Array.from({length:12},(_,i)=>i),branch,'tu-chinh');
  assert.equal(edges.length,3);
  assert.deepEqual(JSON.parse(JSON.stringify(edges.map(x=>x.toBranch))),[(branch+4)%12,(branch+8)%12,(branch+6)%12]);
 }
 const p=softRelationPath({x:50,y:110},{x:500,y:460},.045);
 assert.match(p,/^M 50 110 Q /);assert.match(p,/500 460$/);assert.doesNotMatch(p,/NaN|Infinity/);
 assert.equal(softRelationPath({x:1,y:2},{x:1,y:2}), 'M 1 2 L 1 2');
 assert.match(read('apps/web/src/features/chart/components/palace-relation-lines.tsx'),/straightRelationPath\(start,end/);
});
test('V11: paper export has 12 real palace cells and no external content',()=>{
 const c=chart(),svg=renderChartSvg(c,'Họ tên <script>&',annualOverview(c,2026));
 assert.equal((svg.match(/width="290" height="290"/g)||[]).length,12);
 assert.match(svg,/<rect width="1280" height="1530" fill="#f6f0e1"\/>/);
 assert.match(svg,/&lt;script&gt;&amp;/);
 assert.doesNotMatch(svg,/<script>|<image|<foreignObject/i);
});
test('V11: export supports PNG plus a dedicated isolated print / Save as PDF tab',()=>{
 const output=read('apps/web/src/features/chart/components/chart-result.tsx');
 assert.match(output,/onExportImage\(annualYear\)/);
 assert.match(output,/const annual=Engine\.annualOverview\(result, annualYear\)/);
 assert.match(output,/renderChartSvg\(result, label, annual\)/);
 assert.match(output,/renderStarAppendixHtml\(result,annual\)/);
 assert.match(output,/window\.open\('', '_blank'/);
 assert.match(output,/In \/ Lưu dưới dạng PDF/);
 assert.match(output,/onClick=\{printChart\}/);
 assert.doesNotMatch(output,/document\.body\.classList\.add\('thiendo-print-chart'\)/);
});
