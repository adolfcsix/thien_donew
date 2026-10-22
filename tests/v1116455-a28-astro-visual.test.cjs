'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const layout=require('../apps/web/src/features/western/chart-label-layout.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const separation=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
function component(file){
 const ts=require('typescript'),module={exports:{}};
 const js=ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const localRequire=id=>{if(id.endsWith('.css'))return {__esModule:true,default:{}};if(id.startsWith('.')||id.startsWith('@/')){const base=id.startsWith('@/')?'apps/web/src/'+id.slice(2):path.posix.join(path.posix.dirname(file),id);if(id.endsWith('.cjs'))return require(path.resolve(root,base));const resolved=[base,base+'.tsx',base+'.ts'].find(p=>fs.existsSync(path.join(root,p)));assert.ok(resolved,'resolvable source module '+id);return component(resolved);}return require(id);};
 new Function('require','module','exports',js)(localRequire,module,module.exports);return module.exports;
}


test('A28: angular layout does not mutate true astronomical longitude',()=>{
 const inputs=[{id:'Sun',angle:359.8},{id:'Moon',angle:0.1},{id:'Mercury',angle:0.3},{id:'Mars',angle:0.7},{id:'Venus',angle:14},{id:'Saturn',angle:180}];
 const snapshot=structuredClone(inputs);
 const result=layout.layoutCircularLabels(inputs,14.5);
 assert.deepEqual(inputs,snapshot);
 assert.deepEqual(new Set(result.map(p=>p.id)),new Set(inputs.map(p=>p.id)));
 for (const p of result) assert.equal(p.angle,layout.normalize(snapshot.find(x=>x.id===p.id).angle));
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert.ok(separation(result[i].labelAngle,result[j].labelAngle)>=14.5-1e-8,`${result[i].id}/${result[j].id} overlap`);
});

test('A28: dense natal and two rings separately remain legible',()=>{
 for(const [count,gap] of [[10,14.5],[12,16],[12,14]]){
  for (const first of [0,15,179,358.5]){
   const inputs=Array.from({length:count},(_,i)=>({id:String(i),angle:(first+i*.12)%360}));
   const result=layout.layoutCircularLabels(inputs,gap);
   assert.equal(result.length,count);
   for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert.ok(separation(result[i].labelAngle,result[j].labelAngle)>=gap-1e-8);
  }
 }
});

test('A28: mixed sparse positions, rotations and duplicates handled predictably',()=>{
 assert.deepEqual(layout.layoutCircularLabels([],14),[]);
 assert.equal(layout.layoutCircularLabels([{id:'Sun',angle:-10}],14)[0].labelAngle,350);
 assert.deepEqual(layout.layoutCircularLabels([{id:'A',angle:10},{id:'B',angle:180}],14).map(p=>p.angle).sort((a,b)=>a-b),[10,180]);
 assert.throws(()=>layout.layoutCircularLabels([{id:'A',angle:NaN}],14),/hữu hạn/);
 assert.throws(()=>layout.layoutCircularLabels([{id:'A',angle:20},{id:'A',angle:50}],14),/khác nhau/);
 assert.throws(()=>layout.layoutCircularLabels(Array.from({length:24},(_,i)=>({id:String(i),angle:i})),16),/không phù hợp/);
});

test('A28: natal ring retains ten bodies, twelve houses, five aspect types and data table',()=>{
 const page=read('apps/web/src/app/western-astrology/page.tsx');
 const wheel=read('apps/web/src/features/western/natal-wheel.tsx');
 assert.match(page,/<NatalWheel result=\{result\}/);
 assert.match(page,/result\.planets\.map\(p=><tr/);
 assert.match(wheel,/result\.houses\.map\(/);
 assert.match(wheel,/result\.planets\.map\(/);
 assert.match(wheel,/result\.aspects\.filter\([\s\S]*?\.map\(/);
 assert.match(wheel,/layoutCircularLabels/);
 const engine=require('../packages/astrology-engine/src/western-natal.cjs');
 const result=engine.calculate({method:engine.METHOD,date:'2000-01-01',hour:12,minute:0,utcOffsetMinutes:0,offsetConfirmed:true,latitude:21.0285,longitude:105.8542,houseSystem:'whole-sign',orb:6});
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {NatalWheel}=component('apps/web/src/features/western/natal-wheel.tsx');
 const markup=renderToStaticMarkup(React.createElement(NatalWheel,{result,selected:'Sun',onSelect:()=>{}}));
 const svg=markup.match(/<svg\b[^>]*data-precision-wheel="natal"[\s\S]*?<\/svg>/)?.[0];assert.ok(svg,'precision measurement SVG remains separate from decoration');
 assert.equal((svg.match(/role="button"/g)||[]).length,10);
 assert.equal((svg.match(/data-degree-tick=/g)||[]).length,360);
 const lines=(svg.match(/<line\b[^>]*>/g)||[]).filter(tag=>tag.includes('data-aspect='));assert.equal(lines.length,result.aspects.length);
 const point=lon=>{const angle=(180+lon-result.ascendant)*Math.PI/180;return [260+132*Math.cos(angle),260-132*Math.sin(angle)];};
 lines.forEach((tag,index)=>{const aspect=result.aspects[index],first=result.planets.find(p=>p.body===aspect.first),second=result.planets.find(p=>p.body===aspect.second);const expected=[...point(first.longitude),...point(second.longitude)];['x1','y1','x2','y2'].forEach((name,i)=>{const actual=Number(tag.match(new RegExp(name+'="([^"]+)"'))?.[1]);assert.ok(Math.abs(actual-expected[i])<1e-7,name+' retains true longitude');});});
 assert.match(wheel,/onKeyDown=/);
});

test('A28: comparison wheel keeps existing browser smoke selectors and both A/B rings',()=>{
 const wheel=read('apps/web/src/features/relationship/relationship-wheel.tsx');
 const page=read('apps/web/src/app/western-astrology/relationship/page.tsx');
 assert.match(wheel,/'Hai vòng Synastry A và B'/);
 assert.match(wheel,/'Biểu đồ Composite trung điểm'/);
 assert.match(wheel,/rows\.filter\(p=>p\.side==='A'\)/);
 assert.match(wheel,/rows\.filter\(p=>p\.side==='B'\)/);
 assert.match(wheel,/layoutCircularLabels/);
 assert.match(page,/styles\.table} \${styles\.matrix}/);
});

test('A28: responsive light/dark CSS, matrix scrolling and accessible focus',()=>{
 const rel=read('apps/web/src/features/relationship/relationship.module.css');
 const natal=read('apps/web/src/app/western-astrology/western.module.css');
 assert.match(rel,/\.matrix table\{width:max-content;min-width:1080px/);
 assert.match(rel,/\.table\{overflow-x:auto;max-width:100%/);
 assert.match(rel,/background:var\(--panel\)/);
 assert.match(rel,/@media\(max-width:600px\)/);
 assert.match(natal,/\.chartLayout\{display:grid;grid-template-columns:minmax\(0,1\.28fr\)/);
 assert.match(natal,/@media\(max-width:1080px\)/);
 assert.match(rel,/\.planetTarget:focus-visible circle/);
});
