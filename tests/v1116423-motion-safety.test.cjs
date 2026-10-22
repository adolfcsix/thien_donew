'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=file=>fs.readFileSync(path.join(root,file),'utf8');

test('five Western hero images have separate decorative crossfade layers without moving readable text',()=>{
 const s=css('apps/web/src/app/western-worlds.css');
 assert.match(s,/\.western-world-page>header::before\s*\{\s*background-image:var\(--ww-hero-shade\),var\(--ww-dark\)/);
 assert.match(s,/\.western-world-page>header::after\s*\{\s*background-image:var\(--ww-hero-shade\),var\(--ww-light\)/);
 assert.match(s,/\.site\[data-western-world\]\.light \.western-world-page>header::before\{opacity:0\}/);
 assert.match(s,/\.site\[data-western-world\]\.light \.western-world-page>header::after\{opacity:1\}/);
 assert.match(s,/\.western-world-page>header>\*\{position:relative;z-index:1\}/);
 assert.match(s,/pointer-events:none/);
 assert.match(s,/transition:opacity 850ms/);
 assert.match(s,/background-image:none/);
});
test('all 10 Western world images are valid local WEBP assets',()=>{
 for(const world of ['astrology','tarot','numerology','symbols','research'])for(const mode of ['dark','light']){
  const bytes=fs.readFileSync(path.join(root,'apps/web/public/theme/western',`${world}-${mode}.webp`));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length>1000);
 }
});
test('reduced device effect setting suppresses scenery crossfades and assistant perpetual animations',()=>{
 const global=css('apps/web/src/app/global-visual-harmony-v11164182.css');
 const western=css('apps/web/src/app/western-worlds.css');
 const assistant=css('apps/web/src/features/admin-insights/chat.module.css');
 assert.match(global,/html\[data-thiendo-effects="reduced"\] \.site\[data-theme-ready="true"\]::after/);
 assert.match(global,/transform:none!important;transition:none!important;animation:none!important/);
 assert.match(western,/html\[data-thiendo-effects="reduced"\] \.site\[data-western-world\] \.western-world-page>header::after/);
 assert.match(western,/prefers-reduced-motion:reduce/);
 assert.match(assistant,/:global\(html\[data-thiendo-effects="reduced"\]\) \.orb/);
 assert.match(assistant,/:global\(html\[data-thiendo-effects="reduced"\]\) \.loading span/);
 assert.match(assistant,/animation:none!important/);
});
test('account overlay pauses SVG medal animation without removing its 3D artwork',()=>{
 const s=css('apps/web/src/components/tinh-canh-medal.module.css');
 assert.match(s,/:global\(body:has\(\.modal-backdrop\.account-backdrop\)\) \.medal \*\{animation-play-state:paused!important\}/);
 assert.match(s,/\.floatLayer\{[^\n]*animation:medalDepthDrift/);
 assert.match(s,/:global\(html\[data-thiendo-effects="reduced"\]\) \.medal \*\{animation:none!important\}/);
});
