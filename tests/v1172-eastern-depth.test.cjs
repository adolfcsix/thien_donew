'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mai=require('../apps/web/src/features/mai-hoa/casting.cjs');
const luc=require('../apps/web/src/features/luc-hao/reading.cjs');
const ky=require('../apps/web/src/features/ky-mon/luoshu.cjs');
const feng=require('../apps/web/src/features/feng-shui/compass.cjs');
const hex=require('../apps/web/src/features/iching/hexagrams.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const knowledge=JSON.parse(read('packages/knowledge/src/research-disciplines.json')).records;

test('V11.72 Mai Hoa: 8 Tiên thiên theo thứ tự chính xác và nhất quán',()=>{
 assert.deepEqual(mai.PRIOR_HEAVEN.map(x=>x.name),['Càn','Đoài','Ly','Chấn','Tốn','Khảm','Cấn','Khôn']);
 assert.deepEqual(mai.PRIOR_HEAVEN.map(x=>x.number),[1,2,3,4,5,6,7,8]);
 assert.equal(mai.moduloOne(8,8),8);assert.equal(mai.moduloOne(16,8),8);
 assert.equal(mai.moduloOne(6,6),6);
});
test('V11.72 Mai Hoa: khởi quẻ theo số năm chi/tháng/ngày/giờ, không hoán đổi hạ/thượng',()=>{
 const result=mai.castByLunarTime({yearBranch:1,lunarMonth:1,lunarDay:1,hourBranch:1});
 assert.deepEqual(result.arithmetic,{base:3,total:4,upperRemainder:3,lowerRemainder:4,changingRemainder:4,movingSeed:4});
 assert.equal(result.upper.name,'Ly');assert.equal(result.lower.name,'Chấn');assert.equal(result.changingLine,4);
 assert.equal(result.original.bits,'100101');
 assert.equal(result.transformed.bits,'100001');
 assert.equal(result.body.name,'Chấn');assert.equal(result.use.name,'Ly');assert.equal(result.relationshipPerspective,'Thể sinh Dụng');
 assert.equal(result.original.number,hex.hexagramFromBits('100101').number);
});
test('V11.72 Mai Hoa: hỗ quẻ lấy 2–4 và 3–5; quẻ biến chỉ đảo 1 hào đúng vị trí',()=>{
 for(let y=1;y<=12;y++)for(let m=1;m<=12;m++)for(let h=1;h<=12;h++){
  const r=mai.castByLunarTime({yearBranch:y,lunarMonth:m,lunarDay:10,hourBranch:h});
  assert.equal(r.nuclear.bits,r.original.bits.slice(1,4)+r.original.bits.slice(2,5));
  let diffs=0;
  for(let i=0;i<6;i++)if(r.original.bits[i]!==r.transformed.bits[i]){assert.equal(i+1,r.changingLine);diffs++;}
  assert.equal(diffs,1);
  assert.equal(r.body.name,r.changingLine<=3?r.upper.name:r.lower.name);
  assert.equal(r.use.name,r.changingLine<=3?r.lower.name:r.upper.name);
 }
});
test('V11.72 Mai Hoa: hai số khác phép thời gian và không đổi công thức sau khi xem quẻ',()=>{
 const r=mai.castByNumbers({first:3,second:8});
 assert.equal(r.method,'two-number-sum');
 assert.equal(r.upper.name,'Ly');assert.equal(r.lower.name,'Khôn');
 assert.equal(r.original.number,35);assert.equal(r.changingLine,5);
 assert.equal(r.arithmetic.movingSeed,11);
 assert.equal(r.nuclear.bits,r.original.bits.slice(1,4)+r.original.bits.slice(2,5));
 const multiples=mai.castByNumbers({first:16,second:8});
 assert.equal(multiples.upper.name,'Khôn');assert.equal(multiples.lower.name,'Khôn');
 assert.equal(multiples.changingLine,6);
 for(const bad of [0,-1,1.25,'3',Infinity,1000001]){
  assert.throws(()=>mai.castByNumbers({first:bad,second:8}),RangeError);
 }
});
test('V11.72 Mai Hoa: mọi đầu vào phi số, ngày/tháng/chi vượt miền đều bị chặn',()=>{
 const source={yearBranch:1,lunarMonth:8,lunarDay:12,hourBranch:7};
 for(const [key,bad] of [['yearBranch',0],['yearBranch',13],['lunarMonth',13],['lunarDay',0],['lunarDay',31],['hourBranch',13],['hourBranch','7'],['lunarDay',1.5]]){
  assert.throws(()=>mai.castByLunarTime({...source,[key]:bad}),RangeError);
 }
});
test('V11.72 Lục Hào: không tự tạo phép Nạp Giáp và bảo toàn 64 cấu trúc',()=>{
 for(const h of hex.HEXAGRAMS){
  const lines=h.bits.split('').map(n=>n==='1'?7:8);
  const reading=luc.makeLineLedger(lines);
  assert.equal(reading.original.number,h.number);
  assert.equal(reading.ledger.length,6);
  assert.deepEqual(reading.changing,[]);
  assert.ok(reading.notComputed.includes('Nạp Giáp từng hào'));
 }
 const altered=luc.makeLineLedger([6,7,8,9,7,8]);
 assert.deepEqual(altered.changing,[1,4]);
 assert.equal(altered.ledger[0].before,'Âm');assert.equal(altered.ledger[0].after,'Dương');
 assert.equal(altered.ledger[3].before,'Dương');assert.equal(altered.ledger[3].after,'Âm');
 assert.throws(()=>luc.makeLineLedger([6,7,8]),TypeError);
});
test('V11.72 Kỳ Môn: cửu cung Lạc Thư đúng chiều Nam trên và tổng 15',()=>{
 assert.deepEqual(ky.PALACES.map(x=>x.number),[4,9,2,3,5,7,8,1,6]);
 assert.equal(new Set(ky.PALACES.map(p=>p.number)).size,9);
 assert.deepEqual(ky.verifyLuoShu().sums,Array(8).fill(15));
 assert.equal(ky.getPalace(1).direction,'Bắc');assert.equal(ky.getPalace(9).direction,'Nam');
 assert.equal(ky.getPalace(5).trigram,'Không có quái riêng');assert.equal(ky.getPalace(12),null);
 for(let i=1;i<=9;i++){assert.equal(ky.oppositePalace(i).number,i===5?5:10-i);}assert.equal(ky.oppositePalace(99),null);
 assert.deepEqual([ky.THREE_WONDERS.length,ky.SIX_INSTRUMENTS.length,ky.EIGHT_GATES.length,ky.NINE_STARS.length,ky.EIGHT_DEITIES.length],[3,6,8,9,8]);
});
test('V11.72 Phong thủy: đủ 24 sơn không trùng, phương vị chuẩn và 12 cặp tọa/hướng',()=>{
 assert.equal(feng.SECTORS.length,24);
 assert.equal(new Set(feng.SECTORS.map(m=>m.name)).size,24);
 assert.equal(feng.mountainAt(0).name,'Tý');assert.equal(feng.mountainAt(180).name,'Ngọ');
 assert.equal(feng.mountainAt(90).name,'Mão');assert.equal(feng.mountainAt(270).name,'Dậu');
 assert.equal(feng.mountainAt(337.5).name,'Nhâm');assert.equal(feng.mountainAt(352.5).name,'Tý');assert.equal(feng.mountainAt(7.5).name,'Quý');
 for(let i=0;i<24;i++){
  const m=feng.SECTORS[i];assert.equal(feng.mountainAt(m.center).name,m.name);
  const r=feng.orientation(m.center);assert.equal(r.sittingDegrees,(m.center+180)%360);
  assert.equal(r.sitting.name,feng.SECTORS[(i+12)%24].name);
  assert.equal(r.boundaryDistance,7.5);
 }
});
test('V11.72 Phong thủy: ranh giới không chồng lấn, chuẩn hóa độ và từ chối NaN',()=>{
 for(let i=0;i<3600;i++){
  const deg=i/10;
  const m=feng.mountainAt(deg);
  assert.ok(m && m.center>=0 && m.center<360);
  assert.equal(feng.mountainAt(deg+360).name,m.name);
 }
 assert.equal(feng.orientation(7.5).boundaryDistance,0);
 assert.equal(feng.normalizeDegrees(-10),350);
 assert.equal(feng.orientation(540).facing.name,'Ngọ');
 for(const x of [NaN,Infinity,-Infinity,'90',null])assert.throws(()=>feng.orientation(x),TypeError);
});
test('V11.72 route thật, công cụ và giới hạn từng môn được ghi nhận',()=>{
 for(const [id,route,feature] of [['mai-hoa','/mai-hoa','castByLunarTime'],['luc-hao','/luc-hao','makeLineLedger'],['ky-mon','/ky-mon','verifyLuoShu'],['phong-thuy','/phong-thuy','orientation']]){
  const record=knowledge.find(r=>r.id===id);
  assert.equal(record.route,route);assert.ok(record.boundary.length>50);
  const page=read(`apps/web/src/app${route}/page.tsx`);
  assert.ok(page.includes(feature),`missing ${feature} for ${route}`);
  assert.match(read('apps/web/src/lib/navigation.ts'),new RegExp(route));
  assert.match(read('apps/web/src/app/huyen-hoc/page.tsx'),new RegExp(route));
 }
 assert.match(read('apps/web/src/features/feng-shui/study.tsx'),/natalStarChart\(/);
 assert.match(read('apps/web/src/app/ky-mon/page.tsx'),/không phải bàn Kỳ Môn/i);
});
