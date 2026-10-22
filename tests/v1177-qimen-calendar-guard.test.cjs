'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {termAtLongitude,suggestKymonContext,GUARD_DEGREES}=require('../apps/web/src/features/ky-mon/calendar-context.cjs');
const {CYCLE,SOLAR_TERMS,BRANCHES,BRANCH_PALACES,hourForDayBranch,voidForHour,makeBaseFormation}=require('../apps/web/src/features/ky-mon/formation.cjs');
const Bazi=require('../packages/astrology-engine/src/bazi.js');
const Almanac=require('../packages/astrology-engine/src/almanac.js');
const sample=(date='2026-10-12',hour=12,minute=0,dayBoundary='midnight',lateZiAcknowledged=false)=>{
 const b=Bazi.calculate({date,hour,minute,dayBoundary});
 return suggestKymonContext({date,hour,minute,dayBoundary,lateZiAcknowledged,longitudeDeg:b.solarTerm.longitudeDeg,
  dayCanChi:b.pillars.day.name,hourCanChi:b.pillars.hour.name});
};
const synthetic=(changes={})=>suggestKymonContext({date:'2026-10-12',hour:12,minute:0,
 dayCanChi:'Kỷ Mùi',hourCanChi:'Canh Ngọ',longitudeDeg:198.89,...changes});

test('V11.77 24 tiết khí: kinh độ 270° quy về Đông Chí, 255° về Đại Tuyết',()=>{
 for(let i=0;i<24;i++){
  const found=termAtLongitude((270+15*i+2)%360);
  assert.equal(found.index,i);
  assert.equal(found.name,SOLAR_TERMS[i].name);
  assert.equal(found.dun,i<12?'dương':'âm');
  assert.equal(found.nearBoundary,false);
 }
 assert.equal(termAtLongitude(270).index,0);
 assert.equal(termAtLongitude(255).index,23);
 assert.equal(termAtLongitude(0).name,'Xuân Phân');
 assert.equal(termAtLongitude(315).name,'Lập Xuân');
});

test('V11.77 chặn ước tính gần mọi mốc giao tiết ở cả hai bên 15°',()=>{
 for(let i=0;i<24;i++){
  const edge=(270+i*15)%360;
  for(const delta of [-1.1,0,1.1]){
   const t=termAtLongitude((edge+delta+360)%360);
   assert.equal(t.nearBoundary,true);
  }
  for(const delta of [-2,2])assert.equal(termAtLongitude((edge+delta+360)%360).nearBoundary,false);
 }
 assert.equal(GUARD_DEGREES,1.2);
 assert.equal(synthetic({longitudeDeg:270.9}).status,'needs-verification');
 assert.equal(synthetic({longitudeDeg:270.9}).canAutoForm,false);
});

test('V11.77 bộ máy lịch VN và Bát Tự khớp Can Chi trong ngày giữa trưa',()=>{
 for(const date of ['2026-10-12','2024-02-29','2026-02-04','2000-01-01','1980-06-21','1976-12-23']){
  const [y,m,d]=date.split('-').map(Number);
  const a=Almanac.dayInfo(y,m,d);
  const b=Bazi.calculate({date,hour:12,minute:0});
  assert.equal(a.dayCanChi,b.pillars.day.name,date);
  const suggestion=sample(date);
  assert.equal(suggestion.dayCanChi,a.dayCanChi);
  assert.equal(suggestion.hourCanChi,b.pillars.hour.name);
  assert.equal(CYCLE[suggestion.dayCycleIndex].name,b.pillars.day.name);
 }
});

test('V11.77 ngày thường tự đề xuất cục số và giữ nguyên thuật toán Chai Bổ cũ',()=>{
 const s=sample('2026-10-12',12);
 assert.equal(s.status,'ready');
 assert.equal(s.canAutoForm,true);
 const r=makeBaseFormation({solarTermIndex:s.solarTerm.index,dayCycleIndex:s.dayCycleIndex,hourCycleIndex:s.hourCycleIndex});
 assert.equal(r.term,s.solarTerm.name);
 assert.equal(r.day,s.dayCanChi);
 assert.equal(r.chief.hourName,s.hourCanChi);
 assert.equal(r.hasFullHourChart,false);
 assert.equal(r.palaces.length,9);
});

test('V11.77 23h cần xác nhận, hai quy ước ngày được tách bạch',()=>{
 const one=sample('2026-10-12',23,30,'midnight');
 const two=sample('2026-10-12',23,30,'late-zi');
 assert.equal(one.canAutoForm,false);assert.equal(two.canAutoForm,false);
 assert.notEqual(one.dayCanChi,two.dayCanChi);
 assert.notEqual(one.hourCanChi,two.hourCanChi);
 const oneConfirmed=sample('2026-10-12',23,30,'midnight',true);
 const twoConfirmed=sample('2026-10-12',23,30,'late-zi',true);
 assert.equal(oneConfirmed.canAutoForm,true);assert.equal(twoConfirmed.canAutoForm,true);
 assert.equal(oneConfirmed.dayCanChi,one.dayCanChi);
 assert.equal(twoConfirmed.dayCanChi,two.dayCanChi);
});

