'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const base='apps/web/src/features/chart/components/';
const reader=read(base+'palace-reader-dialog.tsx');
const board=read(base+'chart-board.tsx');
const controls=read(base+'chart-display-controls.tsx');
const tile=read(base+'palace-tile.tsx');
const styles=read('apps/web/src/app/palace-reader.css');

test('reader: open action is available on chart toolbar and double-clicking a house',()=>{
  assert.match(board,/\[readerOpen,setReaderOpen\] = useState\(false\)/);
  assert.match(controls,/aria-haspopup="dialog" onClick=\{onOpenReader\}/);
  assert.match(board,/onOpenReader=\{\(\) => setReaderOpen\(true\)\}/);
  assert.match(board,/onOpenReader=\{\(\) => \{setSelectedBranch\(house.branchIndex\);setReaderOpen\(true\);\}\}/);
  assert.match(tile,/onDoubleClick=\{onOpenReader\}/);
});
test('reader: one native dialog with Escape, focus restoration, no duplicate astrology logic',()=>{
  assert.match(reader,/<dialog[\s\S]*?aria-modal="true"/);
  assert.match(reader,/modal\.showModal\(\)/);
  assert.match(reader,/onClose=\{\(\) => \{/);
  assert.match(reader,/if \(!modalRef\.current\?\.open\) onClose\(\)/);
  assert.match(reader,/previousFocus\?\.focus\(\)/);
  assert.match(reader,/modal\.close\(\)/);
  assert.match(reader,/<PalaceDetails house=\{house\}/);
  assert.doesNotMatch(reader,/Engine\.|calculate\(|annualOverview\(/);
});
test('reader: panel shows all data layers and full detail; navigation uses stable branch order',()=>{
  assert.match(reader,/adjacentPalaceBranch\(houses, house\.branchIndex, direction\)/);
  assert.match(reader,/aria-live="polite"/);
  assert.match(reader,/house\.auxiliaryStars\.length \+ house\.yearStars\.length \+ \(house\.additionalStars\?\.length \?\? 0\)/);
  assert.match(reader,/ruleSet=\{ruleSet\} annual=\{annual\}/);
  assert.match(reader,/showAnnual=\{showAnnual\} showStrength=\{showStrength\}/);
});
test('reader: typography toggles without scaling or shrinking the 12-palace chart',()=>{
  assert.match(reader,/data-reader-font=\{largeText \? 'large' : 'normal'\}/);
  assert.match(reader,/aria-pressed=\{largeText\}/);
  assert.match(styles,/data-reader-font="large"/);
  assert.match(styles,/\.palace-reader-content \.atlas-details-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles,/@media\(max-width:650px\)/);
  assert.match(styles,/\.palace-reader-dialog::backdrop/);
  assert.doesNotMatch(styles,/\.astrology-grid\s*\{|\.atlas-grid\s*\{/);
});
test('reader: stylesheet loads only after fit and heritage layers',()=>{
  const layout=read('apps/web/src/app/layout.tsx');
  const fit=layout.indexOf(["import ","'./chart-fit.css';"].join(""));
  const focus=layout.indexOf(["import ","'./palace-reader.css';"].join(""));
  assert.ok(fit>=0 && focus>fit);
  assert.match(reader,/data-reader-skin=\{skin\}/);
  assert.match(styles,/data-reader-skin="jade"/);
});
