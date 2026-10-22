'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {HEXAGRAMS,TRIGRAMS,hexagramFromBits}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeLineLedger}=require('../apps/web/src/features/luc-hao/reading.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const {lineTemporalEvidence}=require('../apps/web/src/features/luc-hao/temporal-relations.cjs');
const {manualContext,STEMS,BRANCHES}=require('../apps/web/src/features/luc-hao/temporal.cjs');
const {RELATIVES,relativeFocus}=require('../apps/web/src/features/luc-hao/relative-focus.cjs');
const {castByNumbers,castByLunarTime}=require('../apps/web/src/features/mai-hoa/casting.cjs');
const {makeLineTrace}=require('../apps/web/src/features/mai-hoa/line-trace.cjs');

test('V11.75: năm Lục Thân được tính trong quẻ chủ, không sinh ứng viên ảo',()=>{
 assert.equal(new Set(RELATIVES).size,5);
 for(const hex of HEXAGRAMS){
  const bits=hex.bits.split('').map(b=>b==='1'?7:8);
  const reading=makeLineLedger(bits),chart=makeNaJiaChart(reading.original);
  const initially=relativeFocus(chart,reading,null);
  assert.equal(initially.ready,false);assert.equal(initially.count,0);
  let union=[];
  for(const family of RELATIVES){
   const result=relativeFocus(chart,reading,null,family);
   assert.equal(result.selected,family);
   for(const item of result.candidates){
    const original=chart.lines[item.position-1];
    assert.equal(original.family,family);assert.equal(item.stemBranch,original.stemBranch);
    assert.equal(item.void,null);assert.equal(item.day,null);assert.equal(item.month,null);
    assert.equal(item.changed===null,!item.moving);
    assert.equal(item.role,original.role);
   }
   union.push(...result.candidates.map(item=>item.position));
  }
  assert.deepEqual([...union].sort((a,b)=>a-b),[1,2,3,4,5,6]);
 }
});

test('V11.75: đối chiếu ứng viên qua đủ 64 quẻ × 60 ngày Can Chi, chỉ lấy trạng thái từ hào tương ứng',()=>{
 for(const hex of HEXAGRAMS){
  const values=hex.bits.split('').map((bit,i)=>(i===0||i===5)?(bit==='1'?9:6):(bit==='1'?7:8));
  const reading=makeLineLedger(values),chart=makeNaJiaChart(reading.original);
  for(let day=0;day<60;day++){
   const context=manualContext({dayStem:STEMS[day%10],dayBranch:BRANCHES[day%12],monthBranch:BRANCHES[day%12]});
   const evidence=lineTemporalEvidence(chart,reading,context);
   for(const family of RELATIVES){
    const result=relativeFocus(chart,reading,evidence,family);
    assert.equal(result.hasTemporal,true);
    for(const item of result.candidates){
     const line=evidence.lines[item.position-1];
     assert.equal(item.void,line.void);assert.deepEqual(item.day,line.day);assert.deepEqual(item.month,line.month);
     assert.equal(item.moving,line.moving);assert.deepEqual(item.changed,line.changed);
    }
   }
  }
 }
});

test('V11.75: hào động vẫn có Nạp Giáp quẻ biến kể cả chưa chọn ngày',()=>{
 const reading=makeLineLedger([6,7,9,8,7,9]),chart=makeNaJiaChart(reading.original);
 const expected=makeNaJiaChart(reading.transformed);
 let seen=0;
 for(const family of RELATIVES){
  const focus=relativeFocus(chart,reading,null,family);
  for(const item of focus.candidates){
   if(item.moving){
    seen++;assert.ok(item.changed);
    assert.equal(item.changed.stemBranch,expected.lines[item.position-1].stemBranch);
   }else assert.equal(item.changed,null);
   assert.equal(item.day,null);assert.equal(item.month,null);assert.equal(item.void,null);
  }
 }
 assert.equal(seen,3);
});

test('V11.75: thiếu tháng cận tiết không được thêm nhãn tháng',()=>{
 const reading=makeLineLedger([6,7,8,9,7,8]),chart=makeNaJiaChart(reading.original);
 const context={...manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),monthBranch:null};
 const proof=lineTemporalEvidence(chart,reading,context);
 for(const family of RELATIVES)assert.ok(relativeFocus(chart,reading,proof,family).candidates.every(x=>x.month===null));
});

