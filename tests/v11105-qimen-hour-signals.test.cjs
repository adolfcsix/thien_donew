'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const {HORSE_GROUPS,STRIKING_POSITIONS,horseFromBranch,positionMatches,analyzeHourSignals}=require('../apps/web/src/features/ky-mon/hour-signals.cjs');
const root=path.join(__dirname,'..');
function fixture(term=3,day=52,branch=5){const f=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index});return [f,buildRotatingHourPlate(f)];}
test('V11.105 bốn nhóm Tam Hợp mỗi nhóm ba chi, không chi nào thiếu/trùng',()=>{
 assert.equal(HORSE_GROUPS.length,4);
 assert.equal(new Set(HORSE_GROUPS.flatMap(x=>x.members)).size,12);
 assert.deepEqual(HORSE_GROUPS.map(x=>x.horse),['Dần','Thân','Hợi','Tỵ']);
 assert.deepEqual(HORSE_GROUPS.map(x=>x.palace),[8,2,6,4]);
});
test('V11.105 Thân–Tý–Thìn Mã Dần/Cấn 8',()=>{for(const chi of ['Thân','Tý','Thìn']) assert.deepEqual([horseFromBranch(chi).horseBranch,horseFromBranch(chi).palaceNumber],['Dần',8]);});
test('V11.105 Dần–Ngọ–Tuất Mã Thân/Khôn 2',()=>{for(const chi of ['Dần','Ngọ','Tuất']) assert.equal(horseFromBranch(chi).palaceNumber,2);});
test('V11.105 Tỵ–Dậu–Sửu Mã Hợi/Càn 6',()=>{for(const chi of ['Tỵ','Dậu','Sửu']) assert.equal(horseFromBranch(chi).palaceNumber,6);});
test('V11.105 Hợi–Mão–Mùi Mã Tỵ/Tốn 4',()=>{for(const chi of ['Hợi','Mão','Mùi']) assert.equal(horseFromBranch(chi).palaceNumber,4);});
test('V11.105 không nhận chi sai, object, undefined',()=>{for(const val of ['',null,undefined,1,'Mậu','Ti'])assert.throws(()=>horseFromBranch(val),RangeError);});
test('V11.105 sáu cặp Kích Hình có thứ tự và ngữ nghĩa kinh điển',()=>{
 assert.deepEqual(STRIKING_POSITIONS.map(x=>[x.instrument,x.palace]),[['Mậu',3],['Kỷ',2],['Canh',8],['Tân',9],['Nhâm',4],['Quý',4]]);
 assert.equal(new Set(STRIKING_POSITIONS.map(x=>x.instrument)).size,6);
});
test('V11.105 thời bàn độc lập fixture: giờ Tỵ có Mã Hợi/Càn 6',()=>{
 const [f,b]=fixture(3,52,5);const x=analyzeHourSignals(f,b);
 assert.equal(x.hourHorse.basisBranch,'Tỵ');assert.equal(x.hourHorse.horseBranch,'Hợi');assert.equal(x.hourHorse.palaceNumber,6);
 assert.equal(x.byPalace[6].hourHorse,true);assert.equal(x.byPalace[5].hourHorse,false);
 assert.equal(x.status,'research-only');assert.equal(x.horseBasis,'hour');
});
test('V11.105 ngày Mã Tinh tách khỏi giờ, không tráo chức năng',()=>{
 const [f,b]=fixture(3,52,5);const x=analyzeHourSignals(f,b);
 assert.equal(x.dayHorse.basisBranch,'Thìn');assert.equal(x.dayHorse.palaceNumber,8);
 assert.equal(x.hourHorse.palaceNumber,6);assert.equal(x.byPalace[8].dayHorse,true);
});
test('V11.105 chỉ nhận Thiên bàn ở đúng vị trí, không dùng địa bàn',()=>{
 const [f,b]=fixture();const result=positionMatches(b);
 for(const hit of result){assert.equal(b.byPalace[hit.palace].heavenStem,hit.instrument);}
 const fake={byPalace:Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,{earthStem:'Mậu',heavenStem:null}]))};
 assert.deepEqual(positionMatches(fake),[]);
});
test('V11.105 kiểm thử từng cặp Kích Hình riêng, không ràng buộc sai các cặp khác',()=>{
 for(const rule of STRIKING_POSITIONS){
  const cells=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,{heavenStem:null}]));
  cells[rule.palace]={heavenStem:rule.instrument};
  const hits=positionMatches({byPalace:cells});
  assert.equal(hits.length,1);assert.equal(hits[0].instrument,rule.instrument);
 }
});
test('V11.105 vị trí sai cùng một Can không tạo Kích Hình',()=>{
 for(const rule of STRIKING_POSITIONS){
  const cells=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,{heavenStem:null}]));
  cells[rule.palace===4?3:4]={heavenStem:rule.instrument};
  assert.ok(!positionMatches({byPalace:cells}).some(x=>x.instrument===rule.instrument));
 }
});
test('V11.105 bản cục thiếu giờ hoặc thiếu thời bàn bị từ chối',()=>{
 assert.throws(()=>analyzeHourSignals(makeBaseFormation({solarTermIndex:0,dayCycleIndex:0}),null),TypeError);
 assert.throws(()=>analyzeHourSignals(null,null),TypeError);
});
test('V11.105 không chấp nhận dữ kiện can/chi giả',()=>{
 const [f,b]=fixture();assert.throws(()=>analyzeHourSignals({...f,day:'Giáp Giáp'},b),RangeError);
 assert.throws(()=>analyzeHourSignals({...f,chief:{...f.chief,hourName:'Giáp Giáp'}},b),RangeError);
});
test('V11.105 chống sửa lén bảng Địa bàn',()=>{
 const [f,b]=fixture();assert.throws(()=>analyzeHourSignals({...f,plate:{...f.plate,byPalace:{...f.plate.byPalace,4:'Mậu'}}},b),RangeError);
});
test('V11.105 chống tráo Can Thiên bàn và cờ Trực Phù',()=>{
 const [f,b]=fixture();
 const cells={...b.byPalace,4:{...b.byPalace[4],heavenStem:'Mậu'}};
 assert.throws(()=>analyzeHourSignals(f,{...b,byPalace:cells}),RangeError);
});
test('V11.105 không ép suy kết luận cát hung, giữ phương pháp nghiên cứu',()=>{
 const [f,b]=fixture();const x=analyzeHourSignals(f,b);assert.ok(x.limits.some(s=>s.includes('cát hung')));
 assert.equal('outcome' in x,false);assert.equal('auspicious' in x,false);
});
test('V11.105 phân bổ chín cung chính xác một dấu Mã theo giờ và ngày',()=>{
 for(let term=0;term<24;term+=3)for(let day=0;day<60;day+=9)for(let branch=0;branch<12;branch++){
  const [f,b]=fixture(term,day,branch),x=analyzeHourSignals(f,b);
  assert.equal(Object.keys(x.byPalace).length,9);
  assert.equal(Object.values(x.byPalace).filter(p=>p.hourHorse).length,1);
  assert.equal(Object.values(x.byPalace).filter(p=>p.dayHorse).length,1);
  assert.deepEqual(x.striking.map(s=>s.instrument).sort(),Object.values(x.byPalace).flatMap(p=>p.strikingInstruments).sort());
 }
});
test('V11.105 màn hình không thêm ghi chú lớn, chỉ một khối chuyên sâu đóng sẵn',()=>{
 const s=fs.readFileSync(path.join(root,'apps/web/src/app/ky-mon/page.tsx'),'utf8');
 assert.match(s,/analyzeHourSignals/);assert.match(s,/<details className=\{styles\.accordion\}><summary>Mã Tinh và Lục Nghi Kích Hình/);
 assert.equal((s.match(/Mã Tinh và Lục Nghi Kích Hình/g)||[]).length,1);
});
test('V11.105 có d.cts và tài liệu, metadata bật research-only',()=>{
 assert.ok(fs.existsSync(path.join(root,'apps/web/src/features/ky-mon/hour-signals.d.cts')));
 assert.ok(fs.existsSync(path.join(root,'docs/research/schools/ky-mon-hour-signals.md')));
 const r=JSON.parse(fs.readFileSync(path.join(root,'packages/knowledge/src/phase2-school-methods.json')));
 const s=r.schools.find(m=>m.id==='ky-mon-chai-bo-rotating');
 assert.equal(s.engineIntegration,'legacy-reference-only');assert.ok(s.subroutines.some(x=>x.includes('V11.105')));
});
