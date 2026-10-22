'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const Q=require('../apps/web/src/features/reading-quality/quality.cjs');
const {castByNumbers,castByLunarTime}=require('../apps/web/src/features/mai-hoa/casting.cjs');
const {makeLineLedger}=require('../apps/web/src/features/luc-hao/reading.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const {lineTemporalEvidence}=require('../apps/web/src/features/luc-hao/temporal-relations.cjs');
const {relativeFocus}=require('../apps/web/src/features/luc-hao/relative-focus.cjs');
const {makeBaseFormation}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const {orientation}=require('../apps/web/src/features/feng-shui/compass.cjs');
const location=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const check=(report,id)=>{const item=report.items.find(item=>item.id===id);assert.ok(item,`${report.discipline}: missing ${id}`);return item;};
const makeLuc=values=>{const reading=makeLineLedger(values);const nj=makeNaJiaChart(reading.original);const temporal=lineTemporalEvidence(nj,reading,null);const focus=relativeFocus(nj,reading,temporal,null);return {reading,nj,temporal,focus};};

test('Mai Hoa: both legitimate casts verify line, nuclear and body/use geometry',()=>{
 for(const cast of [castByNumbers({first:3,second:8}),castByLunarTime({yearBranch:7,lunarMonth:8,lunarDay:15,hourBranch:7})]) {
  const report=Q.buildMaiHoaQuality(cast);
  for(const id of ['casting','mutation','nuclear','body-use'])assert.equal(check(report,id).status,'observed');
  assert.equal(check(report,'calendar').status,'needs-check');
  assert.equal(report.stage,'provisional');
 }
});
test('Mai Hoa: 64 hexagrams and six moving lines do not produce false shape failures',()=>{
 for(let a=1;a<=8;a++)for(let b=1;b<=8;b++){
  const report=Q.buildMaiHoaQuality(castByNumbers({first:a,second:b}));
  assert.equal(report.stage,'provisional',`numbers ${a} + ${b}`);
 }
});
test('Mai Hoa: tampered transformed line fails closed',()=>{
 const cast=castByNumbers({first:3,second:8});
 const altered={...cast,transformed:{...cast.transformed,bits:cast.original.bits}};
 const report=Q.buildMaiHoaQuality(altered);
 assert.equal(check(report,'mutation').status,'blocked');assert.equal(report.stage,'blocked');
});
test('Mai Hoa: wrong nuclear or body mapping fails closed',()=>{
 const cast=castByNumbers({first:3,second:8});
 assert.equal(Q.buildMaiHoaQuality({...cast,nuclear:{...cast.nuclear,bits:'000000'}}).stage,'blocked');
 assert.equal(Q.buildMaiHoaQuality({...cast,body:cast.use}).stage,'blocked');
});
test('Mai Hoa: no cast clearly requests input',()=>{
 assert.equal(Q.buildMaiHoaQuality(null).stage,'blocked');
});
test('Mai Hoa: one single-bit tamper at different position is rejected',()=>{
 const cast=castByNumbers({first:3,second:8});const bits=cast.original.bits.split('');
 const wrong=(cast.changingLine%6);bits[wrong]=bits[wrong]==='1'?'0':'1';
 assert.equal(check(Q.buildMaiHoaQuality({...cast,transformed:{...cast.transformed,bits:bits.join('')}}),'mutation').status,'blocked');
});
test('Lục Hào: real Nạp Giáp is verified without temporal assumptions',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const r=Q.buildLucHaoQuality(d.reading,d.nj,d.temporal,d.focus);
 assert.equal(check(r,'six-lines').status,'observed');
 assert.equal(check(r,'day').status,'needs-check');
 assert.equal(check(r,'month').status,'needs-check');
 assert.equal(check(r,'focus').status,'needs-check');
});
test('Lục Hào: 6 changing values produce correct moving lines without invented Dụng Thần',()=>{
 const d=makeLuc([6,9,6,9,6,9]);const r=Q.buildLucHaoQuality(d.reading,d.nj,d.temporal,d.focus);
 assert.match(check(r,'movement').evidence,/6 hào/);
 assert.match(r.limits.join(' '),/Dụng Thần/);
});
test('Lục Hào: mismatched Na Giap chart is blocked',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const other=makeNaJiaChart(makeLineLedger([7,7,7,7,7,7]).original);
 const r=Q.buildLucHaoQuality(d.reading,other,d.temporal,d.focus);
 assert.equal(check(r,'six-lines').status,'blocked');
});
test('Lục Hào: a forged line position is blocked',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const forged={...d.nj,lines:d.nj.lines.map((v,i)=>i===0?{...v,position:3}:v)};
 assert.equal(check(Q.buildLucHaoQuality(d.reading,forged,d.temporal,d.focus),'six-lines').status,'blocked');
});
test('Lục Hào: temporal line mismatch is blocked',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const faux={ready:true,monthVerified:true,lines:Array.from({length:6},(_,i)=>({position:i+1,branch:'X',moving:false}))};
 const r=Q.buildLucHaoQuality(d.reading,d.nj,faux,d.focus);
 assert.equal(check(r,'day').status,'blocked');
});
test('Lục Hào: focus requires explicit user selected Lục Thân',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const f=relativeFocus(d.nj,d.reading,d.temporal,'Phụ Mẫu');
 const report=Q.buildLucHaoQuality(d.reading,d.nj,d.temporal,f);
 assert.equal(check(report,'focus').status,'observed');
 assert.match(check(report,'focus').evidence,/Phụ Mẫu/);
});
test('Kỳ Môn: valid example identifies earthly board and hour plate but manual calendar remains unverified',()=>{
 const f=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0,hourCycleIndex:0});
 const r=Q.buildKyMonQuality(f,{source:'manual',hourPlate:buildRotatingHourPlate(f),withHour:true});
 assert.equal(check(r,'solar').status,'observed');assert.equal(check(r,'hour').status,'observed');assert.equal(check(r,'calendar').status,'needs-check');
});
test('Kỳ Môn: auto decision rejects an unexplained formation',()=>{
 const f=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0,hourCycleIndex:0});
 const r=Q.buildKyMonQuality(f,{source:'auto',decision:{canAutoForm:false}});
 assert.equal(check(r,'contradiction').status,'blocked');assert.equal(r.stage,'blocked');
});
test('Kỳ Môn: missing auto formation remains a pending input rather than invented result',()=>{
 const r=Q.buildKyMonQuality(null,{source:'auto',decision:null});
 assert.equal(check(r,'solar').status,'needs-check');
 assert.notEqual(r.stage,'structural');
});
test('Kỳ Môn: no hour plate does not silently certify the time plate',()=>{
 const f=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0,hourCycleIndex:0});
 const r=Q.buildKyMonQuality(f,{source:'manual',hourPlate:null,withHour:true});
 assert.equal(check(r,'hour').status,'needs-check');
});
test('Feng Shui: center of the South mountain has 7.5 degrees margin and opposite axis',()=>{
 const r=Q.buildFengShuiQuality(orientation(180));
 assert.equal(check(r,'axis').status,'observed');
 assert.equal(check(r,'sector').status,'observed');
 assert.match(check(r,'sector').evidence,/7.50°/);
});
test('Feng Shui: boundaries must warn on angles around 7.5 degrees',()=>{
 for(const d of [7.5,7.49,7.51,-352.5,367.5]){
  const r=Q.buildFengShuiQuality(orientation(d));assert.equal(check(r,'sector').status,'needs-check');
 }
});
test('Feng Shui: forged sitting axis fails closed',()=>{
 const v=orientation(180);const r=Q.buildFengShuiQuality({...v,sittingDegrees:17});
 assert.equal(check(r,'axis').status,'blocked');assert.equal(r.stage,'blocked');
});
test('Feng Shui: invalid measurement is blocked',()=>{
 assert.equal(Q.buildFengShuiQuality(null).stage,'blocked');
});
test('Tử Vi: no natal claims derived without actual reading',()=>{
 assert.equal(Q.buildTuViQuality(null).stage,'blocked');
});
test('Tử Vi: vô chính diệu is not the same as empty palace',()=>{
 const r=Q.buildTuViQuality({palace:'Mệnh',isVoChinhDieu:true,stars:[],combinations:[]});
 assert.match(check(r,'natal').evidence,/Vô chính diệu/);assert.equal(check(r,'natal').status,'observed');
 assert.equal(check(r,'geometry').status,'needs-check');
});
test('Tử Vi: matched patterns remain bounded, no classical proof claim',()=>{
 const r=Q.buildTuViQuality({palace:'Mệnh',stars:[{name:'Tử Vi'}],combinations:[{id:'x'}]});
 assert.equal(check(r,'patterns').status,'observed');
 assert.match(check(r,'patterns').meaning,/Không khớp không có nghĩa/);
});
test('Quality reports deterministic and immutable at public boundary',()=>{
 const report=Q.buildFengShuiQuality(orientation(180));const same=Q.buildFengShuiQuality(orientation(180));
 assert.deepEqual(report,same);assert.ok(Object.isFrozen(report));assert.ok(Object.isFrozen(report.items));assert.ok(report.items.every(Object.isFrozen));
});
test('All five disciplines explicitly forbid extrapolation to real-life prediction',()=>{
 const d=makeLuc([7,8,7,8,7,8]);
 const reports=[Q.buildMaiHoaQuality(castByNumbers({first:1,second:2})),Q.buildLucHaoQuality(d.reading,d.nj,d.temporal,d.focus),
  Q.buildKyMonQuality(null),Q.buildFengShuiQuality(orientation(180)),Q.buildTuViQuality({palace:'Mệnh',stars:[]})];
 assert.equal(new Set(reports.map(r=>r.discipline)).size,5);
 for(const r of reports){assert.match(r.limits.join(' '),/không chứng minh năng lực dự báo/);assert.ok(r.questions.length>=1);}
});
test('Quality visual layers integrated into 5 existing routes (not a disconnected landing page)',()=>{
 for(const file of ['apps/web/src/app/mai-hoa/page.tsx','apps/web/src/app/luc-hao/page.tsx',
  'apps/web/src/app/ky-mon/page.tsx','apps/web/src/app/phong-thuy/page.tsx','apps/web/src/features/chart/components/palace-reading.tsx']){
  assert.match(location(file),/ReadingQualityPanel report=\{quality\}/,file);
 }
});
test('Rendering changes do not mutate calculation engines or modify shared styles',()=>{
 const panel=location('apps/web/src/features/reading-quality/quality-panel.tsx');
 assert.match(panel,/useViewMode/);assert.match(panel,/mode==='expert'/);
 assert.doesNotMatch(panel,/score\s*[:=]|Math\.random\(|fetch\(/);
 assert.match(panel,/data-status=\{item\.status\}/);
});
test('Lục Hào: invalid temporal evidence never certifies month',()=>{
 const d=makeLuc([7,8,7,8,7,8]);const forged={ready:true,monthVerified:true,lines:Array.from({length:6},(_,i)=>({position:i+1,branch:'X',moving:false}))};
 const r=Q.buildLucHaoQuality(d.reading,d.nj,forged,d.focus);
 assert.equal(check(r,'month').status,'blocked');
});
test('Kỳ Môn: duplicate palaces or inconsistent plate are flagged',()=>{
 const f=makeBaseFormation({solarTermIndex:0,dayCycleIndex:0,hourCycleIndex:0});
 assert.equal(check(Q.buildKyMonQuality({...f,palaces:f.palaces.map((v,i)=>i===8?f.palaces[0]:v)}),'solar').status,'blocked');
 assert.equal(check(Q.buildKyMonQuality({...f,plate:{...f.plate,ju:2}}),'solar').status,'blocked');
});
