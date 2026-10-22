'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const css = read('apps/web/src/app/sitewide-material-motion-stage2.css');
const layout = read('apps/web/src/app/layout.tsx');
const shell = read('apps/web/src/components/shell.tsx');
test('stage2 is included once and loaded after contrast foundation',()=>{
  assert.equal((layout.match(/import '\.\/sitewide-material-motion-stage2\.css'/g)||[]).length,1);
  assert.ok(layout.indexOf("import " + "'./sitewide-material-motion-stage2.css'")>layout.indexOf("import " + "'./sitewide-contrast-safety.css'"));
});
test('one shared shell owns all routes, including admin',()=>{
  assert.match(layout,/<Shell>\{children\}<\/Shell>/);
  assert.match(shell,/data-visual-density=\{visualDensity\}/);
  assert.match(shell,/data-theme-ready=\{preferencesReady\}/);
});
test('shared glass surfaces, motion accessibility, and fallback protection exist',()=>{
  for(const term of ['.site.light','--td2-foreground','--td2-secondary','.command-panel','.modal.account-modal','prefers-reduced-motion: reduce','prefers-contrast: more','data-thiendo-effects="reduced"',':focus-visible']) assert.ok(css.includes(term),term);
});
test('stage2 does not change chart geometry or semantic color selectors',()=>{
  for(const forbidden of ['.atlas-house','.atlas-star','.house','.palace','.board-scroll','!important; color:']) assert.ok(!css.includes(forbidden),forbidden);
});
