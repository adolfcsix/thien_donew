'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const ts = require('./helpers-typeloader.cjs');
const modulePath=path.join(root,'apps/web/src/features/chart/lib/birth-calendar.ts');
const source=fs.readFileSync(modulePath,'utf8');
const generated=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},reportDiagnostics:true});
const jsModule={exports:{}};
vm.runInNewContext(generated.outputText,{module:jsModule,exports:jsModule.exports,require:id=>{
  if(id==='@thiendo/astrology-engine')return Engine;
  throw new Error('Unexpected module '+id);
}});
const {convertBirthCalendar,birthCheck}=jsModule.exports;
const birth={label:'Dữ liệu kiểm thử',date:'2026-10-10',hour:12,minute:30,calendar:'solar',leap:false,gender:'Nam'};
const plain=value=>JSON.parse(JSON.stringify(value));

test('V11 birth input: new browser module compiles without TS syntactic diagnostics',()=>{
  assert.deepEqual(generated.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>d.code)||[],[]);
});
test('V11 birth input: calendar switch preserves the actual day and hour instead of reinterpreting typed digits',()=>{
  const lunar=plain(convertBirthCalendar(birth,'lunar'));
  assert.equal(lunar.date,'2026-09-01');
  assert.equal(lunar.calendar,'lunar');
  assert.equal(lunar.leap,false);
  assert.equal(lunar.hour,12);
  assert.equal(lunar.minute,30);
  assert.equal(lunar.gender,'Nam');
  assert.equal(lunar.label,birth.label);
  const again=plain(convertBirthCalendar(lunar,'solar'));
  assert.deepEqual(again,birth);
});
test('V11 birth input: switching between both calendars correctly preserves a leap lunar month',()=>{
  const solar={...birth,date:'2033-12-22',hour:23,minute:59,gender:'Nữ'};
  const lunar=plain(convertBirthCalendar(solar,'lunar'));
  assert.equal(lunar.date,'2033-11-01');
  assert.equal(lunar.leap,true);
  assert.deepEqual(plain(convertBirthCalendar(lunar,'solar')),solar);
});
test('V11 birth input: no silent reinterpretation for malformed or impossible dates',()=>{
  for (const date of ['2026-02-30','2026-2-17','2033-11-31','not-a-date']) {
    assert.throws(()=>convertBirthCalendar({...birth,date},'lunar'));
  }
  const invalid=plain(birthCheck({...birth,date:'2026-02-30'}));
  assert.equal(typeof invalid.error,'string');
  assert.equal(invalid.solar,null);
});
test('V11 birth input: preview clearly includes converted dates and zodiac hour',()=>{
  assert.deepEqual(plain(birthCheck(birth)),{solar:'10/10/2026',lunar:'01/09/2026',hourBranch:'Ngọ',error:null});
  const result=plain(birthCheck({...birth,date:'2033-12-22'}));
  assert.equal(result.lunar,'01/11/2033 (tháng nhuận)');
});
test('V11 reference screenshot: birth 10/10/2026 12:30 maps to the same twelve core palaces and main-star groups',()=>{
  const chart=Engine.calculate(birth);
  assert.deepEqual(plain(chart.lunar),{year:2026,month:9,day:1,leap:false});
  assert.equal(chart.yearCanChi,'Bính Ngọ');
  assert.equal(chart.cuc.number,2);
  assert.equal(chart.menh,'Thìn');
  assert.equal(chart.thanPalace,'Mệnh');
  const expected={
    'Mệnh':['Thái Âm'], 'Phụ Mẫu':['Liêm Trinh','Tham Lang'], 'Phúc Đức':['Cự Môn'],
    'Điền Trạch':['Thiên Tướng'], 'Quan Lộc':['Thiên Đồng','Thiên Lương'],
    'Nô Bộc':['Vũ Khúc','Thất Sát'], 'Thiên Di':['Thái Dương'], 'Tật Ách':[],
    'Tài Bạch':['Thiên Cơ'], 'Tử Tức':['Tử Vi','Phá Quân'], 'Phu Thê':[], 'Huynh Đệ':['Thiên Phủ']
  };
  for(const [palace,stars] of Object.entries(expected)) {
    const house=chart.houses.find(x=>x.palace===palace);
    assert.ok(house,palace);
    assert.deepEqual(plain(house.stars),stars,`${palace}: main star discrepancy`);
  }
});
test('V11 birth input: form keeps observable conversion, date format guard and inline validation',()=>{
  const ui=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/chart-form.tsx'),'utf8');
  for(const label of ['convertBirthCalendar(input, next)','onChange(\'date\', converted.date)','aria-pressed={input.calendar','birthCheck(input)','chart-birth-preview','disabled={Boolean(check.error)}','Giờ sinh áp dụng theo múi giờ Việt Nam']) {
    assert.ok(ui.includes(label),label);
  }
});

test('V11 chart: every traditional hour across 2 genders and reference dates keeps 12 unique houses and fourteen unique main stars',()=>{
  const Verify=require('../packages/astrology-engine/src/verify.js');
  for(const date of ['2004-01-01','2023-01-22','2026-02-17','2026-10-10','2033-12-22']){
    for(const gender of ['Nam','Nữ'])for(let hour=0;hour<24;hour++){
      const chart=Engine.calculate({...birth,date,hour,gender});
      const verification=Verify.check(chart);
      assert.equal(verification.passed,true,`${date} ${hour} ${gender}: ${JSON.stringify(verification.checks.filter(x=>!x.passed))}`);
      assert.equal(chart.hourBranch,Engine.BRANCHES[Math.floor((hour+1)/2)%12]);
    }
  }
});

test('V11 chart: 23:00 and leap months keep explicit caution rather than silently changing traditional rule convention',()=>{
  const late=Engine.calculate({...birth,hour:23,minute:30});
  assert.ok(late.warnings.some(text=>text.includes('23:00')));
  const leap=Engine.calculate({...birth,date:'2033-11-01',calendar:'lunar',leap:true});
  assert.deepEqual(plain(leap.solar),{year:2033,month:12,day:22});
  assert.ok(leap.warnings.some(text=>text.includes('Tháng âm nhuận')));
});
