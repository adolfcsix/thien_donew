'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {dayInfo}=require('../packages/astrology-engine/src/almanac.js');
const {HEXAGRAMS,hexagramByNumber}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeLineLedger}=require('../apps/web/src/features/luc-hao/reading.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const {STEMS,BRANCHES,xunVoid,calendarContext,manualContext}=require('../apps/web/src/features/luc-hao/temporal.cjs');
const {SIX_COMBINE,relation,lineTemporalEvidence}=require('../apps/web/src/features/luc-hao/temporal-relations.cjs');

test('V11.74: 60 Can Chi ngày chia đúng 6 tuần, 2 chi Không tuần nào cũng khác nhau',()=>{
 const expected=[['Giáp Tý',['Tuất','Hợi']],['Giáp Tuất',['Thân','Dậu']],['Giáp Thân',['Ngọ','Mùi']],['Giáp Ngọ',['Thìn','Tỵ']],['Giáp Thìn',['Dần','Mão']],['Giáp Dần',['Tý','Sửu']]];
 for(let index=0;index<60;index++){
  const s=STEMS[index%10],b=BRANCHES[index%12],result=xunVoid(s,b);
  const x=Math.floor(index/10);assert.equal(result.xun,expected[x][0]);assert.deepEqual(result.voidBranches,expected[x][1]);
  assert.equal(result.xunIndex,x);assert.equal(result.voidBranches.length,2);
  assert.ok(!result.voidBranches.includes(b));
 }
 for(const [stem,branch] of [['Giáp','Sửu'],['Ất','Tý'],['Quý','Dần']])assert.throws(()=>xunVoid(stem,branch),/âm dương/);
 assert.throws(()=>xunVoid('AB','Tý'),RangeError);
 assert.throws(()=>xunVoid('Giáp','ZZ'),RangeError);
});

test('V11.74: nhập Can Chi đã kiểm chứng không tự đổi thứ tự, không lẫn Nguyệt kiến với tháng âm',()=>{
 const t=manualContext({dayStem:'Bính',dayBranch:'Dần',monthBranch:'Thìn'});
 assert.equal(t.dayCanChi,'Bính Dần');assert.equal(t.monthBranch,'Thìn');assert.equal(t.xun,'Giáp Tý');
 assert.equal(t.source,'user-verified-manual');assert.equal(t.needsMonthVerification,false);
 assert.throws(()=>manualContext({dayStem:'Bính',dayBranch:'Mão',monthBranch:'Thìn'}),RangeError);
 assert.throws(()=>manualContext({dayStem:'Bính',dayBranch:'Dần',monthBranch:'Tân'}),RangeError);
});

test('V11.74: dữ liệu lịch Can Chi từ engine dùng UTC+7, kiểm tra nhiều ngày và biên năm',()=>{
 for(const [y,m,d] of [[1900,1,1],[1968,5,12],[2000,2,29],[2026,10,11],[2040,12,31],[2100,12,31]]){
  const raw=dayInfo(y,m,d),t=calendarContext(raw);
  assert.equal(t.date,raw.solar.iso);assert.equal(t.dayCanChi,raw.dayCanChi);
  assert.equal(t.suggestedMonthBranch,raw.monthCanChi.name.split(' ')[1]);
  assert.deepEqual(t.voidBranches,xunVoid(t.dayStem,t.dayBranch).voidBranches);
  assert.equal(t.warnings.length>=2,true);
  assert.equal(t.source,'calendar-utc7-noon-approx');
 }
 assert.throws(()=>calendarContext({}),TypeError);
 assert.throws(()=>calendarContext({solar:{iso:'2026-10-11'},dayCanChi:'AB',monthCanChi:{name:'Can Chi'},solarTerm:{}}),TypeError);
});

test('V11.74: ngày cận chuyển tiết phải bỏ mọi quan hệ tháng, vẫn giữ Nhật và Tuần Không',()=>{
 const raw=dayInfo(2026,10,11);
 const actual={...raw,monthCanChi:{...raw.monthCanChi,nearBoundary:true}};
 const t=calendarContext(actual);
 assert.equal(t.needsMonthVerification,true);assert.equal(t.monthBranch,null);
 assert.ok(BRANCHES.includes(t.suggestedMonthBranch));
 const reading=makeLineLedger([7,7,7,7,7,7]);
 const proof=lineTemporalEvidence(makeNaJiaChart(reading.original),reading,t);
 assert.equal(proof.monthVerified,false);
 assert.ok(proof.lines.every(line=>line.month.length===0&&line.monthElement===null));
 assert.equal(proof.lines.length,6);
});

test('V11.74: Lục Hợp đối xứng 6 cặp, Lục Xung đúng 6 cặp, và đồng chi không gây hợp/xung',()=>{
 assert.equal(SIX_COMBINE.length,6);
 for(const [a,b] of SIX_COMBINE){assert.ok(relation(a,b).includes('lục hợp'));assert.ok(relation(b,a).includes('lục hợp'));}
 for(let i=0;i<12;i++){
  const a=BRANCHES[i],opposite=BRANCHES[(i+6)%12];
  assert.deepEqual(relation(a,a),['đồng chi']);
  assert.ok(relation(a,opposite).includes('lục xung'));
  assert.ok(!relation(a,opposite).includes('lục hợp'));
 }
 assert.deepEqual(relation('Tý',null),[]);
 assert.throws(()=>relation('ZZ','Tý'),RangeError);
 assert.throws(()=>relation('Tý','AB'),RangeError);
});

test('V11.74: 64 quẻ x 60 Can Chi được đối chiếu đúng 6 hào, không thêm hào và không thay dữ liệu an sao',()=>{
 const originalBits=HEXAGRAMS.map(x=>x.bits);
 for(const hex of HEXAGRAMS){
  const reading=makeLineLedger([...hex.bits].map(x=>x==='1'?7:8));
  const naJia=makeNaJiaChart(reading.original);
  for(let d=0;d<60;d++){
   const context=manualContext({dayStem:STEMS[d%10],dayBranch:BRANCHES[d%12],monthBranch:BRANCHES[d%12]});
   const proof=lineTemporalEvidence(naJia,reading,context);
   assert.equal(proof.lines.length,6);assert.equal(proof.monthVerified,true);
   assert.equal(proof.lines.filter(line=>line.moving).length,0);
   assert.ok(proof.lines.every(line=>line.changed===null));
   assert.deepEqual(proof.lines.map(line=>line.branch),naJia.lines.map(line=>line.branch));
  }
 }
 assert.deepEqual(HEXAGRAMS.map(x=>x.bits),originalBits);
});

test('V11.74: hào động có Chi hóa đúng quẻ biến, không tự thay cung gốc hay suy Dụng Thần',()=>{
 const reading=makeLineLedger([6,7,9,8,7,9]);
 const origin=makeNaJiaChart(reading.original),changed=makeNaJiaChart(reading.transformed);
 const context=manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'});
 const result=lineTemporalEvidence(origin,reading,context);
 assert.deepEqual(result.lines.filter(line=>line.moving).map(line=>line.position),[1,3,6]);
 for(const line of result.lines){
  if(reading.ledger[line.position-1].moving){
   assert.equal(line.changed.stemBranch,changed.lines[line.position-1].stemBranch);
   assert.equal(line.changed.element,changed.lines[line.position-1].element);
  }else assert.equal(line.changed,null);
  assert.equal(line.void,context.voidBranches.includes(line.branch));
 }
 assert.match(result.notes.join(' '),/không tự/);
});

test('V11.74: các input thiếu hoặc không đồng bộ bị chặn, không trả về bằng chứng giả',()=>{
 const reading=makeLineLedger([7,8,7,8,7,8]),chart=makeNaJiaChart(reading.original);
 const empty=lineTemporalEvidence(chart,reading,null);assert.equal(empty.ready,false);assert.deepEqual(empty.lines,[]);
 assert.throws(()=>lineTemporalEvidence({},reading,manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'})),TypeError);
 assert.throws(()=>lineTemporalEvidence(chart,{ledger:[{position:2,moving:true}]},manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'})),TypeError);
 assert.throws(()=>lineTemporalEvidence(chart,reading,{dayBranch:'ZZ',monthBranch:'Ngọ',voidBranches:['Tuất','Hợi']}),TypeError);
});

test('V11.74 UI: chọn lịch hoặc nhập tay, có cảnh báo chuyển tiết, trạng thái Tuần Không và không bỏ phần Nạp Giáp',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/luc-hao/page.tsx'),'utf8');
 for(const phrase of ['calendarContext','manualContext','lineTemporalEvidence','Engine.calendarDay','STEMS.map','BRANCHES.map','naJia.notComputed','Tuần Không','Chưa tự kiểm định tiết khí','hào động']){
  assert.ok(source.includes(phrase),`Missing UI ${phrase}`);
 }
 assert.ok(source.includes('aria-pressed'));assert.ok(source.includes('min="1900-01-01"'));
 assert.ok(fs.existsSync(path.join(__dirname,'../apps/web/src/app/luc-hao/luc-temporal.module.css')));
});
