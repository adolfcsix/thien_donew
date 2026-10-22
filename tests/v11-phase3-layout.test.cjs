'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=p=>readFileSync(join(__dirname,'..',p),'utf8');

test('A26: desktop chart uses the same collapsible rail as every other route',()=>{
  const shell=read('apps/web/src/components/shell.tsx');
  const css=read('apps/web/src/app/chart-fit.css');
  const foundation=read('apps/web/src/app/global-visual-harmony-v11164182.css');
  assert.match(shell,/data-navigation=\{compact \? 'compact' : 'full'\}/);
  assert.match(shell,/function toggleCompact\(\)/);
  assert.match(shell,/aria-controls="thiendo-sidebar"/);
  assert.doesNotMatch(shell,/chartNavCollapsed|STORAGE_CHART_NAV|chart-navigation-toggle|data-chart-sidebar/);
  // Frozen legacy CSS can retain unused selectors until the final baseline audit.
  assert.match(css,/chart-navigation-toggle/);
  assert.match(foundation, /\.site\[data-navigation="compact"\] \.app-area/);
});

test('V11 phase 3: fluid chart overrides all fixed minimum sizes without hiding star data on desktop',()=>{
  const css=read('apps/web/src/app/chart-fit.css');
  assert.match(css,/\.chart-room-layout\[data-board-skin\] \.atlas-grid\{[\s\S]*?min-width:0;/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/overflow-x:clip/);
  assert.match(css,/\.chart-room-layout\[data-dock-open="true"\]\{grid-template-columns:minmax\(0,1fr\)\}/);
  const board=read('apps/web/src/features/chart/components/chart-board.tsx');
  const interactive=read('apps/web/src/features/chart/styles/chart-experience.css');
  assert.match(interactive,/overflow-x:auto/);
  assert.match(interactive,/min-width:880px/);
  assert.match(board,/chart-compact-reading-note/);
  // Auxiliary stars now render in the extracted list view; keep checking visibility.
  const list=read('apps/web/src/features/chart/components/chart-palace-list.tsx');
  assert.match(board,/<ChartPalaceList matching=\{matching\}/);
  assert.match(list,/house\.auxiliaryStars/);
});

test('V11 phase 3: CSS precedence preserves the heritage theme while allowing the new fitting layer',()=>{
  const layout=read('apps/web/src/app/layout.tsx');
  const sheets = [...layout.matchAll(/import ['"]\.\/([^'"]+\.css)['"]/g)].map(match=>match[1]);
  assert.ok(sheets.indexOf("chart-fit.css") > sheets.indexOf("chart-heritage.css"));
  assert.match(read('apps/web/src/app/global-visual-harmony-v11164182.css'), /prefers-reduced-motion:reduce/);
});
