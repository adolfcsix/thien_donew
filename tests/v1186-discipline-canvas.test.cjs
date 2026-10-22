'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const text=f=>fs.readFileSync(path.join(root,f),'utf8');
const M=require('../apps/web/src/features/discipline-canvas/discipline-canvas.model.cjs');
const {castByNumbers}=require('../apps/web/src/features/mai-hoa/casting.cjs');
const {makeLineLedger}=require('../apps/web/src/features/luc-hao/reading.cjs');
const {PALACES}=require('../apps/web/src/features/ky-mon/luoshu.cjs');
const {SECTORS,orientation}=require('../apps/web/src/features/feng-shui/compass.cjs');

test('Mai Hoa: all 64 pairs render six lines in correct top-to-bottom order',()=>{
 for(let a=1;a<=8;a++)for(let b=1;b<=8;b++){
  const cast=castByNumbers({first:a,second:b});
  for(const hex of [cast.original,cast.nuclear,cast.transformed]){
   const rows=M.hexRows(hex.bits);assert.equal(rows.length,6);
   assert.deepEqual(rows.map(r=>r.bit).join(''),[...hex.bits].reverse().join(''));
   assert.deepEqual(rows.map(r=>r.position),[6,5,4,3,2,1]);
  }
  const main=M.hexRows(cast.original.bits,cast.changingLine);
  assert.deepEqual(main.filter(r=>r.moving).map(r=>r.position),[cast.changingLine]);
 }
});
test('Six-line diagram rejects invalid bits and out-of-range changing lines',()=>{
 for(const bits of ['10001','11001x',null,'1111111'])assert.throws(()=>M.hexRows(bits));
 for(const line of [-1,0,7,1.1,'1'])assert.throws(()=>M.hexRows('101010',line));
 assert.equal(M.hexRows('101010').filter(r=>r.moving).length,0);
});
test('Lục Hào: overlay matches true engine mutation for all moving values',()=>{
 const reading=makeLineLedger([6,9,7,8,6,9]);
 const before=M.hexRows(reading.original.bits);const after=M.hexRows(reading.transformed.bits);
 for(const position of [1,2,3,4,5,6]){
  const b=before.find(r=>r.position===position);const a=after.find(r=>r.position===position);
  assert.equal(a.bit!==b.bit,reading.changing.includes(position));
 }
});
test('Lục Hào: zero-moving produces unchanged diagrams',()=>{
 const reading=makeLineLedger([7,8,7,8,7,8]);
 assert.deepEqual(M.hexRows(reading.original.bits),M.hexRows(reading.transformed.bits));
});
test('Lạc Thư nine cells use original palaces and canonical direction order',()=>{
 const cells=M.palaceCells(PALACES);
 assert.deepEqual(cells.map(c=>c.number),[4,9,2,3,5,7,8,1,6]);
 assert.equal(cells[4].direction,'Trung cung');
 assert.deepEqual(cells.map(x=>x.symbol),PALACES.map(x=>x.symbol));
});
test('Lạc Thư rejects missing, duplicate or out-of-domain palaces',()=>{
 assert.throws(()=>M.palaceCells(PALACES.slice(0,8)));
 assert.throws(()=>M.palaceCells([...PALACES.slice(0,8),PALACES[0]]));
 assert.throws(()=>M.palaceCells([...PALACES.slice(0,8),{...PALACES[8],number:10}]));
});
test('Phong thủy: eight groups contain every mountain exactly once',()=>{
 const groups=M.directionGroups(SECTORS);
 assert.equal(groups.length,8);
 assert.deepEqual(groups.map(g=>g.direction),M.DIRECTIONS);
 assert.ok(groups.every(g=>g.sectors.length===3));
 assert.deepEqual(groups.flatMap(g=>g.sectors.map(s=>s.name)).sort(),SECTORS.map(s=>s.name).sort());
});
test('Phong thủy: choosing every mountain center resolves to that mountain and safe boundary',()=>{
 for(const s of SECTORS){const reading=orientation(s.center);assert.equal(reading.facing.name,s.name);assert.equal(reading.boundaryDistance,7.5);}
});
test('Phong thủy: malformed direction groups fail closed instead of hiding data',()=>{
 assert.throws(()=>M.directionGroups(SECTORS.slice(1)));
 assert.throws(()=>M.directionGroups([...SECTORS.slice(0,23),SECTORS[0]]));
});
test('Five individual routes import specialized visualizations inside the existing tools',()=>{
 const integration={
  'chart/page.tsx':'TuViCanvas',
  'mai-hoa/page.tsx':'MaiHoaCanvas',
  'luc-hao/page.tsx':'LucHaoCanvas',
  'ky-mon/page.tsx':'KyMonCanvas',
  'phong-thuy/page.tsx':'PhongThuyCanvas',
 };
 for(const [file,component] of Object.entries(integration)){
  const source=text('apps/web/src/app/'+file);
  assert.match(source,new RegExp(`import\\s+\\{${component}\\}\\s+from\\s+['\"]@/features/discipline-canvas/discipline-canvas`));
  assert.match(source,new RegExp(`<${component}\\s`));
 }
});
test('The interactive Kỳ Môn map controls the existing selected palace state',()=>{
 const source=text('apps/web/src/app/ky-mon/page.tsx');
 assert.match(source,/KyMonCanvas palaces=\{PALACES\} selected=\{selected\} onSelect=\{setSelected\}/);
 assert.match(source,/onClick=\{\(\)=>setSelected\(p\.number\)\}/);
});
test('The Feng Shui 24-mountain map changes existing measurement input only',()=>{
 const source=text('apps/web/src/app/phong-thuy/page.tsx');
 assert.match(source,/PhongThuyCanvas sectors=\{SECTORS\} reading=\{result\} onChoose=\{angle=>setValue\(String\(angle\)\)\}/);
 assert.match(source,/orientation\(degrees\)/);
});
test('Accessible visualization uses button pressed state and accurate labels',()=>{
 const source=text('apps/web/src/features/discipline-canvas/discipline-canvas.tsx');
 for(const token of ['role="img"','aria-label','aria-pressed={selected===number}','aria-pressed={reading?.facing.name===s.name}','type="button"'])assert.ok(source.includes(token),token);
 assert.match(source,/không phải vị trí an cung/);
 assert.doesNotMatch(source,/dangerouslySetInnerHTML|Math\.random\(|localStorage|fetch\(/);
});
test('New CSS is isolated and respects keyboard and responsive use',()=>{
 const css=text('apps/web/src/features/discipline-canvas/discipline-canvas.module.css');
 assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:580px\)/);assert.match(css, /prefers-reduced-motion/);
 assert.doesNotMatch(css, /(^|\n)\s*(body|html|:root|\*)\s*\{/);
});
test('Presentation model results are immutable and do not mutate imported data',()=>{
 const before=JSON.stringify(PALACES)+JSON.stringify(SECTORS);
 assert.ok(Object.isFrozen(M.hexRows('101010')));
 assert.ok(M.hexRows('101010').every(Object.isFrozen));
 assert.ok(Object.isFrozen(M.palaceCells(PALACES)));
 assert.ok(Object.isFrozen(M.directionGroups(SECTORS)));
 assert.equal(JSON.stringify(PALACES)+JSON.stringify(SECTORS),before);
});