test('V11.77 trước 1976 không tự an với UTC+7 cố định',()=>{
 const s=sample('1950-10-12',12);
 assert.equal(s.status,'needs-verification');
 assert.equal(s.canAutoForm,false);
 assert.match(s.reasons.join(' '),/múi giờ/i);
});

test('V11.77 không nhận ngày ảo, giờ lỗi, kinh độ lỗi hoặc Can Chi sai',()=>{
 for(const d of ['2026-02-30','2026-13-01','2026-1-2','1899-12-31','2101-01-01'])
  assert.throws(()=>synthetic({date:d}),RangeError);
 for(const h of [-1,24,12.5,'12',null])assert.throws(()=>synthetic({hour:h}),RangeError);
 for(const mm of [-1,60,0.5,'00'])assert.throws(()=>synthetic({minute:mm}),RangeError);
 for(const deg of [null,NaN,Infinity,-1,360,'180'])assert.throws(()=>synthetic({longitudeDeg:deg}),RangeError);
 assert.throws(()=>synthetic({dayCanChi:'sai'}),RangeError);
 assert.throws(()=>synthetic({hourCanChi:'Giáp Tý'}),RangeError);
 assert.throws(()=>synthetic({dayBoundary:'nope'}),RangeError);
});

test('V11.77 Tuần Không sáu tuần giờ, 60 chỉ số Can Chi',()=>{
 const expected=[['Tuất','Hợi'],['Thân','Dậu'],['Ngọ','Mùi'],['Thìn','Tỵ'],['Dần','Mão'],['Tý','Sửu']];
 const expectedPalace=[[6],[2,7],[9,2],[4],[8,3],[1,8]];
 for(let h=0;h<60;h++){
  const v=voidForHour(h),xun=Math.floor(h/10);
  assert.equal(v.xunHead,CYCLE[xun*10].name);
  assert.deepEqual(Array.from(v.branches),expected[xun]);
  assert.deepEqual(Array.from(v.palaceNumbers),expectedPalace[xun]);
  assert.deepEqual(Array.from(v.palaceNumbers),[...new Set(v.branchIndices.map(i=>BRANCH_PALACES[i]))]);
 }
 assert.equal(BRANCHES.length,12);
 assert.throws(()=>voidForHour(60),RangeError);
 assert.throws(()=>voidForHour('10'),RangeError);
});

test('V11.77 Tuần Không gắn đúng cung, không thay địa bàn và không tự tạo nếu thiếu giờ',()=>{
 for(let term=0;term<24;term+=3)for(let day=0;day<60;day+=5){
  const plain=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day});
  assert.equal(plain.palaces.filter(x=>x.voidAtPalace).length,0);
  const hour=hourForDayBranch(day,7);
  const formed=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hour.index});
  assert.deepEqual(formed.palaces.map(x=>x.earthStem),plain.palaces.map(x=>x.earthStem));
  assert.deepEqual(formed.palaces.filter(x=>x.voidAtPalace).map(x=>x.number).sort((a,b)=>a-b),
   [...formed.chief.voids.palaceNumbers].sort((a,b)=>a-b));
  assert.equal(formed.hasFullHourChart,false);
 }
});

test('V11.77 giao diện yêu cầu nhập ngày, có hai chế độ, không hiển thị địa bàn sai khi bị chặn',()=>{
 const s=fs.readFileSync(path.join(root,'apps/web/src/app/ky-mon/page.tsx'),'utf8');
 assert.match(s,/suggestKymonContext/);
 assert.match(s,/Engine\.baziCalculate/);
 assert.match(s,/Engine\.calendarDay/);
 assert.match(s,/type="date"/);
 assert.match(s,/canAutoForm/);
 assert.match(s,/lateZiAcknowledged/);
 assert.match(s,/mode==='manual'/);
 assert.match(s,/formation\?\s*</);
 assert.match(s,/Tuần Không/);
 assert.match(s,/không phải bàn Kỳ Môn hoàn chỉnh/i);
 assert.ok(fs.existsSync(path.join(root,'apps/web/src/app/ky-mon/calendar.module.css')));
});

test('V11.77 Trực Sử theo giờ: 18 cục × 60 giờ, số bước đúng, Trung 5 ký Khôn 2',()=>{
 const {earthPlate,chiefAtHome}=require('../apps/web/src/features/ky-mon/formation.cjs');
 for(const dun of ['dương','âm'])for(let ju=1;ju<=9;ju++)for(let h=0;h<60;h++){
  const plate=earthPlate(dun,ju),chief=chiefAtHome(plate,h);
  const direction=dun==='dương'?1:-1,delta=h%10;
  const expected=1+((chief.originalPalace-1+direction*delta+90)%9);
  assert.equal(chief.doorTime.stepsFromXunHead,delta);
  assert.equal(chief.doorTime.rawPalace,expected);
  assert.equal(chief.doorTime.hostPalace,expected===5?2:expected);
  assert.equal(chief.doorTime.borrowedCenter,expected===5);
  if(delta===0||delta===9)assert.equal(chief.doorTime.rawPalace,chief.originalPalace);
 }
});
