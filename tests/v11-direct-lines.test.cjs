'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ts = require('./helpers-typeloader.cjs');
const cache=new Map();
function load(name){
 if(cache.has(name)) return cache.get(name);
 const source=fs.readFileSync(path.join(root,'apps/web/src/features/chart/lib',name+'.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:rel=>{assert.ok(rel.startsWith('./'));return load(rel.slice(2));}});
 cache.set(name,module.exports);return module.exports;
}
const {straightRelationPath,palaceRelationEdges}=load('palace-relation-lines');
const {interpolatePoint}=load('relation-motion');
const all=Array.from({length:12},(_,i)=>i);
const plain=v=>JSON.parse(JSON.stringify(v));
test('straight path contains exactly M and L, never curves or bend vertices',()=>{
 const cases=[[[20,40],[105.12345,60.98765]],[[0,0],[100,100]],[[-2,-3],[0,4]]];
 for(const [[x1,y1],[x2,y2]] of cases){
  const d=straightRelationPath({x:x1,y:y1},{x:x2,y:y2});
  assert.match(d,/^M -?\d+(?:\.\d+)? -?\d+(?:\.\d+)? L -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?$/);
  assert.ok(!/[QCZA]/.test(d),d);
 }
});
test('straight guide returns empty path for invalid coordinates',()=>{
 assert.equal(straightRelationPath({x:NaN,y:2},{x:1,y:2}),'');
 assert.equal(straightRelationPath({x:1,y:Infinity},{x:1,y:2}),'');
});
test('36 relations connect exactly the standard Tam hợp + Đối cung endpoints',()=>{
 for(const branch of all){
  const edges=plain(palaceRelationEdges(all,branch,'tu-chinh'));
  assert.equal(edges.length,3);
  assert.deepEqual(edges.map(e=>e.toBranch),[(branch+4)%12,(branch+8)%12,(branch+6)%12]);
  assert.deepEqual(edges.map(e=>e.kind),['tam-hop','tam-hop','doi-cung']);
 }
});
test('moving endpoints remain on straight connections and ease monotonically',()=>{
 const a={x:10,y:20},b={x:300,y:400};
 let previous=0;
 for(const t of [0,.10,.2,.4,.6,.8,1]){
  const p=plain(interpolatePoint(a,b,t));
  const fraction=(p.x-a.x)/(b.x-a.x);
  assert.ok(fraction>=previous-1e-8&&fraction<=1+1e-8);
  assert.ok(Math.abs((p.y-a.y)/(b.y-a.y)-fraction)<1e-7);
  assert.match(straightRelationPath(a,p),/^M .* L .*$/);
  previous=fraction;
 }
});
test('React overlay uses straight path, hover fade, motion and reduced-motion support',()=>{
 const src=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/palace-relation-lines.tsx'),'utf8');
 const css=fs.readFileSync(path.join(root,'apps/web/src/app/palace-insight-dock.css'),'utf8');
 assert.match(src,/straightRelationPath\(start,end\)/);
 assert.doesNotMatch(src,/silkPerimeterRelationPath\(start,end/);
 assert.match(src,/interpolatePoint\(previous\.edges\[i\]\.start,edge\.start,progress\)/);
 assert.match(src,/prefers-reduced-motion: reduce/);
 assert.match(src,/data-visible=\{visible && Boolean\(layer\?\.edges\.length\)\}/);
 assert.match(css,/\.chart-relation-lines\[data-visible="false"\]\{opacity:0\}/);
});
