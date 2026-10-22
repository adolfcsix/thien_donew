'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../../packages/astrology-engine/src/tarot-rws.cjs'),D=require('../../packages/interpretation/src/tarot-depth.cjs');
const data=require('../../packages/knowledge/src/tarot-depth-78.json'),pages=require('../../packages/knowledge/src/tarot-depth-source-pages.json');
let singletonReads=0,pairReads=0;const errors=[];
try{
 assert.deepEqual(data.cards.map(c=>c.id),E.CARDS.map(c=>c.id));assert.equal(data.cards.length,78);
 for(const c of data.cards){assert.equal(c.symbols.length,2);assert.equal(c.contexts.length,3);assert.equal(c.scenarios.length,2);assert.equal(c.companions.length,1);assert.ok(pages.pages.some(p=>p.url===c.source.url));
  for(const reversed of [false,true]){const s={version:1,deck:E.METHODS.deck,spread:'one',includeReversed:true,question:'',draw:[{id:c.id,reversed}]};const r=D.studyTarotSnapshot(s);assert.equal(r.positions[0].orientation,reversed?'reversed':'upright');assert.equal(r.combinations.length,0);singletonReads++;}
 }
 // Exercise every ordered three-card reference window across the 78-card cycle,
 // all eight orientation patterns and four explicit contexts.
 for(let i=0;i<78;i++)for(let bits=0;bits<8;bits++)for(const context of ['general','work','relationship','resources']){
  const s={version:1,deck:E.METHODS.deck,spread:'three',includeReversed:true,question:'audit-private',draw:[0,1,2].map(j=>({id:E.CARDS[(i+j)%78].id,reversed:Boolean(bits&(1<<j))}))};
  const before=JSON.stringify(s),r=D.studyTarotSnapshot(s,{context});assert.equal(r.combinations.length,3);assert.equal(JSON.stringify(s),before);assert.ok(!JSON.stringify(r).includes('audit-private'));pairReads++;
 }
}catch(e){errors.push(e.message);}
const report={edition:'11.124.0',verdict:errors.length?'FAIL':'PASS',cards:data.cards.length,symbols:data.cards.flatMap(c=>c.symbols).length,contexts:data.cards.flatMap(c=>c.contexts).length,scenarios:data.cards.flatMap(c=>c.scenarios).length,companionLinks:data.cards.flatMap(c=>c.companions).length,primaryIdentityReferences:pages.pages.length,singletonReads,threeCardReads:pairReads,errors,limits:'Internal schema and position/orientation/context invariants; not expert review or predictive validation. Reference windows are not exhaustive over all 78 choose 3 combinations.'};
if(process.argv.includes('--write')){const out=path.resolve(__dirname,'../../docs/reports/tarot-depth-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
