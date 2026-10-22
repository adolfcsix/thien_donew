'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function read(pathname) { return fs.readFileSync(path.join(root, pathname), 'utf8'); }
const geometry = read('apps/web/src/features/admin-insights/panel-geometry.ts');
const js = ts.transpileModule(geometry, {fileName:'panel-geometry.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod = {exports:{}};
new Function('module','exports',js)(mod,mod.exports);
const {clampAssistantPosition:clamp} = mod.exports;
test('assistant drag stays visible on normal desktop viewport', () => {
 const vp = {left:0,top:0,width:1440,height:900};
 assert.deepEqual(clamp({left:960,top:100},{x:800,y:-600},{width:470,height:600},vp),{left:962,top:8});
 assert.deepEqual(clamp({left:960,top:100},{x:-2000,y:900},{width:470,height:600},vp),{left:8,top:292});
});
test('assistant drag respects zoomed and panned visual viewport bounds', () => {
 const vp = {left:230,top:95,width:640,height:480};
 assert.deepEqual(clamp({left:420,top:140},{x:2000,y:2000},{width:440,height:310},vp),{left:422,top:257});
 assert.deepEqual(clamp({left:420,top:140},{x:-2000,y:-2000},{width:440,height:310},vp),{left:238,top:103});
});
test('tiny visual viewport cannot invert boundaries or generate nonfinite coordinates', () => {
 const result=clamp({left:500,top:300},{x:200,y:200},{width:470,height:600},{left:120,top:80,width:320,height:200});
 assert.deepEqual(result,{left:128,top:88});
});
test('assistant drag and low-resource exit use viewport geometry and reduced effects setting',()=>{
 const source=read('apps/web/src/features/admin-insights/floating-assistant.tsx');
 assert.match(source,/clampAssistantPosition\(/);
 assert.match(source,/visual\.offsetLeft/);
 assert.match(source,/visual\.offsetTop/);
 assert.match(source,/visual\.width/);
 assert.match(source,/document\.documentElement\.dataset\.thiendoEffects === 'reduced'/);
 assert.match(source,/onPointerCancel/);
});
test('floating assistant mobile panel has nonclipping header text and accessible actions',()=>{
 const css=read('apps/web/src/features/admin-insights/chat.module.css');
 assert.match(css,/\.panelHeader>div:first-child\s*\{[^}]*min-width:0;overflow:hidden/);
 assert.match(css,/\.panelHeader strong\s*\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/\.windowActions\s*\{flex:0 0 auto\}/);
 assert.match(css,/@media\(max-width:639px\)\{\.panelHeader\{cursor:default;touch-action:pan-y\}\}/);
});
test('five world palettes and image assets remain unchanged and registered',()=>{
 const worlds=read('apps/web/src/app/western-worlds.css');
 for(const id of ['astrology','tarot','numerology','symbols','research']) {
  for(const mode of ['dark','light']) {
   assert.match(worlds,new RegExp(`${id}-${mode}\\.webp`));
   assert.ok(fs.statSync(path.join(root,`apps/web/public/theme/western/${id}-${mode}.webp`)).size>1000);
  }
 }
});

test('five Western sidebar artworks crossfade without fading brand or navigation controls',()=>{
 const css=read('apps/web/src/app/western-worlds.css');
 assert.match(css,/\.site\[data-western-world\]>#thiendo-sidebar::before\{[^}]*--ww-dark[^}]*opacity:\.14/);
 assert.match(css,/\.site\[data-western-world\]>#thiendo-sidebar::after\{[^}]*--ww-light[^}]*opacity:0/);
 assert.match(css,/\.site\[data-western-world\]\.light>#thiendo-sidebar::after\{opacity:\.14\}/);
 assert.match(css,/>#thiendo-sidebar>:is\(\.brand,\.nav-heading,nav\)\{position:relative;z-index:1\}/);
 assert.match(css,/html\[data-thiendo-effects="reduced"\] \.site\[data-western-world\]>#thiendo-sidebar::before,/);
 assert.match(css,/@media\(max-width:970px\)\{\.site\[data-western-world\]>#thiendo-sidebar\{border-radius:0 22px 22px 0\}\}/);
});
