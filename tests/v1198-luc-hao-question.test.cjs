'use strict';
const {test}=require('node:test'); const a=require('node:assert/strict');
const {hexagramFromBits}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const T=require('../apps/web/src/features/luc-hao/temporal.cjs');
const {getQuestionGuide,buildQuestionEvidence,QUESTION_GUIDES}=require('../apps/web/src/features/luc-hao/question-evidence.cjs');
const {getSchool,gateSchoolExecution}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const c=bits=>makeNaJiaChart(hexagramFromBits(bits));
const tru=c('100010');
const money={questionId:'money-owned-assets',confirmedFamily:'Thê Tài'};
test('five narrow and explicit topics cover each family exactly once',()=>{
 a.equal(Object.keys(QUESTION_GUIDES).length,5);
 a.equal(new Set(Object.values(QUESTION_GUIDES).map(g=>g.family)).size,5);
 for(const id of Object.keys(QUESTION_GUIDES))a.equal(getQuestionGuide(id).requiresExplicitConfirmation,true);
});
test('unknown or ambiguous topics fail closed',()=>{for(const id of ['health','marriage','litigation','travel','love','',null,undefined,'__proto__'])a.throws(()=>getQuestionGuide(id),RangeError);});
test('no implicit selection: confirmed family must match explicitly',()=>{
 for(const rel of [undefined,'Phụ Mẫu','Tử Tôn','Thê Tài '])a.throws(()=>buildQuestionEvidence(tru,{questionId:'money-owned-assets',confirmedFamily:rel}),RangeError);
});
test('Thủy Lôi Truân selected finance topic yields Phục Thần Mậu Ngọ under Canh Thìn',()=>{
 const x=buildQuestionEvidence(tru,money);
 a.equal(x.referenceStatus,'HIDDEN_REFERENCE');a.equal(x.visible.length,0);a.equal(x.hidden.length,1);
 a.equal(x.hidden[0].stemBranch,'MậuNgọ');a.equal(x.hidden[0].flying.stemBranch,'CanhThìn');
 a.equal(x.hidden[0].flying.hiddenToFlying,'generate');a.equal(x.chosenUsefulGodLine,null);
});
test('all proposed families have real reference candidates over 64 hexagrams',()=>{
 for(let n=0;n<64;n++)for(const [id,g] of Object.entries(QUESTION_GUIDES)){
  const e=buildQuestionEvidence(c(n.toString(2).padStart(6,'0')),{questionId:id,confirmedFamily:g.family});
  a.ok(e.visible.length+e.hidden.length>0);a.equal(e.visible.length*e.hidden.length,0);
  a.equal(e.decision.usefulGod,null);
 }
});
test('visible relative never invents a hidden reference',()=>{
 const x=buildQuestionEvidence(tru,{questionId:'office-position',confirmedFamily:'Quan Quỷ'});
 a.equal(x.referenceStatus,'VISIBLE');a.deepEqual(x.visible.map(y=>y.position),[3,5]);a.equal(x.hidden.length,0);
});
test('day/month manual evidence distinguishes month break and day clash',()=>{
 const x=buildQuestionEvidence(tru,{...money,context:T.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Tý'})});
 a.equal(x.calendarStatus,'USER_SUPPLIED');a.equal(x.hidden[0].day.clash,true);
 a.equal(x.hidden[0].month.monthBreak,true);a.equal(x.hidden[0].xunVoid,false);
 a.equal(x.hidden[0].dayBreak,null);a.equal(x.hidden[0].monthProsperity,null);
});
test('day clash does not by itself imply 日破 or 暗動',()=>{
 const x=buildQuestionEvidence(tru,{...money,context:T.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'})});
 a.equal(x.hidden[0].day.clash,true);a.equal(x.hidden[0].month.monthBreak,false);
 a.equal(x.hidden[0].dayBreak,null);a.equal(x.hidden[0].auspiciousness,null);
});
test('xun void stays independent of day and month clashes',()=>{
 const x=buildQuestionEvidence(tru,{...money,context:T.manualContext({dayStem:'Giáp',dayBranch:'Ngọ',monthBranch:'Ngọ'})});
 // Jia Wu -> xun void Chen/Si, hidden Wu not void
 a.equal(x.hidden[0].xunVoid,false);a.equal(x.hidden[0].month.monthBreak,false);
 const y=buildQuestionEvidence(tru,{questionId:'office-position',confirmedFamily:'Quan Quỷ',context:T.manualContext({dayStem:'Giáp',dayBranch:'Ngọ',monthBranch:'Tý'})});
 a.equal(y.visible.some(z=>z.xunVoid===true),true);
});
test('no date must be unknown not false',()=>{
 const e=buildQuestionEvidence(tru,money);a.equal(e.hidden[0].xunVoid,null);a.equal(e.hidden[0].day,null);a.equal(e.hidden[0].month,null);
 a.equal(e.monthOrigin,null);
});
test('approximate calendar context never supplies Month Break',()=>{
 const manual=T.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Tý'});
 const context={...manual,source:'calendar-utc7-noon-approx',date:'2026-10-12'};
 const e=buildQuestionEvidence(tru,{...money,context});
 a.equal(e.calendarStatus,'CALENDAR_APPROXIMATE');a.equal(e.hidden[0].month,null);
 a.equal(e.hidden[0].day.clash,true);a.equal(e.monthOrigin,null);
});
test('movement is explicitly declared, sorted, unique and frozen',()=>{
 const e=buildQuestionEvidence(tru,{...money,movingPositions:[5,3]});a.deepEqual(e.movingPositions,[3,5]);
 a.equal(e.hidden[0].isDeclaredMoving,true);a.equal(e.hidden[0].flying.movementIsDeclaredForFlying,true);
 a.equal(e.hidden[0].emergence,null);a.ok(Object.isFrozen(e.movingPositions));a.ok(Object.isFrozen(e.hidden[0]));
});
test('invalid movement positions cannot pass',()=>{
 for(const movingPositions of [[0],[7],[-1],[1,1],[2.5],[2,'3'],['3'],[],[1,2,3,4,5,6,7],null,{}].filter(x=>x!==[])){
  if(Array.isArray(movingPositions)&&movingPositions.length===0)continue;
  a.throws(()=>buildQuestionEvidence(tru,{...money,movingPositions}),RangeError);
 }
});
test('input validation rejects charts forged at any Nạp Giáp layer',()=>{
 const x=structuredClone(tru);x.lines[2].branch='Hợi';a.throws(()=>buildQuestionEvidence(x,money),TypeError);
});
test('do not auto-select one line for duplicate family',()=>{
 const e=buildQuestionEvidence(tru,{questionId:'office-position',confirmedFamily:'Quan Quỷ'});
 a.equal(e.visible.length,2);a.equal(e.chosenUsefulGodLine,null);a.equal(e.decision.usefulGod,null);
});
test('unsupported source of moon or contradictory xun void denied',()=>{
 let context={...T.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),source:'external'};
 a.throws(()=>buildQuestionEvidence(tru,{...money,context}),TypeError);
 context={...T.manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Ngọ'}),voidBranches:['Dần','Mão']};
 a.throws(()=>buildQuestionEvidence(tru,{...money,context}),TypeError);
});
test('production is still blocked for both old and new school',()=>{
 a.equal(getSchool('luc-hao-dung-than-evidence').status,'deterministic-subroutine-only');
 a.equal(gateSchoolExecution('luc-hao-dung-than-evidence').verdict,'RESEARCH_SUBROUTINE_ONLY');
 a.equal(gateSchoolExecution('luc-hao-jingfang').verdict,'BLOCKED');
});
test('legacy module not importing this module',()=>{
 const fs=require('node:fs');for(const f of ['apps/web/src/app/luc-hao/page.tsx','apps/web/src/features/luc-hao/na-jia.cjs','apps/web/src/features/luc-hao/relative-focus.cjs','apps/api/src/main.ts'])
 a.doesNotMatch(fs.readFileSync(require('node:path').resolve(__dirname,'..',f),'utf8'),/question-evidence\.cjs/);
});
test('evidence never resolves prosperity, timing or auspiciousness',()=>{
 for(const [id,guide] of Object.entries(QUESTION_GUIDES)){
  const e=buildQuestionEvidence(tru,{questionId:id,confirmedFamily:guide.family});
  a.deepEqual(e.decision,{usefulGod:null,emergence:null,prosperity:null,auspiciousness:null,timing:null});
 }
});
