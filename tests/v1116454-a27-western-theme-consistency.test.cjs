'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const shell=fs.readFileSync(path.join(root,'apps/web/src/components/shell.tsx'),'utf8');
const pref=fs.readFileSync(path.join(root,'apps/web/src/lib/theme-preference.ts'),'utf8');
const style=fs.readFileSync(path.join(root,'apps/web/src/app/western-worlds.css'),'utf8');
const worlds=fs.readFileSync(path.join(root,'apps/web/src/lib/western-worlds.ts'),'utf8');
const policyMatch=pref.match(/export function resolveThemePreference\([^)]*\): boolean \{([\s\S]*?)\n\}/);
assert.ok(policyMatch,'pure shared theme resolution function must be present');
const resolveThemePreference=new Function('saved','systemPrefersLight',policyMatch[1]);

test('valid explicit light preference always beats a dark OS setting',()=>assert.equal(resolveThemePreference('light',false),true));
test('valid explicit dark preference always beats a light OS setting',()=>assert.equal(resolveThemePreference('dark',true),false));
test('missing/invalid preference follows the OS instead of defaulting blindly to dark',()=>{
  for (const raw of [null, '', 'LIGHT', 'invalid', 'true']) {
    assert.equal(resolveThemePreference(raw,true),true);
    assert.equal(resolveThemePreference(raw,false),false);
  }
});
test('Shell uses a single global brightness source on initial load and after tab synchronization',()=>{
  assert.ok(shell.includes('const resolvedLight = light'));
  assert.equal((shell.match(/resolveThemePreference\(/g)||[]).length,2);
  assert.ok(shell.includes("const STORAGE_THEME = 'thiendo-theme'"));
  assert.ok(!shell.includes('westernThemeKey('));
  assert.ok(shell.includes('if (!preferencesReady) return;'));
});
test('cross-tab storage, tab return, and cleanup are wired without reactive route reset',()=>{
  assert.ok(shell.includes("window.addEventListener('storage', onStorage)"));
  assert.ok(shell.includes("document.addEventListener('visibilitychange', onVisibility)"));
  assert.ok(shell.includes("window.removeEventListener('storage', onStorage)"));
  assert.ok(shell.includes("document.removeEventListener('visibilitychange', onVisibility)"));
  assert.ok(shell.includes('event.key === STORAGE_THEME || event.key === null'));
  assert.ok(shell.includes("document.visibilityState === 'visible'"));
  assert.ok(shell.includes("dataset.thiendoTheme = resolvedLight ? 'light' : 'dark'"));
});
test('all five worlds preserve their own pair of image assets and palette',()=>{
  for(const id of ['astrology','tarot','numerology','symbols','research']){
    assert.ok(worlds.includes(`id: '${id}'`));
    for(const mode of ['light','dark']){
      assert.ok(fs.statSync(path.join(root,'apps/web/public/theme/western',`${id}-${mode}.webp`)).size>1000);
    }
    assert.ok(style.includes(`.site[data-western-world="${id}"]`));
  }
});
test('Western workbench widens on large monitors without altering calculations',()=>{
  assert.match(style,/\.western-world-page\{[^}]*max-width:1480px;[^}]*margin-inline:0;/);
  assert.match(style,/@media\(max-width:600px\)/);
  assert.match(style,/\.western-world-page>header :is\(h1,p\)\{max-width:100%\}/);
  assert.ok(!style.includes('display:none!important;color:transparent'));
});
