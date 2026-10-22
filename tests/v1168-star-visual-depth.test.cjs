'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const colors=require('../packages/knowledge/src/star-display-groups.json');
const {categoryFor,colorFor}=require('../packages/chart-export/src/star-display.cjs');
const {calculate,annualOverview}=require('../packages/astrology-engine/src/tuvi.js');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');

test('V11.68 one shared audited visual taxonomy for atlas and print; Lưu Hà remains natal',()=>{
 assert.equal(colors.scope,'presentation-only');
 assert.equal(colors.main.length,14);
 assert.equal(categoryFor('Hóa Lộc · Tử Vi'),'transform');
 assert.equal(categoryFor('Hóa Lộc · Tử Vi',{annual:true}),'annual');
 assert.equal(categoryFor('Lưu Hà'),'neutral','Lưu Hà is a natal star, not an annual overlay');
 assert.equal(categoryFor('Thái Tuế',{cycle:true}),'cycle');
 assert.equal(categoryFor('Thiên Khôi'),'support');
 assert.equal(categoryFor('Kình Dương'),'challenging');
 assert.equal(colorFor('Kình Dương'),colors.colors.challenging);
 for(const key of ['main','support','challenging','transform']) assert.equal(new Set(colors[key]).size,colors[key].length);
 const frontend=read('apps/web/src/features/chart/lib/star-visuals.ts');
 assert.match(frontend,/star-display-groups\.json/);
 assert.doesNotMatch(frontend,/Lưu '\)|startsWith\('Lưu/);
});

test('V11.68 chart colorization preserves chart calculations and escaped SVG output',()=>{
 const chart=calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
 const annual=annualOverview(chart,2026);
 const before=JSON.stringify(chart);
 const svg=renderChartSvg(chart,'<&" Xiii',annual);
 assert.equal(JSON.stringify(chart),before);
 assert.match(svg,/&lt;&amp;&quot; Xiii/);
 assert.match(svg,/Màu phân biệt nhóm sao/);
 assert.match(svg,/fill="#9c3746"/);
 assert.match(svg,/fill="#22745e"|fill="#b94e30"/);
 assert.doesNotMatch(svg,/<script|<foreignObject|<image/i);
 assert.equal((svg.match(/width="290" height="290"/g)||[]).length,12);
});

test('V11.68 pure palace geometry does not introduce annual stars or fake positions',()=>{
 const code=`const {relativePalace,natalStarNames,locateNatalStar} = await import('./'+'apps/web/src/features/chart/lib/palace-star-context.ts');
 const base={branchIndex:0,branch:'Tý',palace:'Mệnh',stars:['Tử Vi'],auxiliaryStars:['Lưu Hà'],yearStars:[],additionalStars:[],traditionalStars:[],natalExtensionStars:[],beneficStars:[],positionalStars:[],missingStars:[],derivedStars:[],advancedStars:[],cycleStars:{trangSinh:['Tràng Sinh'],thaiTue:['Thái Tuế'],bacSi:['Bác Sĩ']}};
 const opposite={...base,branchIndex:6,branch:'Ngọ',palace:'Thiên Di',stars:['Tham Lang'],auxiliaryStars:['Đà La']};
 console.log(JSON.stringify({relations:[0,4,8,6,1,11,3].map(n=>relativePalace(0,n)),names:natalStarNames(base),found:locateNatalStar([base,opposite],'Đà La',0)}));`;
 const r=spawnSync(process.execPath,['--no-warnings','--experimental-strip-types','--input-type=module','--eval',code],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const data=JSON.parse(r.stdout);
 assert.deepEqual(data.relations,['Đồng cung','Tam hợp','Tam hợp','Đối cung','Giáp cung','Giáp cung','Cung khác']);
 assert.ok(data.names.includes('Lưu Hà'));
 assert.equal(data.found.length,1);
 assert.equal(data.found[0].relation,'Đối cung');
});

test('V11.68 all 12 cung can open inline dossiers without adding engine output fields',()=>{
 const board=read('apps/web/src/features/chart/components/chart-board.tsx');
 const overview=read('apps/web/src/features/chart/components/chart-palace-list.tsx');
 const ui=read('apps/web/src/features/chart/components/star-context-explorer.tsx');
 assert.match(board,/<StarContextExplorer house=\{selectedHouse\} houses=\{houses\}/);
 assert.match(board,/<StarColorLegend\s*\/>/);
 assert.match(overview,/\.\.\.\(house\.missingStars \?\? \[\]\)/);
 assert.match(ui,/primary-star-palace-guidance\.json/);
 assert.match(ui,/star-dossiers\.json/);
 assert.match(ui,/locateNatalStar\(houses,name,house\.branchIndex\)/);
 assert.match(ui,/!hasEditorial/);
});
