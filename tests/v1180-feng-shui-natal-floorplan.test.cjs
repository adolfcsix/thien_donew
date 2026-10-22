'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {SECTORS,orientation}=require('../apps/web/src/features/feng-shui/compass.cjs');
const {PATH,periodStarChart}=require('../apps/web/src/features/feng-shui/flying-stars.cjs');
const {MOUNTAINS,HOME_PALACE,mountainPosition,seedFlight,natalStarChart}=require('../apps/web/src/features/feng-shui/natal-flying-stars.cjs');
const {ZONES,ROOM_TYPES,blankFloorPlan,assignRoom}=require('../apps/web/src/features/feng-shui/floor-plan.cjs');

test('V11.80: kiểm kê đủ 24 sơn và âm dương nguyên long theo 8 quái',()=>{
 assert.equal(Object.keys(MOUNTAINS).length,8);
 const all=Object.values(MOUNTAINS).flat().map(item=>item[0]);
 assert.equal(all.length,24);
 assert.equal(new Set(all).size,24);
 assert.deepEqual(new Set(all),new Set(SECTORS.map(x=>x.name)));
 for(const sector of SECTORS){
  const pos=mountainPosition(sector);
  assert.equal(pos.palace,HOME_PALACE[sector.trigram]);
  assert.ok(pos.rank>=1&&pos.rank<=3);
  assert.equal(MOUNTAINS[pos.palace][pos.rank-1][0],sector.name);
 }
});
test('V11.80: nguyên long chính cung — cung chính 1 Dương/2 Âm/3 Âm, cung góc ngược lại',()=>{
 for(const p of [1,3,7,9])assert.deepEqual(MOUNTAINS[p].map(x=>x[1]),['yang','yin','yin']);
 for(const p of [2,4,6,8])assert.deepEqual(MOUNTAINS[p].map(x=>x[1]),['yin','yang','yang']);
});
test('V11.80: đối chiếu độc lập Vận 8 hướng Ngọ (S2): song tinh 8 tại cung Nam',()=>{
 const c=natalStarChart(8,180),south=c.positions.find(x=>x.number===9);
 assert.deepEqual([south.periodStar,south.mountainStar,south.waterStar],[3,8,8]);
 assert.deepEqual([c.mountain.seed,c.mountain.direction,c.facingStar.seed,c.facingStar.direction],[4,'forward',3,'reverse']);
});
test('V11.80: fixture độc lập Vận 9 Ngọ (S2) đủ cả 9 cung — núi/hướng/vận',()=>{
 // Dữ liệu đối chiếu bảng công khai "Flying Star Calculator" của Ancient Chinese Lab, trường hợp Vận 9, hướng Ngọ 180°.
 const fixture={4:[6,3,8],9:[1,8,4],2:[8,1,6],3:[7,2,7],5:[5,4,9],7:[3,6,2],8:[2,7,3],1:[9,9,5],6:[4,5,1]};
 const c=natalStarChart(9,180);
 for(const p of c.positions)assert.deepEqual([p.mountainStar,p.waterStar,p.periodStar],fixture[p.number],`cung ${p.number}`);
 assert.equal(c.mountain.borrowedFromPeriod,true);
 assert.equal(c.mountain.homePalace,9);
});
test('V11.80: 216 tổ hợp 9 vận × 24 sơn luôn đủ các sao 1–9 và đúng nguồn nhập trung',()=>{
 for(let period=1;period<=9;period++){
  const base=periodStarChart(period);
  for(const s of SECTORS){
   const c=natalStarChart(period,s.center);
   assert.equal(c.positions.length,9);
   assert.equal(c.measured.facing.name,s.name);
   assert.equal(c.measured.boundaryDistance,7.5);
   assert.equal(c.nearBoundary,false);
   const baseAt=n=>base.positions.find(x=>x.number===n).star;
   assert.equal(c.mountain.seed,baseAt(c.sitting.palace));
   assert.equal(c.facingStar.seed,baseAt(c.facing.palace));
   for(const field of ['periodStar','mountainStar','waterStar']){
    const numbers=c.positions.map(x=>x[field]);
    assert.deepEqual(new Set(numbers),new Set([1,2,3,4,5,6,7,8,9]));
   }
   for(const p of c.positions)assert.equal(p.periodStar,baseAt(p.number));
   assert.equal(c.positions.filter(x=>x.sittingPalace).length,1);
   assert.equal(c.positions.filter(x=>x.facingPalace).length,1);
  }
 }
});
test('V11.80: sao 5 dùng cùng thứ tự sơn của quái vận, không tự áp theo ngũ hành',()=>{
 const pos=mountainPosition(orientation(0).facing);
 assert.deepEqual([pos.palace,pos.rank],[1,2]);
 assert.deepEqual([seedFlight(5,pos,8).homePalace,seedFlight(5,pos,8).referenceMountain,seedFlight(5,pos,8).direction],[8,'Cấn','forward']);
 assert.deepEqual([seedFlight(5,pos,9).homePalace,seedFlight(5,pos,9).referenceMountain,seedFlight(5,pos,9).direction],[9,'Ngọ','reverse']);
});
test('V11.80: cảnh báo phương vị gần biên 24 sơn, không âm thầm khẳng định kết quả',()=>{
 for(const degrees of [7.49,7.5,7.6,352.5,352.51]){
  const c=natalStarChart(9,degrees);
  assert.equal(c.nearBoundary,true);
  assert.match(c.boundaryWarning,/3°|sơn/i);
 }
 assert.equal(natalStarChart(9,180).boundaryWarning,null);
});
test('V11.80: chặn tham số sai, không nhập ngày tháng xây dựng vào thay cho vận',()=>{
 for(const p of [0,10,'9',9.1,NaN,undefined])assert.throws(()=>natalStarChart(p,180),RangeError);
 for(const bearing of [Infinity,NaN,'180',undefined])assert.throws(()=>natalStarChart(9,bearing));
 assert.throws(()=>mountainPosition(null),TypeError);
 assert.throws(()=>mountainPosition({name:'Tý',trigram:'Ly'}),RangeError);
 assert.throws(()=>seedFlight(10,mountainPosition(orientation(0).facing),9),RangeError);
});
test('V11.80: mặt bằng 9 ô cùng trục Nam trên, đủ 8 hướng và Trung cung',()=>{
 assert.deepEqual(ZONES.map(x=>x.palace),[4,9,2,3,5,7,8,1,6]);
 assert.equal(new Set(ZONES.map(z=>z.direction)).size,9);
 assert.equal(ROOM_TYPES[0],'Chưa gán');
});
test('V11.80: tương tác gán/xóa phòng không làm biến đổi dữ liệu nền',()=>{
 const before=blankFloorPlan();
 const bedroom=assignRoom(before,9,'Phòng ngủ');
 assert.equal(before[9],'Chưa gán');
 assert.equal(bedroom[9],'Phòng ngủ');
 assert.equal(bedroom[5],'Chưa gán');
 assert.equal(Object.isFrozen(bedroom),true);
 assert.equal(assignRoom(bedroom,9,'Bếp')[9],'Bếp');
 assert.deepEqual(blankFloorPlan(),before);
});
test('V11.80: chặn khu vực lạ, cung lạ và đối tượng không hợp lệ',()=>{
 const plan=blankFloorPlan();
 for(const bad of [-1,0,10,2.5,'9',NaN])assert.throws(()=>assignRoom(plan,bad,'Bếp'),RangeError);
 assert.throws(()=>assignRoom(plan,9,'Dự báo trúng số'),RangeError);
 assert.throws(()=>assignRoom(null,9,'Bếp'),TypeError);
});
test('V11.80: giao diện dùng tam bàn, đủ lớp sao, sơ đồ có nhãn và tương tác chọn khu',()=>{
 const ui=fs.readFileSync(path.join(root,'apps/web/src/features/feng-shui/study.tsx'),'utf8');
 const css=fs.readFileSync(path.join(root,'apps/web/src/features/feng-shui/feng-shui-study.module.css'),'utf8');
 for(const re of [/natalStarChart\(/,/assignRoom\(/,/blankFloorPlan\(/,/showMountain/,/showFacing/,/mountainStar/,/waterStar/,/activeZone/,/ROOM_TYPES\.map/,/Nam ở trên/,/chưa tính Thế quái/i])assert.match(ui,re);
 for(const re of [/\.mountainStar/,/\.facingStar/,/\.floorGrid/,/\.floorCell/,/\.zoneLabel/])assert.match(css,re);
});
