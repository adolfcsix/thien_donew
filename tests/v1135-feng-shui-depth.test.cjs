'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {SECTORS,orientation}=require('../apps/web/src/features/feng-shui/compass.cjs');
const {ATLAS,WIDTH,LINE_WIDTH,hexagramAt,greatHexagramPair,ELEMENT_BY_QI,validateAccuracy}=require('../apps/web/src/features/feng-shui/great-hexagrams.cjs');
const {natalStarChart}=require('../apps/web/src/features/feng-shui/natal-flying-stars.cjs');
const {STRUCTURES,classifyNatalStructure,measurementAudit,eightMansionsDirectionAudit}=require('../apps/web/src/features/feng-shui/feng-shui-audit.cjs');

test('V11.135: atlas đủ 64 quẻ/384 đoạn, không trùng số Kinh Dịch, số Quái vận không có 5',()=>{
 assert.equal(ATLAS.length,64);assert.equal(64*6,384);
 assert.equal(new Set(ATLAS.map(x=>x.kingWen)).size,64);
 assert.equal(new Set(ATLAS.map(x=>x.binary)).size,64);
 assert.deepEqual(new Set(ATLAS.map(x=>x.kingWen)),new Set(Array.from({length:64},(_,i)=>i+1)));
 for(const row of ATLAS){assert.match(row.binary,/^[01]{6}$/);assert.ok(row.qi>=1&&row.qi<=9);assert.ok(row.guaPeriod>=1&&row.guaPeriod<=9);assert.notEqual(row.qi,5);assert.notEqual(row.guaPeriod,5);assert.equal(ELEMENT_BY_QI[row.qi]?.length>0,true);}
 assert.equal(ATLAS[0].from,0);assert.equal(ATLAS[63].to,360);assert.equal(WIDTH,5.625);assert.equal(LINE_WIDTH,.9375);
});
test('V11.135: fixture Luopan: Chính Bắc Phục, chính Nam Cấu; Càn trước 180, Khôn trước 360',()=>{
 assert.deepEqual([ATLAS[0].kingWen,ATLAS[0].han,ATLAS[0].qi,ATLAS[0].guaPeriod],[24,'復',1,8]);
 assert.deepEqual([ATLAS[31].kingWen,ATLAS[31].han],[1,'乾']);
 assert.deepEqual([ATLAS[32].kingWen,ATLAS[32].han,ATLAS[32].qi,ATLAS[32].guaPeriod],[44,'姤',9,8]);
 assert.deepEqual([ATLAS[63].kingWen,ATLAS[63].han],[2,'坤']);
 assert.equal(hexagramAt(5.624).han,'復');assert.equal(hexagramAt(5.625).han,'頤');
 assert.equal(hexagramAt(-.01).han,'坤');assert.equal(hexagramAt(360).han,'復');
});
test('V11.135: 64 cặp đối 180° — luôn đảo 6 hào, Quái khí cộng 10 và Quái vận trùng',()=>{
 for(let index=0;index<64;index++){
  const d=index*WIDTH+WIDTH/2;
  const c=greatHexagramPair(d,.2);
  assert.equal(c.stable,true,`slot ${index}`);
  assert.equal(c.facing.index,index);
  assert.equal(c.sitting.index,(index+32)%64);
  assert.equal(c.pairingVerified,true);
  assert.equal(c.facing.qi+c.sitting.qi,10);
  assert.equal(c.facing.guaPeriod,c.sitting.guaPeriod);
  assert.ok([...c.facing.binary].every((v,i)=>v!==c.sitting.binary[i]));
 }
});
test('V11.135: phân đoạn hào tính đúng 0.9375°; đo sát ranh quẻ/hào thì không khẳng định',()=>{
 const a=hexagramAt(2.2,.1);
 assert.equal(a.ordinal,1);assert.equal(a.slotLine,3);assert.equal(a.hexagramStable,true);assert.equal(a.lineStable,true);
 assert.equal(hexagramAt(.9375,0).lineStable,false);
 assert.equal(hexagramAt(0,0).hexagramStable,false);
 assert.equal(hexagramAt(180,.3).hexagramStable,false);
 assert.equal(hexagramAt(180+2.8125,.1).hexagramStable,true);
 assert.equal(hexagramAt(4,.4).hexagramStable,true);
 assert.equal(hexagramAt(4,2).hexagramStable,false);
 assert.equal(greatHexagramPair(180,.5).status,'measurement-uncertain');
});
test('V11.135: 216 bàn chuẩn thành 4 thế bàn, phân loại theo dấu sao không phán tốt/xấu',()=>{
 const counts={};
 for(let period=1;period<=9;period++)for(const {center} of SECTORS){
  const r=classifyNatalStructure(natalStarChart(period,center));
  counts[r.id]=(counts[r.id]||0)+1;
  assert.ok(r.key in STRUCTURES);
  assert.equal(r.flags.mountainAtSitting!==r.flags.mountainAtFacing,true);
  assert.equal(r.flags.facingAtSitting!==r.flags.facingAtFacing,true);
  assert.match(r.scope,/không suy ra/i);
 }
 assert.deepEqual(counts,{'double-sitting':60,'double-facing':60,'prosperous-both':48,reversed:48});
});
test('V11.135: Sai số 24 sơn và 64 quẻ là hai phép xác định riêng',()=>{
 const a=measurementAudit(180,9,.5);
 assert.equal(a.stableMountain,true);
 assert.equal(a.great.stable,false);
 assert.equal(a.status,'requires-remeasurement');
 const b=measurementAudit(182.8125,9,.4);
 assert.equal(b.stableMountain,true);assert.equal(b.great.stable,true);assert.equal(b.status,'measured-stable');
 const c=measurementAudit(187.5,9,.5);
 assert.equal(c.stableMountain,false);assert.equal(c.natal.nearBoundary,true);
 assert.ok(c.issues.some(x=>/24 sơn/.test(x)));
});
test('V11.135: Bát Trạch mệnh quái và trạch quái không bị trộn kết quả',()=>{
 const a=eightMansionsDirectionAudit(orientation(180).sitting.trigram,2004,'male','Bắc');
 assert.equal(a.house.gua,1);assert.equal(a.person.gua,2);
 assert.equal(a.house.label,'Phục Vị');assert.equal(a.person.label,'Tuyệt Mệnh');
 assert.equal(a.mismatch,true);assert.match(a.note,/không lấy trung bình/i);
});
test('V11.135: Input không hợp lệ phải bị chặn, không tự làm tròn vận hoặc quẻ',()=>{
 for(const v of [-1,181,NaN,Infinity,'0.5',null])assert.throws(()=>validateAccuracy(v),RangeError);
 for(const v of [NaN,Infinity,'180'])assert.throws(()=>hexagramAt(v));
 for(const v of [0,10,9.3,'9'])assert.throws(()=>measurementAudit(180,v,.5));
 assert.throws(()=>classifyNatalStructure({positions:[],period:9}),RangeError);
 assert.throws(()=>eightMansionsDirectionAudit('Khảm',2004,'male','Hướng khác'),RangeError);
});
test('V11.135: UI có kiểm soát sai số, atlas đầy đủ, truy vết và hai hệ độc lập',()=>{
 const ui=fs.readFileSync(path.join(root,'apps/web/src/features/feng-shui/study.tsx'),'utf8');
 const css=fs.readFileSync(path.join(root,'apps/web/src/features/feng-shui/feng-shui-study.module.css'),'utf8');
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/phong-thuy/page.tsx'),'utf8');
 for(const regex of [/measurementAudit\(/,/ATLAS\.map/,/64 quẻ/,/384 phân đoạn/,/Sai số đo/,/Quái vận/,/Quái khí/,/aria-expanded/,/batTrachComparison/,/natalStarChart\(/])assert.match(ui,regex);
 for(const regex of [/\.atlasTable/,/\.evidenceGrid/,/\.guaHero/,/max-width:780px/])assert.match(css,regex);
 assert.match(page,/Huyền Không Phi Tinh Hạ quái/);
});
