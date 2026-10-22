const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../packages/engine/cycles.js');
const T=require('../packages/engine/tuvi.js');
const BR=T.BRANCHES;
const at=(arr,name)=>BR[arr.find(x=>x.name===name).branch];
test('Vòng Thái Tuế: every birth branch and all 12 sequence stars',()=>{
 for(let br=0;br<12;br++){
  const x=C.calculate({yearStem:0,yearBranch:br,gender:'Nam',cucNumber:2,locTonBranch:2,menhBranch:7});
  assert.equal(x.thaiTue.length,12);assert.equal(x.thaiTue[0].branch,br);
  assert.equal(x.thaiTue[6].branch,(br+6)%12);
  assert.equal(x.thaiTue[11].branch,(br+11)%12);
  assert.deepEqual(x.thaiTue.map(y=>y.name),C.THAI_TUE);
 }
});
test('Tràng Sinh fixed anchors for all five Cục',()=>{
 for(const [cuc,start] of Object.entries({2:'Thân',3:'Hợi',4:'Tỵ',5:'Thân',6:'Dần'})){
  const x=C.calculate({yearStem:0,yearBranch:0,gender:'Nam',cucNumber:+cuc,locTonBranch:2,menhBranch:3});
  assert.equal(at(x.trangSinh,'Tràng Sinh'),start);
  assert.equal(new Set(x.trangSinh.map(y=>y.branch)).size,12);
 }
});
test('Bác Sĩ first at Lộc Tồn for each start; name order and progression',()=>{
 for(let loc=0;loc<12;loc++){
  const x=C.calculate({yearStem:1,yearBranch:5,gender:'Nam',cucNumber:3,locTonBranch:loc,menhBranch:1});
  assert.equal(x.bacSi[0].branch,loc);assert.equal(x.bacSi[1].branch,(loc+11)%12);
  assert.deepEqual(x.bacSi.map(y=>y.name),C.BAC_SI);
 }
});
test('Dương Nam/Âm Nữ thuận, Âm Nam/Dương Nữ nghịch',()=>{
 assert.equal(C.direction(0,'Nam'),1);assert.equal(C.direction(0,'Nữ'),-1);
 assert.equal(C.direction(1,'Nam'),-1);assert.equal(C.direction(1,'Nữ'),1);
 assert.throws(()=>C.direction(11,'Nam'));
});
test('Đại hạn start at Mệnh, age Cục, +10 for each direction and no overlap',()=>{
 for(const gender of ['Nam','Nữ'])for(let stem=0;stem<10;stem++)for(let cuc=2;cuc<=6;cuc++){
  const x=C.calculate({yearStem:stem,yearBranch:4,gender,cucNumber:cuc,locTonBranch:3,menhBranch:7});
  assert.equal(x.daiHan[0].branch,7);assert.equal(x.daiHan[0].fromAge,cuc);
  assert.deepEqual(x.daiHan.map(h=>h.fromAge),Array.from({length:12},(_,i)=>cuc+i*10));
  assert.equal(new Set(x.daiHan.map(h=>h.branch)).size,12);
  assert.equal(x.daiHan[11].toAge,cuc+119);
  assert.equal(x.daiHan[1].branch,(7+x.direction+12)%12);
 }
});
test('Year highlight 2026 is Ngọ; prior to lunar new year must use prior Can Chi cycle',()=>{
 assert.equal(BR[C.yearBranch(2026)],'Ngọ');
 assert.equal(BR[C.yearBranch(2025)],'Tỵ');
 assert.match(C.yearHighlight(2026).warning,/âm lịch/);
 assert.throws(()=>C.yearBranch(2101));
});
test('Integration: 36 cycle stars exactly once per named group and 12 separate decades',()=>{
 for(const year of [1990,2004,2023,2026])for(const gender of ['Nam','Nữ'])for(const hour of [0,9,23]){
  const x=T.calculate({date:`${year}-08-15`,hour,gender});
  assert.equal(x.cycles.thaiTue.length,12);
  assert.equal(x.cycles.bacSi.length,12);
  assert.equal(x.cycles.trangSinh.length,12);
  assert.equal(x.cycles.daiHan.length,12);
  for(const kind of ['thaiTue','bacSi','trangSinh']){
   assert.equal(x.houses.flatMap(h=>h.cycleStars[kind]).length,12);
   assert.equal(new Set(x.houses.flatMap(h=>h.cycleStars[kind])).size,12);
  }
  assert.equal(x.houses.filter(h=>h.daiHan).length,12);
  assert.equal(x.coverage.fullLuuNien,false);
 }
});
test('Guards missing, invalid inputs instead of arbitrary placements',()=>{
 const args={yearStem:0,yearBranch:0,gender:'Nam',cucNumber:2,locTonBranch:2,menhBranch:3};
 assert.throws(()=>C.calculate({...args,cucNumber:0}));
 assert.throws(()=>C.calculate({...args,locTonBranch:12}));
 assert.throws(()=>C.calculate({...args,gender:'Khác'}));
});
