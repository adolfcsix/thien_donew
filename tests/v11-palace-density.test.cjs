'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const {calculate,annualOverview}=require('../packages/astrology-engine/src/tuvi.js');
const chart=()=>calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
test('V11 phase 2: star strength badges use engine values without changing calculation',()=>{
 const s=['chart-board.tsx','chart-strength-legend.tsx','palace-tile.tsx','star-groups.tsx'].map(name=>read('apps/web/src/features/chart/components/'+name)).join('\n');
 assert.match(s,/function MainStarGroup\(/);
 assert.match(s,/house\.mainStarStrengths\?\.find\(item => item\.name===name\)/);
 assert.match(s,/aria-label=\{`\$\{name\}: \$\{placement\.label\}/);
 for(const star of ['m','v','d','b','h'])assert.match(read('apps/web/src/app/chart-heritage.css'),new RegExp(`atlas-strength-${star}\\{`));
});
test('V11 phase 2: the board no longer silently limits star-group content',()=>{
 const s=['chart-board.tsx','chart-strength-legend.tsx','palace-tile.tsx','star-groups.tsx'].map(name=>read('apps/web/src/features/chart/components/'+name)).join('\n');
 assert.match(s,/label="PHỤ TINH" items=\{house\.auxiliaryStars\}/);
 assert.match(s,/label="SAO CHI NĂM" items=\{house\.yearStars\} variant="year"\s*\/>/);
 assert.match(s,/label="SAO BỔ SUNG" items=\{house\.additionalStars \?\? \[\]\} variant="year"\s*\/>/);
 assert.match(s,/label="LƯU NIÊN" items=\{annualLabels\} variant="year"\s*\/>/);
 assert.match(s,/atlas-strength-legend/);
});
test('V11 phase 2: exported chart provides visible summary count for a densely populated palace',()=>{
 const c=chart(), a=annualOverview(c,2026);
 const h=c.houses[0];
 h.auxiliaryStars=Array.from({length:22},(_,i)=>`Phụ tinh ${i+1}`);
 h.yearStars=Array.from({length:12},(_,i)=>`Sao năm ${i+1}`);
 h.additionalStars=Array.from({length:8},(_,i)=>`Sao bổ sung ${i+1}`);
 h.tuHoa=Array.from({length:8},(_,i)=>({name:`Hóa ${i+1}`,star:'Tử Vi'}));
 const before=JSON.stringify(c);
 const svg=renderChartSvg(c,'Thử < & > "',a);
 assert.equal((svg.match(/width="290" height="290"/g)||[]).length,12);
 assert.match(svg,/\+17 mục · xem JSON/);
 assert.match(svg,/\+10 mục · xem JSON/);
 // The combined extension column now includes new traditional stars as well.
 assert.match(svg,new RegExp('\\+' + (6+(h.traditionalStars?.length??0)) + ' mục · xem JSON'));
 assert.match(svg,/TỨ HÓA \(SINH \/ LƯU\)/);
 assert.match(svg,/&lt; &amp; &gt; &quot;/);
 assert.doesNotMatch(svg,/<script|<foreignObject|<image/i);
 assert.equal(JSON.stringify(c),before,'SVG export must not mutate the engine result');
});
test('V11 phase 2: normal export keeps status attached to correct main star and names as distinct fields',()=>{
 const c=chart(), a=annualOverview(c,2026);
 const house=c.houses.find(h=>h.stars.length && h.mainStarStrengths?.length);
 assert.ok(house);
 const placed=house.mainStarStrengths.find(s=>house.stars.includes(s.name));
 assert.ok(placed);
 const svg=renderChartSvg(c,'Bản mẫu',a);
 assert.ok(svg.includes(`${placed.name} [${placed.status==='D'?'Đ':placed.status}]`));
});
test('V11 phase 2: exporter uses bounded text regions and marks shortened star names',()=>{
 const c=chart();
 c.houses[1].stars=['Tên sao rất dài không thể hiển thị đầy đủ trong ô cung'];
 const svg=renderChartSvg(c,'Tên','');
 assert.match(svg,/Tên sao rất dài khô…/);
 assert.match(read('packages/chart-export/src/index.cjs'),/function compactLabel\(/);
 assert.match(read('packages/chart-export/src/index.cjs'),/maxRows-1/);
});
