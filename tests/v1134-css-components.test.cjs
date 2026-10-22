'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { restoreCss, sha256 } = require('../infrastructure/scripts/lib/css-dedupe-evidence.cjs');
const root = path.resolve(__dirname,'..');
const text = name => fs.readFileSync(path.join(root,name),'utf8');
const json = name => JSON.parse(text(name));

test('V11.34 exact CSS deletion is reversible against V11.33 for every stylesheet', () => {
  const old = json('tests/fixtures/validation/css-before-components-sha256.json');
  const manifest = json('tests/fixtures/validation/css-dedupe-manifest.json');
  const next = json('tests/fixtures/validation/css-components-sha256.json');
  const cssImports = Array.from(text('apps/web/src/app/layout.tsx').matchAll(/import '\.\/(.+?\.css)';/g), m => m[1]);
  // Historical baselines are immutable; newer CSS layers may follow the originals.
  assert.deepEqual(cssImports.slice(0,Object.keys(old.files).length), Object.keys(old.files));
  assert.deepEqual(cssImports.slice(0,Object.keys(next.files).length), Object.keys(next.files));
  assert.equal(new Set(cssImports).size, cssImports.length);
  let count=0;
  for (const name of Object.keys(next.files)) {
    const current=text('apps/web/src/app/'+name);
    const entry=manifest.files[name];
    count+=(entry?.removed.length ?? 0);
    assert.equal(sha256(current), next.files[name], name);
    assert.equal(sha256(entry ? restoreCss(current, entry):current),old.files[name],name);
  }
  assert.equal(count,17);
});

test('V11.34 CSS cuts are exclusively duplicate declarations in later imported stylesheets', () => {
  const manifest=json('tests/fixtures/validation/css-dedupe-manifest.json');
  const order=Object.keys(json('tests/fixtures/validation/css-components-sha256.json').files);
  for (const [name, entry] of Object.entries(manifest.files)) {
    for (const declaration of entry.removed) {
      const later=text('apps/web/src/app/'+declaration.laterFile);
      assert.ok(order.indexOf(name)<order.indexOf(declaration.laterFile), name);
      assert.ok(later.includes(declaration.selector), declaration.selector);
      assert.ok(later.includes(declaration.property), declaration.property);
      assert.equal(typeof declaration.value,'string');
    }
  }
});

test('V11.34 CSS source audit passes without third-party packages', () => {
  const test=spawnSync(process.execPath,['infrastructure/scripts/audit-css-dedupe.cjs'],{cwd:root,encoding:'utf8'});
  assert.equal(test.status,0,test.stderr);
  assert.match(test.stdout,/Browser visual equivalence NOT tested/);
});

test('V11.34 list component is presentational, with navigation and selection owned by ChartBoard', () => {
  const chart=text('apps/web/src/features/chart/components/chart-board.tsx');
  const list=text('apps/web/src/features/chart/components/chart-palace-list.tsx');
  assert.match(chart,/import \{ ChartPalaceList \} from '.\/chart-palace-list'/);
  assert.match(chart,/<ChartPalaceList matching=\{matching\}/);
  assert.match(chart,/onSelect=\{selectHouse\}/);
  assert.doesNotMatch(list,/useEffect|useState|Engine\.|new Date\(/);
  for (const label of ['chart-palace-list-item','chart-list-branch','chart-list-content','chart-list-tags','Vô chính diệu','Không tìm thấy cung phù hợp','aria-controls']) assert.ok(list.includes(label),label);
  for (const flag of ['showAnnual','showAuxiliary','selectedBranch','matching']) assert.ok(list.includes(flag),flag);
});
