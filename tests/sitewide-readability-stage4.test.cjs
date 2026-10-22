const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = path.join(__dirname,'../apps/web/src/app');
const css = fs.readFileSync(path.join(app,'sitewide-readability-stage4.css'),'utf8');
const layout = fs.readFileSync(path.join(app,'layout.tsx'),'utf8');
test('stage4 stylesheet imported once after stage3',()=> {
  assert.equal(layout.split("import './sitewide-readability-stage4.css';").length-1,1);
  assert.ok(layout.indexOf('sitewide-readability-stage4.css')>layout.indexOf('sitewide-motion-stage3.css'));
});
test('theme tokens include separate light and dark accessible text/field surfaces',()=>{
  for(const token of ['--td4-text','--td4-field-bg','--td4-placeholder','--td4-ring']) assert.ok(css.split(token).length>=3,token);
  assert.match(css,/\.site\.light\s*\{/);
});
test('no unsafe specialist diagram or star overrides',()=>{
  for(const forbidden of ['.chart-board','.palace','.star','.formation','.tinh-canh','.research-grid']) assert.ok(!css.includes(forbidden),forbidden);
});
test('reduced motion and forced colors fallbacks',()=>{
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/forced-colors: active/);
  assert.match(css,/focus-visible/);
});
