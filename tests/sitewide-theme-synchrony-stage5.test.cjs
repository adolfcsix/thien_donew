const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const css = read('apps/web/src/app/sitewide-theme-synchrony-stage5.css');
const layout = read('apps/web/src/app/layout.tsx');
const shell = read('apps/web/src/components/shell.tsx');
const auth = read('apps/web/src/components/auth-provider.tsx');
test('Stage 5 stylesheet is loaded exactly once, after stage 4', () => {
  assert.equal((layout.match(/import '\.\/sitewide-theme-synchrony-stage5\.css'/g)||[]).length,1);
  assert.ok(layout.indexOf('sitewide-readability-stage4.css') < layout.indexOf('sitewide-theme-synchrony-stage5.css'));
});
test('account modal outside .site uses existing html theme attribute', () => {
  assert.match(shell,/document\.documentElement\.dataset\.thiendoTheme = resolvedLight \? 'light' : 'dark'/);
  assert.match(auth,/modal account-modal/);
  assert.match(css,/html\[data-thiendo-theme="dark"\] \.modal\.account-modal/);
  assert.match(css,/html\[data-thiendo-theme="light"\] \.modal\.account-modal/);
});
test('forms use opaque background and matching ink, caret, placeholder', () => {
  for (const token of ['--td5-glass-solid','--td5-glass-ink','--td5-glass-subtle','--td5-glass-border']) assert.ok(css.includes(token));
  assert.match(css,/background-color: var\(--td5-glass-solid\)/);
  assert.match(css,/caret-color: var\(--td5-glass-ink\)/);
  assert.match(css,/::placeholder/);
});
test('reduced motion, high contrast, forced colors and focus are protected', () => {
  for (const feature of ['prefers-contrast:more','prefers-reduced-motion:reduce','forced-colors:active',':focus-visible']) assert.ok(css.includes(feature));
});
test('specialist data and chart styles are not selected', () => {
  assert.doesNotMatch(css,/(^|\n)\s*\.site\s+(?:\.chart|\.star|\.palace|\.medal|\.formation|\.tinh-canh)/);
});
function luminance(hex){const rgb=hex.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function ratio(a,b){const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05)}
test('solid overlay text and placeholder meet 4.5:1 contrast in both themes', () => {
  for (const [bg,fg,muted] of [['18352b','f3f0e5','d2ded2'],['fffdf7','20392e','405448']]) {
    assert.ok(ratio(bg,fg)>=4.5,`${bg} / ${fg}`);
    assert.ok(ratio(bg,muted)>=4.5,`${bg} / ${muted}`);
  }
});
test('readable shared colors switch together while spatial and scenic motion remain', () => {
  assert.match(css,/transition-property: transform, translate, scale, rotate, opacity, box-shadow, filter !important/);
  assert.match(css,/\.site\[data-theme-ready="true"\] :is\(\.topbar,#thiendo-sidebar,\.bottom-nav,\.command-panel\) \*/);
  assert.doesNotMatch(css,/\.site::(?:before|after)\s*\{[^}]*transition-property/s);
});

test('shared contrast layer cannot override route-owned header or nav actions', () => {
 const shared=read('apps/web/src/app/sitewide-contrast-safety.css');
 const selected=[...shared.matchAll(/:is\(([^)]+)\)/g)].flatMap(match=>match[1].split(',').map(value=>value.trim()));
 assert.ok(!selected.includes('header')&&!selected.includes('nav'));
 assert.match(shared,/:is\(\.sidebar,\.topbar,\.bottom-nav\)/);
 const forum=read('apps/web/src/app/forum/forum.module.css');
 assert.match(forum,/\.primary\{background:#28584d;color:#fff/);
});
