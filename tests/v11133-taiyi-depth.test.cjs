'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const t=require('../packages/astrology-engine/src/taiyi-depth.cjs');
const data=require('../packages/astrology-engine/data/taiyi-jinjing-72.json');
const a=(y,side='yang')=>t.calculateAnnual({methodId:t.METHOD,traditionalYear:y,side,calendarBoundaryResolved:true,calendarEvidence:'Một năm truyền thống đã giải quyết ranh giới'});
test('Primary calendrical anchor 724 and modern arithmetic 2026 are reproducible independently of a civil date',()=>{
 const v=a(724).result;assert.equal(v.accumulatedYears,1937281);assert.equal(v.ju,49);assert.equal(v.taiyiPalace,1);assert.equal(v.tianmu.cn,'大炅');assert.equal(v.dimu.cn,'太阳');assert.equal(v.host.count,24);assert.equal(v.guest.count,25);
 const n=a(2026).result;assert.equal(n.accumulatedYears,1938583);assert.equal(n.ju,55);assert.equal(n.taiyiPalace,3);assert.equal(n.tianmu.cn,'武德');assert.equal(n.dimu.cn,'和德');assert.equal(n.host.count,16);assert.equal(n.guest.count,3);
});
test('Yin plate row1 and row49 follow separately transcribed classical yin table',()=>{
 const y=a(2026,'yin').result;assert.deepEqual([y.ju,y.taiyiPalace,y.tianmu.cn,y.dimu.cn,y.host.count,y.guest.count],[55,7,'吕申','和德',16,18]);
 const n=a(724,'yin').result;assert.deepEqual([n.ju,n.taiyiPalace,n.tianmu.cn,n.dimu.cn,n.host.count,n.guest.count],[49,9,'阴德','太阳',16,1]);
});
test('All 144 Yang/Yin 72 rows have stable indexes, deities and complementary Taiyi positions',()=>{
 const gods=new Set(t.SIXTEEN);const shenY=['寅','丑','子','亥','戌','酉','申','未','午','巳','辰','卯'];const shenN=['申','未','午','巳','辰','卯','寅','丑','子','亥','戌','酉'];
 for(const side of t.SIDES){const rows=data.sides[side];assert.equal(rows.length,72);for(const [i,row] of rows.entries()){
  assert.equal(row.ju,i+1);assert.equal(row.jiShen,(side==='yang'?shenY:shenN)[i%12]);assert.ok(t.RING.includes(row.taiyiPalace));assert.ok(gods.has(row.tianmu));assert.ok(gods.has(row.dimu));
  assert.ok(row.hostCount>=1&&row.hostCount<=40);assert.ok(row.guestCount>=1&&row.guestCount<=40);
  assert.equal(t.generalsFromCount(row.hostCount).count,row.hostCount);
  assert.equal(t.getTableRow(row.ju,side),row);
  if(side==='yin')assert.equal(row.taiyiPalace+data.sides.yang[i].taiyiPalace,10);
 }}
});
test('Independent sixteen-god position, WenChang, JiShen, ShiJi and suan audit gives explicit flagged rows',()=>{
 const seen=new Set();for(const s of t.GOD_STATIONS){assert.ok(!seen.has(s.god));seen.add(s.god);if(s.palace===null){assert.equal(s.between.length,2);assert.ok(s.between.every(x=>t.RING.includes(x)));}else{assert.ok(t.RING.includes(s.palace));assert.equal(s.between,null);}}
 const warnings={yang:[],yin:[]};
 for(const side of t.SIDES)for(let ju=1;ju<=72;ju++){
  const row=t.getTableRow(ju,side),audit=t.auditRow(row,side);
  assert.equal(audit.derived.tianmu,row.tianmu);
  assert.equal(audit.derived.jiShen,row.jiShen);
  assert.ok(audit.derived.hostCount>=1&&audit.derived.hostCount<=40);
  assert.ok(audit.derived.guestCount>=1&&audit.derived.guestCount<=40);
  if(audit.requiresSourceCollation)warnings[side].push(ju);
 }
 assert.deepEqual(warnings.yang,[39,50]);
 assert.deepEqual(warnings.yin,[11,15,25,26,27,37,43,44,46,70]);
 assert.equal(t.countFromGod('武德',1),7);assert.equal(t.countFromGod('大武',1),13);
 assert.throws(()=>t.countFromGod('UNKNOWN',1),RangeError);
});
test('72 annual charts, each for Yang/Yin in 724..795, agree with table and table year rotation',()=>{
 for(let i=0;i<72;i++){const year=724+i;for(const side of t.SIDES){const v=a(year,side);const n=((v.result.ju-1)%72);const tab=data.sides[side][n];assert.equal(v.result.taiyiPalace,tab.taiyiPalace);assert.equal(v.result.host.count,tab.hostCount);assert.equal(v.result.guest.count,tab.guestCount);
  assert.equal(v.result.plate.houses.filter(x=>x.isTaiyi).length,1);assert.ok(v.result.plate.houses.every(x=>x.number!==5));assert.equal(v.result.plate.center.taiyiAllowed,false);
  assert.equal(a(year+72,side).result.ju,v.result.ju);}}
});
test('Counsel counts: 10,20,30,40 use mod 9 for general; other counts use ones digit; deputy may be zero',()=>{
 assert.deepEqual([10,20,30,40].map(x=>t.generalsFromCount(x).majorPalace),[1,2,3,4]);
 assert.equal(t.generalsFromCount(7).deputyNumber,1);assert.equal(t.generalsFromCount(13).majorPalace,3);assert.equal(t.generalsFromCount(13).deputyNumber,9);
 assert.equal(t.generalsFromCount(40).deputyNumber,2);assert.equal(t.generalsFromCount(30).deputyNumber,9);
 assert.throws(()=>t.generalsFromCount(0),RangeError);assert.throws(()=>t.generalsFromCount(41),RangeError);
});
test('Traditional year boundary is required, never inferred from Date, timestamp or BCE',()=>{
 const x=t.calculateAnnual({methodId:t.METHOD,traditionalYear:2026,side:'yang',calendarBoundaryResolved:false});assert.equal(x.status,'boundary-unresolved');assert.equal(x.result,null);
 for(const year of [0,-1,2026.5,'2026',null,10000])assert.throws(()=>a(year),RangeError);
 assert.throws(()=>t.calculateAnnual({methodId:t.METHOD,traditionalYear:2026,side:'yang',calendarBoundaryResolved:true,calendarEvidence:''}),RangeError);
 assert.throws(()=>t.calculateAnnual({methodId:'another',traditionalYear:2026,side:'yang',calendarBoundaryResolved:true,calendarEvidence:'safe'}),RangeError);
 assert.throws(()=>t.calculateAnnual({methodId:t.METHOD,traditionalYear:2026,side:'yang',calendarBoundaryResolved:true,calendarEvidence:'safe',date:'2026-10-14'}),TypeError);
});
test('Month and Day only calculate palace from independently verified period ordinal; Hour refuses Year rules',()=>{
 for(const u of ['month','day']){for(let n=1;n<500;n+=7){const x=t.calculatePeriod({unit:u,methodId:t.METHOD,accumulatedOrdinal:n,side:'yang',calendarBoundaryResolved:true,calendarEvidence:'Tích kỳ đối chiếu có nguồn'});
  assert.equal(x.status,'palace-only-research');assert.ok(t.RING.includes(x.result.taiyiPalace));assert.equal(x.result.cycle24,((n-1)%24)+1);assert.equal(x.result.cycle72,((n-1)%72)+1);assert.equal(Object.hasOwn(x.result,'host'),false);
 }}
 const hour=t.calculatePeriod({unit:'hour',methodId:t.METHOD,accumulatedOrdinal:123,side:'yin',calendarBoundaryResolved:true,calendarEvidence:'Một đường kiểm chứng'});assert.equal(hour.status,'method-unresolved');assert.equal(hour.result,null);
 const blocked=t.calculatePeriod({unit:'month',methodId:t.METHOD,accumulatedOrdinal:1,side:'yin',calendarBoundaryResolved:false});assert.equal(blocked.status,'boundary-unresolved');
});
test('Imported JSON may contain only input parameters; no precomputed payload can bypass validation',()=>{
 const input={unit:'year',methodId:t.METHOD,traditionalYear:2026,side:'yang',calendarBoundaryResolved:true,calendarEvidence:'Có nguồn lịch đã kiểm'};
 assert.deepEqual(t.validateTaiyiSnapshot({format:'thien-do.taiyi',version:1,input}),input);
 assert.throws(()=>t.validateTaiyiSnapshot({format:'thien-do.taiyi',version:1,input:{...input,host:999}}),TypeError);
 assert.throws(()=>t.validateTaiyiSnapshot({format:'thien-do.taiyi',version:1,input:{...input,side:'other'}}),RangeError);
});
test('Study API + archive + route + migration + knowledge registry include Taiyi without deleting other disciplines',()=>{
 const base=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(base,p),'utf8');
 for(const p of ['apps/api/src/modules/study/study-validation.ts','apps/web/src/features/study-room/study-types.ts','apps/web/src/features/study-room/study-backup.cjs','apps/web/src/features/study-room/study-links.cjs','apps/web/src/lib/navigation.ts','infrastructure/db/011_taiyi_study.sql'])assert.match(read(p),/thai-at/);
 assert.match(read('apps/web/src/app/study/page.tsx'),/\/thai-at\?entry=/);
 assert.match(read('apps/web/src/features/taiyi/taiyi-panel.tsx'),/calendarBoundaryResolved/);
 const knowledge=JSON.parse(read('packages/knowledge/src/research-disciplines.json'));assert.equal(knowledge.records.find(x=>x.id==='thai-at').route,'/thai-at');
 assert.doesNotMatch(read('apps/api/src/app.module.ts'),/taiyi-depth/); // no unexpected API-wide injection
});
