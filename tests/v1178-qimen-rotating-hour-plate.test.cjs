'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeBaseFormation,CYCLE,SOLAR_TERMS,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {OUTER,buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const root=path.join(__dirname,'..');
function make(term,day,hour){return buildRotatingHourPlate(makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hour}));}
function readPalace(board,p){const x=board.byPalace[p];return [x.earthStem,x.heavenStem,x.star,x.door,x.deity];}
const fromQimena={
 1:['Quý','Canh','Thiên Trụ','Hưu','Trực Phù'],
 2:['Đinh','Ất','Thiên Phụ','Tử','Huyền Vũ'],
 3:['Bính','Quý','Thiên Bồng','Thương','Thái Âm'],
 4:['Ất','Tân','Thiên Nhậm','Đỗ','Lục Hợp'],
 5:['Mậu',null,null,null,null],
 6:['Kỷ','Đinh','Thiên Nhuế','Khai','Cửu Thiên'],
 7:['Canh','Nhâm','Thiên Anh','Kinh','Cửu Địa'],
 8:['Tân','Kỷ','Thiên Tâm','Sinh','Đằng Xà'],
 9:['Nhâm','Bính','Thiên Xung','Cảnh','Bạch Hổ']
};
test('V11.78 fixture độc lập Qimena: 2027-02-06 10:00 Shanghai, dương 5, Bính Thìn / Quý Tỵ',()=>{
 // Published on 2026-09-29, qimen-calculation-rules; no use of web data at runtime.
 const b=make(3,52,29);
 assert.equal(b.chiefStar,'Thiên Trụ');assert.equal(b.chiefDoor,'Kinh');
 assert.equal(b.chiefStarLanding,1);assert.equal(b.chiefDoorLanding,7);
 for(let i=1;i<=9;i++)assert.deepEqual(readPalace(b,i),fromQimena[i],`cung ${i}`);
 assert.equal(b.byPalace[6].lodgedTianQin,true);
});
test('V11.78 fixture độc lập GUYU JIAN: 2026-03-18 15:20, dương 4, Tân Mão / Bính Thân',()=>{
 // https://www.guyujian.cn/learn/qimen/07 | table published publicly.
 const b=make(5,27,32);
 assert.equal(b.chiefStarLanding,2);assert.equal(b.chiefDoorLanding,9);
 const cases={
 1:['Đinh','Nhâm','Thiên Nhậm','Thương','Lục Hợp'],
 2:['Bính','Tân','Thiên Trụ','Khai','Trực Phù'],
 3:['Ất','Mậu','Thiên Phụ','Cảnh','Huyền Vũ'],
 4:['Mậu','Quý','Thiên Anh','Tử','Cửu Địa'],
 5:['Kỷ',null,null,null,null],
 6:['Canh','Đinh','Thiên Bồng','Sinh','Thái Âm'],
 7:['Tân','Canh','Thiên Tâm','Hưu','Đằng Xà'],
 8:['Nhâm','Ất','Thiên Xung','Đỗ','Bạch Hổ'],
 9:['Quý','Bính','Thiên Nhuế','Kinh','Cửu Thiên']
 };
 for(let i=1;i<=9;i++)assert.deepEqual(readPalace(b,i),cases[i],`cung ${i}`);
});
test('V11.78 đủ 18 Âm/Dương × cục 1–9 × 60 giờ: mỗi lớp giữ đúng tám biểu tượng',()=>{
 let count=0;
 for(const dun of ['dương','âm'])for(let ju=1;ju<=9;ju++)for(let hour=0;hour<60;hour++){
  const branch=hour%12;
  let input=null;
  for(let term=0;term<24&&!input;term++){
   if((term<12?'dương':'âm')!==dun)continue;
   for(let day=0;day<60;day++){
    const yuan=Math.floor(day%15/5);
    if(SOLAR_TERMS[term].ju[yuan]===ju&&hourForDayBranch(day,branch).index===hour){
     input={solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hour};break;
    }
   }
  }
  assert.ok(input,`${dun} ${ju} cục ${hour} giờ cần cặp dữ liệu hợp lệ`);
  const b=buildRotatingHourPlate(makeBaseFormation(input));count++;
  const outer=b.palaces.filter(p=>p.number!==5);
  assert.equal(outer.length,8);
  for(const key of ['star','door','deity','heavenStem'])assert.equal(new Set(outer.map(p=>p[key])).size,8);
  assert.equal(outer.filter(p=>p.chiefStarLanding).length,1);
  assert.equal(outer.filter(p=>p.chiefDoorLanding).length,1);
  assert.equal(outer.filter(p=>p.lodgedTianQin).length,1);
  assert.equal(b.byPalace[5].star,null);
  assert.equal(b.byPalace[5].door,null);
  assert.equal(b.byPalace[5].deity,null);
  assert.equal(new Set(b.palaces.map(p=>p.earthStem)).size,9);
 }
 assert.equal(count,1080);
});
test('V11.78 mỗi cung sao/môn bảo toàn nguyên quán: không ngẫu nhiên xếp lại',()=>{
 for(let term=0;term<24;term++)for(let day=0;day<60;day+=4){
  const h=hourForDayBranch(day,7);
  const f=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:h.index});
  const b=buildRotatingHourPlate(f);
  const starFrom=new Set(b.palaces.filter(p=>p.number!==5).map(p=>p.starFromPalace));
  const doorFrom=new Set(b.palaces.filter(p=>p.number!==5).map(p=>p.doorFromPalace));
  assert.deepEqual([...starFrom].sort((a,b)=>a-b),[...OUTER].sort((a,b)=>a-b));
  assert.deepEqual([...doorFrom].sort((a,b)=>a-b),[...OUTER].sort((a,b)=>a-b));
  assert.equal(f.hasFullHourChart,false,'API nền không được tự đổi trạng thái hoàn chỉnh');
 }
});
test('V11.78 trường hợp Giáp giờ lấy can ẩn theo tuần thủ, không đặt trực tiếp Giáp lên địa bàn',()=>{
 for(const hour of [0,10,20,30,40,50]){
  // choose a day compatible with the selected hour stem, pick chi for the actual hour.
  const correctDay=Array.from({length:60},(_,i)=>i).find(i=>hourForDayBranch(i,hour%12).index===hour);
  assert.notEqual(correctDay,undefined);
  const f=makeBaseFormation({solarTermIndex:0,dayCycleIndex:correctDay,hourCycleIndex:hour});
  const b=buildRotatingHourPlate(f);
  assert.equal(b.trueHourStem,f.chief.hiddenStem);
  assert.equal(f.plate.byPalace[b.hourStemPalace],f.chief.hiddenStem);
 }
});
test('V11.78 Trung cung: không an 8 môn vào Trung 5, thiên cầm chỉ ký cùng Thiên Nhuế',()=>{
 let centerCases=0;
 for(const term of [0,12])for(let day=0;day<60;day+=2)for(let branch=0;branch<12;branch++){
  const h=hourForDayBranch(day,branch);
  const f=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:h.index});
  const b=buildRotatingHourPlate(f);
  assert.equal(b.palaces.filter(p=>p.lodgedTianQin).length,1);
  if(f.chief.originalPalace===5){
   centerCases++;
   assert.equal(b.chiefStar,'Thiên Cầm');
   assert.equal(b.byPalace[b.chiefStarLanding].star,'Thiên Nhuế');
  }
  if(f.chief.doorTime.rawPalace===5){
   assert.equal(b.chiefDoorLanding,2);
   assert.equal(b.byPalace[2].chiefDoorLanding,true);
  }
 }
 assert.ok(centerCases>10);
});
test('V11.78 không dựng thời bàn khi chưa có giờ hoặc đầu vào giả',()=>{
 assert.throws(()=>buildRotatingHourPlate(makeBaseFormation({solarTermIndex:0,dayCycleIndex:0})),TypeError);
 assert.throws(()=>buildRotatingHourPlate(null),TypeError);
 assert.throws(()=>buildRotatingHourPlate({chief:{hourName:'Giáp Tý'},palaces:[]}),TypeError);
});
test('V11.78 giao diện có phân tầng Thiên/Nhân/Thần và chế độ che lớp',()=>{
 const s=fs.readFileSync(path.join(root,'apps/web/src/app/ky-mon/page.tsx'),'utf8');
 assert.match(s,/buildRotatingHourPlate/);
 assert.match(s,/showHourPlate/);
 assert.match(s,/hourStyle\.palaceLayers/);
 assert.match(s,/hourPlate\?\.byPalace/);
 assert.match(s,/Chuyển Bàn/);
 assert.match(s,/limitations/);
 assert.match(s,/không phải bàn Kỳ Môn hoàn chỉnh/i);
 assert.ok(fs.existsSync(path.join(root,'apps/web/src/app/ky-mon/hour-plate.module.css')));
 assert.ok(fs.existsSync(path.join(root,'apps/web/src/features/ky-mon/hour-plate.d.cts')));
});
