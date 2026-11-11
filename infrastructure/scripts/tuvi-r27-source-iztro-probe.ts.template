/**
 * R27 external runtime probe.
 * Copy THIS file into the root of the pinned reference checkout as
 * .thiendo-r27-iztro-probe.ts and execute it there using that project's
 * committed tsx/iztro dependencies. Does not modify either engine.
 *
 * Only synthetic, non-personal chart cases are used.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateChart } from './lib/ziwei/algorithm';
import { astro } from 'iztro';

const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const PINNED_IZTRO='2.6.1';
const SOURCE_NAMES=['旬空','副旬','截空','副截'];
const RAW_NAMES=['旬空','副旬','截路','空亡','截空','副截'];
const BRANCHES='子丑寅卯辰巳午未申酉戌亥'.split('');
const cases=JSON.parse(readFileSync('../tests/fixtures/tuvi-r27-iztro-cases.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const runtime=JSON.parse(readFileSync('node_modules/iztro/package.json','utf8'));
if(lock.packages?.['node_modules/iztro']?.version!==PINNED_IZTRO||runtime.version!==PINNED_IZTRO)
 throw new Error('iztro version does not match the pinned source lockfile');
if(cases.schema!=='thiendo-r27-public-synthetic-case-matrix-v1'||
   !Array.isArray(cases.cases)||cases.cases.length!==65)
 throw new Error('Unexpected R27 synthetic case list');

function fromSource(palaces:any[]):Record<string,number[]>{
 const result:Record<string,number[]>=Object.fromEntries(SOURCE_NAMES.map(name=>[name,[]]));
 if(!Array.isArray(palaces)||palaces.length!==12)throw new Error('Source has no 12 palace array');
 for(const palace of palaces){
  const branch=palace.branch;
  if(!Number.isInteger(branch)||branch<0||branch>11)throw new Error('Source branch invalid');
  for(const star of palace.stars||[]){
   if(Object.prototype.hasOwnProperty.call(result,star.name))result[star.name].push(branch);
  }
 }
 return result;
}
function fromIztro(palaces:any[]):Record<string,number[]>{
 const result:Record<string,number[]>=Object.fromEntries(RAW_NAMES.map(name=>[name,[]]));
 if(!Array.isArray(palaces)||palaces.length!==12)throw new Error('iztro has no 12 palaces');
 for(const palace of palaces){
  const branch=BRANCHES.indexOf(palace.earthlyBranch);
  if(branch<0)throw new Error('Unrecognized iztro earthlyBranch');
  for(const field of ['majorStars','minorStars','adjectiveStars']){
   for(const star of palace[field]||[]){
    if(Object.prototype.hasOwnProperty.call(result,star.name))result[star.name].push(branch);
   }
  }
 }
 return result;
}

const records=cases.cases.map((sample:any)=>{
 const [year,month,day]=sample.date.split('-').map(Number);
 const hourBranch=Math.floor(((sample.hour+1)%24)/2);
 const sourceGender=sample.gender==='Nam'?'male':sample.gender==='Nữ'?'female':null;
 if(!sourceGender||sample.minute!==0||sample.hour===23||hourBranch<0||hourBranch>11)
  throw new Error('Unexpected synthetic case: '+sample.id);
 // The pinned source implementation calls its lockfile's iztro internally.
 const chart=generateChart({year,month,day,hour:hourBranch,gender:sourceGender});
 // Independently observe the raw iztro chart *before source name-swapping*.
 // The pinned source has configured iztro at module import time.
 const raw=astro.bySolar(sample.date,hourBranch,sourceGender==='male'?'男':'女',true,'zh-CN');
 const sourceStars=fromSource(chart.palaces);
 const rawIztroStars=fromIztro(raw.palaces);
 return {
  id:sample.id,kind:sample.kind,solarDate:sample.date,
  hour:sample.hour,hourBranch,gender:sample.gender,
  lunarYear:chart.lunarInfo.lunarYear,
  lunarMonth:chart.lunarInfo.lunarMonth,
  lunarDay:chart.lunarInfo.lunarDay,
  lunarIsLeapMonth:chart.lunarInfo.isLeapMonth,
  lunarYearStemIndex:chart.lunarInfo.yearStem,
  lunarYearBranchIndex:chart.lunarInfo.yearBranch,
  sourceStars,rawIztroStars
 };
});
const result={
 schema:'thiendo-r27-source-iztro-observation-v1',
 provenance:{
  sourceRepository:'Renhuai123/ziwei-doushu',sourceCommit:SOURCE_COMMIT,
  iztroVersion:runtime.version,
  sourceFunction:'generateChart + postprocessed applySchoolJiekong/applySchoolFuxun',
  rawEngineFunction:'astro.bySolar',syntheticCasesOnly:true
 },
 records
};
writeFileSync('../.r27-source-iztro-observations.json',JSON.stringify(result,null,2)+'\n','utf8');
console.log('R27: observed '+records.length+' synthetic charts from pinned source and iztro@'+runtime.version);
