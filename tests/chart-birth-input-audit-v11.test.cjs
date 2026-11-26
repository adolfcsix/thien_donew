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
vm.runInNewContext(generated.outputText,{Error,RangeError,module:jsModule,exports:jsModule.exports,require:id=>{
  if(id==='@thiendo/astrology-engine')return Engine;
  throw new Error('Unexpected module '+id);
}});
const {convertBirthCalendar,birthCheck,lunarMonthChoices,normalizeLunarBirthDate}=jsModule.exports;
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
  assert.deepEqual(plain(birthCheck(birth)),{solar:'10/10/2026',lunar:'01/09/2026',hourBranch:'Ngọ',leap:false,error:null});
  const result=plain(birthCheck({...birth,date:'2033-12-22'}));
  assert.equal(result.lunar,'01/11/2033 (tháng nhuận)');
  assert.equal(result.leap,true);
});
test('R70 shows both solar equivalents when a lunar month has a leap namesake',()=>{
  assert.deepEqual(plain(lunarMonthChoices('2020-04-01')),{
    regularSolar:'23/04/2020',leapSolar:'23/05/2020',hasLeapMonth:true
  });
  assert.deepEqual(plain(lunarMonthChoices('2020-04-30')),{
    regularSolar:'22/05/2020',leapSolar:null,hasLeapMonth:true
  });
  assert.deepEqual(plain(lunarMonthChoices('2023-02-01')),{
    regularSolar:'20/02/2023',leapSolar:'22/03/2023',hasLeapMonth:true
  });
  const normal=plain(lunarMonthChoices('2023-03-01'));
  assert.equal(normal.hasLeapMonth,false);
  assert.equal(normal.leapSolar,null);
  assert.equal(lunarMonthChoices('2023-03-'),null);
  assert.equal(lunarMonthChoices('2023-03-31'),null);
});
test('R70 accepts day 30 of 2017 leap month six only when the leap option is selected',()=>{
  const input={...birth,date:'2017-06-30',calendar:'lunar'};
  assert.deepEqual(plain(lunarMonthChoices(input.date)),{
    regularSolar:null,leapSolar:'21/08/2017',hasLeapMonth:true
  });
  assert.notEqual(birthCheck(input).error,null);
  assert.equal(birthCheck({...input,leap:true}).solar,'21/08/2017');
  const solar=plain(convertBirthCalendar({...input,leap:true},'solar'));
  assert.equal(solar.date,'2017-08-21');
  assert.deepEqual(plain(convertBirthCalendar(solar,'lunar')),{...input,leap:true});
});
test('R71 accepts eight digits from a numeric keyboard while keeping ISO input for the engine',()=>{
  assert.equal(normalizeLunarBirthDate('20170630'),'2017-06-30');
  for(const date of ['','2017063','2017-06-30','2017-0630','201706300','2017a630']){
    assert.equal(normalizeLunarBirthDate(date),date);
  }
  const invalid={...birth,calendar:'lunar',date:normalizeLunarBirthDate('20170631'),leap:true};
  assert.notEqual(birthCheck(invalid).error,null);
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
  for(const label of ['convertBirthCalendar(input, next)','onChange(\'date\', converted.date)','aria-pressed={input.calendar','birthCheck(input)','chart-birth-preview','disabled={profileLoading || Boolean(check.error)}','Giờ sinh áp dụng theo múi giờ Việt Nam']) {
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
