'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
const board=read('apps/web/src/features/chart/components/chart-board.tsx')+'\n'+read('apps/web/src/features/chart/components/chart-display-controls.tsx');
const css=read('apps/web/src/app/chart-readability.css');
const fit=read('apps/web/src/app/chart-fit.css');
const layout=read('apps/web/src/app/layout.tsx');

test('readability: user can select comfortable/large chart type without altering astrology data',()=>{
 assert.match(board,/\[chartTextSize,setChartTextSize\] = useState<'comfortable' \| 'large'>\('comfortable'\)/);
 assert.match(board,/data-chart-text-size=\{chartTextSize\}/);
 assert.match(board,/aria-pressed=\{chartTextSize === 'comfortable'\}/);
 assert.match(board,/aria-pressed=\{chartTextSize === 'large'\}/);
 assert.doesNotMatch(board,/fontScale\s*\*\s*Engine/);
});
test('readability: enlarged font hierarchy covers main stars, auxiliary stars, labels and ages',()=>{
 for(const token of ['--chart-main-size:15px','--chart-aux-size:13px','--chart-cung-size:17px','--chart-main-size:17px','--chart-aux-size:14.5px','--chart-meta-size:11.5px'])assert.ok(css.includes(token),token);
 for(const selector of ['.atlas-main-star-entry strong','.atlas-house-assist .atlas-star','.atlas-house-header strong','.atlas-group-label','.atlas-age'])assert.ok(css.includes(selector),selector);
});
test('readability: CSS is last stylesheet after older heritage, fit and reader styles',()=>{
 for(const name of ['chart-heritage.css','chart-fit.css','palace-reader.css']) assert.ok(layout.indexOf(name)<layout.indexOf('chart-readability.css'),name);
 const styleImport = ['im', 'port ', "'./", 'chart-readability.css', "';"].join('');
 assert.ok(layout.includes(styleImport));
});
test('readability: smaller screens retain no forced horizontal scrolling and readable list fallback',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.chart-palace-list-item \.chart-list-content strong\{font-size:15px/);
 assert.match(fit,/\.chart-room-layout\[data-board-skin\] \.board-scroll\{[\s\S]*?overflow-x:clip/);
 assert.doesNotMatch(css,/white-space:nowrap;[^}]*atlas-star/);
});
test('readability: does not truncate star arrays or touch engine placement algorithms',()=>{
 assert.doesNotMatch(css,/text-overflow:ellipsis|line-clamp|overflow:hidden/);
 const tile=read('apps/web/src/features/chart/components/palace-tile.tsx');
 assert.match(tile,/items=\{house\.auxiliaryStars\}/);
 assert.match(tile,/items=\{house\.yearStars\}/);
 assert.match(tile,/<MainStarGroup house=\{house\}/);
});