test('V11.75: các bảng bị lệch, Lục Thân sai phải dừng trước khi hiển thị',()=>{
 const reading=makeLineLedger([7,8,7,8,7,8]),chart=makeNaJiaChart(reading.original);
 assert.throws(()=>relativeFocus(chart,reading,null,'Không tồn tại'),RangeError);
 assert.throws(()=>relativeFocus(chart,{ledger:[{position:1,moving:false}]},null,'Thê Tài'),TypeError);
 assert.throws(()=>relativeFocus({...chart,hexagram:makeLineLedger([8,8,8,8,8,8]).original},reading,null,'Thê Tài'),TypeError);
 const context=manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),evidence=lineTemporalEvidence(chart,reading,context);
 const corrupted={...evidence,lines:evidence.lines.map((x,i)=>i===0?{...x,branch:'Tỵ'}:x)};
 assert.throws(()=>relativeFocus(chart,reading,corrupted,'Phụ Mẫu'),TypeError);
});

test('V11.75: Mai Hoa kiểm mọi quẻ 64 × 6 hào động, vết tính khớp phép dựng độc lập',()=>{
 for(const original of HEXAGRAMS)for(let changingLine=1;changingLine<=6;changingLine++){
  const flipped=original.bits.split('');flipped[changingLine-1]=flipped[changingLine-1]==='1'?'0':'1';
  const cast={original,changingLine,
   nuclear:hexagramFromBits(original.bits.slice(1,4)+original.bits.slice(2,5)),
   transformed:hexagramFromBits(flipped.join(''))};
  const trace=makeLineTrace(cast);
  assert.equal(trace.lines.length,6);
  assert.deepEqual(trace.lines.filter(x=>x.changing).map(x=>x.position),[changingLine]);
  assert.deepEqual(trace.lines.filter(x=>x.inLowerNuclear).map(x=>x.position),[2,3,4]);
  assert.deepEqual(trace.lines.filter(x=>x.inUpperNuclear).map(x=>x.position),[3,4,5]);
  assert.equal(trace.lines.filter(x=>x.before!==x.after).length,1);
 }
});

test('V11.75: Mai Hoa hai số không áp đặt 6 hào khả dĩ cho cùng 2 quái khi công thức tổng có hạn chế đồng dư',()=>{
 for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++){
  const seen=new Set();
  for(let a=0;a<6;a++)for(let b=0;b<6;b++){
   const cast=castByNumbers({first:upper+8*a,second:lower+8*b});
   const trace=makeLineTrace(cast);
   assert.equal(trace.lines[cast.changingLine-1].changing,true);
   assert.equal(cast.upper.number,upper);assert.equal(cast.lower.number,lower);
   seen.add(cast.changingLine);
  }
  assert.equal(seen.size,3,'Cố định hai quái và cộng bội 8 chỉ tạo ba lớp đồng dư modulo 6');
 }
});

test('V11.75: đường khởi quẻ âm lịch cũng có vết tính; dữ liệu cấu trúc sai bị chặn',()=>{
 const cast=castByLunarTime({yearBranch:1,lunarMonth:1,lunarDay:1,hourBranch:1});
 assert.equal(makeLineTrace(cast).lines.length,6);
 assert.throws(()=>makeLineTrace({...cast,nuclear:cast.original}),/Hỗ quẻ không khớp/);
 assert.throws(()=>makeLineTrace({...cast,changingLine:7}),TypeError);
 assert.throws(()=>makeLineTrace({...cast,transformed:cast.original}),/Quẻ biến sai/);
});

test('V11.75 UI: Lục Hào có tra cứu có kiểm soát, Mai Hoa có bảng vết hào và câu hỏi ngữ cảnh',()=>{
 const root=path.join(__dirname,'../apps/web/src/app');
 const luc=fs.readFileSync(path.join(root,'luc-hao/page.tsx'),'utf8');
 const mai=fs.readFileSync(path.join(root,'mai-hoa/page.tsx'),'utf8');
 for(const token of ['RELATIVES.map','relativeFocus','selectedRelative','ỨNG VIÊN','Tuần Không','Nguyệt: chưa xác minh'])assert.ok(luc.includes(token),token);
 for(const token of ['makeLineTrace','trace.lines','Hạ hỗ','Thượng hỗ','outcome.original.inquiry'])assert.ok(mai.includes(token),token);
 assert.ok(fs.existsSync(path.join(root,'luc-hao/luc-focus.module.css')));
});
