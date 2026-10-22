#!/usr/bin/env node
'use strict';
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const {BRANCHES}=require('../../packages/astrology-engine/src/da-liu-ren-plates.cjs');
const {STEMS,STEM_LODGING,buildFourLessons}=require('../../packages/astrology-engine/src/da-liu-ren-four-lessons.cjs');
const {deriveThreeTransmissions}=require('../../packages/astrology-engine/src/da-liu-ren-three-transmissions.cjs');
const data=JSON.parse(readFileSync(resolve(__dirname,'../../tests/fixtures/v1190-classical-liuren-cases.json'),'utf8'));
const errors=[];let checked=0,resolved=0,unresolved=0;
if(data.cases.length<5)errors.push('Not enough independent worked examples');
if(!existsSync(resolve(__dirname,'../../docs/research/schools/dai-luc-nham-four-lessons.md')))errors.push('Missing method documentation');
for(const row of data.cases){
 if(!row.sourceUrl.startsWith('https://'))errors.push('Example without source URL: '+row.id);
 const f=buildFourLessons(row.input);
 if(JSON.stringify(f.lessons.map(x=>x.upper))!==JSON.stringify(row.expectedUpper))errors.push('Four lessons mismatch '+row.id);
 if(row.expectedThree){const t=deriveThreeTransmissions(row.input);
  if(JSON.stringify(t.transmissions?.sequence)!==JSON.stringify(row.expectedThree)||t.rule!==row.expectedRule)errors.push('Three transmissions mismatch '+row.id);
 }
}
for(let s=0;s<STEMS.length;s++)for(let b=0;b<BRANCHES.length;b++){
 if(s%2!==b%2)continue;
 for(const monthGeneral of BRANCHES)for(const divinationHour of BRANCHES){
  checked++;
  const v=deriveThreeTransmissions({dayStem:STEMS[s],dayBranch:BRANCHES[b],monthGeneral,divinationHour});
  if(v.verdict==='derived-subroutine-only'){
   resolved++;
   if(!v.transmissions||v.transmissions.sequence.length!==3||v.transmissions.sequence.some(x=>!BRANCHES.includes(x)))errors.push('Invalid resolved sequence');
  }else if(v.verdict==='unresolved'){
   unresolved++;
   if(v.transmissions!==null)errors.push('Fail-open unresolved case');
  }else errors.push('Unexpected verdict');
 }
}
if(checked!==8640||resolved+unresolved!==8640||Object.keys(STEM_LODGING).length!==10)errors.push('Coverage drift');
const result={status:errors.length?'FAIL':'PASS',workedExamples:data.cases.length,validCombinations:checked,resolvedResearchCases:resolved,pendingCases:unresolved,errors};
console.log('Da Liu Ren Four Lessons and partial Three Transmissions:',JSON.stringify(result));
if(errors.length)process.exitCode=1;
