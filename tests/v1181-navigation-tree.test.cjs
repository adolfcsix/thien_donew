'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const ts = require('./helpers-typeloader.cjs');
const src = read('apps/web/src/lib/navigation.ts');
const compiled = ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
const moduleObj = {exports:{}};
vm.runInNewContext(compiled.outputText,{module:moduleObj,exports:moduleObj.exports});
const {navigationItems,navigationShortcuts,navigationGroups,findNavigationGroup,navigationCategory,searchNavigation} = moduleObj.exports;

test('V11.81: every former route belongs to one and only one visible menu branch',()=>{
  const routes = [...navigationShortcuts,...navigationGroups.flatMap(g=>g.items)];
  assert.equal(routes.length,navigationItems.length);
  assert.equal(new Set(routes.map(x=>x.href)).size,navigationItems.length);
  assert.deepEqual(Array.from(routes,x=>x.href).sort(),Array.from(navigationItems,x=>x.href).sort());
  assert.deepEqual(Array.from(navigationShortcuts,x=>x.href),['/','/huyen-hoc','/huyen-giai','/study','/birth-profiles','/collection']);
  assert.equal(navigationGroups.length,7);
  for(const href of ['/huong-dan','/phap-ly','/ho-tro'])assert.equal(findNavigationGroup(href)?.id,'huong-dan-ho-tro');
  for(const route of routes){
    assert.ok(fs.existsSync(path.join(root,'apps/web/src/app',route.href==='/'?'page.tsx':`${route.href.slice(1)}/page.tsx`)),route.href);
  }
});

test('V11.81: sections have stable, unique IDs and useful captions',()=>{
  assert.equal(new Set(Array.from(navigationGroups,x=>x.id)).size,navigationGroups.length);
  for (const g of navigationGroups){
    assert.match(g.id,/^[a-z-]+$/);
    assert.ok(g.label && g.symbol && g.description);
    assert.ok(g.items.length>=2);
    for(const item of g.items){
      assert.equal(findNavigationGroup(item.href)?.id,g.id);
      assert.equal(navigationCategory(item.href),g.label);
    }
  }
  assert.equal(findNavigationGroup('/chart')?.id,'menh-ly');
  assert.equal(navigationCategory('/chart'),'Mệnh lý & Tử Vi');
});

test('V11.81: fuzzy search can find group names and preserves legacy aliases',()=>{
  for (const href of ['/iching','/mai-hoa','/luc-hao','/ngu-hanh']) assert.ok(searchNavigation('dich hoc').some(i=>i.href===href),href);
  for (const href of ['/ky-mon','/phong-thuy']) assert.ok(searchNavigation('phong thuy').some(i=>i.href===href),href);
  assert.equal(searchNavigation('bát tự')[0].href,'/bazi');
  assert.equal(searchNavigation('tu vi')[0].href,'/chart');
  assert.equal(searchNavigation('12 cung')[0].href,'/chart');
  assert.equal(searchNavigation('mai hoa')[0].href,'/mai-hoa');
});

test('V11.81: React shell implements accessible, keyboard navigable accordion groups',()=>{
  const shell=read('apps/web/src/components/shell.tsx');
  assert.match(shell,/navigationGroups\.filter\(group=>group\.id!==\'huong-dan-ho-tro\'\)\.map\(group =>/);
  assert.match(shell,/aria-expanded=\{expanded\}/);
  assert.match(shell,/aria-controls=\{`nav-group-\$\{group\.id\}`\}/);
  assert.match(shell,/hidden=\{!expanded\}/);
  assert.match(shell,/toggleNavigationGroup\(group\.id\)/);
  assert.match(shell,/aria-current=\{route === item\.href \? 'page' : undefined\}/);
  assert.match(shell,/navigationShortcuts\.map\(item =>/);
  assert.match(shell,/navigationCategory\(item\.href\)/);
  assert.doesNotMatch(shell,/id="sidebar-search-tools"/);
  assert.match(shell,/ref=\{searchTrigger\}/);
  assert.match(shell,/aria-label="Tìm nhanh trang và công cụ"/);
  assert.match(shell,/querySelectorAll<HTMLElement>\('a\[href\], button:not\(\[disabled\]\)'\)/);
  assert.match(shell,/getClientRects\(\)\.length > 0/);
  assert.match(shell,/findNavigationGroup\(route\)\?\.id/);
  assert.match(shell,/localStorage\.setItem\(STORAGE_NAV_GROUPS/);
});

test('V11.81: isolated responsive stylesheet does not alter original baseline files',()=>{
  const css=read('apps/web/src/components/navigation-tree.module.css');
  const layout=read('apps/web/src/app/layout.tsx');
  const shell=read('apps/web/src/components/shell.tsx');
  assert.match(shell,/import navStyles from '\.\/navigation-tree\.module\.css'/);
  assert.doesNotMatch(layout,/navigation-tree\.module\.css/);
  assert.match(css,/\.groupToggle\[aria-expanded='true'\]/);
  assert.match(css,/\.groupItems\[hidden\]/);
  assert.match(css,/@media\(max-width:970px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('V11.81: new navigation code passes TypeScript syntax diagnostics',()=>{
  const files=['apps/web/src/lib/navigation.ts','apps/web/src/components/shell.tsx'];
  for(const file of files){
    const output=ts.transpileModule(read(file),{
      fileName:file,
      reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.Preserve, module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
    });
    const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
    assert.equal(errors.length,0,`${file}: ${errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | ')}`);
  }
});
