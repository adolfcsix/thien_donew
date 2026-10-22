const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');

test('Vietnamese type system is consistent and offline-safe',()=>{
 const css=read('apps/web/src/app/globals.css');
 const typography=read('apps/web/src/app/typography-refinement.css');
 assert.match(css,/--font-ui:/);
 assert.match(css,/--font-display:/);
 assert.match(css,/--font-han:/);
 assert.match(typography,/\.atlas-grid \.atlas-house \.atlas-star/);
 assert.doesNotMatch(css,/@import\s+url\(/);
 assert.doesNotMatch(css,/@font-face\s*\{/);
});

test('all page-level styles use shared serif token rather than incompatible hardcoded Georgia',()=>{
 const src=join(root,'apps/web/src/app');
 function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isDirectory()){scan(p);continue;}
  if(!entry.name.endsWith('.css')||entry.name==='globals.css')continue;
  const css=readFileSync(p,'utf8');
  assert.doesNotMatch(css,/\bGeorgia\b|\bTimes New Roman\b/,'Unstandardized CSS serif: '+p);
 }}
 scan(src);
});

test('all chart accents are indexed by stable địa chi branch, not grid geometry',()=>{
 const chart=read('apps/web/src/features/chart/components/palace-tile.tsx');
 assert.match(chart,/houseAccentStyle\(house\.cell, house\.branchIndex\)/);
 assert.match(chart,/houseAccentPalette\[branchIndex\]/);
 assert.match(chart,/['"]--house-accent['"]\s*:/); // normal CSS custom props
});

test('chart has pointer-preview without changing the clicked selection, plus coarse-pointer dismissal',()=>{
 const board=read('apps/web/src/features/chart/components/chart-board.tsx')+'\n'+read('apps/web/src/features/chart/components/palace-tile.tsx');
 assert.match(board,/onMouseEnter=\{onPreviewStart\}/);
 assert.match(board,/onMouseLeave=\{onPreviewEnd\}/);
 assert.match(board,/visualRelationBranch = showRelationLines \? previewBranch : null/);
 assert.match(board,/document\.addEventListener\('pointerdown', dismissOutsidePalace\)/);
 assert.match(board,/\[showInsightDock,setShowInsightDock\] = useState\(false\)/);
});

test('frontend Unicode labels have no replacement glyphs or obvious UTF-8 mojibake',()=>{
 const src=join(root,'apps/web/src');
 function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isDirectory()){scan(p);continue;}
  if(!/\.(css|tsx?|json)$/.test(entry.name))continue;
  const data=readFileSync(p,'utf8');
  assert.doesNotMatch(data,/\uFFFD|Ã¡|Ã¢|á»|Â·/,'Encoding suspect: '+p);
 }}
 scan(src);
});
