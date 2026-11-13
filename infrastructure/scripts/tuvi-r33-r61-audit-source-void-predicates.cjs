'use strict';
/**
 * R61 independently reconstruct source-only predicates from six literal
 * source star names, never from local Tuần/Triệt proxy. This measures coverage,
 * not source-school semantic equivalence or a confirmed classical formation.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-pattern-catalog.cjs');
const {SCHEMA:R33_SCHEMA,validateSource:validateR33}=
 require('./tuvi-r33-evaluate-root-cause.cjs');
const SCHEMA='thiendo-r61-pinned-source-void-predicate-audit-v1';
const INPUT='thiendo-r61-pinned-source-void-predicates-v1';
const SIX=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const GENDERS=Object.freeze(['male','female']);
const YEARS=Object.freeze(Array.from({length:10},(_,i)=>1984+i));
const MONTHS=Object.freeze([2,5,8,11]);
const HOUR_BRANCHES=Object.freeze(Array.from({length:12},(_,i)=>i));
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const sorted=a=>[...a].sort((x,y)=>x-y);
const deep=a=>JSON.stringify(a);
const allIds=()=>{
 const ids=[];
 for(const year of YEARS)for(const month of MONTHS)
  for(const gender of GENDERS)for(const hour of HOUR_BRANCHES)
   ids.push([year,String(month).padStart(2,'0'),'15',gender,hour].join('-'));
 return ids;
};
const CASE_IDS=Object.freeze(allIds());
function auditR61(observation,r33){
 if(!observation||observation.schema!==INPUT||
    observation.provenance?.repository!=='Renhuai123/ziwei-doushu'||
    observation.provenance?.commit!==SOURCE_COMMIT||
    observation.provenance?.iztroVersion!=='2.6.1'||
    observation.provenance?.sourceExecuted!==true||
    observation.provenance?.syntheticOnly!==true||
    deep(observation.provenance?.usedDetectors)!==
      deep(['DING_PIN_GE','DING_ZA_GE','detectDingPin','detectDingZa'])||
    deep(observation.sourceSixVoidNames)!==deep(SIX)||
    deep(observation.years)!==deep(YEARS)||
    deep(observation.months)!==deep(MONTHS)||
    observation.hours!==12||deep(observation.genders)!==deep(GENDERS)||
    observation.caseCount!==960||!Array.isArray(observation.records)||
    observation.records.length!==960||!observation.hitCounts||
    r33?.schema!==R33_SCHEMA)
  throw Error('R61 source provenance or 960-case grid incorrect');
 validateR33(r33);
 const sourceCase=r33.records.find(x=>x.id==='1989-08-15-Nam-0')?.source;
 if(!sourceCase)throw Error('R61 pinned R33 August-1989 target missing');
 const map=new Map(),counts={ban01:0,ban02:0,tap03Periods:0,anyVoidAtMing:0};
 const byName=Object.fromEntries(SIX.map(name=>[name,{chartPresence:0,atMing:0}]));
 const sample={ban01:null,ban02:null,tap03:null};
 for(const row of observation.records){
  if(!row||!CASE_IDS.includes(row.id)||map.has(row.id)||
     !YEARS.includes(row.year)||!MONTHS.includes(row.month)||
     row.day!==15||!GENDERS.includes(row.gender)||
     !HOUR_BRANCHES.includes(row.hour)||!isBranch(row.mingBranch)||
     !isBranch(row.sevenBranch)||!isBranch(row.luBranch)||
     !isBranch(row.horseBranch)||
     row.solarDate!==
       [row.year,String(row.month).padStart(2,'0'),'15'].join('-')||
     row.id!==[row.year,String(row.month).padStart(2,'0'),'15',row.gender,row.hour].join('-')||
     !row.sourceVoidByName||!row.parts||!row.sourcePredicates||
     !row.independentPredicates||
     !Array.isArray(row.voidNamesAtMing)||!Array.isArray(row.periods)||
     row.periods.length!==12)
   throw Error('R61 forged or malformed source case identity');
  map.set(row.id,row);
  for(const name of SIX){
   const arr=row.sourceVoidByName[name];
   if(!Array.isArray(arr)||arr.some(x=>!isBranch(x))||
      deep(arr)!==deep(sorted([...new Set(arr)])))
    throw Error('R61 source six-star branch list is malformed');
   if(arr.length>0)byName[name].chartPresence++;
   if(arr.includes(row.mingBranch))byName[name].atMing++;
  }
  if(Object.keys(row.sourceVoidByName).length!==6)throw Error('R61 extra/unknown void labels');
  const namesAtMing=SIX.filter(name=>row.sourceVoidByName[name].includes(row.mingBranch));
  if(deep(row.voidNamesAtMing)!==deep(namesAtMing))
   throw Error('R61 source per-name Mệnh membership mismatch');
  if(namesAtMing.length>0)counts.anyVoidAtMing++;
  const voidAt=branch=>SIX.some(name=>row.sourceVoidByName[name].includes(branch));
  const p=row.parts;
  if(['liemAtMing','luOrHuaLuAtMing','diKongAndDiJieAtMing',
      'luInSourceVoid','horseInSourceVoid'].some(field=>typeof p[field]!=='boolean')||
     p.luInSourceVoid!==voidAt(row.luBranch)||
     p.horseInSourceVoid!==voidAt(row.horseBranch))
   throw Error('R61 source star components inconsistent with six separately named voids');
  const expectedBan1=namesAtMing.length>0&&p.liemAtMing;
  const expectedBan2=namesAtMing.length>0&&p.luOrHuaLuAtMing&&p.diKongAndDiJieAtMing;
  const starts=new Set(),branches=new Set();
  for(const period of row.periods){
   if(!period||!Number.isInteger(period.startAge)||period.startAge<0||
      !isBranch(period.branch)||starts.has(period.startAge)||
      branches.has(period.branch))
    throw Error('R61 source decade period invalid');
   starts.add(period.startAge);branches.add(period.branch);
  }
  if(deep(row.periods.map(x=>x.startAge))!==deep(sorted([...starts])))
   throw Error('R61 source periods not in ascending age order');
  const expectedTap=row.periods.filter(period=>{
   const b=period.branch;
   return [b,(b+4)%12,(b+8)%12,(b+6)%12].includes(row.sevenBranch)&&
    voidAt(row.luBranch)&&voidAt(row.horseBranch);
  }).map(x=>x.startAge);
  const predicates={
   'dinh-ban-01':expectedBan1,
   'dinh-ban-02':expectedBan2,
   'dinh-tap-03':expectedTap
  };
  if(deep(row.independentPredicates)!==deep(predicates)||
     deep(row.sourcePredicates)!==deep(predicates))
   throw Error('R61 genuine source detector and independent predicates disagree');
  counts.ban01+=Number(expectedBan1);
  counts.ban02+=Number(expectedBan2);
  counts.tap03Periods+=expectedTap.length;
  if(expectedBan1&&!sample.ban01)sample.ban01=row.id;
  if(expectedBan2&&!sample.ban02)sample.ban02=row.id;
  if(expectedTap.length&&!sample.tap03)sample.tap03=row.id;
 }
 if(map.size!==960||CASE_IDS.some(id=>!map.has(id))||
    observation.hitCounts['dinh-ban-01']!==counts.ban01||
    observation.hitCounts['dinh-ban-02']!==counts.ban02||
    observation.hitCounts['dinh-tap-03-periods']!==counts.tap03Periods)
  throw Error('R61 source hit count, duplicate or required case omission');
 const target=map.get('1989-08-15-male-0');
 if(!target||target.mingBranch!==sourceCase.mingGongBranch||
    target.parts.liemAtMing!==
      (sourceCase.liemTrinhBranch===sourceCase.mingGongBranch))
  throw Error('R61 1989 case does not match independently pinned R33 chart');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,caseCount:960,
  natalControlCases:960,uniqueYears:10,monthsPerYear:4,
  completeBirthHourBranches:12,genders:2,
  independentSourcePredicateAgreement:true,
  sourceVoidLabels:Object.freeze([...SIX]),
  perLabel:Object.freeze(Object.fromEntries(SIX.map(name=>[
   name,Object.freeze({...byName[name]})
  ]))),
  sourceHitCounts:Object.freeze({
   'dinh-ban-01':counts.ban01,
   'dinh-ban-02':counts.ban02,
   'dinh-tap-03-periods':counts.tap03Periods
  }),
  casesWithAnySourceVoidAtMing:counts.anyVoidAtMing,
  firstObservedPositive:Object.freeze({...sample}),
  known1989Case:Object.freeze({
   id:target.id,mingBranch:target.mingBranch,
   liemAtMing:target.parts.liemAtMing,
   voidNamesAtMing:Object.freeze([...target.voidNamesAtMing]),
   ban01SourcePredicate:target.sourcePredicates['dinh-ban-01']
  }),
  sourceRuleSyntaxObserved:true,
  sourceSchoolSemanticEquivalenceVerified:false,
  sourceCalendarPolicyVerified:false,
  sourceToLocalPlacementParityVerified:false,
  expertReviewed:false,
  mayEnableUnmappedPatterns:false,mayChangeChartRules:false,
  researchMapped:31,referenceTotal:49,mayIncreaseMapping:false,
  limitation:'960 synthetic pinned source charts validate exact source Boolean predicates and six distinct void labels. This does NOT equate them to Thiên Đồ Tuần/Triệt, validate all actual births or authorize a 32nd mapped pattern.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R61 expects actual source runtime JSON');
 const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const r33=JSON.parse(fs.readFileSync('.r33-source-1989-root-cause-observations.json','utf8'));
 const out=auditR61(o,r33);
 fs.writeFileSync('.r61-pinned-void-predicate-audit.json',JSON.stringify(out,null,2)+'\n');
 console.log('R61: 960 pinned genuine source charts, source Boolean predicate agreement; counts '+
  JSON.stringify(out.sourceHitCounts)+'; six named void labels independent; 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,INPUT,SIX,IDS,YEARS,MONTHS,HOUR_BRANCHES,CASE_IDS,auditR61});
