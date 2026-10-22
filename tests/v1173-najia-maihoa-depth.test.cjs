'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {HEXAGRAMS,hexagramByNumber}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {castByNumbers,castByLunarTime}=require('../apps/web/src/features/mai-hoa/casting.cjs');
const {makeDeepReading}=require('../apps/web/src/features/mai-hoa/deep-reading.cjs');
const {makeLineLedger}=require('../apps/web/src/features/luc-hao/reading.cjs');
const {getEightPalace,makeNaJiaChart,NA_JIA,STEMS,SIX_SPIRITS,getSpirits}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const root=path.resolve(__dirname,'..');
const oldStageNumbers={
 Càn:[1,44,33,12,20,23,35,14],
 Đoài:[58,47,45,31,39,15,62,54],
 Ly:[30,56,50,64,4,59,6,13],
 Chấn:[51,16,40,32,46,48,28,17],
 Tốn:[57,9,37,42,25,21,27,18],
 Khảm:[29,60,3,63,49,55,36,7],
 Cấn:[52,22,26,41,38,10,61,53],
 Khôn:[2,24,19,11,34,43,5,8],
};
test('V11.73 Bát Cung: 64 quẻ đối chiếu đầy đủ tám cung kinh điển và không trùng',()=>{
 const seen=new Set();
 for(const [palace,numbers] of Object.entries(oldStageNumbers)){
  for(let i=0;i<8;i++){
   const h=hexagramByNumber(numbers[i]);
   const found=getEightPalace(h);
   assert.equal(found.palace.name,palace,`#${h.number} cung ${palace}`);
   assert.equal(found.stage.id,['pure','first','second','third','fourth','fifth','wandering','returning'][i],`#${h.number}`);
   assert.equal(found.bits,h.bits);
   assert.equal(Math.abs(found.stage.self-found.stage.response),3);
   assert.ok(!seen.has(h.number));seen.add(h.number);
  }
 }
 assert.equal(seen.size,64);
});
test('V11.73 Nạp Giáp: bảng tám quái đủ 48 giá trị và đối chiếu nguyên quẻ Càn/Khôn',()=>{
 const list=['qian','dui','li','zhen','xun','kan','gen','kun'];
 assert.deepEqual(Object.keys(NA_JIA),list);
 for(const id of list){
  assert.equal(NA_JIA[id].inner.length,3);assert.equal(NA_JIA[id].outer.length,3);
  for(const key of ['innerStem','outerStem'])assert.ok(STEMS.includes(NA_JIA[id][key]));
 }
 assert.deepEqual(makeNaJiaChart(hexagramByNumber(1)).lines.map(x=>x.stemBranch),['GiápTý','GiápDần','GiápThìn','NhâmNgọ','NhâmThân','NhâmTuất']);
 assert.deepEqual(makeNaJiaChart(hexagramByNumber(2)).lines.map(x=>x.stemBranch),['ẤtMùi','ẤtTỵ','ẤtMão','QuýSửu','QuýHợi','QuýDậu']);
 assert.deepEqual(makeNaJiaChart(hexagramByNumber(11)).lines.map(x=>x.stemBranch),['GiápTý','GiápDần','GiápThìn','QuýSửu','QuýHợi','QuýDậu']);
});
test('V11.73 Nạp Giáp: Hỏa Thiên Đại Hữu và Thiên Hỏa Đồng Nhân đính đúng nội/ngoại và thế ứng',()=>{
 const great=makeNaJiaChart(hexagramByNumber(14));
 assert.equal(great.palace.name,'Càn');assert.equal(great.stage.name,'Quy hồn');
 assert.deepEqual(great.lines.map(x=>x.stemBranch),['GiápTý','GiápDần','GiápThìn','KỷDậu','KỷMùi','KỷTỵ']);
 assert.deepEqual(great.lines.map(x=>x.family),['Tử Tôn','Thê Tài','Phụ Mẫu','Huynh Đệ','Phụ Mẫu','Quan Quỷ']);
 assert.equal(great.lines[2].role,'Thế');assert.equal(great.lines[5].role,'Ứng');
 const same=makeNaJiaChart(hexagramByNumber(13));
 assert.equal(same.palace.name,'Ly');assert.equal(same.stage.name,'Quy hồn');
 assert.deepEqual(same.lines.map(x=>x.stemBranch),['KỷMão','KỷSửu','KỷHợi','NhâmNgọ','NhâmThân','NhâmTuất']);
});
test('V11.73 Lục Thần: bắt đầu theo nhật can được nhập; không tự đặt nhật can',()=>{
 for(const stem of STEMS){
  const list=getSpirits(stem);assert.equal(list.length,6);assert.deepEqual([...new Set(list)].sort(),[...SIX_SPIRITS].sort());
  assert.equal(makeNaJiaChart(hexagramByNumber(11),{dayStem:stem}).lines[0].spirit,list[0]);
 }
 assert.deepEqual(getSpirits('Giáp'),[...SIX_SPIRITS]);
 assert.equal(getSpirits('Kỷ')[0],'Đằng Xà');
 assert.equal(getSpirits('Tân')[0],'Bạch Hổ');
 assert.equal(getSpirits('Quý')[0],'Huyền Vũ');
 assert.equal(getSpirits(null),null);
 assert.ok(makeNaJiaChart(hexagramByNumber(1)).lines.every(x=>x.spirit===null));
 for(const bad of ['Ất Sửu','Giáp Tý', 'AB',1])assert.throws(()=>getSpirits(bad),RangeError);
});
test('V11.73 Nạp Giáp: tất cả quẻ cho 6 hào, 1 thế, 1 ứng, lục thân từ hành cung, không đổi bản gốc',()=>{
 const originals=HEXAGRAMS.map(h=>h.bits);
 for(const h of HEXAGRAMS){
  const r=makeNaJiaChart(h);
  assert.equal(r.lines.length,6);
  assert.equal(r.hexagram,h);
  assert.equal(r.lines.filter(x=>x.role==='Thế').length,1);
  assert.equal(r.lines.filter(x=>x.role==='Ứng').length,1);
  assert.deepEqual(r.lines.map(x=>x.position),[1,2,3,4,5,6]);
  assert.ok(r.lines.every(x=>x.family&&x.stem&&x.branch&&x.element));
  assert.ok(r.notComputed.includes('Dụng thần và phục thần'));
  assert.equal(makeLineLedger(h.bits.split('').map(x=>x==='1'?7:8)).original.number,h.number);
 }
 assert.deepEqual(HEXAGRAMS.map(h=>h.bits),originals);
 for(const x of [null,{}, {bits:'0000'}])assert.throws(()=>getEightPalace(x),TypeError);
});
test('V11.73 Mai Hoa: tầng Dụng/Hỗ Thể/Hỗ Dụng/Biến có vết tính và không tự đánh giá cát/hung',()=>{
 for(let first=1;first<=20;first++)for(let second=1;second<=20;second++){
  const original=castByNumbers({first,second});
  const deep=makeDeepReading(original);
  assert.equal(deep.layers.length,4);
  assert.deepEqual(deep.layers.map(x=>x.id),['immediate','nuclear-body','nuclear-use','transformed']);
  assert.equal(deep.bodyLocation,original.changingLine<=3?'upper':'lower');
  assert.equal(deep.layers[0].trigram.id,original.use.id);
  assert.equal(deep.layers[1].trigram.bits,original.nuclear[deep.bodyLocation].bits);
  assert.equal(deep.layers[2].trigram.bits,original.nuclear[deep.bodyLocation==='upper'?'lower':'upper'].bits);
  assert.equal(deep.layers[3].trigram.bits,original.transformed[deep.bodyLocation==='upper'?'lower':'upper'].bits);
  assert.equal(deep.checks.agree+deep.checks.oppose+deep.checks.neutral,4);
  assert.match(deep.limit,/không phải phép chấm điểm/);
 }
 assert.throws(()=>makeDeepReading({}),TypeError);
});
test('V11.73 UI: nhận module chuyên môn mới, giữ giới hạn Dụng Thần và kế thừa lớp tương tác',()=>{
 const mai=fs.readFileSync(path.join(root,'apps/web/src/app/mai-hoa/page.tsx'),'utf8');
 const luc=fs.readFileSync(path.join(root,'apps/web/src/app/luc-hao/page.tsx'),'utf8');
 assert.match(mai,/makeDeepReading/);assert.match(mai,/Bốn lớp đối chiếu/);
 assert.match(luc,/makeNaJiaChart/);assert.match(luc,/STEMS.map/);assert.match(luc,/Chưa tự kiểm định tiết khí/);
 assert.match(luc,/naJia\.lines/);assert.match(luc,/naJia\.notComputed/);
});
