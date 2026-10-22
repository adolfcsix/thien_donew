'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const methods=require('../packages/knowledge/src/phase2-school-methods.cjs');
const {BRANCHES,ZHONG_QI,monthGeneralAfterZhongQi,buildHeavenEarthPlates}=require('../packages/astrology-engine/src/da-liu-ren-plates.cjs');
const {schools,disciplines}=methods.registry;

test('Phase 2 records cover known and newly missing disciplines with explicit status',()=>{
 assert.equal(disciplines.length,14);assert.equal(schools.length,17);
 for(const id of ['tu-vi','bat-tu','luc-hao','mai-hoa','ky-mon','phong-thuy','dai-luc-nham','thai-at','ha-lac']) assert.ok(methods.getDiscipline(id),id);
 assert.equal(methods.getDiscipline('thai-at').implementation,'foundation-only');
 assert.equal(methods.getDiscipline('dai-luc-nham').implementation,'foundation-only');
 assert.equal(methods.getDiscipline('__proto__'),null);
 assert.equal(methods.getSchool('missing'),null);
});
test('School method documentation is kept separate and every document has boundaries',()=>{
 const keys=new Set();
 for(const school of schools){
  assert.ok(!keys.has(school.id));keys.add(school.id);
  assert.ok(methods.getDiscipline(school.disciplineId));
  const file=resolve(root,school.document);
  assert.ok(existsSync(file),school.id);
  const content=readFileSync(file,'utf8');
  assert.match(content,/Đầu vào/);assert.match(content,/Chưa đủ điều kiện/);
  assert.ok(school.pending.length>=1);assert.ok(school.boundaries.length>=1);
 }
});
test('All unreviewed methods fail closed; only explicitly allowlisted research subroutines are available',()=>{
 for(const school of schools){
  const gate=methods.gateSchoolExecution(school.id);
  if(['dai-luc-nham-yuejiang','thai-at-foundation','tu-vi-phi-tinh','bat-tu-tiet-khi','bat-tu-nguyet-lenh','bat-tu-bien-cach','luc-hao-phuc-than','luc-hao-dung-than-evidence','luc-hao-multiple-jie-evidence','mai-hoa-lunar-number'].includes(school.id))assert.equal(gate.verdict,'RESEARCH_SUBROUTINE_ONLY');
  else assert.equal(gate.verdict,'BLOCKED',school.id);
 }
 assert.equal(methods.gateSchoolExecution('__proto__').verdict,'BLOCKED');
 assert.ok(Object.isFrozen(methods.registry));assert.ok(Object.isFrozen(methods.registry.schools));
 assert.ok(Object.isFrozen(methods.registry.schools[0]));
});
test('12 middle solar terms map to 12 distinct manually selected month generals',()=>{
 assert.equal(Object.keys(ZHONG_QI).length,12);
 assert.equal(new Set(Object.values(ZHONG_QI)).size,12);
 assert.equal(monthGeneralAfterZhongQi('Vũ Thủy'),'Hợi');
 assert.equal(monthGeneralAfterZhongQi('Đông Chí'),'Sửu');
 assert.throws(()=>monthGeneralAfterZhongQi('Lập Xuân'),RangeError);
 assert.throws(()=>monthGeneralAfterZhongQi('2026-10-12'),RangeError);
 assert.throws(()=>monthGeneralAfterZhongQi('__proto__'),RangeError);
});
for(const general of BRANCHES){
 test(`12 divination-hour cases map the complete sky ring for month general ${general}`,()=>{
  for(const hour of BRANCHES){
   const result=buildHeavenEarthPlates({monthGeneral:general,divinationHour:hour});
   assert.equal(result.positions.find(x=>x.earth===hour).heaven,general);
   assert.equal(result.positions.length,12);
   assert.equal(new Set(result.positions.map(x=>x.heaven)).size,12);
   assert.equal(result.positions[0].earth,'Tý');
   for(let i=0;i<12;i++)assert.equal(result.positions[i].heaven,BRANCHES[(i+result.offset)%12]);
   assert.equal(result.pattern,result.offset===0?'phuc-ngam':result.offset===6?'phan-ngam':'normal');
   assert.equal(result.status,'deterministic-subroutine-only');
   assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.positions));
  }
 });
}
test('Classic example places Hợi on Ngọ, Tý on Mùi as specified by 六壬指南',()=>{
 const v=buildHeavenEarthPlates({monthGeneral:'Hợi',divinationHour:'Ngọ'});
 assert.equal(v.positions[BRANCHES.indexOf('Ngọ')].heaven,'Hợi');
 assert.equal(v.positions[BRANCHES.indexOf('Mùi')].heaven,'Tý');
 assert.equal(v.positions[BRANCHES.indexOf('Thân')].heaven,'Sửu');
});
test('Fu Yin / Fan Yin are only geometrical labels, not predictions',()=>{
 const same=buildHeavenEarthPlates({monthGeneral:'Tý',divinationHour:'Tý'});
 const opp=buildHeavenEarthPlates({monthGeneral:'Ngọ',divinationHour:'Tý'});
 assert.equal(same.pattern,'phuc-ngam');assert.equal(opp.pattern,'phan-ngam');
 assert.equal(same.offset,0);assert.equal(opp.offset,6);
 assert.ok(!Object.hasOwn(opp,'fortune'));
});
test('Invalid or ambiguous branch input is rejected without a best-effort conversion',()=>{
 for(const bad of [undefined,null,0,12,'子','ty','tý','','__proto__',[],{}]){
  assert.throws(()=>buildHeavenEarthPlates({monthGeneral:bad,divinationHour:'Tý'}));
  assert.throws(()=>buildHeavenEarthPlates({monthGeneral:'Hợi',divinationHour:bad}));
 }
 assert.throws(()=>buildHeavenEarthPlates({monthGeneral:'Hợi',divinationHour:'Tý',date:'2026-10-12'}),TypeError);
 assert.throws(()=>buildHeavenEarthPlates(null),TypeError);
});
test('Method math stays isolated, not silently enabled in TuVi or production endpoints',()=>{
 const astrologicalEngine=readFileSync(resolve(root,'packages/astrology-engine/src/tuvi.js'),'utf8');
 assert.doesNotMatch(astrologicalEngine,/da-liu-ren-plates/);
 const knowledge=require('../packages/knowledge/src/index.cjs');
 assert.equal(knowledge.phase2Schools,methods);
});
