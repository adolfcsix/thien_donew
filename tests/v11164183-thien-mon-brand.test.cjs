// SEC-01: normalized lock snapshot reviewed for Next 16.4.2; retain the existing A43 normalization and all asset/schema assertions.
const {baselineBytes}=require('./helpers/a43-protected-baseline.cjs');
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(baselineBytes(root,p)).digest('hex');
const component = read('apps/web/src/components/thien-mon-mark.tsx');
const nav = read('apps/web/src/components/navigation-symbol.tsx');
const shell = read('apps/web/src/components/shell.tsx');
const home = read('apps/web/src/app/page.tsx');
const account = read('apps/web/src/components/auth-provider.tsx');
const favicon = read('apps/web/src/app/icon.svg');
const css = read('apps/web/src/app/thien-mon-brand-v11164183.css');
const layout = read('apps/web/src/app/layout.tsx');
test('approved Thiên Môn identity appears in navigation, home, account and guest icons',()=>{
  // V11.164.18.4 switches large brand surfaces from an approximate SVG to the
  // approved concept artwork; the small scalable vector remains the favicon.
  assert.match(shell,/thien-mon-approved-icon/);
  assert.match(home,/thien-mon-home-scene--dark/);
  assert.match(home,/thien-mon-home-scene--light/);
  assert.match(account,/thien-mon-art-scene--dark/);
  assert.match(account,/thien-mon-art-scene--light/);
  assert.match(nav,/return <TianMonMark size=\{size\} compact/);
  assert.match(favicon,/<svg[\s\S]*<circle[\s\S]*<path/);
  assert.match(component,/Hand-drawn geometry/);
  assert.match(component,/aria-hidden="true"/);
  assert.match(component,/tm-character/);
  assert.match(component,/tm-jade/);
  assert.match(component,/tm-metal/);
});
test('logo and navigation work in dark/light themes with compact and mobile states',()=>{
  for(const token of ['.site.light','--tm-metal','--tm-character','--tm-jade','--tm-logo-bg','--tm-nav-shadow','--td-glass-heading','@media (max-width:970px)','@media (max-width:700px)']) assert.ok(css.includes(token),token);
  assert.match(css, /\.site > #thiendo-sidebar\s*\{/);
  assert.match(css, /backdrop-filter:blur\(19px\)/);
  assert.match(css, /@media \(hover:hover\) and \(prefers-reduced-motion:no-preference\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
});
test('navigation behavior and app source outside visual scope untouched',()=>{
  for(const token of ["data-navigation={compact ? 'compact' : 'full'}",'aria-expanded={expanded}','aria-controls={`nav-group-${group.id}`}','inert={searchOpen || (narrow && !menu)}','STORAGE_THEME']) assert.ok(shell.includes(token),token);
  const j=layout.indexOf('thien-mon-brand-v11164183.css');
  assert.ok(j>layout.indexOf('global-visual-harmony-v11164182.css'));
  assert.doesNotMatch(css,/\.(house|palace|star-label|atlas-grid)(?:\s|:|\{|\.)/);
  assert.doesNotMatch(css,/https?:\/\//);
});
test('approved concept boards and frozen backend schema and security-reviewed dependencies after exact A43 additions remain unchanged; additive community migration is append-only',()=>{
  for(const file of ['docs/design-references/brand-thien-mon/approved-light-board.png','docs/design-references/brand-thien-mon/approved-dark-board.png'])assert.ok(fs.statSync(path.join(root,file)).size>500_000,file);
  assert.equal(sha('package-lock.json'),'553a9b4328e2f37e965573913996f7760e133e9ba0e0678dacd80a2c5c9705ff');
  assert.equal(sha('apps/api/src/app.module.ts'),'7cd6730534b2f4839d2386f3b6e0f8f443def5d613e2e87068475e0ad95dc4f5');
  assert.equal(fs.readdirSync(path.join(root,'infrastructure/db')).filter(n=>n.endsWith('.sql')).length,37);
});
