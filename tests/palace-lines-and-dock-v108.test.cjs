'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ts = require('./helpers-typeloader.cjs');
const libraryPath='apps/web/src/features/chart/lib/';
const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  const source=read(`${libraryPath}${name}.ts`);
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(js,{module,exports:module.exports,require:required=>{
    if(!required.startsWith('./'))throw new Error('Unexpected import: '+required);
    return load(required.slice(2));
  }});
  cache.set(name,module.exports);
  return module.exports;
}
const {palaceRelationEdges,inwardEdgePoint}=load('palace-relation-lines');
const plain=value=>JSON.parse(JSON.stringify(value));
const all=Array.from({length:12},(_,i)=>i);

test('links: selected palace connects to exactly two Tam hợp and one Đối cung',()=>{
  for(let current=0;current<12;current++){
    const edges=plain(palaceRelationEdges(all,current,'tu-chinh'));
    assert.deepEqual(edges.map(edge=>edge.fromBranch),[current,current,current]);
    assert.deepEqual(edges.map(edge=>edge.toBranch),[(current+4)%12,(current+8)%12,(current+6)%12]);
    assert.deepEqual(edges.map(edge=>edge.kind),['tam-hop','tam-hop','doi-cung']);
    assert.equal(new Set(edges.map(e=>e.toBranch)).size,3);
  }
});
test('links: Tam hợp omits Đối cung; one-cung focus produces zero lines',()=>{
  assert.deepEqual(plain(palaceRelationEdges(all,10,'tam-hop')).map(e=>e.toBranch),[2,6]);
  assert.deepEqual(plain(palaceRelationEdges(all,10,'single')),[]);
});
test('links: missing or shuffled houses cannot create fabricated connections',()=>{
  assert.deepEqual(plain(palaceRelationEdges([11,7,3,5],11,'tu-chinh')).map(e=>e.toBranch),[3,7,5]);
  assert.deepEqual(plain(palaceRelationEdges([9,7,3,5],11,'tu-chinh')),[]);
  assert.deepEqual(plain(palaceRelationEdges([11,3],11,'tu-chinh')).map(e=>e.toBranch),[3]);
});
test('links: invalid địa chi fails closed',()=>{
  for(const branch of [-1,12,0.1,Infinity,NaN])assert.throws(()=>palaceRelationEdges(all,branch,'tu-chinh'),{name:'RangeError'});
});
test('geometry: inner anchors land on visible tile boundary without crossing labels',()=>{
  const board={left:0,top:0,right:400,bottom:400};
  assert.deepEqual(plain(inwardEdgePoint({left:100,top:0,right:200,bottom:100},board)),{x:150,y:94});
  assert.deepEqual(plain(inwardEdgePoint({left:0,top:100,right:100,bottom:200},board)),{x:94,y:150});
  assert.deepEqual(plain(inwardEdgePoint({left:300,top:100,right:400,bottom:200},board)),{x:306,y:150});
  assert.deepEqual(plain(inwardEdgePoint({left:100,top:300,right:200,bottom:400},board)),{x:150,y:306});
});
test('geometry: anchors track translated board and non-square responsive tiles',()=>{
  const board={left:50,top:100,right:950,bottom:700};
  const p=plain(inwardEdgePoint({left:50,top:100,right:275,bottom:250},board));
  assert.deepEqual(p,{x:219,y:144});
  assert.ok(p.x>=0&&p.x<=900&&p.y>=0&&p.y<=600);
});
test('UI: dock is collapsed by default, has explicit accessible toggle, retains original panel',()=>{
  const board=read('apps/web/src/features/chart/components/chart-board.tsx')+'\n'+read('apps/web/src/features/chart/components/chart-display-controls.tsx');
  const css=read('apps/web/src/app/palace-insight-dock.css');
  assert.match(board,/\[showInsightDock,setShowInsightDock\] = useState\(false\)/);
  assert.match(board,/aria-expanded=\{showInsightDock\} aria-controls="thiendo-study-dock"/);
  assert.match(board,/data-dock-open=\{showInsightDock\}/);
  assert.match(board,/hidden=\{!showInsightDock\}/);
  assert.match(board,/<PalaceInsightDock house=\{selectedHouse\}/);
  assert.match(css,/\.chart-room-layout\[data-dock-open="false"\]\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.chart-dock-slot\[hidden\]\{display:none!important\}/);
});
test('UI: visual connections are hover-guided, drawn on chart only and ignore pointer interaction',()=>{
  const board=read('apps/web/src/features/chart/components/chart-board.tsx')+'\n'+read('apps/web/src/features/chart/components/chart-display-controls.tsx')+'\n'+read('apps/web/src/features/chart/components/palace-tile.tsx');
  const component=read('apps/web/src/features/chart/components/palace-relation-lines.tsx');
  const css=read('apps/web/src/app/palace-insight-dock.css')+'\n'+read('apps/web/src/app/typography-refinement.css');
  assert.match(board,/\[showRelationLines,setShowRelationLines\] = useState\(true\)/);
  assert.match(board,/\[previewBranch,setPreviewBranch\] = useState<number \| null>\(null\)/);
  assert.match(board,/aria-pressed=\{showRelationLines\}/);
  assert.match(board,/onMouseEnter=\{onPreviewStart\} onMouseLeave=\{onPreviewEnd\}/);
  assert.match(board,/showRelationLines && <PalaceRelationLines/);
  assert.match(component,/selectedBranch: number \| null/);
  assert.match(component,/setVisible\(false\)/);
  assert.match(board,/if \(!showRelationLines \|\| !canHover\) return;/);
  assert.match(component,/new ResizeObserver\(schedule\)/);
  assert.match(component,/aria-hidden="true" focusable="false"/);
  assert.match(css,/\.chart-relation-lines\{[^}]*pointer-events:none/);
  assert.match(css,/\.chart-relation-doi-cung path\{[^}]*stroke-dasharray/);
  assert.match(css,/\.chart-relation-tam-hop path\s*\{[^}]*stroke:/);
});
test('routing: every line follows central panel perimeter without cutting across its text',()=>{
  const {perimeterRelationPath}=load('palace-relation-lines');
  const center={left:100,top:100,right:300,bottom:300};
  const path=perimeterRelationPath({x:50,y:160},{x:350,y:250},center,15);
  const segments=[...path.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
  assert.deepEqual(segments[0],{x:50,y:160});
  assert.deepEqual(segments.at(-1),{x:350,y:250});
  for(const point of segments.slice(1,-1)){
    assert.ok(point.x===115||point.x===285||point.y===115||point.y===285,JSON.stringify(point));
  }
  assert.ok(!path.includes('NaN'));
});
test('routing: valid fallback path for pathologically small center card',()=>{
  const {perimeterRelationPath}=load('palace-relation-lines');
  const path=perimeterRelationPath({x:1,y:2},{x:3,y:4},{left:0,top:0,right:4,bottom:4},10);
  assert.equal(path,'M 1 2 L 3 4');
});
