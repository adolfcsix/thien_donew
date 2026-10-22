'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const B=require('../packages/astrology-engine/src/bazi.js');
const Public=require('../packages/astrology-engine/src/tuvi.js');
const sample={date:'2026-02-19',hour:10,minute:30};
const mod=(a,m)=>(a%m+m)%m;

test('V9.8 year yang 2026 male -> forward, female -> reverse, from month pillar',()=>{
 const m=B.daYun({...sample,sex:'male'}), f=B.daYun({...sample,sex:'female'});
 assert.equal(m.direction,'forward');assert.equal(f.direction,'reverse');
 assert.equal(m.monthPillar,'Canh Dần');assert.equal(m.cycles[0].name,'Tân Mão');assert.equal(f.cycles[0].name,'Kỷ Sửu');
 assert.equal(m.referenceJie.name,'Kinh Trập');assert.equal(f.referenceJie.name,'Lập Xuân');
 assert.ok(m.referenceJie.distanceDays>14 && m.referenceJie.distanceDays<15);
 assert.ok(f.referenceJie.distanceDays>15 && f.referenceJie.distanceDays<16);
});
test('V9.8 yin-year 2025 reverses direction convention',()=>{
 const p={date:'2025-06-10',hour:10};
 assert.equal(B.calculate(p).pillars.year.stem,'Ất');
 assert.equal(B.daYun({...p,sex:'male'}).direction,'reverse');
 assert.equal(B.daYun({...p,sex:'female'}).direction,'forward');
});
test('V9.8 cycles advance correct 60-pair pattern, no repeat month pillar as first luck',()=>{
 for(const sex of ['male','female']){
  const r=B.daYun({...sample,sex,count:12}),birth=B.calculate(sample),step=sex==='male'?1:-1;
  assert.equal(r.cycles.length,12);
  for(let i=0;i<r.cycles.length;i++){
   const c=r.cycles[i];assert.equal(c.index,i+1);
   assert.equal(c.stemIndex,mod(birth.pillars.month.stemIndex+step*(i+1),10));
   assert.equal(c.branchIndex,mod(birth.pillars.month.branchIndex+step*(i+1),12));
   assert.ok(Math.abs(c.startingAgeYears-(r.startingAge.decimalYears+10*i))<.002);
   assert.ok(c.endingAgeYears>c.startingAgeYears);
   if(i)assert.equal(c.stemIndex,mod(r.cycles[i-1].stemIndex+step,10));
  }
 }
});
test('V9.8 3-days-year conversion non-rounded base and rounded displayed months consistent',()=>{
 const r=B.daYun({...sample,sex:'male'});
 assert.ok(Math.abs(r.startingAge.decimalYears-r.referenceJie.distanceDays/3)<0.0001);
 assert.ok(Math.abs((r.startingAge.years*12+r.startingAge.months)-r.startingAge.decimalYears*12)<.501);
 assert.equal(r.startingAge.years,4);assert.equal(r.startingAge.months,10);
 assert.match(r.startingAge.precision,/ước tính/);
});
test('V9.8 only twelve monthly Jie, around 2026 Lập Xuân and Kinh Trập',()=>{
 assert.equal(B.JIE_NAMES.length,12);assert.equal(new Set(B.JIE_NAMES).size,12);
 const feb=B.daYun({date:'2026-02-03',hour:12,sex:'female'});
 assert.equal(feb.referenceJie.name,'Lập Xuân');
 const mar=B.daYun({date:'2026-02-20',hour:12,sex:'male'});
 assert.equal(mar.referenceJie.name,'Kinh Trập');
 assert.ok(mar.referenceJie.approxVietnamTime.startsWith('2026-03-05'));
});
test('V9.8 solar Jie solver lands near respective 30-degree boundary',()=>{
 const tm=Date.UTC(2026,1,19,10-7,30); // Vietnam UTC+7
 for(const dir of ['forward','reverse']){
  const event=B.jieBoundaryAt(tm,dir);
  const vt=new Date(event.timestampMs+7*3600000);
  const longitude=B.solarLongitudeAtTime(vt.getUTCFullYear(),vt.getUTCMonth()+1,vt.getUTCDate(),vt.getUTCHours(),vt.getUTCMinutes());
  const dist=Math.abs(mod(longitude-event.longitudeDeg+180,360)-180);
  assert.ok(dist<0.003,`boundary ${dir} ${dist}`);
  assert.ok(event.intervalDays>=0 && event.intervalDays<37);
  assert.equal(dir==='forward',event.timestampMs>tm);
 }
});
test('V9.8 real Jie crossing changes four-pillar month/year, no discontinuity from 00:00',()=>{
 const before=B.calculate({date:'2026-02-04',hour:2});
 const after=B.calculate({date:'2026-02-04',hour:4});
 assert.notEqual(before.pillars.year.name,after.pillars.year.name);
 assert.notEqual(before.pillars.month.name,after.pillars.month.name);
 assert.equal(before.pillars.day.name,after.pillars.day.name);
});
test('V9.8 23:00 rollover does not change direction, reference Jie or age (changes Ten Gods only)',()=>{
 const p={date:'2026-02-19',hour:23,minute:20,sex:'male'};
 const a=B.daYun({...p,dayBoundary:'midnight'}),b=B.daYun({...p,dayBoundary:'late-zi'});
 assert.equal(a.direction,b.direction);
 assert.deepEqual(a.referenceJie,b.referenceJie);
 assert.deepEqual(a.startingAge,b.startingAge);
 assert.equal(a.cycles[0].name,b.cycles[0].name);
 assert.notEqual(a.cycles[0].tenGod,b.cycles[0].tenGod);
});
test('V9.8 invalid inputs rejected; prevents missing gender and oversized cycles',()=>{
 for(const bad of [undefined,'other','Nam',null,''])assert.throws(()=>B.daYun({...sample,sex:bad}),/Nam hoặc Nữ/);
 for(const count of [-1,0,1.2,13,100,NaN])assert.throws(()=>B.daYun({...sample,sex:'male',count}));
 for(const date of ['2026-02-30','1800-01-01','2101-01-01'])assert.throws(()=>B.daYun({date,hour:8,sex:'female'}));
});
test('V9.8 output independent/no mutation and existing natal engine invariant',()=>{
 const input={...sample,sex:'male'};const original=JSON.stringify(input);
 const natal=JSON.stringify(B.calculate(sample));
 const a=B.daYun(input);a.cycles[0].name='INJECTED';a.notes.push('extra');
 const b=B.daYun(input);
 assert.notEqual(b.cycles[0].name,'INJECTED');assert.equal(JSON.stringify(input),original);
 assert.equal(JSON.stringify(B.calculate(sample)),natal);
 assert.equal(b.cycles.length,8);
});
test('V9.8 year edge 1900 and 2100 supported without invalid local formatting',()=>{
 for(const date of ['1900-01-01','1900-12-31','2100-01-01','2100-12-31']){
  for(const sex of ['male','female']){
   const r=B.daYun({date,hour:11,minute:5,sex,count:2});
   assert.ok(Number.isFinite(r.startingAge.decimalYears));
   assert.equal(r.cycles.length,2);
   assert.match(r.referenceJie.approxVietnamTime,/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  }
 }
});
test('V9.8 public engine, types, UI, CSS, HTML demo all expose real Da Yun',()=>{
 assert.equal(Public.baziDaYun,B.daYun);
 assert.equal(typeof Public.baziDaYunRuleSet,'string');
 const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert.match(read('packages/astrology-engine/src/index.d.ts'),/interface DaYunResult/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/Engine\.baziDaYun\(input\)/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/daYun\.cycles\.map/);
 assert.match(read('apps/web/src/app/bazi.css'),/bz-luck-grid/);
 const html=read('tools/offline/bazi.html');assert.match(html,/ThienDoBaZi\.daYun\(/);
 assert.match(html,/id="luck-cycles"/);assert.match(html,/V9\.8/);
 assert.match(read('docs/reference/rules-da-yun-v9-8.md'),/chưa kiểm định/);
});
