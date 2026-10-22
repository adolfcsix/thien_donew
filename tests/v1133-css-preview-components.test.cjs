/** V11.33 source-only regression locks: preview bytes, CSS order and chart header wiring. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('V11.33 CSS hashes and import sequence match frozen V11.32 baseline', () => {
  const data = JSON.parse(read('tests/fixtures/validation/css-before-components-sha256.json'));
  const evidence = JSON.parse(read('tests/fixtures/validation/css-dedupe-manifest.json'));
  const { restoreCss } = require('../infrastructure/scripts/lib/css-dedupe-evidence.cjs');
  const names = Object.keys(data.files);
  const layout = read('apps/web/src/app/layout.tsx');
  const imports = Array.from(layout.matchAll(/import '\.\/(.+?\.css)';/g), match => match[1]);
  assert.equal(names.length, 28);
  // V11.103: keep frozen imports intact; allow new non-baseline layers only after them.
  assert.deepEqual(imports.slice(0,names.length), names);
  assert.equal(new Set(imports).size, imports.length);
  for (const name of names) {
    const current = read('apps/web/src/app/' + name);
    const reconstructed = evidence.files[name] ? restoreCss(current, evidence.files[name]) : current;
    assert.equal(sha(Buffer.from(reconstructed)), data.files[name], name);
  }
});

test('V11.33 six historic preview builders reuse one CSS module', () => {
  const shared = require('../infrastructure/scripts/lib/chart-preview-css.cjs');
  assert.ok(shared.length > 6000);
  const manifest = JSON.parse(read('tests/fixtures/validation/preview-baseline-sha256.json'));
  assert.equal(Object.keys(manifest.files).length, 6);
  for (const script of Object.keys(manifest.files)) {
    const code = read(script);
    assert.match(code, /require\('\.\/lib\/chart-preview-css\.cjs'\)/, script);
    assert.ok(code.includes('${previewChartCss}'), script);
    assert.doesNotMatch(code, /<style>\n:root\{font-family/, 'CSS should not be pasted inside each builder');
  }
});

test('V11.33 six builders preserve frozen output hashes without shipping generated snapshots', () => {
  const shared = require('../infrastructure/scripts/lib/chart-preview-css.cjs');
  const manifest = JSON.parse(read('tests/fixtures/validation/preview-baseline-sha256.json'));
  for (const [script, { output, sha256, size }] of Object.entries(manifest.files)) {
    const target=path.join(root,output);
    const snapshot=fs.existsSync(target)?fs.readFileSync(target):null;
    const builder = require(path.join(root, script));
    const generated = Buffer.from(builder.html, 'utf8');
    assert.equal(generated.length, size, script);
    assert.equal(sha(generated), sha256, script);
    assert.ok(builder.html.includes('<style>\n' + shared + '\n</style>'), script);
    if(snapshot)assert.equal(sha(fs.readFileSync(target)),sha(snapshot),'Import must not change an existing output');
    else assert.equal(fs.existsSync(target),false,'Import must not create generated output in source');
  }
});

test('V11.33 ChartBoard delegates UI-only controls while keeping chart computations at parent', () => {
  const parent = read('apps/web/src/features/chart/components/chart-board.tsx');
  const header = read('apps/web/src/features/chart/components/chart-board-header.tsx');
  assert.match(parent, /<ChartBoardHeader result=\{result\}/);
  for (const prop of ['onShowAuxiliaryChange', 'onShowStrengthChange', 'onShowCyclesChange', 'onShowAnnualChange', 'onYearChange']) {
    assert.ok(parent.includes(prop + '='), prop);
    assert.ok(header.includes(prop), prop);
  }
  for (const label of ['Năm âm lịch cần xem', 'ĐỊA BÀN 12 CUNG', 'Lưu Tứ Hóa', 'Phụ tinh', 'Vòng sao']) assert.ok(header.includes(label), label);
  assert.doesNotMatch(header, /useState|useEffect|Engine\.|calculate\(/);
  assert.ok(parent.includes('Engine.annualOverview'));
});
