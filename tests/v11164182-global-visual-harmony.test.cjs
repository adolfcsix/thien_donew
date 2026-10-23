// SEC-01: normalized lock snapshot reviewed for Next 16.4.2; retain the existing A43 normalization and all asset/schema assertions.
const {baselineBytes}=require('./helpers/a43-protected-baseline.cjs');
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('apps/web/src/app/global-visual-harmony-v11164182.css');
const shell = read('apps/web/src/components/shell.tsx');
const layout = read('apps/web/src/app/layout.tsx');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const text = (s, t) => assert.ok(s.includes(t), `missing ${t}`);
function luminance(hex) {
  const [r, g, b] = hex.match(/[a-f\d]{2}/ig).map(s => parseInt(s, 16) / 255)
    .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) { const [hi, lo] = [luminance(a), luminance(b)].sort((x,y) => y - x); return (hi + .05) / (lo + .05); }

test('one global stylesheet is ordered last after all earlier design patches', () => {
  assert.equal((layout.match(/global-visual-harmony-v11164182\.css/g)||[]).length,1);
  assert.ok(layout.indexOf('global-visual-harmony-v11164182.css') > layout.indexOf('study-atmosphere-v1116418.css'));
});
test('all routes use same fixed two-photo background, regardless of visual-space', () => {
  for(const selector of ['.site::before, .site::after','.site::before {','.site::after {','.site.light::after','.site.light::before']) text(css,selector);
  assert.match(css,/\.site::before\s*\{[^}]*thap-nhi-dia-chi\.jpeg/s);
  assert.match(css,/\.site::after\s*\{[^}]*cuon-thu-ngoc\.jpeg/s);
  assert.match(css,/\.site\s*>\s*\.app-area\s*\{[^}]*z-index:\s*1/s);
  assert.match(css,/pointer-events:\s*none/);
  assert.doesNotMatch(css,/https?:\/\//i);
});
test('purely presentational density classification covers specialist, content and immersive routes', () => {
  text(shell,'data-visual-density={visualDensity}');
  text(shell,"visualSpace ? 'immersive'");
  for(const route of ['/chart','/bazi','/ky-mon','/luc-hao','/western-astrology','/calendar']) text(shell,`'${route}'`);
  for(const route of ['/admin','/forum','/van-kho','/books','/login','/phap-ly']) text(shell,`'${route}'`);
  for(const group of ['immersive','reading','dense']) text(css, `[data-visual-density="${group}"]`);
  assert.match(css,/\.site\.light\[data-visual-density="dense"\]/);
  assert.match(css,/\.site\.light\[data-visual-density="reading"\]/);
});
test('global chrome includes sidebar, header, mobile nav and footer', () => {
  for(const target of ['#thiendo-sidebar','.topbar','.bottom-nav','.thiendo-legal-footer','.command-panel','.modal.account-modal']) text(css,target);
  text(css,'van-may-thien-do.svg');
  text(css,'backdrop-filter: blur(16px)');
});
test('dense chart rendering and special semantics are explicitly protected', () => {
  assert.doesNotMatch(css,/\.(house|house-grid|star-label|tuvi-board|palace|chart-board)(?:[\s\.#:{])/);
  assert.doesNotMatch(css,/\.(?:site\s+)?(?:div|section)\s*\{\s*(?:background|color)/);
  assert.doesNotMatch(css,/\.(?:house|palace|star-label)[^{]*\{[^}]*display:\s*none/s);
  text(shell,"data-navigation={compact ? 'compact' : 'full'}");
  text(shell,'aria-expanded={expanded}');
});
test('input, modal and buttons retain accessible focus and resize behavior from foundation', () => {
  const design = read('apps/web/src/app/design-foundation-v1116417.css');
  for(const value of ['.account-reveal',':focus-visible','min-height: 44px','font-size: 16px']) text(design,value);
  assert.equal((css.match(/pointer-events:\s*none/g)||[]).length,2,'only background imagery and decorative tooltip are non-interactive');
  assert.doesNotMatch(css,/inert\s*=/);
});
test('theme transitions wait for hydration and use reduced-motion, print, and contrast fallbacks', () => {
  text(css,'data-theme-ready="true"');
  text(css,'prefers-reduced-motion:no-preference');
  text(css,'prefers-reduced-motion:reduce');
  text(css,'prefers-contrast:more');
  text(css,'forced-colors:active');
  text(css,'@supports not');
  text(css,'@media print');
  assert.doesNotMatch(css,/@keyframes|animation:\s*(?:infinite|\w+\s+\w+\s+infinite)/i);
});
test('themed foreground and accent text have WCAG AA 4.5:1 solid-surface proxy ratios', () => {
  const checks = [
    ['dark chrome primary', '#f3f0e5', '#13281f'],
    ['dark chrome muted', '#c9d6ca', '#13281f'],
    ['dark gold accent', '#efd09a', '#13281f'],
    ['light chrome primary', '#20392e', '#f8faf1'],
    ['light chrome muted', '#405347', '#f8faf1'],
    ['light golden text', '#765124', '#fffaf0'],
    ['light positive text', '#205f42', '#fffaf0'],
    ['light negative text', '#9c352a', '#fffaf0'],
    ['dark faint text', '#b9c9bc', '#12241c'],
    ['light faint text', '#4e6257', '#fffaf0'],
  ];
  for(const [label, fore, back] of checks) assert.ok(contrast(fore,back) >= 4.5,`${label}: ${contrast(fore,back).toFixed(2)}:1`);
});
test('glass labels stay >= 4.5:1 even against adversarial solid black/white photo pixels', () => {
  const rgbaMix=(overlay,back,a)=> '#'+overlay.slice(1).match(/../g).map((v,i)=>{
    const c=Math.round(parseInt(v,16)*a+parseInt(back.slice(1).substr(i*2,2),16)*(1-a));
    return c.toString(16).padStart(2,'0');
  }).join('');
  const lightWorst=rgbaMix('#f8faf1','#000000',.80);
  const darkWorst=rgbaMix('#0c1e18','#ffffff',.80);
  for(const color of ['#20392e','#405347','#315b45']) assert.ok(contrast(color,lightWorst)>=4.5,`light ${color}`);
  for(const color of ['#f3f0e5','#c9d6ca','#f3d9a9']) assert.ok(contrast(color,darkWorst)>=4.5,`dark ${color}`);
});
test('artwork, pre-A43 API registration after exact A43 additions and security-reviewed dependencies match snapshots', () => {
  const expect = {
    'apps/web/public/theme/cuon-thu-ngoc.jpeg':'b7311174c96458a75e64d7bd1e975e4fe27ca3f8503cb82a8ecc1803d4f3c587',
    'apps/web/public/theme/thap-nhi-dia-chi.jpeg':'3c4fe94ff4035e80da79d13ddee7190f0b91c875555039663134851f3a0b4fc2',
    'apps/web/public/theme/van-may-thien-do.svg':'a7077071c6e48efa13c158c37f2e002c48cc2acafd53caee2a0c86cb0acdf366',
    'apps/api/src/app.module.ts':'7cd6730534b2f4839d2386f3b6e0f8f443def5d613e2e87068475e0ad95dc4f5',
    'package-lock.json':'553a9b4328e2f37e965573913996f7760e133e9ba0e0678dacd80a2c5c9705ff'
  };
  for(const [f,h] of Object.entries(expect)) assert.equal(sha(baselineBytes(root,f)),h,f);
  const dir=path.join(root,'infrastructure/db');
  const migrations=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
  assert.equal(migrations.length,37);
  const joined=migrations.slice(0,30).map(f=>`${f}:${sha(fs.readFileSync(path.join(dir,f)))}\n`).join('');
  assert.equal(sha(Buffer.from(joined)),'18b33ba731cc9fd34e17d6f1addea8be431015c9a7d527866f180f37d9189a6e');
});
