'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const read = name => readFileSync(join(root, name), 'utf8');
const source = read('apps/web/src/lib/navigation.ts');
const ts = require('./helpers-typeloader.cjs');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObj = {exports:{}};
vm.runInNewContext(compiled, {exports:moduleObj.exports, module:moduleObj}, {filename:'navigation.cjs'});
const {navigationItems, searchNavigation, normalizeSearchText} = moduleObj.exports;

test('UX: routes are unique and each navigation link maps to a real Next.js page', () => {
  assert.ok(navigationItems.length >= 9);
  assert.ok(navigationItems.some(item => item.href === "/research"));
  assert.equal(new Set(navigationItems.map(x => x.href)).size, navigationItems.length);
  for (const item of navigationItems) {
    assert.ok(item.text && item.caption && item.keywords);
    assert.ok(existsSync(join(root,'apps/web/src/app', item.href === '/' ? 'page.tsx': `${item.href.slice(1)}/page.tsx`)), item.href);
  }
});
test('UX: Vietnamese accent-insensitive search treats Đ, dấu and whitespace consistently', () => {
  assert.equal(normalizeSearchText('Đại Vận'), 'dai van');
  assert.equal(normalizeSearchText('TỬ  VI').replace(/\s+/g,' '), 'tu vi');
  assert.equal(searchNavigation('tử vi')[0].href, '/chart');
  assert.equal(searchNavigation('tu vi')[0].href, '/chart');
  assert.equal(searchNavigation('bát tự')[0].href, '/bazi');
  assert.equal(searchNavigation('xem ngay tot')[0].href, '/good-days');
});
test('UX: multiword and alias searches find the correct tools', () => {
  assert.deepEqual(Array.from(searchNavigation('cuoi hoi'), x=>x.href), ['/good-days']);
  assert.deepEqual(Array.from(searchNavigation('thap than'), x=>x.href), ['/bazi']);
  assert.deepEqual(Array.from(searchNavigation('12 cung'), x=>x.href), ['/chart']);
  assert.deepEqual(Array.from(searchNavigation('luu tru'), x=>x.href), ['/collection']);
  assert.deepEqual(Array.from(searchNavigation('khong-ton-tai'), x=>x.href), []);
  assert.equal(searchNavigation('   ').length, navigationItems.length);
  assert.equal(searchNavigation('mieu vuong')[0].href, '/star-atlas');
});
test('UX: palette supports keyboard search, focus management and navigation', () => {
  const shell=read('apps/web/src/components/shell.tsx');
  for(const required of ['event.key.toLowerCase() === \'k\'','event.key === \'/\'','event.key === \'Escape\'','event.key === \'ArrowDown\'','event.key === \'ArrowUp\'','event.key === \'Enter\'','role="dialog"','aria-modal="true"','role="combobox"','aria-activedescendant','aria-current','aria-expanded={menu}','aria-controls="thiendo-sidebar"','Bỏ qua điều hướng','id="main-content"']) {
    assert.ok(shell.includes(required), required);
  }
  assert.match(shell,/document\.removeEventListener\('keydown'/);
  assert.match(shell,/document\.body\.style\.overflow = previousOverflow/);
});
test('UX: theme and expert view restore after hydration and persist on change', () => {
  const shell=read('apps/web/src/components/shell.tsx');
  assert.ok(shell.includes('const [preferencesReady, setPreferencesReady]'));
  assert.match(shell,/localStorage\.getItem\(STORAGE_THEME\)/);
  const sharedMode = read('apps/web/src/components/view-mode.tsx');
  assert.match(shell,/ViewModeProvider/);
  assert.match(shell,/useViewMode\(\)/);
  assert.match(sharedMode,/localStorage\.getItem\(VIEW_MODE_STORAGE_KEY\)/);
  assert.match(shell,/if \(!preferencesReady\) return;/);
  assert.match(shell,/localStorage\.setItem\(STORAGE_THEME/);
  assert.match(sharedMode,/localStorage\.setItem\(VIEW_MODE_STORAGE_KEY/);
  assert.match(sharedMode,/if \(!restored\) return;/);
  assert.match(shell,/aria-pressed=\{expert\}/);
});
test('UX: homepage links all key working tool areas, including good-days', () => {
  const home=read('apps/web/src/app/page.tsx');
  const directory=read('apps/web/src/components/tool-directory.tsx');
  const subjects=read('apps/web/src/lib/discipline-presentation.ts');
  assert.match(home,/<ToolDirectory\s*\/>/);
  assert.match(directory,/disciplinePresentations\.filter/);
  assert.match(subjects,/Lịch vạn niên/);
  assert.match(subjects,/Xem ngày tốt/);
  assert.match(home,/href="\/academy"/);
  assert.match(subjects,/path: '\/chart'/);
});
test('UX: mobile navigation and palette have light theme, small-screen and reduced-motion support', () => {
  const css=read('apps/web/src/app/ux-refinement.css');
  const responsive=read('apps/web/src/app/responsive.css');
  assert.match(css,/\.site\.light \.bottom-nav/);
  assert.match(css,/\.site\.light \.hero/);
  assert.match(css,/max-width: 370px/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/\.sidebar \{ visibility: hidden;/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(responsive,/\.site\[data-mode="basic"\]/);
});
