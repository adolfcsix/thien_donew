const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'apps/web/src/features/chart/components/traceable-findings-panel.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'apps/web/src/app/traceable-findings.css'), 'utf8');
test('research workbench: scoped search spans interpretation and evidence', () => {
  assert.match(panel, /finding\.evidence\.flatMap/);
  assert.match(panel, /searchKey\(findingSearchText\(f\)\)/);
  assert.match(panel, /\.normalize\('NFD'\)/);
  assert.match(panel, /f\.category === category/);
  assert.match(panel, /filter === 'annual'/);
});
test('research workbench: copy provides readable evidence without exposing internal paths', () => {
  assert.match(panel, /Các ghi nhận là dữ liệu tham khảo/);
  assert.match(panel, /Các vị trí liên quan/);
  assert.doesNotMatch(panel, /<code>\{source\.path\}<\/code>/);
  assert.match(panel, /navigator\.clipboard\.writeText/);
  assert.match(panel, /catch \{/);
});
test('research workbench: accessible count and responsive filters', () => {
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /aria-pressed=\{filter===key\}/);
  assert.match(css, /\.trace-findings-toolbar/);
  assert.match(css, /@media\(max-width:500px\)/);
});
