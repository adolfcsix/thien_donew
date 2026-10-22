'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root = join(__dirname, '..');
const scene = readFileSync(join(root, 'apps/web/src/features/chart/components/chart-scene.tsx'), 'utf8');
const material = readFileSync(join(root, 'apps/web/src/features/chart/styles/chart-jade-material.css'), 'utf8');
const layout = readFileSync(join(root, 'apps/web/src/app/layout.tsx'), 'utf8');
const board = readFileSync(join(root, 'apps/web/src/features/chart/components/chart-board.tsx'), 'utf8');

test('material is imported after base chart and western styles, so skin tokens win', () => {
  assert.ok(layout.includes("import '../features/chart/styles/chart-jade-material.css';"));
  assert.ok(layout.indexOf("import '../features/chart/styles/chart-jade-material.css'") > layout.indexOf("import './western-worlds.css'"));
});
test('decorative depth is a real accessible toggle with persistent preference', () => {
  assert.match(scene, /data-depth=\{enabled \? 'on' : 'off'\}/);
  assert.match(scene, /aria-pressed=\{enabled\}/);
  assert.match(scene, /onClick=\{toggleDepth\}/);
  assert.match(scene, /localStorage\.setItem\('thiendo\.chart\.depth\.v1'/);
  assert.match(scene, /localStorage\.getItem\('thiendo\.chart\.depth\.v1'/);
});
test('decorative layer does not intercept palace interactions and is hidden from accessibility tree', () => {
  assert.match(scene, /className="chart-scene-engraving" aria-hidden="true"/);
  assert.match(material, /\.chart-scene-engraving\{[\s\S]*?pointer-events:none/);
  assert.match(material, /\.atlas-center\.board-center::before\{[\s\S]*?pointer-events:none/);
});
test('effect must stop on hidden document, system reduced motion and performance fallback', () => {
  assert.match(scene, /!document\.hidden/);
  assert.match(scene, /!reduced\.matches/);
  assert.match(scene, /dataSet|dataset\.thiendoEffects/);
  assert.match(material, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(material, /html\[data-thiendo-effects="reduced"\]/);
  assert.match(material, /\.chart-scene\[data-motion="active"\]/);
});
test('all orbit animations require both active motion and user-enabled depth', () => {
  assert.match(material, /\.chart-scene\[data-depth="on"\]\[data-motion="active"\] \.chart-scene-orbit-outer/);
  assert.match(material, /\.chart-scene\[data-depth="on"\]\[data-motion="active"\] \.chart-scene-orbit-inner/);
  assert.match(material, /\.chart-scene\[data-depth="off"\] \.chart-scene-engraving/);
});
test('jade appearance uses layered radial and fine etched veins, not plain flat green', () => {
  assert.match(material, /\[data-board-skin="jade"\] \.atlas-house\.house\{\s*background:\s*radial-gradient\(/);
  assert.match(material, /repeating-linear-gradient\(128deg/);
  assert.match(material, /\[data-board-skin="jade"\] \.atlas-center\.board-center::before/);
});
test('jade center engraved motif sits behind content', () => {
  assert.match(material, /\.atlas-center\.board-center::before\{[\s\S]*?z-index:0/);
  assert.match(material, /\.atlas-center\.board-center>\*\{[\s\S]*?z-index:1/);
});
test('chart domain remains unchanged: 12 palaces, same board computations and display modes', () => {
  assert.match(board, /result\.houses\.map\(house => <PalaceTile/);
  assert.match(board, /Engine\.annualOverview\(result,year\)/);
  assert.match(board, /'heritage' \| 'jade'/);
  assert.doesNotMatch(scene, /calculateLocal|annualOverview|astrology-engine/);
});
test('print/compact media disables animation or expensive ambient light', () => {
  assert.match(material, /@media print\{/);
  assert.match(material, /@media \(max-width:760px\)/);
  assert.match(material, /\.chart-scene::after\{display:none\}/);
});
