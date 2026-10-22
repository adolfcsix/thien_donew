'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('apps/web/src/components/shell.tsx');
const chart=read('apps/web/src/app/chart/page.tsx');
const form=read('apps/web/src/features/chart/components/chart-form.tsx');
const result=read('apps/web/src/features/chart/components/chart-result.tsx');
const center=read('apps/web/src/features/chart/components/board-summary.tsx');
const polish=read('apps/web/src/app/responsive-polish.css');

test('V11.103: navigation groups have labels and affordances, not decorative item counts',()=>{
  assert.match(shell,/navigationGroups\.filter\(group=>group\.id!==\'huong-dan-ho-tro\'\)\.map\(group/);
  assert.match(shell,/aria-expanded=\{expanded\}/);
  assert.match(shell,/navStyles\.chevron/);
  assert.doesNotMatch(shell,/<small>\{navigationGroups\.length\} nhóm<\/small>/);
  assert.doesNotMatch(shell,/navStyles\.count|<small[^>]*>\{group\.items\.length\}<\/small>/);
});
test('V11.103: exactly one topbar search trigger and both presentation modes remain',()=>{
  assert.equal((shell.match(/className="quick-search-trigger"/g)||[]).length,1);
  assert.match(shell,/setViewMode\('basic'\)/);
  assert.match(shell,/setViewMode\('expert'\)/);
  assert.match(shell,/aria-label="Điều hướng điện thoại"/);
});
test('V11.103: chart landing no longer repeats view mode introduction',()=>{
  assert.doesNotMatch(chart,/ModeIntroduction/);
  assert.match(chart,/<ChartForm/);
  assert.match(chart,/<ChartResult/);
  assert.match(chart,/<TuViCanvas/);
});
test('V11.103: chart main board shows actual data, no research slogan',()=>{
  assert.match(center,/result\.solar\.day/);
  assert.match(center,/result\.lunar\.day/);
  assert.doesNotMatch(center,/atlas-center-disclaimer/);
  assert.match(result,/<details className="chart-method-details">/);
  assert.match(result,/<summary>Phương pháp và phạm vi luận giải<\/summary>/);
});
test('V11.103: form removes redundant footnotes while preserving date validation',()=>{
  assert.match(form,/birthCheck\(input\)/);
  assert.match(form,/disabled=\{Boolean\(check.error\)\}/);
  assert.doesNotMatch(form,/className="rule-note"/);
  assert.match(form,/chart-form-help/);
  assert.match(form,/Giờ sinh áp dụng theo múi giờ Việt Nam/);
  assert.match(form,/23:00/);
});
test('V11.103: real backend warning messages remain available in a collapsed details panel',()=>{
  assert.match(result,/result\.warnings\?\.length > 0/);
  assert.match(result,/<details className="warning-details">/);
  assert.match(result,/result\.warnings\.map/);
});
test('V11.103: responsive patch covers narrow, tablet and intermediate desktop widths',()=>{
  for (const breakpoint of ['max-width:370px','max-width:480px','max-width:760px','max-width:970px','max-width:1600px']) assert.ok(polish.includes(breakpoint),breakpoint);
  assert.match(polish,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(polish,/\.toolbar \{gap:3px/);
  assert.match(polish,/\.chart-atlas-workspace \.entry-panel form \{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(read('apps/web/src/app/layout.tsx'),/import '\.\/responsive-polish\.css'/);
});
test('V11.103: CSS audit continues to hash all 28 legacy styles in original order',()=>{
  const audit=read('infrastructure/scripts/audit-css-baseline.cjs');
  assert.match(audit,/imports\.slice\(0,expected\.length\)/);
  assert.match(audit,/hash !== baseline\.files\[name\]/);
  assert.match(audit,/Duplicate CSS imports/);
});
