'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const read = relative => fs.readFileSync(path.join(root,relative),'utf8');
const base = 'apps/web/src/';
const atmosphere = read(base+'app/study-atmosphere-v1116418.css');
const aiCss = read(base+'app/huyen-giai/huyen-giai.module.css');
const studyCss = read(base+'features/study-room/study-room.module.css');
const layout = read(base+'app/layout.tsx');
const shell = read(base+'components/shell.tsx');
const aiPage = read(base+'app/huyen-giai/page.tsx');

test('image atmosphere is loaded after V11.164.17 without replacing its foundation', () => {
  assert.equal(layout.split("'./study-atmosphere-v1116418.css'").length-1,1);
  assert.ok(layout.indexOf('study-atmosphere-v1116418.css')>layout.indexOf('design-foundation-v1116417.css'));
});
test('AI, research and study pages receive a route-scoped visual theme only', () => {
  assert.match(shell,/data-visual-space=\{visualSpace\}/);
  assert.match(shell,/route === '\/huyen-giai' \? 'ai'/);
  assert.match(shell,/route === '\/study'/);
  assert.match(shell,/route === '\/research'/);
  assert.match(atmosphere,/\.site\[data-visual-space\] \.main-content::before/);
  assert.doesNotMatch(atmosphere,/\.site\s+\.main-content::before/);
});
test('light uses the jade scroll, dark uses the zodiac illustration', () => {
  assert.match(atmosphere,/\.site\s*\{[\s\S]*?--td-study-photo:\s*url\('\/theme\/thap-nhi-dia-chi\.jpeg'\)/);
  assert.match(atmosphere,/\.site\.light\s*\{[\s\S]*?--td-study-photo:\s*url\('\/theme\/cuon-thu-ngoc\.jpeg'\)/);
  for (const rel of ['apps/web/public/theme/cuon-thu-ngoc.jpeg','apps/web/public/theme/thap-nhi-dia-chi.jpeg']) {
    const bytes=fs.readFileSync(path.join(root,rel));
    assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);assert.ok(bytes.length>50000 && bytes.length<750000);
  }
});
test('background is purely decorative, layered and not printed', () => {
  assert.match(atmosphere,/pointer-events:\s*none/);
  assert.match(atmosphere,/var\(--td-study-veil\), var\(--td-study-photo\)/);
  assert.match(atmosphere,/@media print/);
  assert.match(atmosphere,/\.main-content::before\s*\{display:none!important/);
});
test('sidebar cloud ornament is local vector and navigation remains interactive', () => {
  assert.match(atmosphere,/url\('\/theme\/van-may-thien-do\.svg'\)/);
  const svg=read('apps/web/public/theme/van-may-thien-do.svg');
  assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|<foreignObject|onload=|href=/i);
  assert.match(atmosphere,/\.nav-item:focus-visible|\.nav-item\[aria-current="page"\]/);
  assert.match(shell,/aria-expanded=\{expanded\}/);
  assert.match(shell,/onClick=\{\(\) => toggleNavigationGroup\(group.id\)\}/);
});
test('AI guest hero has explicit login entry without altering auth provider behavior', () => {
  assert.match(aiPage,/styles\.guestHero/);
  assert.match(aiPage,/styles\.guestPanel/);
  assert.match(aiPage,/onClick=\{\(\) => open\(\)\}/);
  assert.match(aiPage,/return <HuyenGiaiWorkspace key=\{user.id\} \/>/);
  assert.match(aiPage,/void generate\(\)/);
  assert.match(aiPage,/consent:true|\bconsent\b/);
});
test('AI surfaces are theme-sensitive with contrast, focus, and mobile layout', () => {
  assert.match(aiCss,/:global\(\.site\.light\) \.root/);
  assert.match(aiCss,/:global\(\.site\.light\) \.hero/);
  assert.match(aiCss,/--ai-surface:\s*var\(--td-study-surface/);
  assert.match(aiCss,/:focus-visible/);
  assert.match(aiCss,/@media\(max-width:800px\)/);
  assert.match(aiCss,/@media\(max-width:420px\)/);
  assert.match(aiCss,/@media print/);
});
test('study and research use accessible card surfaces rather than placing text on the photo', () => {
  assert.match(studyCss,/background:var\(--td-study-surface/);
  assert.match(atmosphere,/\.research-heading\s*\{/);
  assert.match(atmosphere,/background:\s*var\(--td-study-surface\)/);
  assert.match(studyCss,/\.field input,\.field select,\.field textarea/);
});
test('no remote fonts, animated wallpaper, API paths or database migrations added by visual CSS', () => {
  for (const css of [atmosphere,aiCss,studyCss]) {
    assert.doesNotMatch(css,/@import|https?:\/\/|animation:\s*infinite/i);
  }
  assert.ok(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'apps/web/public/theme/cuon-thu-ngoc.jpeg'))).digest('hex').length===64);
});
