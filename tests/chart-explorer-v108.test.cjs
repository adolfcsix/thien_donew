'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join,resolve} = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const root = resolve(__dirname,'..');
const read = p=>readFileSync(join(root,p),'utf8');
const ts = require('./helpers-typeloader.cjs');
const compiled = ts.transpileModule(read('apps/web/src/features/chart/lib/chart-explorer.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const script = {exports:{}};
vm.runInNewContext(compiled,{module:script,exports:script.exports});
const {normalizePalaceSearch,orderedPalaces,palaceSearchText,matchingPalaces,adjacentPalaceBranch}=script.exports;
const birth = (date='2004-08-15')=>Engine.calculate({date,calendar:'solar',gender:'Nam',hour:8,minute:30,leap:false});
const plain = value=>JSON.parse(JSON.stringify(value));

test('chart explorer: normalizes Vietnamese accent and Đ with harmless empty input',()=>{
  assert.equal(normalizePalaceSearch(' ĐẠI   HẠN '),'dai han');
  assert.equal(normalizePalaceSearch('TỬ VI'),normalizePalaceSearch('tu vi'));
  assert.equal(normalizePalaceSearch('  '),'');
  assert.equal(normalizePalaceSearch('Lưu\tThiên Mã'),'luu thien ma');
});
test('chart explorer: all 12 unique palaces sorted by geographic cell, without mutating chart',()=>{
  const result=birth();const before=JSON.stringify(result);
  const sorted=orderedPalaces(result.houses);
  assert.equal(sorted.length,12);
  assert.equal(new Set(sorted.map(h=>h.branchIndex)).size,12);
  assert.deepEqual(Array.from(sorted,h=>h.cell),Array.from(sorted,h=>h.cell).sort((a,b)=>a-b));
  assert.equal(JSON.stringify(result),before);
});
test('chart explorer: search by palace, main star and diacritics retrieves correct palaces',()=>{
  const c=birth();
  assert.equal(matchingPalaces(c.houses,'').length,12);
  assert.deepEqual(Array.from(matchingPalaces(c.houses,'Mệnh'),h=>h.palace),['Mệnh']);
  const starHouse=c.houses.find(h=>h.stars.includes('Tử Vi'));
  assert.ok(starHouse);
  assert.ok(matchingPalaces(c.houses,'tu vi').some(h=>h.branchIndex===starHouse.branchIndex));
  assert.deepEqual(Array.from(matchingPalaces(c.houses,'xxx-khong-co'),h=>h.branchIndex),[]);
  assert.ok(palaceSearchText(starHouse).includes('tu vi'));
});
test('chart explorer: annual star search follows the selected year and the visible layer toggle',()=>{
  const c=birth();
  for(const year of [2024,2026,2033]){
    const annual=Engine.annualOverview(c,year);
    const horse=annual.luuStars.items.find(item=>item.name==='Lưu Thiên Mã');
    assert.ok(horse);
    const matching=matchingPalaces(c.houses,'Lưu Thiên Mã',annual,true);
    assert.ok(matching.some(h=>h.branchIndex===horse.branch));
    const withoutLayer=matchingPalaces(c.houses,'Lưu Thiên Mã',annual,false);
    assert.ok(!withoutLayer.some(h=>h.branchIndex===horse.branch && !palaceSearchText(h).includes('luu thien ma')));
  }
});
test('chart explorer: previous/next navigation uses stable branch IDs and wraps, even with a filtered subset',()=>{
  const c=birth();const sorted=orderedPalaces(c.houses);
  const first=sorted[0].branchIndex,last=sorted.at(-1).branchIndex;
  assert.equal(adjacentPalaceBranch(c.houses,first,'previous'),last);
  assert.equal(adjacentPalaceBranch(c.houses,last,'next'),first);
  assert.equal(adjacentPalaceBranch(c.houses,last,'first'),first);
  assert.equal(adjacentPalaceBranch(c.houses,first,'last'),last);
  assert.equal(adjacentPalaceBranch(sorted.slice(0,2),sorted[0].branchIndex,'next'),sorted[1].branchIndex);
  assert.equal(adjacentPalaceBranch([],0,'next'),null);
});
test('chart explorer: read-only helpers leave natal and annual data unchanged',()=>{
  const c=birth();const annual=Engine.annualOverview(c,2026),before=JSON.stringify({c,annual});
  matchingPalaces(c.houses,'hoa',annual,true);
  matchingPalaces(c.houses,'hoa',annual,false);
  adjacentPalaceBranch(c.houses,c.houses[0].branchIndex,'next');
  assert.equal(JSON.stringify({c,annual}),before);
});
test('chart explorer: mode switch, search, keyboard access and details wired into real Next component',()=>{
  const jsx=['chart-board.tsx','chart-board-header.tsx','chart-palace-list.tsx','palace-tile.tsx','palace-details.tsx'].map(name=>read('apps/web/src/features/chart/components/'+name)).join('\n');
  for(const keyword of ['matchingPalaces(', 'normalizePalaceSearch(', "useState<'board' | 'list'>",'aria-pressed={view === \'list\'}','role="status"','aria-live="polite"','ArrowRight','ArrowLeft','Home','End','aria-controls={detailId}','Lưu Tứ Hóa','Tiểu hạn','Tứ Hóa năm sinh','onChange={event => setQuery(event.target.value)}']){
    assert.ok(jsx.includes(keyword),`Missing ${keyword}`);
  }
  assert.match(jsx,/<ChartScene>/);
  assert.doesNotMatch(jsx,/if \(window\.matchMedia\('\(max-width: 760px\)'\)\.matches\) setView\('list'\)/);
  assert.match(jsx,/find\(house => house\.branchIndex === selectedBranch\)/);
  assert.match(jsx,/showAnnual && \(isYearBranch \|\| isMajor \|\| isTieuHan\)/);
  const css=read('apps/web/src/app/chart-explorer.css');
  assert.match(css,/\.chart-palace-list/);
  assert.match(css,/\.site\[data-mode="basic"\] \.house-minor/);
  assert.match(read('apps/web/src/app/layout.tsx'),/import '\.\/chart-explorer\.css'/);
});
