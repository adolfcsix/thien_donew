'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const reference=require('./fixtures/qimen-v11110-relations-independent.json');
const {TOPICS,INDICATORS,palaceRelation,readQuestionBoard}=require('../apps/web/src/features/ky-mon/question-reading.cjs');
const {makeBaseFormation,hourForDayBranch}=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const {analyzeStructuralSignals}=require('../apps/web/src/features/ky-mon/structural-signals.cjs');
function board(term=3,day=52,branch=5){const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:hourForDayBranch(day,branch).index});return {base,plate:buildRotatingHourPlate(base)};}
function selection(overrides={}){return {topic:'career',indicatorId:'door:Khai',referencePalace:1,confirmed:true,questionNote:'Kiểm tra cung biểu tượng đã chọn',...overrides};}
const has=(list,id)=>list.some(x=>x.id===id||x.code===id);

test('all 16 hand-entered Five-Phase palace pairs agree with directed comparisons',()=>{
 for(const row of reference.cases){const report=palaceRelation(row.from,row.to,'independent-reference');assert.equal(report.code,row.expected,`${row.text}: ${row.from} -> ${row.to}`);}
 assert.throws(()=>palaceRelation(5,1,'x'),RangeError);assert.throws(()=>palaceRelation(1,0,'x'),RangeError);
});
test('topic and indicator catalogs are explicit, complete and do not auto-select a yongshen',()=>{
 assert.equal(TOPICS.length,7);assert.equal(new Set(TOPICS.map(x=>x.id)).size,TOPICS.length);
 assert.equal(INDICATORS.filter(x=>x.layer==='door').length,8);
 assert.equal(INDICATORS.filter(x=>x.layer==='star').length,9);
 assert.equal(INDICATORS.filter(x=>x.layer==='deity').length,8);
 assert.ok(!INDICATORS.some(x=>x.topic||x.recommended));
});
test('no evidence reading until the user confirms BOTH topic and yongshen',()=>{
 const {base,plate}=board();const r=readQuestionBoard(base,plate,selection({confirmed:false}));assert.equal(r.status,'awaiting-confirmation');assert.equal(r.usePalace,null);assert.equal(r.contextEvidence.length,0);assert.ok(has(r.missingData,'confirmation'));
});
test('locates a door on actual hour plate, not the home-door chart or selected palace',()=>{
 const {base,plate}=board(),symbol='Khai',target=plate.palaces.find(x=>x.door===symbol);
 const r=readQuestionBoard(base,plate,selection({indicatorId:`door:${symbol}`,referencePalace:null}));
 assert.equal(r.status,'evidence-ready');assert.equal(r.usePalace,target.number);assert.equal(r.relations.length,1);assert.ok(has(r.missingData,'reference'));assert.ok(r.contextEvidence.some(x=>x.text.includes('không lấy Môn/Sao bản vị')));
});
test('supports directed generation of yongshen palace, with no outcome or score',()=>{
 const {base,plate}=board();const target=plate.palaces.find(x=>x.number===3);
 const indicatorId=`door:${target.door}`;
 const r=readQuestionBoard(base,plate,selection({indicatorId,referencePalace:1}));
 assert.equal(r.usePalace,3);assert.equal(r.relations[0].code,'generates');assert.ok(has(r.supportingEvidence,'reference-generates-use'));
 assert.equal(r.outcome,null);assert.equal(r.score,null);assert.equal(r.forecast,null);
});
test('directed control of yongshen is counterevidence; reverse control is NOT auto favorable',()=>{
 const {base,plate}=board();const target6=plate.byPalace[6];const a=readQuestionBoard(base,plate,selection({indicatorId:`deity:${target6.deity}`,referencePalace:9}));
 assert.ok(has(a.counterEvidence,'reference-controls-use'));assert.equal(a.relations[0].code,'controls');
 const target9=plate.byPalace[9];const b=readQuestionBoard(base,plate,selection({indicatorId:`deity:${target9.deity}`,referencePalace:6}));
 assert.equal(b.relations[0].code,'controlled-by');assert.equal(has(b.supportingEvidence,'reference-generates-use'),false);assert.ok(has(b.contextEvidence,'reference-relation'));
});
test('same reference palace, opposite palace and five-element relations remain separate',()=>{
 const {base,plate}=board();const p=plate.byPalace[2];const r=readQuestionBoard(base,plate,selection({indicatorId:`door:${p.door}`,referencePalace:2}));
 assert.equal(r.relations[0].code,'same');assert.equal(r.relations[1].toPalace,8);assert.equal(r.relations[1].role,'use-to-opposite');
 assert.ok(has(r.contextEvidence,'reference-relation'));assert.ok(has(r.contextEvidence,'opposite'));
});
test('center cannot become a fabricated time-plate reference',()=>{
 const {base,plate}=board();const r=readQuestionBoard(base,plate,selection({referencePalace:5}));
 assert.ok(has(r.missingData,'center-reference'));assert.equal(r.relations.length,1);assert.equal(has(r.supportingEvidence,'reference-generates-use'),false);
});
test('day-less/hour-less formation yields missing hour-plate, not a synthetic result',()=>{
 const base=makeBaseFormation({solarTermIndex:3,dayCycleIndex:52});const r=readQuestionBoard(base,null,selection());
 assert.equal(r.status,'not-computed');assert.equal(r.usePalace,null);assert.ok(has(r.missingData,'hour-plate'));
});
test('unrepresented heaven stem is flagged; not mapped from the earth center',()=>{
 let witness=null;
 for(let t=0;t<24&&!witness;t++)for(let d of [0,14,29,52])for(let b=0;b<12;b++){
  const v=board(t,d,b);const coverage=analyzeStructuralSignals(v.base,v.plate).graveCoverage.find(x=>x.status==='not-represented');
  if(coverage){witness={...v,stem:coverage.stem};break;}
 }
 assert.ok(witness);const r=readQuestionBoard(witness.base,witness.plate,selection({indicatorId:`stem:${witness.stem}`}));
 assert.equal(r.status,'unlocated');assert.equal(r.usePalace,null);assert.ok(has(r.missingData,'indicator-not-represented'));assert.match(r.missingData[0].text,/Trung 5/);
});
test('lodged Tian Qin is declared a convention, not a ninth placed star',()=>{
 const {base,plate}=board();const r=readQuestionBoard(base,plate,selection({indicatorId:'star:Thiên Cầm'}));
 assert.equal(r.status,'evidence-ready');assert.equal(r.usePalace,plate.palaces.find(x=>x.lodgedTianQin).number);
 assert.ok(has(r.missingData,'tian-qin-independent'));assert.ok(has(r.contextEvidence,'tian-qin-host'));
});
test('existing structural signs travel into counter evidence only when present, no invented positive negations',()=>{
 const {base,plate}=board();const structural=analyzeStructuralSignals(base,plate);
 for(const p of plate.palaces.filter(x=>x.number!==5)){
  const r=readQuestionBoard(base,plate,selection({indicatorId:`door:${p.door}`,referencePalace:null}));
  assert.equal(has(r.counterEvidence,'door-pressure'),structural.byPalace[p.number].door.status==='present');
  assert.equal(has(r.counterEvidence,'wonder-grave'),structural.byPalace[p.number].grave.status==='present');
 }
});
test('all inputs validated; forged board rejected through V11.109 integrity gate',()=>{
 const {base,plate}=board();for(const patch of [{topic:'otherxxx'},{topic:'other',questionNote:''},{indicatorId:'door:bad'},{referencePalace:'1'},{referencePalace:10},{questionNote:'a'.repeat(281)},{confirmed:'yes'}])assert.throws(()=>readQuestionBoard(base,plate,selection(patch)));
 assert.throws(()=>readQuestionBoard({...base,ju:100},plate,selection()),RangeError);
 assert.throws(()=>readQuestionBoard(base,{...plate,byPalace:{...plate.byPalace,1:{...plate.byPalace[1],door:'bogus'}}},selection()),RangeError);
});
test('output immutable, original board unchanged, incomplete methods explicitly listed',()=>{
 const {base,plate}=board();const before=JSON.stringify([base,plate]);const r=readQuestionBoard(base,plate,selection());
 assert.ok(has(r.missingData,'season-strength'));assert.ok(has(r.missingData,'pattern-synthesis'));assert.ok(has(r.missingData,'time-location'));
 assert.throws(()=>r.missingData.push({}),TypeError);assert.throws(()=>r.contextEvidence[0].text='changed',TypeError);
 assert.equal(JSON.stringify([base,plate]),before);assert.equal(r.outcome,null);
});
test('hour-plate location and reading evidence stay consistent across both dun directions and all indicator layers',()=>{
 let cases=0,seenDun=new Set();
 for(const term of [0,3,12,15])for(const day of [0,52])for(const branch of [0,3,9]){
  const {base,plate}=board(term,day,branch);seenDun.add(base.dun);
  for(const cell of plate.palaces.filter(p=>p.number!==5))for(const [kind,symbol] of [['door',cell.door],['deity',cell.deity],['star',cell.star],['stem',cell.heavenStem]]){
   const r=readQuestionBoard(base,plate,selection({indicatorId:`${kind}:${symbol}`,referencePalace:null}));
   assert.equal(r.status,'evidence-ready');assert.equal(r.usePalace,cell.number);
   assert.ok(r.missingData.some(x=>x.code==='reference'));
   assert.equal(r.outcome,null);cases++;
  }
 }
 assert.equal(cases,768);assert.deepEqual([...seenDun].sort(),['dương','âm'].sort());
});
