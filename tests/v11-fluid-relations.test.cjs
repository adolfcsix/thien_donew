'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
const ts = require('./helpers-typeloader.cjs');
const src=read('apps/web/src/features/chart/lib/relation-motion.ts');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleWrap={exports:{}};
vm.runInNewContext(js,{module:moduleWrap,exports:moduleWrap.exports});
const {easeOutCubic,interpolatePoint}=moduleWrap.exports;
const plain=v=>JSON.parse(JSON.stringify(v));

test('relation motion starts and ends at exactly measured palace anchor points',()=>{
 const a={x:40,y:90},b={x:210,y:400};
 assert.deepEqual(plain(interpolatePoint(a,b,0)),a);
 assert.deepEqual(plain(interpolatePoint(a,b,1)),b);
});
test('relation motion eases smoothly and monotonically without overshoot',()=>{
 const steps=Array.from({length:101},(_,i)=>easeOutCubic(i/100));
 assert.ok(steps.every((v,i)=>v>=0&&v<=1&&(i===0||v>=steps[i-1])));
 assert.ok(easeOutCubic(.5)>.5,'must slow down near the destination');
 assert.ok(steps.slice(1).every((v,i)=>Number.isFinite(v)));
});
test('relation motion safely clamps bad progress inputs',()=>{
 assert.equal(easeOutCubic(-4),0);
 assert.equal(easeOutCubic(10),1);
 assert.equal(easeOutCubic(NaN),1);
});
test('relationship canvas persists through hover-out and respects reduced motion',()=>{
 const board=read('apps/web/src/features/chart/components/chart-board.tsx');
 const overlay=read('apps/web/src/features/chart/components/palace-relation-lines.tsx');
 const css=read('apps/web/src/app/palace-insight-dock.css');
 assert.match(board,/showRelationLines && <PalaceRelationLines/);
 assert.match(overlay,/setVisible\(false\)/);
 assert.match(overlay,/interpolatePoint\(previous\.edges\[i\]\.start,edge\.start,progress\)/);
 assert.match(overlay,/prefers-reduced-motion: reduce/);
 assert.match(overlay,/TRANSITION_MS = 230/);
 assert.match(css,/\.chart-relation-lines\[data-visible="false"\]\{opacity:0\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.chart-relation-lines\{transition:none\}\}/);
});
test('hover grace period prevents flashes between adjacent palace cells',()=>{
 const board=read('apps/web/src/features/chart/components/chart-board.tsx');
 assert.match(board,/hoverExitTimer/);
 assert.match(board,/}, 65\)/);
 assert.match(board,/clearTimeout\(hoverExitTimer\.current\)/);
});
test('SVG hover guide does not take pointer input or alter natal star calculation',()=>{
 const overlay=read('apps/web/src/features/chart/components/palace-relation-lines.tsx');
 const css=read('apps/web/src/app/palace-insight-dock.css');
 assert.match(css,/\.chart-relation-lines\{[^}]*pointer-events:none/);
 assert.match(overlay,/aria-hidden="true" focusable="false"/);
 assert.doesNotMatch(overlay,/calculate\(|annualOverview\(|setSelectedBranch/);
});
