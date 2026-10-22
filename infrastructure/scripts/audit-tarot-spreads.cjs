'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../../packages/astrology-engine/src/tarot-rws.cjs'),A=require('../../packages/astrology-engine/src/tarot-spreads.cjs'),D=require('../../packages/interpretation/src/tarot-depth.cjs'),C=require('../../packages/interpretation/src/tarot-comparison.cjs');
const registry=A.getSpreadRegistry(),errors=[];let snapshots=0,comparisons=0;
try{
 for(const [key,name] of [['knowledgeChecksum','tarot-depth-78.json'],['deckCatalogChecksum','tarot-rws-78.json']])assert.equal(registry.method[key],'sha256:'+crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../packages/knowledge/src/'+name))).digest('hex'));
 for(const spread of ['one','three','celtic-cross','custom'])for(const context of registry.contexts)for(let i=0;i<50;i++){
  const custom=spread==='custom'?{layout:A.makeCustomLayout(Array.from({length:16},(_,j)=>({id:'p'+(j+1),label:'Vị trí '+(j+1),role:'focus',prompt:'Câu hỏi cần kiểm tra '+(j+1),x:j%5,y:Math.floor(j/5),rotation:0})))}:{};
  const s=A.newAdvancedSpread({spread,includeReversed:Boolean(i%2),context,...custom}),before=JSON.stringify(s),report=D.studyTarotSnapshot(s);
  assert.deepEqual(E.parseReadingExport(JSON.stringify(E.createReadingExport(s))),s);assert.equal(new Set(s.draw.map(c=>c.id)).size,s.draw.length);assert.equal(report.context,context);assert.equal(report.positions.length,s.draw.length);assert.equal(report.combinations.length,s.draw.length*(s.draw.length-1)/2);assert.equal(JSON.stringify(s),before);snapshots++;
  const pair=C.compareTarotSnapshots([s,s]);assert.equal(pair.positionsAligned,true);assert.equal(pair.rows.length,s.draw.length);comparisons++;
 }
 const a=A.newAdvancedSpread({spread:'three'}),b=E.newSpread({spread:'three'});assert.equal(C.compareTarotSnapshots([a,b]).positionsAligned,false);
}catch(e){errors.push(e.message);}
const report={edition:'11.125.0',verdict:errors.length?'FAIL':'PASS',snapshotVersions:[1,2],methodVersion:2,knowledgeEdition:registry.method.knowledgeEdition,advancedSnapshots:snapshots,comparisons,customMax:16,celticPositions:10,errors,limits:'Internal reproducibility and validation only; not predictive or independent expert validation of the Celtic adaptation.'};
if(process.argv.includes('--write')){const out=path.resolve(__dirname,'../../docs/reports/tarot-spreads-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
