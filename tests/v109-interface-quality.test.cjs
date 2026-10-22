const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root = join(__dirname, '..');
const read = file => readFileSync(join(root,file), 'utf8');

// Static contract tests deliberately run with Node only; full Next/React
// behavior requires npm dependencies and separate browser/E2E verification.
test('shared quality style sheet is loaded after all page/module styles', () => {
  const layout = read('apps/web/src/app/layout.tsx');
  const css = [...layout.matchAll(/import ['"]\.\/([^'"]+\.css)['"]/g)].map(m => m[1]);
  const position = name => css.indexOf(name);
  for (const name of ['interface-quality.css','typography-refinement.css','chart-heritage.css','chart-fit.css','palace-reader.css']) {
    assert.ok(position(name) >= 0, `Missing stylesheet ${name}`);
  }
  // Shared refinement precedes chart-only variants; the reader sheet comes
  // last because its native modal controls must override component defaults.
  assert.ok(position('interface-quality.css') < position('typography-refinement.css'));
  assert.ok(position('typography-refinement.css') < position('chart-heritage.css'));
  assert.ok(position('chart-heritage.css') < position('chart-fit.css'));
  assert.ok(position('chart-fit.css') < position('palace-reader.css'));
  assert.ok(css.includes('palace-study-workbench.css'));
  const theme = read('apps/web/src/app/interface-quality.css');
  assert.match(theme, /\.site\.light \.app-area, \.site\.light \.command-panel\s*\{\s*--gold:#83531a/);
  assert.match(theme, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(theme, /\[hidden\] \{ display:none!important; \}/);
});

test('mobile navigation drawer manages keyboard focus and resize transitions', () => {
  const shell = read('apps/web/src/components/shell.tsx');
  assert.match(shell, /if \(!menu \|\| event\.key !== 'Tab'\) return/);
  assert.match(shell, /document\.activeElement === first/);
  assert.match(shell, /document\.activeElement === last/);
  assert.match(shell, /window\.matchMedia\('\(max-width: 970px\)'\)/);
  assert.match(shell, /mobile\.addEventListener\('change', onResize\)/);
  assert.match(shell, /document\.getElementById\('main-content'\)\?\.focus\(\)/);
});

test('command palette safely clamps keyboard index even with zero results', () => {
  const shell = read('apps/web/src/components/shell.tsx');
  assert.match(shell, /Math\.max\(0, matches\.length - 1\)/);
  assert.match(shell, /aria-activedescendant/);
  assert.match(shell, /role="dialog" aria-modal="true"/);
});

test('Next.js loading, 404, and recoverable error states are accessible and actionable', () => {
  const error = read('apps/web/src/app/error.tsx');
  const missing = read('apps/web/src/app/not-found.tsx');
  const loading = read('apps/web/src/app/loading.tsx');
  assert.match(error, /^'use client';/);
  assert.match(error, /onClick=\{reset\}/);
  assert.match(error, /role="alert"/);
  assert.match(missing, /href="\/chart"/);
  assert.match(loading, /role="status"/);
  // Avoid exposing error stack or digest to the end user.
  assert.doesNotMatch(error, /\{error\.message\}|\{error\.stack\}|\{error\.digest\}/);
});
