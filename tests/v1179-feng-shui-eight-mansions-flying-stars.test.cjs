'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const folder='../apps/web/src/features/feng-shui';
const bt=require(folder+'/eight-mansions.cjs');
const fs9=require(folder+'/flying-stars.cjs');
const compass=require(folder+'/compass.cjs');
const root=path.resolve(__dirname,'..');

test('V11.79: Bát Trạch có đủ tám mệnh quái, không có quái 5 và 8 hướng mỗi quái',()=>{
 assert.deepEqual(Object.keys(bt.GUA).map(Number),[1,2,3,4,6,7,8,9]);
 for(const no of [1,2,3,4,6,7,8,9]){
  const table=bt.directionsForGua(no);
  assert.equal(table.length,8);
  assert.deepEqual(new Set(table.map(r=>r.direction)),new Set(bt.DIRECTIONS));
  assert.deepEqual(new Set(table.map(r=>r.key)),new Set(Object.keys(bt.LABELS)));
  assert.equal(table.filter(x=>x.kind==='cát').length,4);
  assert.equal(table.filter(x=>x.kind==='hung').length,4);
  assert.equal(table.find(x=>x.key==='phuc').direction,bt.GUA[no].direction);
 }
});
test('V11.79: 8 quái — fixture Bát Trạch (Sinh Khí, Thiên Y, Diên Niên, Phục Vị)',()=>{
 const expected={1:['Đông Nam','Đông','Nam','Bắc'],2:['Đông Bắc','Tây','Tây Bắc','Tây Nam'],3:['Nam','Bắc','Đông Nam','Đông'],4:['Bắc','Nam','Đông','Đông Nam'],6:['Tây','Đông Bắc','Tây Nam','Tây Bắc'],7:['Tây Bắc','Tây Nam','Đông Bắc','Tây'],8:['Tây Nam','Tây Bắc','Tây','Đông Bắc'],9:['Đông','Đông Nam','Bắc','Nam']};
 for(const [no,names] of Object.entries(expected)){
  const table=bt.directionsForGua(Number(no));
  assert.deepEqual(['sinh','thien','nien','phuc'].map(key=>table.find(x=>x.key===key).direction),names);
 }
});
test('V11.79: Mệnh quái 1900..2099 theo chu kỳ 9 năm, quy tắc thế quái 5',()=>{
 assert.equal(bt.lifeGua(1985,'male').number,6);
 assert.equal(bt.lifeGua(1985,'female').number,9);
 assert.equal(bt.lifeGua(2000,'male').number,9);
 assert.equal(bt.lifeGua(2001,'female').number,7);
 assert.equal(bt.lifeGua(2004,'male').raw,5);
 assert.equal(bt.lifeGua(2004,'male').number,2);
 assert.equal(bt.lifeGua(1990,'female').raw,5);
 assert.equal(bt.lifeGua(1990,'female').number,8);
 for(let y=1900;y<=2099;y++)for(const sex of ['male','female']){
  const r=bt.lifeGua(y,sex);
  assert.ok(bt.GUA[r.number]);
  if(y+9<=2099)assert.equal(r.number,bt.lifeGua(y+9,sex).number);
 }
});
test('V11.79: Quái nhà dựa hướng tọa khác hướng mặt quay ra, không theo năm sinh',()=>{
 for(let d=0;d<360;d+=15){
  const a=compass.orientation(d);
  const h=bt.houseGua(a.sitting.trigram);
  assert.equal(h.name,a.sitting.trigram);
  assert.equal(bt.directionsForGua(h.number).find(x=>x.key==='phuc').direction,h.direction);
 }
 assert.equal(bt.houseGua(compass.orientation(180).sitting.trigram).number,1);
 assert.equal(bt.compareGua(1,9).sameGroup,true);
 assert.equal(bt.compareGua(1,2).sameGroup,false);
});
test('V11.79: Kiểm soát input của bảng quái',()=>{
 for(const invalid of [1899,2100,2004.25,'2004',NaN,Infinity])assert.throws(()=>bt.lifeGua(invalid,'male'),RangeError);
 assert.throws(()=>bt.lifeGua(2004,'unknown'),RangeError);
 assert.throws(()=>bt.directionsForGua(5),RangeError);
 assert.throws(()=>bt.directionsForGua(1.1),RangeError);
 assert.throws(()=>bt.houseGua('Bắc'),RangeError);
 assert.throws(()=>bt.houseGua(null),TypeError);
 assert.throws(()=>bt.compareGua(5,1),RangeError);
});
test('V11.79: Chín cung phi tinh đi theo đúng đường bay Lạc Thư, 9 sao không lặp',()=>{
 assert.deepEqual(fs9.PATH,[5,6,7,8,9,1,2,3,4]);
 assert.deepEqual(fs9.PALACES.map(p=>p.number),[4,9,2,3,5,7,8,1,6]);
 for(let center=1;center<=9;center++)for(const mode of ['forward','reverse']){
  const cells=fs9.flyFromCenter(center,mode);
  assert.equal(cells.length,9);
  assert.equal(new Set(cells.map(x=>x.star)).size,9);
  assert.equal(cells.find(x=>x.number===5).star,center);
  for(const [step,palace] of fs9.PATH.entries()){
   const c=cells.find(x=>x.number===palace);
   const target=((center+step*(mode==='forward'?1:-1)-1)%9+9)%9+1;
   assert.equal(c.star,target);
   assert.equal(c.step,step);
  }
 }
});
test('V11.79: Vận 9 nền, không trộn thành tinh bàn nhà',()=>{
 const r=fs9.periodStarChart(9);
 assert.deepEqual(Object.fromEntries(r.positions.map(x=>[x.number,x.star])),{1:5,2:6,3:7,4:8,5:9,6:1,7:2,8:3,9:4});
 assert.match(r.limitation,/Chưa an sơn tinh, hướng tinh/i);
 for(let period=1;period<=9;period++)assert.equal(fs9.periodStarChart(period).center,period);
 for(const bad of [0,10,5.5,'9',NaN])assert.throws(()=>fs9.periodStarChart(bad),RangeError);
});
test('V11.79: Niên bàn đối chiếu độc lập 2024–2027, niên độ Lập Xuân',()=>{
 const fixtures={2024:{5:3,6:4,7:5,8:6,9:7,1:8,2:9,3:1,4:2},2025:{5:2,6:3,7:4,8:5,9:6,1:7,2:8,3:9,4:1},2026:{5:1,6:2,7:3,8:4,9:5,1:6,2:7,3:8,4:9},2027:{5:9,6:1,7:2,8:3,9:4,1:5,2:6,3:7,4:8}};
 for(const [year,fixture] of Object.entries(fixtures)){
  const r=fs9.annualStarChart(Number(year));
  for(const c of r.positions)assert.equal(c.star,fixture[c.number]);
 }
 assert.equal(fs9.annualStarChart(2033).center,3);
 for(const bad of [1899,2100,NaN,'2026'])assert.throws(()=>fs9.annualStarChart(bad),RangeError);
});
test('V11.79: Chu kỳ 180 năm gồm 9 vận × 20 năm, không lấy 01/01 làm mốc giao vận',()=>{
 assert.equal(fs9.periodByConfirmedSolarYear(2003).period,7);
 assert.equal(fs9.periodByConfirmedSolarYear(2004).period,8);
 assert.equal(fs9.periodByConfirmedSolarYear(2023).period,8);
 assert.equal(fs9.periodByConfirmedSolarYear(2024).period,9);
 assert.equal(fs9.periodByConfirmedSolarYear(2043).period,9);
 assert.equal(fs9.periodByConfirmedSolarYear(2044).period,1);
 for(let year=1864;year<=2223;year++){
  const p=fs9.periodByConfirmedSolarYear(year);
  assert.ok(p.period>=1&&p.period<=9&&year>=p.starts&&year<p.starts+20);
 }
});
test('V11.79: UI đúng module; có cảnh báo về giới hạn sơn/hướng tinh',()=>{
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const page=read('apps/web/src/app/phong-thuy/page.tsx');
 const ui=read('apps/web/src/features/feng-shui/study.tsx');
 assert.match(page,/FengShuiStudy orientationResult/);
 assert.match(ui,/houseGua\(/);
 assert.match(ui,/lifeGua\(/);
 assert.match(ui,/periodStarChart\(/);
 assert.match(ui,/annualStarChart\(/);
 assert.match(ui,/natalStarChart\(/);
 assert.match(ui,/Lập Xuân/);
 assert.match(ui,/aria-pressed=/);
 assert.ok(fs.existsSync(path.join(root,'apps/web/src/features/feng-shui/feng-shui-study.module.css')));
});
