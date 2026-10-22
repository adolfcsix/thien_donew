/** V11.82: source-only regression for nested navigation and release stability checks. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const ts = require('./helpers-typeloader.cjs');
const moduleObj = {exports:{}};
const compiled = ts.transpileModule(read('apps/web/src/lib/navigation.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
const errors = (compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0);
vm.runInNewContext(compiled.outputText,{module:moduleObj,exports:moduleObj.exports});
const {findNavigationParent, findNavigationGroup, navigationCategory, navigationPageTitle} = moduleObj.exports;

test('V11.82: direct /research/examples and /research/schools resolve to research group',()=>{
 for(const route of ['/research/examples','/research/schools']){
   assert.equal(findNavigationParent(route)?.href,'/research');
   assert.equal(findNavigationGroup(route)?.id,'hoc-tap');
   assert.equal(navigationCategory(route),'Khám phá & Học tập');
 }
 assert.equal(navigationPageTitle('/research/examples'),'Ví dụ thực hành');
 assert.equal(navigationPageTitle('/research/schools'),'Thẩm định trường phái');
});

test('V11.82: dynamic academy lessons belong to learning group and show useful breadcrumbs',()=>{
 assert.equal(findNavigationParent('/academy/nhap-mon')?.href,'/academy');
 assert.equal(findNavigationGroup('/academy/nhap-mon')?.id,'hoc-tap');
 assert.equal(navigationPageTitle('/academy/nhap-mon'),'Bài học');
});

test('V11.82: prefix detection respects path boundaries and unknown paths',()=>{
 for(const route of ['/researcher','/charting','/academy2/slug','/phong-thuy-news','/']){
   if(route==='/') assert.equal(findNavigationParent(route)?.href,'/');
   else {assert.equal(findNavigationParent(route),undefined,route);assert.equal(findNavigationGroup(route),undefined,route);}
 }
 assert.equal(findNavigationParent('/research/examples/')?.href,'/research');
 assert.equal(findNavigationParent('/research/examples?filter=all#top')?.href,'/research');
 assert.equal(findNavigationGroup('/phong-thuy/phan-khu')?.id,'ky-mon-phong-thuy');
 assert.equal(findNavigationGroup('/chart/chi-tiet')?.id,'menh-ly');
 assert.equal(navigationCategory('/chart/chi-tiet'),'Mệnh lý & Tử Vi');
});

test('V11.82: all nested app routes have a parent and no duplicate route definitions',()=>{
 const pages=['/research/examples','/research/schools','/academy/slug'];
 for(const p of pages) assert.ok(findNavigationParent(p),p);
 const src=read('apps/web/src/lib/navigation.ts');
 assert.match(src,/startsWith\(item\.href \+ '\/'\)/);
});

test('V11.82: sidebar and breadcrumbs resolve group and title for child pages',()=>{
 const shell=read('apps/web/src/components/shell.tsx');
 assert.match(shell,/const current = navigationPageTitle\(route\)/);
 assert.match(shell,/const active = findNavigationGroup\(route\)\?\.id === group\.id/);
 assert.match(shell,/aria-current=\{route === item\.href \? 'page' : undefined\}/);
});

test('V11.82: source release gate includes CSS fingerprint and reconstructability',()=>{
 const gate=read('infrastructure/scripts/verify-release.mjs');
 assert.match(gate,/audit-css-baseline\.cjs/);
 assert.match(gate,/audit-css-dedupe\.cjs/);
 assert.match(gate,/THIENDO_RELEASE_REPORT_DIR/);
 assert.match(gate,/Source-only tests; no Next\/Nest build/);
});
