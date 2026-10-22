'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('apps/web/src/components/shell.tsx');
const bazi=read('apps/web/src/app/bazi/page.tsx');
const nav=read('apps/web/src/components/navigation-tree.module.css');
const css=read('apps/web/src/app/global-visual-harmony-v11164182.css');
const chart=read('apps/web/src/app/chart-fit.css');
const mark=read('apps/web/src/components/navigation-symbol.tsx');

test('Bát Tự public heading has no historical release label',()=>{
  const heading=bazi.match(/<header className="page-heading">[\s\S]*?<\/header>/)?.[0];
  assert.ok(heading,'missing heading');
  assert.doesNotMatch(heading,/V11\.142|V11\.134|V11\.\d+/);
  assert.match(heading,/THIÊN ĐỒ · BÁT TỰ – TỨ TRỤ/);
});
test('desktop rail owns sole menu collapse state and persists across routes',()=>{
  assert.match(shell,/const STORAGE_RAIL = 'thiendo-navigation-compact'/);
  assert.match(shell,/localStorage\.getItem\(STORAGE_RAIL\)/);
  assert.match(shell,/localStorage\.setItem\(STORAGE_RAIL/);
  assert.match(shell,/function toggleCompact\(\)/);
  assert.match(shell,/data-navigation=\{compact \? 'compact' : 'full'\}/);
  assert.doesNotMatch(shell,/STORAGE_CHART_NAV|chartNavCollapsed|toggleChartNavigation|chart-navigation-toggle|data-chart-sidebar/);
  // Chart-fit is a frozen CSS baseline: its unused selectors remain for
  // historical reconstruction, but no live Shell markup sets those attributes.
  assert.match(chart,/chart-navigation-toggle/);
});
test('mobile navigation and accessible drawer remain intact',()=>{
  assert.match(shell,/className="icon-button mobile-menu"/);
  assert.match(shell,/setMenu\(!menu\)/);
  assert.match(shell,/aria-modal=\{narrow && menu \? true : undefined\}/);
  assert.match(shell,/className="drawer-close"/);
  assert.match(shell,/inert=\{searchOpen \|\| \(narrow && !menu\)\}/);
  assert.match(shell,/aria-controls="thiendo-sidebar"/);
});
test('compact icon boxes are square, centered and do not rotate on hover',()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1fr\);place-items:center/);
  assert.match(css,/width:26px;height:26px;min-width:26px;min-height:26px/);
  assert.match(css,/width:21px;height:21px/);
  // Test the live declarations rather than wording of an obsolete comment.
  const compactStart=css.indexOf('.site[data-navigation="compact"] > #thiendo-sidebar');
  assert.ok(compactStart>=0,'missing compact rail selector');
  const compactCss=css.slice(compactStart);
  for(const state of ['hover','focus-visible','active']) {
    const rule=compactCss.match(new RegExp(':is\\(\\.nav-item,\\[class\\*="groupToggle"\\]\\):'+state+'\\s*\\{([^}]+)\\}'));
    assert.ok(rule, 'missing compact '+state+' rule');
    assert.match(rule[1],/transform:\s*none\s*;/);
  }
  assert.match(css,/transform:none;\s*\}/);
  assert.match(nav,/\.groupSymbol \{width:24px;height:24px/);
  assert.match(mark,/return <TianMonMark size=\{size\} compact/);
});
test('focus styles and reduced-motion behavior remain available',()=>{
  const brand=read('apps/web/src/app/thien-mon-brand-v11164183.css');
  assert.match(brand,/:focus-visible/);
  assert.match(brand,/prefers-reduced-motion:reduce/);
  assert.match(shell,/onFocusCapture=\{event=>showRailTooltip/);
  assert.match(shell,/aria-expanded=\{!compact\}/);
});
test('profile changes from previous checkpoint preserved',()=>{
  assert.match(shell,/function ShellAvatar/);
  assert.match(shell,/setFailed\(true\)/);
  const account=read('apps/web/src/components/account-settings.tsx');
  assert.match(account,/avatarRevision/);
});

test('Western visual worlds all derive brightness from the single site preference',()=>{
  const worldCss=read('apps/web/src/app/western-worlds.css');
  assert.match(shell,/const resolvedLight = light;/);
  assert.match(shell,/function toggleTheme\(\) \{ setLight\(value => !value\); \}/);
  assert.match(shell,/localStorage\.setItem\(STORAGE_THEME, light \? 'light' : 'dark'\)/);
  assert.doesNotMatch(shell,/worldThemes|setWorldThemes|westernThemeKey/);
  for(const id of ['astrology','tarot','numerology','symbols','research']){
    assert.ok(worldCss.includes(`.site[data-western-world="${id}"].light`),id+' light palette');
    assert.ok(worldCss.includes(`/theme/western/${id}-dark.webp`),id+' dark artwork');
    assert.ok(worldCss.includes(`/theme/western/${id}-light.webp`),id+' light artwork');
  }
});

test('decorative public page headers do not expose historical build numbers',()=>{
  const pairs=[
    ['bazi/page.tsx','V11.142'],
    ['good-days/page.tsx','TRẠCH NHẬT CHUYÊN BIỆT · V11.134'],
    ['mai-hoa/page.tsx','THIÊN ĐỒ / MAI HOA V11.129'],
    ['ha-lac/page.tsx','V11.145 / HÀ LẠC'],
    ['thiet-ban/page.tsx','V11.146 / THIẾT BẢN'],
    ['luc-hao/page.tsx','THIÊN ĐỒ / LỤC HÀO V11.130'],
    ['western-symbols/page.tsx','WESTERN SYMBOLIC ATLAS · V11.137'],
    ['admin/tinh-canh/page.tsx','ADMIN · V11.160'],
    ['admin/finance/page.tsx','ADMIN FINANCE · V11.161'],
    ['study/compare/page.tsx','SO SÁNH / V11.138']
  ];
  for(const [rel,label] of pairs)assert.ok(!read('apps/web/src/app/'+rel).includes(label),rel+' still has '+label);
});
