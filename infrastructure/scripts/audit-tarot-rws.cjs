'use strict';
/** Fail-closed Tarot RWS taxonomy + snapshot audit, independent of Next/Nest dependencies. */
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const dataset=JSON.parse(readFileSync(path.join(root,'packages/knowledge/src/tarot-rws-78.json'),'utf8'));
const {CARDS,METHODS,reading,validateSpreadSnapshot}=require(path.join(root,'packages/astrology-engine/src/tarot-rws.cjs'));
const required=['id','name','nameVi','symbol','upright','reversed','reflection'];
function audit(){
 assert.equal(dataset.cardCount,78,'Declared 78-card deck');
 assert.equal(dataset.tradition,METHODS.deck,'Method ID must be stable');
 assert.equal(CARDS.length,78,'Full deck');
 assert.equal(new Set(CARDS.map(x=>x.id)).size,78,'Unique canonical cards');
 assert.equal(CARDS.filter(x=>x.arcana==='major').length,22);
 const majors=CARDS.filter(x=>x.arcana==='major');
 assert.deepEqual(majors.map(x=>x.number),Array.from({length:22},(_,i)=>i));
 assert.equal(majors[8].name,'Strength');assert.equal(majors[11].name,'Justice');
 for(const suit of ['wands','cups','swords','pentacles']){
  const minor=CARDS.filter(x=>x.suit===suit);
  assert.deepEqual(minor.map(x=>x.number),Array.from({length:14},(_,i)=>i+1),suit);
 }
 assert.equal(CARDS.filter(x=>x.arcana==='minor').length,56);
 assert.equal(new Set(CARDS.map(x=>x.reflection)).size,78,'Independent reflection questions');
 for(const card of CARDS){
  for(const key of required)assert.ok(typeof card[key]==='string'&&card[key].trim().length>0,`${card.id}:${key}`);
  assert.notEqual(card.upright,card.reversed,card.id);
  for(const reversed of [false,true]){
   const snapshot={version:METHODS.version,deck:METHODS.deck,spread:'one',includeReversed:true,question:'Bài kiểm toán',draw:[{id:card.id,reversed}]};
   const normalized=validateSpreadSnapshot(snapshot);
   assert.deepEqual(normalized,snapshot,`${card.id} snapshot`);
   const result=reading(normalized);
   assert.equal(result.positions.length,1);assert.equal(result.positions[0].card.id,card.id);
   assert.equal(result.positions[0].meaning,reversed?card.reversed:card.upright);
  }
 }
 const sql=readFileSync(path.join(root,'infrastructure/db/009_tarot_rws_study.sql'),'utf8');
 assert.match(sql,/study_entries_discipline_check/);assert.match(sql,/tarot/);
 const requiredPaths=['apps/web/src/app/tarot/page.tsx','apps/web/src/app/tarot/tarot.module.css','apps/api/src/modules/study/study-validation.ts','tests/v11120-tarot-rws.test.cjs'];
 for(const file of requiredPaths)assert.ok(existsSync(path.join(root,file)),file);
 const disciplines=JSON.parse(readFileSync(path.join(root,'packages/knowledge/src/research-disciplines.json'),'utf8'));
 assert.equal(disciplines.records.filter(x=>x.id==='tarot'&&x.route==='/tarot').length,1);
 return {deck:METHODS.deck,cards:CARDS.length,major:22,minor:56,positionScenarios:156,sourceFiles:requiredPaths.length};
}
if(require.main===module){try{console.log('[PASS] V11.120 Tarot RWS taxonomy, 156 snapshot cases and shared contracts',JSON.stringify(audit()));}catch(e){console.error('[FAIL]',e);process.exitCode=1;}}
module.exports={audit};
