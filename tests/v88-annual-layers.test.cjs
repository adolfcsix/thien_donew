"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Annual=require('../packages/astrology-engine/src/annual.js');
const Layers=require('../packages/astrology-engine/src/annual-layers.js');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const fixture=require('./fixtures/annual-tu-hoa-toan-thu.json');
const stems=Object.keys(fixture.rows);
const chart=(y=2004,gender='Nam')=>Engine.calculate({date:`${y}-08-15`,calendar:'solar',gender,hour:9,minute:0,leap:false});

test('V8.8: 10 can Tứ Hóa match published table for all selected years',()=>{
  const c=chart();
  for(let year=2024;year<2034;year++){
    const a=Engine.annualOverview(c,year);
    const stem=(year-4)%10;
    assert.equal(a.luuTuHoa.items.length,4);
    assert.deepEqual(a.luuTuHoa.items.map(t=>t.star),fixture.rows[stems[stem]]);
    assert.deepEqual(a.luuTuHoa.items.map(t=>t.name),['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
    for(const t of a.luuTuHoa.items){
      const h=c.houses.find(h=>h.branchIndex===t.branch);
      assert.ok(h.stars.includes(t.star)||h.auxiliaryStars.includes(t.star));
      assert.equal(t.palace,h.palace);
    }
  }
});

test('V8.8: annual labels are independent from natal, and birth chart immutable',()=>{
  const c=chart(2004);
  const before=JSON.stringify(c);
  const a2026=Engine.annualOverview(c,2026);
  const a2027=Engine.annualOverview(c,2027);
  assert.equal(JSON.stringify(c),before);
  assert.equal(a2026.canChi,'Bính Ngọ');
  assert.equal(a2027.canChi,'Đinh Mùi');
  assert.notDeepEqual(a2026.luuTuHoa.items.map(t=>t.star),a2027.luuTuHoa.items.map(t=>t.star));
  assert.equal(c.coverage.fullLuuNien,false);
  assert.match(a2026.note,/CHƯA tính đầy đủ lưu niên/);
});

test('V11.6: 8 annual stars, year-branch recurrence and signed stem placements',()=>{
  const c=chart();
  for(let y=2004;y<=2100;y++){
    const a=Engine.annualOverview(c,y);
    assert.deepEqual(a.luuStars.items.map(x=>x.name),['Lưu Lộc Tồn','Lưu Kình Dương','Lưu Đà La','Lưu Thiên Mã','Lưu Đào Hoa','Lưu Hoa Cái','Lưu Hồng Loan','Lưu Thiên Hỷ','Lưu Tang Môn','Lưu Bạch Hổ','Lưu Thiên Khốc','Lưu Thiên Hư']);
    const [loc,kinh,da,ma]=a.luuStars.items;
    assert.equal(kinh.branch,(loc.branch+1)%12);
    assert.equal(da.branch,(loc.branch+11)%12);
    for(const s of a.luuStars.items){
      assert.equal(c.houses[s.branch].palace,s.palace);
      assert.ok(s.branch>=0&&s.branch<12);
    }
    if(y+12<=2100)assert.equal(ma.branch,Engine.annualOverview(c,y+12).luuStars.items[3].branch);
  }
});

test('V8.8: reject malformed chart and out-of-bounds year-stem',()=>{
  const c=chart();
  assert.throws(()=>Layers.calculate(c,10,0),RangeError);
  assert.throws(()=>Layers.calculate(c,0,-1),RangeError);
  assert.throws(()=>Layers.calculate({...c,houses:c.houses.slice(0,11)},0,0),TypeError);
  const duplicate=structuredClone(c);
  duplicate.houses[0].stars.push(duplicate.houses[1].stars[0]||'Tử Vi');
  assert.throws(()=>Layers.calculate(duplicate,0,0),/Trùng sao/);
});

test('V8.8: SVG export includes annual overlay, is safe for XML text, 12 palaces',()=>{
  const c=chart(),a=Engine.annualOverview(c,2026);
  const svg=renderChartSvg(c,'Tên <người dùng> & Kiểm thử',a);
  assert.match(svg,/Lưu Tứ Hóa/);
  assert.match(svg,/Lưu Lộc Tồn/);
  assert.match(svg,/Hóa Lộc/);
  assert.match(svg,/Tên &lt;người dùng&gt; &amp; Kiểm thử/);
  assert.doesNotMatch(svg,/<người dùng>/);
  assert.equal((svg.match(/<rect x="\d+(?:\.\d+)?" y="\d+(?:\.\d+)?" width="290"/g)||[]).length,12);
});

test('V8.8: source wiring and public types indicate overlays, not predictions',()=>{
  const p=join(__dirname,'../apps/web/src/features/chart/components/chart-board.tsx');
  const jsx=readFileSync(p,'utf8');
  const header=readFileSync(join(__dirname,'../apps/web/src/features/chart/components/chart-board-header.tsx'),'utf8');
  assert.match(jsx, /<ChartBoardHeader result=\{result\}/);
  const types=readFileSync(join(__dirname,'../packages/shared-types/index.d.ts'),'utf8');
  assert.match(header,/Lưu Tứ Hóa/);
  assert.match(jsx,/showAnnual/);
  assert.match(header,/showAnnual/);
  assert.match(types,/luuTuHoa:AnnualFourTransformations/);
  assert.match(types,/luuStars:AnnualStars/);
});
