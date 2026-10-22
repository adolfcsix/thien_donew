'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {resolve}=require('node:path');
const Hex=require('../apps/web/src/features/iching/hexagrams.cjs');
const Na=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const Hidden=require('../apps/web/src/features/luc-hao/hidden-relative.cjs');
const Time=require('../apps/web/src/features/luc-hao/temporal.cjs');
const Schools=require('../packages/knowledge/src/phase2-school-methods.cjs');
const relatives=['Phụ Mẫu','Huynh Đệ','Tử Tôn','Thê Tài','Quan Quỷ'];
const chart=bits=>Na.makeNaJiaChart(Hex.hexagramFromBits(bits));
const pure=bits=>Na.makeNaJiaChart(Hex.hexagramFromBits(bits));
const sample=()=>chart('100010'); // 水雷屯 – 坎宮
const file=p=>readFileSync(resolve(__dirname,'..',p),'utf8');
test('V11.97: 水雷屯 has no 妻财 exposed and seeks 坎宮純卦 3rd 戊午',()=>{
 const x=Hidden.hiddenRelativeEvidence(sample(),'Thê Tài');
 assert.equal(x.status,'HIDDEN_REFERENCE');assert.equal(x.palace,'kan');assert.equal(x.purePalaceBits,'010010');
 assert.equal(x.hidden.length,1);assert.equal(x.hidden[0].position,3);
 assert.equal(x.hidden[0].hidden.stemBranch,'MậuNgọ');assert.equal(x.hidden[0].flying.stemBranch,'CanhThìn');
 assert.equal(x.hidden[0].flyingToHidden,'generated-by');assert.equal(x.hidden[0].hiddenToFlying,'generate');
 assert.equal(x.visible.length,0);assert.equal(x.decision.usefulGod,null);
});
test('V11.97: selecting a visible relative must never invent a hidden copy',()=>{
 const x=Hidden.hiddenRelativeEvidence(sample(),'Quan Quỷ');
 assert.equal(x.status,'VISIBLE');assert.deepEqual(x.visible.map(c=>c.line.position),[3,5]);assert.equal(x.hidden.length,0);
});
test('V11.97: pure palace always has visible selected relative',()=>{
 for(const trigram of Hex.TRIGRAMS){const c=chart(trigram.bits.repeat(2));for(const family of relatives){
  const x=Hidden.hiddenRelativeEvidence(c,family);assert.equal(x.status,'VISIBLE');assert.equal(x.hidden.length,0);
 }}
});
test('V11.97: for all 64 hexagrams x 5 families, hidden references are real SAME-POSITION palace lines',()=>{
 let hiddenCount=0,visibleCount=0;
 for(let i=0;i<64;i++){const bits=i.toString(2).padStart(6,'0'),c=chart(bits),p=pure(c.palace.bits.repeat(2));
  for(const family of relatives){const x=Hidden.hiddenRelativeEvidence(c,family);
   assert.equal(x.palace,c.palace.id);assert.equal(x.purePalaceBits,c.palace.bits.repeat(2));
   if(c.lines.some(l=>l.family===family)){visibleCount++;assert.equal(x.status,'VISIBLE');assert.equal(x.hidden.length,0);}
   else{hiddenCount++;assert.equal(x.status,'HIDDEN_REFERENCE');assert.ok(x.hidden.length>0);
    for(const ref of x.hidden){assert.deepEqual(ref.hidden.stemBranch,p.lines[ref.position-1].stemBranch);
     assert.equal(ref.hidden.family,family);assert.equal(ref.flying.stemBranch,c.lines[ref.position-1].stemBranch);
     assert.equal(ref.flying.position,ref.hidden.position);}
   }
  }
 }
 assert.equal(hiddenCount+visibleCount,320);assert.ok(hiddenCount>0);
});
test('V11.97: reject unchosen or invalid relative – no automatic Dụng Thần',()=>{
 for(const bad of [undefined,null,'','tài','__proto__',0,{},['Thê Tài']])assert.throws(()=>Hidden.hiddenRelativeEvidence(sample(),bad),RangeError);
});
test('V11.97: impossible chart/missing lines fails closed',()=>{
 for(const bad of [null,{}, {hexagram:sample().hexagram,lines:[]}, {hexagram:null,lines:new Array(6)}])assert.throws(()=>Hidden.hiddenRelativeEvidence(bad,'Thê Tài'),TypeError);
});
test('V11.97: mutated branch, family, palace, stage, method or position cannot spoof Fu Shen',()=>{
 for(const update of [
  x=>x.lines[2].branch='Hợi',x=>x.lines[2].family='Thê Tài',x=>x.lines[2].position=1,
  x=>x.palace.id='qian',x=>x.stage.id='first',x=>x.method='foreign-school']){
  const c=structuredClone(sample());update(c);assert.throws(()=>Hidden.hiddenRelativeEvidence(c,'Thê Tài'),TypeError);
 }
});
test('V11.97: without calendar no fabricated Nhật/Nguyệt, Tuần Không or auspiciousness',()=>{
 const x=Hidden.hiddenRelativeEvidence(sample(),'Thê Tài');
 assert.equal(x.calendarStatus,'NOT_SUPPLIED');assert.deepEqual(x.hidden[0].calendar,{day:null,month:null,void:null,monthUsable:false});
 for(const field of ['usefulGod','prosperity','auspiciousness','timing'])assert.equal(x.decision[field],null);
});
test('V11.97: manually supplied Can Chi provides day/month structure, not vượng suy score',()=>{
 const context=Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'});
 const x=Hidden.hiddenRelativeEvidence(sample(),'Thê Tài',{context});const h=x.hidden[0];
 assert.equal(x.calendarStatus,'USER_SUPPLIED');assert.equal(h.calendar.month.branch,'Ngọ');
 assert.deepEqual(h.calendar.month.relation,['đồng chi']);
 assert.equal(h.calendar.day.elementFromDay,'control'); // Water controls Fire
 assert.equal(h.calendar.month.elementFromMonth,'same');
 assert.equal(h.calendar.void,false);assert.equal(h.calendar.month.opposed,false);
 assert.equal(x.decision.prosperity,null);
});
test('V11.97: month opposition is flagged structurally but not treated as automatic bad fate',()=>{
 const context=Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Tý'});
 const x=Hidden.hiddenRelativeEvidence(sample(),'Thê Tài',{context});
 assert.equal(x.hidden[0].calendar.month.opposed,true);
 assert.ok(x.hidden[0].calendar.month.relation.includes('lục xung'));
 assert.equal(x.decision.auspiciousness,null);
});
test('V11.97: unknown/unverifiable calendars are refused, no auto-fallback',()=>{
 for(const c of [{source:'external',dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ',voidBranches:['Tuất','Hợi']},
  {...Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),voidBranches:['Dần','Mão']},
  {...Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),dayStem:'Ất'},
  {...Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),monthBranch:'foo'}])
 assert.throws(()=>Hidden.hiddenRelativeEvidence(sample(),'Thê Tài',{context:c}),/./);
});
test('V11.97: approximate civil calendar month must stay hidden, not treated as verified Jie',()=>{
 const c={...Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),
  source:'calendar-utc7-noon-approx',date:'2026-10-12'};
 const x=Hidden.hiddenRelativeEvidence(sample(),'Thê Tài',{context:c});
 assert.equal(x.calendarStatus,'CALENDAR_APPROXIMATE');assert.equal(x.hidden[0].calendar.month,null);
 assert.equal(x.hidden[0].calendar.day.branch,'Tý');
});
test('V11.97: forbid approximate context with no traceable civil date',()=>{
 const c={...Time.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),source:'calendar-utc7-noon-approx'};
 assert.throws(()=>Hidden.hiddenRelativeEvidence(sample(),'Thê Tài',{context:c}),TypeError);
});
test('V11.97: freeze returned objects and preserve line ordering for UI adapter',()=>{
 const x=Hidden.hiddenRelativeEvidence(sample(),'Quan Quỷ');
 assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.visible)&&Object.isFrozen(x.notes));
 assert.ok(Object.isFrozen(x.visible[0])&&Object.isFrozen(x.visible[0].line));
 assert.deepEqual(x.visible.map(v=>v.line.position),[3,5]);
});
test('V11.97: school execution is isolated research; unrecognized/legacy schools remain blocked',()=>{
 assert.equal(Schools.getSchool('luc-hao-phuc-than').engineIntegration,'isolated-research-only');
 assert.equal(Schools.gateSchoolExecution('luc-hao-phuc-than').verdict,'RESEARCH_SUBROUTINE_ONLY');
 assert.equal(Schools.gateSchoolExecution('luc-hao-jingfang').verdict,'BLOCKED');
 assert.equal(Schools.gateSchoolExecution('__proto__').verdict,'BLOCKED');
});
test('V11.97: legacy calculators and production pages do not auto-import research routine',()=>{
 for(const p of ['apps/web/src/features/luc-hao/na-jia.cjs','apps/web/src/features/luc-hao/relative-focus.cjs',
  'apps/web/src/app/luc-hao/page.tsx','apps/api/src/main.ts'])assert.doesNotMatch(file(p),/hidden-relative\.cjs/);
});
test('V11.97: documentation, typings and release audit are present',()=>{
 assert.match(file('docs/research/schools/luc-hao-phuc-than.md'),/Chưa đủ điều kiện/);
 assert.match(file('apps/web/src/features/luc-hao/hidden-relative.d.cts'),/usefulGod:null/);
 assert.match(file('infrastructure/scripts/verify-release.mjs'),/audit-luc-hao-hidden.cjs/);
});
