const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculate, annualOverview } = require('../packages/astrology-engine/src/tuvi.js');
const { renderChartSvg } = require('../packages/chart-export/src/index.cjs');
const base={date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
const calc=()=>calculate(base);
test('V8.6 age mu calculated from lunar birth year, not solar year',()=>{
  const c=calc();const view=annualOverview(c,2026);
  assert.equal(view.ageMu,2026-c.lunar.year+1);
  assert.equal(view.luuThaiTueBranch,'Ngọ');
  assert.equal(view.canChi,'Bính Ngọ');
});
test('V8.6 selected year refers to lunar year, not January 1',()=>{
  assert.equal(annualOverview(calc(),2025).canChi,'Ất Tỵ');
  assert.match(annualOverview(calc(),2025).note,/không mặc định bắt đầu/);
});
test('V8.6 annual year rejects invalid/prebirth/out of range',()=>{
  const chart=calc();
  for(const y of [1899,2101,NaN,2000.5,'2026',chart.lunar.year-1])
    assert.throws(()=>annualOverview(chart,y));
});
test('V8.6 major decade picks at most one house',()=>{
  const c=calc();
  for(let y=c.lunar.year;y<=2100;y++){
    const v=annualOverview(c,y);
    const matches=c.houses.filter(h=>h.daiHan && h.daiHan.fromAge<=v.ageMu && v.ageMu<=h.daiHan.toAge);
    assert.ok(matches.length<=1);
    assert.equal(v.activeDaiHan?.branchIndex??null,matches[0]?.branchIndex??null);
  }
});
test('V8.6 PNG source SVG has 12 distinct cells and correct dimensions',()=>{
  const c=calc();const svg=renderChartSvg(c,'Khách',annualOverview(c,2026));
  assert.match(svg,/width="1280" height="1530"/);
  assert.equal((svg.match(/<rect x="[0-9.]+" y="[0-9.]+" width="290" height="290"/g)||[]).length,12);
  assert.match(svg,/Bính Ngọ/);
  assert.match(svg,/Vô chính diệu|Chính:/);
});
test('V8.6 SVG escapes hostile user content and never references external sources',()=>{
  const s=renderChartSvg(calc(),'</text><script>alert("x")</script> &');
  assert.ok(s.includes('&lt;script&gt;'));
  assert.ok(!s.includes('<script>'));
  assert.ok(!s.includes('<image'));
  assert.ok(!/https?:\/\//.test(s.replace('http://www.w3.org/2000/svg','')));
});
test('V8.6 exporter rejects malformed charts',()=>{
  assert.throws(()=>renderChartSvg({houses:[{cell:1}]},'bad'));
});
test('V8.6 Next UI wires annual interaction to exported PNG',()=>{
  const root=path.resolve(__dirname,'..');
  const read=x=>fs.readFileSync(path.join(root,x),'utf8');
  assert.match(read('apps/web/src/features/chart/components/chart-board.tsx'),/annualYear/);
  assert.match(read('apps/web/src/features/chart/components/chart-result.tsx'),/onExportImage\(annualYear\)/);
  assert.match(read('apps/web/src/features/chart/lib/download-image.ts'),/canvas\.toBlob/);
  assert.match(read('apps/web/src/app/chart/page.tsx'),/onExportImage=\{exportImage\}/);
});
