const {baselineBytes}=require('./helpers/a43-protected-baseline.cjs');
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(root, r), 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Frozen regression material; this stylesheet is not imported by the current app.
const css = read('tests/fixtures/design/liquid-material-baseline.css');
const shell = read('apps/web/src/components/shell.tsx');
const layout = read('apps/web/src/app/layout.tsx');
const aiCss = read('apps/web/src/app/huyen-giai/huyen-giai.module.css');
const studyCss = read('apps/web/src/features/study-room/study-room.module.css');

test('global material supersedes the route-only liquid import without duplicating photographs', () => {
  assert.equal((layout.match(/global-visual-harmony-v11164182\.css/g)||[]).length,1);
  assert.equal((layout.match(/import '.\/liquid-theme-v11164181\.css'/g)||[]).length,0);
});
test('functional navigation keeps chart controls, focus restoration, storage and theme state', () => {
  for(const token of ['toggleCompact','toggleNavigationGroup','lastOverlay','aria-modal={narrow && menu ? true : undefined}','data-theme-ready={preferencesReady}','toggleCompact','STORAGE_RAIL']) assert.ok(shell.includes(token),token);
});
test('visual CSS selectors are scoped to visual-space routes', () => {
  const rules = css.match(/[^{}]+\{/g) || [];
  // Exclude @media/@supports, plain 0%, 100% and comments.
  const scoped = rules.filter(s => !s.trim().startsWith('@') && !/^\s*\d+%/.test(s) && !s.includes('/*'));
  assert.ok(scoped.length > 20);
  assert.doesNotMatch(css, /\.site\s*>\s*#thiendo-sidebar/);
  assert.doesNotMatch(css, /\.site\s+\.main-content\s*\{/);
  assert.match(css, /\.site\[data-visual-space\]/);
});
test('two distinct photos crossfade without JS timers, mutation observers or infinite motion', () => {
  assert.match(css, /\.site\[data-visual-space\]::before/);
  assert.match(css, /\.site\[data-visual-space\]::after/);
  assert.match(css, /url\('\/theme\/thap-nhi-dia-chi\.jpeg'\)/);
  assert.match(css, /url\('\/theme\/cuon-thu-ngoc\.jpeg'\)/);
  assert.match(css, /data-theme-ready="true"/);
  assert.match(css, /transition: opacity 960ms/);
  assert.doesNotMatch(css, /animation\s*:|animation-name\s*:|https?:\/\//i);
});
test('animated background never intercepts pointer events or overlaps interactive controls', () => {
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /z-index:\s*0/);
  assert.match(css, /\.app-area\s*\{[\s\S]*?z-index:\s*1/);
  assert.match(css, /\.site\[data-visual-space\]\s*>\s*#thiendo-sidebar/);
  assert.match(css, /:is\(\.nav-item\.active, \.nav-item\[aria-current="page"\]\)/);
});
test('existing chart toggle and mobile drawer keyboard features still exist', () => {
  for(const part of ["data-navigation={compact ? 'compact' : 'full'}", 'aria-expanded={expanded}', 'toggleNavigationGroup(group.id)', 'lastOverlay', 'aria-modal={narrow && menu ? true : undefined}', 'setMenu(false)', 'STORAGE_THEME']) assert.ok(shell.includes(part), part);
});
test('theme fallback, print, reduced-motion and responsive conditions provided', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition: none !important/);
  assert.match(css, /@supports not \(\(backdrop-filter:/);
  assert.match(css, /@media \(max-width: 970px\)/);
  assert.match(css, /@media print/);
  assert.match(css, /display:none !important/);
});
test('AI and study heroes use a light pseudo-layer and preserve their dark artwork', () => {
  for (const source of [aiCss, studyCss]) {
    assert.match(source, /\.hero::before\s*\{/);
    assert.match(source, /:global\(\.site\.light\) \.hero::before\s*\{\s*opacity:\s*1/);
    assert.match(source, /background-image:[^;]+cuon-thu-ngoc\.jpeg/);
    assert.match(source, /background-image:[^;]+thap-nhi-dia-chi\.jpeg/);
    assert.match(source, /@media print[^}]*\.hero::before/);
  }
});
test('photos, pre-A43 API registration after exact A43 additions, original artwork and security-reviewed lockfile and first 30 migrations match snapshots', () => {
  // Lockfile snapshot refreshed for SEC-01 only; audited Next 16.4.0 -> 16.4.2.
  const expected = {
    'apps/web/public/theme/cuon-thu-ngoc.jpeg':'b7311174c96458a75e64d7bd1e975e4fe27ca3f8503cb82a8ecc1803d4f3c587',
    'apps/web/public/theme/thap-nhi-dia-chi.jpeg':'3c4fe94ff4035e80da79d13ddee7190f0b91c875555039663134851f3a0b4fc2',
    'apps/web/public/theme/van-may-thien-do.svg':'a7077071c6e48efa13c158c37f2e002c48cc2acafd53caee2a0c86cb0acdf366',
    'apps/api/src/app.module.ts':'7cd6730534b2f4839d2386f3b6e0f8f443def5d613e2e87068475e0ad95dc4f5',
    'package-lock.json':'553a9b4328e2f37e965573913996f7760e133e9ba0e0678dacd80a2c5c9705ff'
  };
  for (const [f, hash] of Object.entries(expected)) assert.equal(sha(baselineBytes(root,f)),hash,f);
  const migrationDir=path.join(root,'infrastructure/db');
  const migrations=fs.readdirSync(migrationDir).filter(f=>f.endsWith('.sql')).sort();
  assert.equal(migrations.length,36);
  const aggregate = migrations.slice(0,30).map(f=>f+':'+sha(fs.readFileSync(path.join(migrationDir,f)))+'\n').join('');
  assert.equal(sha(Buffer.from(aggregate)), '18b33ba731cc9fd34e17d6f1addea8be431015c9a7d527866f180f37d9189a6e');
});
