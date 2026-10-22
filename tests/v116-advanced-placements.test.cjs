'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const A=require(path.join(root,'packages/astrology-engine/src/advanced-placements.js'));
const E=require(path.join(root,'packages/astrology-engine/src/tuvi.js'));
const V=require(path.join(root,'packages/astrology-engine/src/verify.js'));
const Svg=require(path.join(root,'packages/chart-export/src/index.cjs'));
const base={date:'2026-10-10',hour:12,minute:30,gender:'Nam',calendar:'solar',leap:false};
const mod=(n,k)=>(n%k+k)%k;

test('V11.6: Tuần and Triệt known-source tables for 60 sexagenary years',()=>{
  const starts=[[10,11],[8,9],[6,7],[4,5],[2,3],[0,1]];
  const triet=[[8,9],[6,7],[4,5],[2,3],[0,1]];
  for(let k=0;k<60;k++){
    const a=A.calculate({yearStem:k%10,yearBranch:k%12,hourBranch:0,gender:'Nam'});
    const [tuan,tr]=a.obstructions;
    assert.deepEqual(tuan.branches,starts[Math.floor(k/10)],`Tuần ${k}`);
    assert.deepEqual(tr.branches,triet[k%5],`Triệt ${k}`);
  }
});
test('V11.6: Không/Kiếp start at Hợi (Tý hour), Kiếp goes forward and Không backward',()=>{
  for(let hour=0;hour<12;hour++){
    const a=A.calculate({yearStem:0,yearBranch:0,hourBranch:hour,gender:'Nam'}).stars;
    assert.equal(a.find(x=>x.name==='Địa Kiếp').branch,mod(11+hour,12));
    assert.equal(a.find(x=>x.name==='Địa Không').branch,mod(11-hour,12));
  }
});
test('V11.6: Hỏa/Linh use documented four chi-trines and opposite hour directions',()=>{
  const starts={2:[1,3],8:[2,10],5:[3,10],11:[9,10]};
  for(const [branch,start] of Object.entries(starts)) {
    for(let gender of ['Nam','Nữ']) {
      const yearBranch=Number(branch),yearStem=yearBranch%2;
      const direction=((yearStem%2===0)===(gender==='Nam'))?1:-1;
      for(let hour=0;hour<12;hour++){
        const a=A.calculate({yearStem,yearBranch,hourBranch:hour,gender}).stars;
        assert.equal(a.find(x=>x.name==='Hỏa Tinh').branch,mod(start[0]+direction*hour,12));
        assert.equal(a.find(x=>x.name==='Linh Tinh').branch,mod(start[1]-direction*hour,12));
      }
    }
  }
});
test('V11.6: validation rejects invalid Can Chi, out of range hours and genders',()=>{
  const valid={yearStem:0,yearBranch:0,hourBranch:0,gender:'Nam'};
  for(const input of [{...valid,yearStem:-1},{...valid,yearBranch:12},{...valid,hourBranch:12},
    {...valid,yearStem:1},{...valid,gender:'unknown'},{...valid,hourBranch:1.5}]) assert.throws(()=>A.calculate(input),RangeError);
});
test('V11.6: chart wiring exposes placements once, obstruction pairs twice, and keeps original seven',()=>{
  for(const date of ['2026-10-10','1988-02-17','1999-04-30']) for(const hour of [0,11,23]) for(const gender of ['Nam','Nữ']){
    const chart=E.calculate({...base,date,hour,gender});
    assert.equal(chart.additionalStars.length,7);
    assert.equal(chart.advancedStars.length,4);
    assert.equal(chart.obstructionMarkers.length,2);
    assert.equal(chart.houses.flatMap(h=>h.advancedStars).length,4);
    assert.equal(chart.houses.flatMap(h=>h.obstructionMarkers).length,4);
    assert.equal(chart.coverage.fullLuuNien,false);
    assert.equal(V.check(chart).passed,true);
    for(const star of chart.advancedStars) assert.ok(chart.houses[star.branch].advancedStars.includes(star.name));
  }
});
test('V11.6: independent checker rejects corrupt advanced positions / obstruction markers',()=>{
  const chart=E.calculate(base);
  const corrupt=structuredClone(chart); corrupt.advancedStars[0].branch=(corrupt.advancedStars[0].branch+1)%12;
  assert.equal(V.check(corrupt).passed,false);
  const damaged=structuredClone(chart); damaged.obstructionMarkers[0].branches=[0,0];
  assert.equal(V.check(damaged).passed,false);
});
test('V11.6: SVG export includes source-derived advanced stars and paired markers in description',()=>{
  const chart=E.calculate(base);const svg=Svg.renderChartSvg(chart,'Bản kiểm tra');
  for(const star of chart.advancedStars) assert.ok(svg.includes(star.name));
  assert.ok(svg.includes('Tuần'));assert.ok(svg.includes('Triệt'));
  assert.ok(svg.includes('Sát tinh mở rộng'));
});
test('V11.6: new fields do not change existing 14 main stars or annual period rules',()=>{
  const chart=E.calculate(base);
  assert.equal(chart.houses.flatMap(h=>h.stars).length,14);
  const annual=E.annualOverview(chart,2027);
  assert.equal(annual.luuStars.items.length,12);
  assert.equal(typeof annual.tieuHan.branchIndex,'number');
  assert.equal(chart.coverage.fullLuuNien,false);
});

test('V11.6: Lưu Đào Hoa, Hoa Cái, Hồng Loan, Thiên Hỷ follow original branch tables',()=>{
  const Year=require(path.join(root,'packages/astrology-engine/src/year-stars.js'));
  const chart=E.calculate(base);
  for(let y=2026;y<=2050;y++){
    const a=E.annualOverview(chart,y);
    assert.equal(a.luuStars.items.length,12);
    const source=Year.calculate((y-4)%12);
    for(const n of ['Thiên Mã','Đào Hoa','Hoa Cái','Hồng Loan','Thiên Hỷ']){
      assert.equal(a.luuStars.items.find(x=>x.name===`Lưu ${n}`).branch,source.find(x=>x.name===n).branch);
    }
  }
});
test('V11.6: independent annual overlays remain independent of the birth chart',()=>{
  const chart=E.calculate(base);const snapshot=JSON.stringify(chart);
  const a=E.annualOverview(chart,2027);const b=E.annualOverview(chart,2028);
  assert.equal(JSON.stringify(chart),snapshot);
  assert.notDeepEqual(a.luuStars.items.map(x=>x.branch),b.luuStars.items.map(x=>x.branch));
  assert.equal(chart.coverage.fullLuuNien,false);
});
