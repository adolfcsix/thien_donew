#!/usr/bin/env node
'use strict';
/** V11.50: deterministic editorial casebook from engine fixtures. Not scholarly certification. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {buildPalaceRelationalSynthesis,buildPalaceConditionalSynthesis}=require('../../packages/interpretation/src/index.cjs');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json').cases;
const definitions=require('../../packages/knowledge/src/worked-case-definitions.json');
const output=path.join(root,'packages/knowledge/src/worked-examples.json');
const publicFields=({star,kind,palace,branch,branchIndex,relation,side,strength,transformation,scope,year})=>({star,kind,palace,branch:branch??null,branchIndex,relation:relation??null,side:side??null,strength:strength??null,transformation:transformation??null,scope,year:year??null});
const digest=object=>crypto.createHash('sha256').update(JSON.stringify(object)).digest('hex');
function extract(chart,branchIndex,family,id){
 const report=family==='relational'?buildPalaceRelationalSynthesis(chart,branchIndex):
  family==='conditional'?buildPalaceConditionalSynthesis(chart,branchIndex):null;
 if(!report)throw new Error(`Unknown family ${family}`);
 const record=report.records.find(item=>item.id===id);
 if(!record)throw new Error(`Missing record ${family}/${id}`);
 return record;
}
function buildCasebook(){
 const errors=[],results=[],fixtureUses=new Map();
 for(const def of definitions.cases){
  let chosen=null;
  for(const fixture of [...fixtures].sort((a,b)=>(fixtureUses.get(a.id)??0)-(fixtureUses.get(b.id)??0))){
   const input=fixture.input??fixture,chart=Engine.calculate(input);
   const house=chart.houses.find(h=>h.palace===def.palace);
   if(!house){errors.push(`Unknown palace ${def.palace}`);break;}
   const record=extract(chart,house.branchIndex,def.family,def.recordId);
   if(record.status!==def.wanted)continue;
   const ev=record.evidence.map(publicFields);
   const checks=def.family==='relational'?(record.checks??[]).map(({label,met})=>({label,met})):[
    {label:'Có chính tinh bản mệnh với độ sáng hợp lệ tại cung',met:ev.some(x=>x.kind==='chính tinh'&&Boolean(x.strength))},
    {label:'Có bằng chứng thuộc nhóm sao phối hợp, cùng cung hoặc cùng năm được kiểm toán',met:ev.some(x=>x.kind!=='chính tinh')},
    {label:'Không có dữ liệu mâu thuẫn trong nhóm đã đối chiếu',met:record.status!=='needs-review'}
   ];
   // A matched record must not have internally contradictory state.
   if(record.status==='observed' && (record.missing.length||checks.some(c=>!c.met))){errors.push(`False observed: ${def.id}`);break;}
   const witness={status:record.status,checks,evidence:ev,missing:record.missing,matchedPairs:record.matchedPairs??[],relatedBranches:record.relatedBranches??[]};
   chosen={id:def.id,palace:def.palace,family:def.family,recordId:def.recordId,question:def.prompt,exercise:def.exercise,
    title:record.title,scope:record.condition,fixtureId:fixture.id,input,branchIndex:house.branchIndex,
    branch:house.branch,...witness,sha256:digest(witness)};
   break;
  }
  if(!chosen)errors.push(`Cannot find ${def.wanted} sample for ${def.id}`);
  else {results.push(chosen);fixtureUses.set(chosen.fixtureId,(fixtureUses.get(chosen.fixtureId)??0)+1);}
 }
 if(new Set(results.map(item=>item.palace)).size!==12)errors.push('Not all twelve palaces represented');
 if(new Set(results.map(item=>item.id)).size!==results.length)errors.push('Duplicate case ID');
 if(errors.length)throw new Error(errors.join('\n'));
 return {edition:definitions.edition,scope:definitions.scope,school:definitions.school,
   expertReviewed:false,notice:definitions.notice,source:'packages/star-audit/fixtures/chart-baselines.json',
   cases:results};
}
function checkSnapshot(snapshot){
 const current=buildCasebook();
 return {ok:JSON.stringify(snapshot)===JSON.stringify(current),expected:current};
}
if(require.main===module){
 const current=buildCasebook();
 if(process.argv.includes('--write')){fs.writeFileSync(output,JSON.stringify(current,null,2)+'\n');console.log(`Generated ${current.cases.length} replayable cases`);}
 else {const existing=JSON.parse(fs.readFileSync(output,'utf8'));
  if(!checkSnapshot(existing).ok){console.error('STALE: casebook needs regeneration / review');process.exitCode=1;}
  else console.log(`PASS ${existing.cases.length} fixture-derived examples; matching replays`);}
}
module.exports={buildCasebook,checkSnapshot,extract,publicFields};
