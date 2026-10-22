'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');

test('V11.102: a single global search trigger in topbar, no duplicate sidebar entry',()=>{
  const shell=read('apps/web/src/components/shell.tsx');
  assert.equal((shell.match(/className="quick-search-trigger"/g)||[]).length,1);
  assert.doesNotMatch(shell,/sidebar-search-tools|navStyles\.search/);
  assert.match(shell,/ref=\{searchTrigger\}/);
  assert.match(shell,/setSearchOpen\(true\)/);
  assert.match(shell,/\(event\.ctrlKey \|\| event\.metaKey\)/);
  assert.doesNotMatch(shell,/<kbd>Ctrl K<\/kbd>/);
});

test('V11.102: mobile menu retains keyboard focus and closes reliably',()=>{
  const shell=read('apps/web/src/components/shell.tsx');
  assert.match(shell,/thiendo-sidebar nav a\[href\]/);
  assert.match(shell,/if \(!menu \|\| event\.key !== 'Tab'\)/);
  assert.match(shell,/getClientRects\(\)\.length > 0/);
  assert.match(shell,/menuTrigger\.current\?\.focus\(\)/);
  assert.match(shell,/aria-controls="thiendo-sidebar"/);
});

test('V11.102: navigation search and quick tools share one data source',()=>{
  const hub=read('apps/web/src/app/huyen-hoc/page.tsx');
  assert.match(hub,/navigationItems\.filter/);
  assert.match(hub,/navigationCategory\(item\.href\)/);
  assert.doesNotMatch(hub,/\{href:'\/chart',name:/);
});

test('V11.102: avoid repeated training notes while keeping essential caveats',()=>{
  const shell=read('apps/web/src/components/shell.tsx');
  assert.doesNotMatch(shell,/sidebar-lower|Minh triết xưa/);
  const research=read('apps/web/src/app/research/page.tsx');
  assert.match(research,/những sao chưa có quy tắc xác minh sẽ không an tự động lên lá số/);
  assert.doesNotMatch(research,/research-footnote/);
  const hub=read('apps/web/src/app/huyen-hoc/page.tsx');
  assert.match(hub,/không thay thế tư vấn y tế/);
});

test('V11.102: no empty/unused sidebar search CSS',()=>{
  const css=read('apps/web/src/components/navigation-tree.module.css');
  assert.doesNotMatch(css,/\.searchIcon|\.search kbd|\.search \{/);
  assert.match(css,/\.groupToggle/);
});
