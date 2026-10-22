/** V11.83: exploration centre taxonomy, route safety and UI resilience. */
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('./helpers-typeloader.cjs');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const data = JSON.parse(read('packages/knowledge/src/research-disciplines.json'));
function loadTS(file, inject={}) {
 const compiled=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,file);
 const obj={exports:{}};
 vm.runInNewContext(compiled.outputText,{module:obj,exports:obj.exports,require:specifier=>{
  if(Object.hasOwn(inject,specifier))return inject[specifier];
  throw Error('Unexpected import: '+specifier);
 }});
 return obj.exports;
}
const nav=loadTS('apps/web/src/lib/navigation.ts');
const catalog=loadTS('apps/web/src/features/explore/catalog.ts',{'@/lib/navigation':nav});
const plain=x=>JSON.parse(JSON.stringify(x));

test('V11.83: all current disciplines have exactly one taxonomy record and valid first-party routes',()=>{
 assert.equal(data.records.length,15);
 assert.deepEqual(plain(catalog.validateExploreCatalogue(data.records)),[]);
 const pages=path.join(root,'apps/web/src/app');
 for(const d of data.records){
  const meta=catalog.exploreMeta[d.id];
  assert.ok(meta && meta.family && meta.symbol && meta.startingPoint,d.id);
  if(d.route)assert.ok(fs.existsSync(path.join(pages,d.route.slice(1),'page.tsx')),d.route);
 }
});
test('V11.83: filters compose; case/diacritics-safe search; zero results are explicit',()=>{
 const {filterDisciplines:f}=catalog;
 assert.equal(f(data.records,{}).length,15);
 assert.equal(f(data.records,{availability:'tools'}).length,15);
 assert.equal(f(data.records,{availability:'study'}).length,0);
 assert.deepEqual(plain(f(data.records,{family:'tay-phuong'}).map(r=>r.id)),['numerology','astrology-western','tarot']);
 assert.deepEqual(plain(f(data.records,{search:'LUC HAO'}).map(r=>r.id)),['luc-hao']);
 assert.deepEqual(plain(f(data.records,{search:'24 sơn'}).map(r=>r.id)),['phong-thuy']);
 assert.deepEqual(plain(f(data.records,{family:'ky-mon',availability:'study'}).map(r=>r.id)),[]);
 assert.equal(f(data.records,{search:'khong-co-bo-mon-12345'}).length,0);
});
test('V11.83: reject missing, orphan and duplicate metadata rather than hiding broken records',()=>{
 const missing=data.records.filter(item=>item.id!=='ha-lac');
 assert.ok(catalog.validateExploreCatalogue(missing).some(x=>x.includes('Orphan')));
 const unknown=[...data.records,{...data.records[0],id:'new-field'}];
 assert.ok(catalog.validateExploreCatalogue(unknown).some(x=>x.includes('Missing presentation')));
 const duplicate=[...data.records,data.records[0]];
 assert.ok(catalog.validateExploreCatalogue(duplicate).some(x=>x.includes('Duplicate ID')));
});
test('V11.83: each guided learning path leads to live routes; no fake calculator on study-only discipline',()=>{
 assert.equal(catalog.learningJourneys.length,3);
 const hrefs=new Set();
 for(const track of catalog.learningJourneys){
  assert.equal(track.steps.length,3);
  for(const step of track.steps){
   assert.match(step.href,/^\/[a-z/-]+$/);
   hrefs.add(step.href);
   assert.ok(fs.existsSync(path.join(root,'apps/web/src/app',step.href.slice(1),'page.tsx')),step.href);
  }
 }
 assert.ok(hrefs.has('/research/schools'));
 assert.ok(hrefs.has('/mai-hoa'));
 assert.equal(data.records.find(x=>x.id==='thai-at').route,'/thai-at');
 assert.equal(data.records.find(x=>x.id==='ha-lac').route,'/ha-lac');
 assert.equal(data.records.find(x=>x.id==='thiet-ban').route,'/thiet-ban');
 assert.equal(data.records.find(x=>x.id==='astrology-western').route,'/western-astrology');
});
test('V11.83: UI exposes accessible filters, learning goals, no-result reset and a responsive isolated stylesheet',()=>{
 const page=read('apps/web/src/app/huyen-hoc/page.tsx');
 const css=read('apps/web/src/app/huyen-hoc/huyen-hoc.module.css');
 const navFile=read('apps/web/src/lib/navigation.ts');
 assert.match(page,/disciplines\.records/);
 assert.match(page,/item\.route/);
 assert.match(page,/filterDisciplines\(/);
 assert.match(page,/aria-pressed=\{journey === item\.id\}/);
 assert.match(page,/role="status"/);
 assert.match(page,/aria-expanded=\{showAllTools\}/);
 assert.match(page,/onClick=\{resetFilters\}/);
 assert.match(page,/htmlFor="explore-search"/);
 for(const route of ['/mai-hoa','/luc-hao','/ky-mon','/phong-thuy','/ngu-hanh'])assert.ok(page.includes(`'${route}':`),route);
 assert.match(page,/navigationItems\.filter/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(navFile,/text: 'Trung tâm Khám phá'/);
});
test('V11.83: outdated Ky Mon and Feng Shui research descriptions are aligned with current deployed code',()=>{
 const ky=data.records.find(x=>x.id==='ky-mon');
 const phong=data.records.find(x=>x.id==='phong-thuy');
 assert.match(ky.boundary,/Chuyển Bàn/);
 assert.match(phong.boundary,/Bát Trạch/);
 assert.match(phong.boundary,/Hạ quái/);
 assert.match(read('apps/web/src/app/ky-mon/page.tsx'),/buildRotatingHourPlate/);
 assert.match(read('apps/web/src/app/phong-thuy/page.tsx'),/FengShuiStudy/);
});
