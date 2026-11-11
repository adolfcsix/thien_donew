'use strict';
/* R44: source-only formula test harness. NEVER a Thiên Đồ natal verdict. */
const {SOURCE_COMMIT}=require('./classical-pattern-catalog.cjs');
const VOID=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const URL='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/';
function evaluatePinnedSourceVoidFixture(input){
 if(!input||input.kind!=='source-synthetic-fixture'||!Array.isArray(input.palaces)||
    input.palaces.length!==12||!Number.isInteger(input.mingGongBranch)||
    input.mingGongBranch<0||input.mingGongBranch>11||
    !Array.isArray(input.periodBranches)||input.periodBranches.length!==12)
  throw new TypeError('Only complete, synthetic source-shaped fixtures are supported');
 const byBranch=new Map();
 for(const palace of input.palaces){
  if(!palace||!Number.isInteger(palace.branch)||palace.branch<0||
     palace.branch>11||byBranch.has(palace.branch)||!Array.isArray(palace.stars))
   throw new RangeError('Duplicate or invalid source branch');
  for(const star of palace.stars){
   if(!star||typeof star.name!=='string'||!star.name.trim()||
      (star.siHua!==undefined&&!['禄','权','科','忌'].includes(star.siHua)))
    throw new TypeError('Invalid source star or transformation');
  }
  byBranch.set(palace.branch,palace.stars);
 }
 if(byBranch.size!==12||new Set(input.periodBranches).size!==12||
    input.periodBranches.some(b=>!Number.isInteger(b)||b<0||b>11))
  throw new RangeError('Incomplete source fixture period geometry');
 const has=(b,name)=>byBranch.get(b).some(star=>star.name===name);
 const atVoid=b=>VOID.some(name=>has(b,name));
 const m=input.mingGongBranch,stars=byBranch.get(m);
 const a=atVoid(m)&&has(m,'廉贞');
 const b=(has(m,'禄存')||stars.some(s=>s.siHua==='禄'))&&
   atVoid(m)&&has(m,'地空')&&has(m,'地劫');
 const findStar=name=>input.palaces.find(p=>p.stars.some(s=>s.name===name))?.branch;
 const loc=findStar('禄存'),horse=findStar('天马');
 const bothVoid=loc!==undefined&&horse!==undefined&&atVoid(loc)&&atVoid(horse);
 const periods=Object.freeze(input.periodBranches.map((branch,index)=>{
  const four=[branch,(branch+4)%12,(branch+8)%12,(branch+6)%12];
  return Object.freeze({index,branch,
   sevenKillingsInFourCourts:four.some(x=>has(x,'七杀')),
   locAndHorseEachAtSourceVoid:bothVoid,
   formulaMatched:four.some(x=>has(x,'七杀'))&&bothVoid});
 }));
 const entry=(id,formulaMatched,periodRows=Object.freeze([]))=>Object.freeze({
  id,formulaMatched,periods:periodRows,
  sourceUrl:URL+(id==='dinh-tap-03'?'patterns-dingza.ts':'patterns-dingpin.ts'),
  sourceEnginePlacementVerified:false,parityWithThienDoVerified:false,
  mayDeclarePattern:false
 });
 return Object.freeze({
  schema:'thiendo-r44-source-void-fixture-v1',sourceCommit:SOURCE_COMMIT,
  sourceVoidNames:VOID,mappedConditionResearch:31,referenceTotal:49,
  items:Object.freeze([entry(IDS[0],a),entry(IDS[1],b),
   entry(IDS[2],periods.some(row=>row.formulaMatched),periods)]),
  sourceEnginePlacementVerified:false,parityWithThienDoVerified:false,
  mayDeclarePattern:false,mayIncreaseMapping:false,
  notice:'Synthetic SOURCE formula only. Six Void placements and school parity are unverified; no Thiên Đồ chart conclusion.'
 });
}
module.exports=Object.freeze({VOID,IDS,evaluatePinnedSourceVoidFixture});
