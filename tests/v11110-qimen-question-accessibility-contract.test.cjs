'use strict';
/** V11.110.2: dependency-free regression guard for the live browser smoke's
 * form-name contract. This is a source-level guard, NOT a Chromium replacement.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const ui=readFileSync(join(root,'apps/web/src/features/ky-mon/question-reading-panel.tsx'),'utf8');
const browser=readFileSync(join(root,'tests/qimen-question-browser-smoke.mjs'),'utf8');
const workflow=readFileSync(join(root,'infrastructure/scripts/run-ci-http.sh'),'utf8');

const fieldContracts=[
 {visible:'Chủ đề muốn xem',browserName:'Chủ đề muốn xem'},
 {visible:'Dụng thần (tự chọn và kiểm tra)',browserName:'Dụng thần'},
 {visible:'Cung tham chiếu (nếu đã xác minh)',browserName:'Cung tham chiếu'}
];
for(const {visible,browserName} of fieldContracts){
 test(`V11.110.2 user-visible ${visible} is the select's accessible name`,()=>{
  const entry=ui.match(new RegExp('<label>'+visible.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*<select\\b([^>]+)>'));
  assert.ok(entry,`Missing visible associated label: ${visible}`);
  assert.doesNotMatch(entry[1],/\baria-label\s*=/,'A competing aria-label overrides the visible label');
  assert.match(browser,new RegExp('getByRole\\(\\x27combobox\\x27,\\{name:/'+browserName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/\\}\\)'),`Chromium selector must use visible label: ${visible}`);
 });
}
test('V11.110.2 real Chromium smoke remains in the live CI HTTP route',()=>{
 assert.match(workflow,/node tests\/qimen-question-browser-smoke\.mjs/);
 assert.match(browser,/1440,height:900/);
 assert.match(browser,/390,height:844/);
 assert.match(browser,/A -> B -> A/);
});
