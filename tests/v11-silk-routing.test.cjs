'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const ts = require('./helpers-typeloader.cjs');
const root=join(__dirname,'..');
const memo=new Map();
function load(name){
 if(memo.has(name))return memo.get(name);
 const src=readFileSync(join(root,'apps/web/src/features/chart/lib',name+'.ts'),'utf8');
 const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:path=>{
  assert.ok(path.startsWith('./'));
  return load(path.slice(2));
 }});
 memo.set(name,module.exports);return module.exports;
}
const {silkPerimeterRelationPath,palaceRelationEdges}=load('palace-relation-lines');
const all=Array.from({length:12},(_,i)=>i);
const center={left:220,top:180,right:580,bottom:560};
const coords=[
 {x:100,y:160},{x:300,y:160},{x:500,y:160},{x:700,y:160},
 {x:170,y:260},{x:630,y:260},{x:170,y:440},{x:630,y:440},
 {x:100,y:620},{x:300,y:620},{x:500,y:620},{x:700,y:620}
];
function parsePath(path){
 const commands=[...path.matchAll(/([MLQ])\s+([\d.-]+)\s+([\d.-]+)(?:\s+([\d.-]+)\s+([\d.-]+))?/g)].map(m=>({cmd:m[1],x:+m[2],y:+m[3],xx:m[4]===undefined?undefined:+m[4],yy:m[5]===undefined?undefined:+m[5]}));
 return commands;
}
function sample(commands){
 const points=[];
 let from=null;
 for(const c of commands){
  if(c.cmd==='Q' && from){
   const control={x:c.x,y:c.y},to={x:c.xx,y:c.yy};
   for(let i=0;i<=10;i++){const t=i/10;
    points.push({x:(1-t)**2*from.x+2*(1-t)*t*control.x+t*t*to.x,y:(1-t)**2*from.y+2*(1-t)*t*control.y+t*t*to.y});
   }
   from=to;
  }else{from={x:c.x,y:c.y};points.push(from);}
 }
 return points;
}
test('silk routes for all 12 branches avoid center text core and preserve precise anchors',()=>{
 for(let branch=0;branch<12;branch++){
  for(const edge of palaceRelationEdges(all,branch,'tu-chinh')){
   const start=coords[branch],end=coords[edge.toBranch];
   const path=silkPerimeterRelationPath(start,end,center,12,12);
   const commands=parsePath(path),points=sample(commands);
   assert.equal(commands[0].cmd,'M');
   assert.ok(commands.some(c=>c.cmd==='Q'),'curve should have rounded joins');
   assert.ok(Math.abs(points[0].x-start.x)<.01 && Math.abs(points[0].y-start.y)<.01);
   assert.ok(Math.abs(points.at(-1).x-end.x)<.01 && Math.abs(points.at(-1).y-end.y)<.01);
   assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
   // Identity typography sits well within this rectangle; the guide stays in its margin.
   for(const p of points){
    assert.ok(!(p.x>center.left+36 && p.x<center.right-36 && p.y>center.top+36 && p.y<center.bottom-36),`route crosses text core at branch ${branch} -> ${edge.toBranch}: ${JSON.stringify(p)}`);
   }
  }
 }
});
test('silk path keeps valid fallback for tiny center box',()=>{
 const a={x:1,y:2},b={x:4,y:5};
 assert.equal(silkPerimeterRelationPath(a,b,{left:0,top:0,right:5,bottom:5},9), 'M 1 2 L 4 5');
});
test('real SVG now uses direct straight guides and preserves fluid anchor transition and reduced-motion support',()=>{
 const source=readFileSync(join(root,'apps/web/src/features/chart/components/palace-relation-lines.tsx'),'utf8');
 assert.match(source,/straightRelationPath\(start,end\)/);
 assert.doesNotMatch(source,/silkPerimeterRelationPath\(start,end/);
 assert.match(source,/interpolatePoint\(previous\.edges\[i\]\.start,edge\.start,progress\)/);
 assert.match(source,/prefers-reduced-motion: reduce/);
});
