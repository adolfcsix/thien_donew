'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../apps/web/src/features/ky-mon/formation.cjs');
const {PALACES}=require('../apps/web/src/features/ky-mon/luoshu.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
// Fixture fixed independently from the 24-term mnemonic in the classical 72-ju verse:
// 冬至一七四 小寒二八五 大寒三九六; ... 夏至九三六; ... 大雪四七一.
const KNOWN_72=[
 [1,7,4],[2,8,5],[3,9,6],[8,5,2],[9,6,3],[1,7,4],
 [3,9,6],[4,1,7],[5,2,8],[4,1,7],[5,2,8],[6,3,9],
 [9,3,6],[8,2,5],[7,1,4],[2,5,8],[1,4,7],[9,3,6],
 [7,1,4],[6,9,3],[5,8,2],[6,9,3],[5,8,2],[4,7,1]
];
test('V11.76 24 tiết khí × 3 nguyên: đủ 72 bảng cục, đối chiếu bảng cổ, đúng âm dương',()=>{
 assert.equal(engine.SOLAR_TERMS.length,24);
 assert.equal(new Set(engine.SOLAR_TERMS.map(x=>x.name)).size,24);
 assert.deepEqual(engine.SOLAR_TERMS.map(x=>Array.from(x.ju)),KNOWN_72);
 assert.deepEqual(engine.SOLAR_TERMS.slice(0,12).map(x=>x.dun),Array(12).fill('dương'));
 assert.deepEqual(engine.SOLAR_TERMS.slice(12).map(x=>x.dun),Array(12).fill('âm'));
 for(const r of engine.SOLAR_TERMS)for(const j of r.ju)assert.ok(j>=1&&j<=9);
});
test('V11.76 lục thập hoa giáp: mỗi 5 ngày đổi nguyên, chu kỳ Thượng/Trung/Hạ lặp 4 lần',()=>{
 assert.equal(engine.CYCLE.length,60);
 assert.equal(engine.CYCLE[0].name,'Giáp Tý');
 assert.equal(engine.CYCLE[59].name,'Quý Hợi');
 assert.equal(new Set(engine.CYCLE.map(x=>x.name)).size,60);
 const heads=['Giáp Tý','Kỷ Tỵ','Giáp Tuất','Kỷ Mão','Giáp Thân','Kỷ Sửu','Giáp Ngọ','Kỷ Hợi','Giáp Thìn','Kỷ Dậu','Giáp Dần','Kỷ Mùi'];
 for(let group=0;group<12;group++)for(let offset=0;offset<5;offset++){
  const y=engine.yuanFromDay(group*5+offset);
  assert.equal(y.index,group%3);assert.equal(y.blockStartName,heads[group]);
  assert.equal(y.dayName,engine.CYCLE[group*5+offset].name);
 }
});
test('V11.76 lựa chọn 72 cục: tính theo tiết khí và vị trí trong nguyên của ngày',()=>{
 for(let term=0;term<24;term++)for(let day=0;day<60;day++){
  const expected=KNOWN_72[term][Math.floor(day%15/5)];
  const got=engine.determineJu(term,day);
  assert.equal(got.ju,expected);assert.equal(got.yuan.index,Math.floor(day%15/5));
  assert.equal(got.dun,term<12?'dương':'âm');
 }
 assert.deepEqual([engine.determineJu(0,0).ju,engine.determineJu(0,5).ju,engine.determineJu(0,10).ju],[1,7,4]);
 assert.deepEqual([engine.determineJu(12,0).ju,engine.determineJu(12,5).ju,engine.determineJu(12,10).ju],[9,3,6]);
});
test('V11.76 địa bàn: 18 tổ hợp 9 cục × hai độn, 9 can khác nhau và quay đúng chiều',()=>{
 for(const dun of ['âm','dương'])for(let ju=1;ju<=9;ju++){
  const plate=engine.earthPlate(dun,ju);
  assert.deepEqual(plate.entries.map(x=>x.stem),['Mậu','Kỷ','Canh','Tân','Nhâm','Quý','Đinh','Bính','Ất']);
  assert.deepEqual(plate.entries.map(x=>x.palaceNumber),Array.from({length:9},(_,i)=>1+((ju-1+(dun==='dương'?i:-i)+90)%9)));
  assert.equal(new Set(plate.entries.map(x=>x.palaceNumber)).size,9);
  assert.equal(plate.byPalace[ju],'Mậu');
  assert.equal(new Set(Object.values(plate.byPalace)).size,9);
 }
 assert.equal(engine.earthPlate('dương',1).byPalace[9],'Ất');
 assert.equal(engine.earthPlate('âm',9).byPalace[1],'Ất');
});
test('V11.76 60 can chi giờ: 6 tuần thủ ẩn đúng 6 nghi, Trực Phù/Trực Sử cung gốc hiện đầy đủ',()=>{
 for(const dun of ['âm','dương'])for(let ju=1;ju<=9;ju++){
  const plate=engine.earthPlate(dun,ju);
  for(let hour=0;hour<60;hour++){
   const chief=engine.chiefAtHome(plate,hour);
   const group=Math.floor(hour/10);
   assert.equal(chief.hiddenStem,['Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][group]);
   assert.equal(chief.xunHead,engine.CYCLE[group*10].name);
   assert.equal(plate.byPalace[chief.originalPalace],chief.hiddenStem);
   assert.equal(chief.hourName,engine.CYCLE[hour].name);
   assert.equal(chief.chiefStar,engine.HOME[chief.originalPalace].star);
   assert.ok(chief.chiefDoor);
   if(chief.originalPalace===5){assert.equal(chief.chiefDoor,'Tử');assert.equal(chief.doorHostPalace,2);assert.equal(chief.borrowedCenter,true);}
   else {assert.equal(chief.borrowedCenter,false);assert.equal(chief.doorHostPalace,chief.originalPalace);}
  }
 }
});
test('V11.76 bất kỳ tiết khí/ngày/giờ phải giữ 9 cung, thiếu giờ thì không tự tạo trực phù',()=>{
 for(let term=0;term<24;term++)for(let day=0;day<60;day+=7){
  const r=engine.makeBaseFormation({solarTermIndex:term,dayCycleIndex:day});
  assert.equal(r.palaces.length,9);assert.deepEqual(r.palaces.map(x=>x.number),PALACES.map(x=>x.number));
  assert.equal(r.chief,null);assert.equal(r.hasFullHourChart,false);
  assert.equal(r.notComputed.length,6);assert.equal(new Set(r.palaces.map(x=>x.earthStem)).size,9);
  const r2=engine.makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:engine.hourForDayBranch(day,6).index});
  assert.equal(r2.palaces.filter(x=>x.chiefHome).length,1);
 }
});
test('V11.76 nghiêm ngặt: không tự ép số chuỗi, không nhận tiết khí/ngày/giờ không hợp lệ',()=>{
 for(const bad of [null,undefined,'0','1',0.1,NaN,Infinity,-1,24,100])assert.throws(()=>engine.determineJu(bad,0),RangeError);
 for(const bad of [null,undefined,'0',3.2,NaN,Infinity,-1,60,100])assert.throws(()=>engine.determineJu(0,bad),RangeError);
 for(const bad of [null,undefined,'0',-1,60,100,0.2])assert.throws(()=>engine.chiefAtHome(engine.earthPlate('dương',1),bad),RangeError);
 for(const bad of ['yang','âm dương','',null])assert.throws(()=>engine.earthPlate(bad,1),RangeError);
 for(const bad of [0,10,-1,1.5,'2',NaN])assert.throws(()=>engine.earthPlate('dương',bad),RangeError);
});
test('V11.76 bảo toàn địa bàn Lạc Thư: số cung không bị hoán vị bởi cục số',()=>{
 for(const t of [0,6,12,18,23])for(const d of [0,5,10,14,59]){
  const r=engine.makeBaseFormation({solarTermIndex:t,dayCycleIndex:d,hourCycleIndex:engine.hourForDayBranch(d,11).index});
  assert.deepEqual(r.palaces.map(x=>x.number),[4,9,2,3,5,7,8,1,6]);
  assert.equal(r.palaces.find(x=>x.number===5).trigram,'Không có quái riêng');
 }
});
test('V11.76 giao diện không trình bày địa bàn như bàn thời gian đã khởi đầy đủ',()=>{
 const page=read('apps/web/src/app/ky-mon/page.tsx');
 assert.match(page,/makeBaseFormation/);assert.match(page,/CYCLE/);assert.match(page,/SOLAR_TERMS/);
 assert.match(page,/không phải bàn Kỳ Môn/i);
 assert.match(page,/chưa an Thiên bàn/i);
 assert.match(page,/thiên bàn/i);
 assert.match(page,/Trực Phù/);assert.match(page,/hourForDayBranch/);
 assert.ok(read('apps/web/src/app/ky-mon/formation.module.css').includes('.formationPalace'));
 assert.ok(read('apps/web/src/features/ky-mon/formation.d.cts').includes('BaseFormation'));
});

test('V11.76 Ngũ Tý Độn: 60 ngày × 12 Chi giờ luôn cho giờ Can Chi hợp lệ',()=>{
 const start=[0,12,24,36,48];
 for(let day=0;day<60;day++){
  const hours=engine.hoursForDay(day);
  assert.equal(hours.length,12);
  assert.equal(new Set(hours.map(x=>x.index)).size,12);
  for(let branch=0;branch<12;branch++){
   const h=engine.hourForDayBranch(day,branch);
   assert.equal(h.index,hours[branch].index);
   assert.equal(h.branch,engine.BRANCHES[branch]);
   assert.equal(h.stem,engine.STEMS[(2*(day%5)+branch)%10]);
   const out=engine.makeBaseFormation({solarTermIndex:day%24,dayCycleIndex:day,hourCycleIndex:h.index});
   assert.equal(out.chief.hourName,h.name);
  }
  assert.equal(hours[0].index,start[day%5]);
 }
 for(const bad of [-1,12,1.4,NaN,undefined,'1'])assert.throws(()=>engine.hourForDayBranch(0,bad),RangeError);
 assert.throws(()=>engine.makeBaseFormation({solarTermIndex:0,dayCycleIndex:1,hourCycleIndex:0}),RangeError);
});
