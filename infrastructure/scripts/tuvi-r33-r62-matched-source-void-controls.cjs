'use strict';
/**
 * R62: controlled positive/negative source-only witnesses across the
 * 960 genuine, pinned R61 source charts (11,520 decade contexts).
 *
 * Natal controls: same solar date + gender, differing one birth hour BRANCH.
 * Major-period controls: same source chart, different 10-year period.
 * These pairs are observational checks, NEVER causal interventions.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT,SOURCE_ALIASES}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditR61,CASE_IDS,SIX}=require('./tuvi-r33-r61-audit-source-void-predicates.cjs');
const SCHEMA='thiendo-r62-genuine-source-matched-controls-v1';
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const MODES=Object.freeze(['both','xun-only','jiekong-only','neither']);
const XUN=Object.freeze(['旬空','副旬']);
const JIE=Object.freeze(['截路','截空','空亡','副截']);
const expected=Object.freeze({'dinh-ban-01':24,'dinh-ban-02':4,'dinh-tap-03':768});
const check=(ok,message)=>{if(!ok)throw Error('R62 '+message);};
const get=(row,branch,names)=>{
 check(Number.isInteger(branch)&&branch>=0&&branch<12,'invalid branch');
 return names.some(name=>row.sourceVoidByName[name].includes(branch));
};
function familiesAt(row,branch){
 const names=SIX.filter(name=>row.sourceVoidByName[name].includes(branch));
 for(const pair of SOURCE_ALIASES){
  check(!(names.includes(pair.legacy)&&names.includes(pair.normalized)),
   'double-counted source legacy/canonical Jiekong alias');
 }
 return Object.freeze({
  xun:get(row,branch,XUN),
  jiekong:get(row,branch,JIE),
  sourceNames:Object.freeze(names)
 });
}
function predicateModes(row,id,period){
 const p=row.parts;
 const atMing=familiesAt(row,row.mingBranch);
 const atLoc=familiesAt(row,row.luBranch);
 const atHorse=familiesAt(row,row.horseBranch);
 const yes=(f,mode)=>mode==='both'?(f.xun||f.jiekong):
  mode==='xun-only'?f.xun:mode==='jiekong-only'?f.jiekong:false;
 const out={};
 for(const mode of MODES){
  if(id==='dinh-ban-01')
   out[mode]=p.liemAtMing&&yes(atMing,mode);
  else if(id==='dinh-ban-02')
   out[mode]=p.luOrHuaLuAtMing&&p.diKongAndDiJieAtMing&&yes(atMing,mode);
  else if(id==='dinh-tap-03'){
   check(period&&Number.isInteger(period.branch)&&period.branch>=0&&period.branch<12,
    'missing source period for third predicate');
   const four=[period.branch,(period.branch+4)%12,
    (period.branch+8)%12,(period.branch+6)%12];
   out[mode]=four.includes(row.sevenBranch)&&
    yes(atLoc,mode)&&yes(atHorse,mode);
  }else throw Error('R62 unknown source criterion '+id);
 }
 check(!out.neither&&(!out['xun-only']||out.both)&&
  (!out['jiekong-only']||out.both),'ablation must be monotonic');
 return Object.freeze({
  ...out,
  onlyTogether:out.both&&!out['xun-only']&&!out['jiekong-only'],
  familyOnlyXun:out.both&&out['xun-only']&&!out['jiekong-only'],
  familyOnlyJiekong:out.both&&out['jiekong-only']&&!out['xun-only']
 });
}
function auditR62(observations,r33){
 const prior=auditR61(observations,r33); // full pinned source oracle + R33 anchor
 check(prior.sourceCommit===SOURCE_COMMIT&&prior.caseCount===960&&
  prior.independentSourcePredicateAgreement===true&&
  prior.sourceSchoolSemanticEquivalenceVerified===false&&
  prior.researchMapped===31&&prior.referenceTotal===49&&
  prior.mayIncreaseMapping===false,'R61 source baseline invalid');
 check(CASE_IDS.length===960&&Array.isArray(observations.records)&&
  observations.records.length===960,'source grid unavailable');
 const before=JSON.stringify(observations);
 const byId=new Map(observations.records.map(row=>[row.id,row]));
 check(byId.size===960&&CASE_IDS.every(id=>byId.has(id)),
  'source grid missing/duplicate cases');
 const byProfile=new Map();
 for(const row of observations.records){
  const key=row.solarDate+'|'+row.gender;
  if(!byProfile.has(key))byProfile.set(key,[]);
  byProfile.get(key).push(row);
 }
 check(byProfile.size===80&&[...byProfile.values()].every(g=>
  g.length===12&&new Set(g.map(x=>x.hour)).size===12),
  'not 80 full 12-hour source control groups');
 const counts=Object.fromEntries(IDS.map(id=>[id,{
  contexts:0,sourcePositive:0,xunOnlyPositive:0,
  jiekongOnlyPositive:0,onlyTogether:0,
  familyOnlyXun:0,familyOnlyJiekong:0
 }]));
 const witnesses={ 'dinh-ban-01':[], 'dinh-ban-02':[], 'dinh-tap-03':[] };
 const positiveByDateGender={
  'dinh-ban-01':new Set(),'dinh-ban-02':new Set()
 };
 const add=(id,modes)=>{
  const c=counts[id];c.contexts++;
  if(modes.both)c.sourcePositive++;
  if(modes['xun-only'])c.xunOnlyPositive++;
  if(modes['jiekong-only'])c.jiekongOnlyPositive++;
  if(modes.onlyTogether)c.onlyTogether++;
  if(modes.familyOnlyXun)c.familyOnlyXun++;
  if(modes.familyOnlyJiekong)c.familyOnlyJiekong++;
 };
 const cyclicDistance=(a,b)=>Math.min(Math.abs(a-b),12-Math.abs(a-b));
 for(const row of observations.records){
  for(const id of IDS.slice(0,2)){
   const m=predicateModes(row,id,null);
   check(m.both===row.sourcePredicates[id],
    'source natal predicate differs from pinned detector: '+id+' '+row.id);
   add(id,m);
   if(!m.both)continue;
   const group=byProfile.get(row.solarDate+'|'+row.gender);
   const neg=group.filter(x=>x.hour!==row.hour&&!x.sourcePredicates[id])
    .sort((a,b)=>cyclicDistance(a.hour,row.hour)-cyclicDistance(b.hour,row.hour)||
      a.hour-b.hour)[0];
   check(neg,'missing actual source negative from same solar date/gender: '+id+' '+row.id);
   const negativeModes=predicateModes(neg,id,null);
   check(!negativeModes.both,'selected natal source control not negative');
   const dateGender=row.solarDate+'|'+row.gender;
   positiveByDateGender[id].add(dateGender);
   witnesses[id].push(Object.freeze({
    positiveId:row.id,negativeId:neg.id,
    solarDate:row.solarDate,gender:row.gender,
    positiveHourBranch:row.hour,negativeHourBranch:neg.hour,
    hourBranchDistance:cyclicDistance(row.hour,neg.hour),
    positiveModes:m,negativeModes,
    comparisonKind:'same-date-gender-different-birth-hour-branch',
    matchedBirthInstant:false,isolatesSingleStarRule:false
   }));
  }
  const periods=row.periods;
  const status=new Map(periods.map(period=>[
   period.startAge,predicateModes(row,'dinh-tap-03',period)]));
  check(status.size===12,'source decade start ages duplicated');
  const listed=row.sourcePredicates['dinh-tap-03'];
  check(periods.filter(period=>status.get(period.startAge).both).length===listed.length&&
   periods.every(period=>status.get(period.startAge).both===
     listed.includes(period.startAge)),
   'source period list contradicts pinned detector');
  for(const period of periods){
   const m=status.get(period.startAge);
   add('dinh-tap-03',m);
   if(!m.both)continue;
   const neg=periods.filter(p=>p.startAge!==period.startAge&&
     !status.get(p.startAge).both)
    .sort((a,b)=>Math.abs(a.startAge-period.startAge)-
      Math.abs(b.startAge-period.startAge)||a.startAge-b.startAge)[0];
   check(neg,'missing negative source period from same chart: '+row.id);
   const negModes=status.get(neg.startAge);
   witnesses['dinh-tap-03'].push(Object.freeze({
    positiveId:row.id,negativeId:row.id,
    sourcePositivePeriodStartAge:period.startAge,
    sourceNegativePeriodStartAge:neg.startAge,
    sourcePositivePeriodBranch:period.branch,
    sourceNegativePeriodBranch:neg.branch,
    positiveModes:m,negativeModes:negModes,
    comparisonKind:'same-chart-different-major-period',
    sameSourceChart:true,matchedPeriod:false,
    sourceVoidNamesAtLoc:Object.freeze([...familiesAt(row,row.luBranch).sourceNames]),
    sourceVoidNamesAtHorse:Object.freeze([...familiesAt(row,row.horseBranch).sourceNames])
   }));
  }
 }
 check(counts['dinh-ban-01'].contexts===960&&
  counts['dinh-ban-02'].contexts===960&&
  counts['dinh-tap-03'].contexts===11520,
  'R62 source-grid coverage not complete');
 for(const id of IDS){
  const c=counts[id];
  check(c.sourcePositive===expected[id]&&
   witnesses[id].length===expected[id],
   'pinned source positive count or matched control missing: '+id);
 }
 check(prior.sourceHitCounts['dinh-ban-01']===counts['dinh-ban-01'].sourcePositive&&
  prior.sourceHitCounts['dinh-ban-02']===counts['dinh-ban-02'].sourcePositive&&
  prior.sourceHitCounts['dinh-tap-03-periods']===counts['dinh-tap-03'].sourcePositive,
  'R62 differs from source audited R61 positive counts');
 check(JSON.stringify(observations)===before,'R62 changed genuine source observations');
 const countGroups=Object.freeze(Object.fromEntries(
  IDS.slice(0,2).map(id=>[id,positiveByDateGender[id].size])
 ));
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,
  genuineSourceDetectorVerified:true,syntheticOnly:true,
  charts:960,dateGenderControlGroups:80,
  decadeContexts:11520,positiveContexts:796,
  matchedNegativeControlCount:796,
  criteria:Object.freeze(IDS),
  counts:Object.freeze(Object.fromEntries(IDS.map(id=>[
   id,Object.freeze({...counts[id]})
  ]))),
  sourcePositiveDateGenderGroups:countGroups,
  witnesses:Object.freeze(Object.fromEntries(IDS.map(id=>[
   id,Object.freeze(witnesses[id])
  ]))),
  sourceSchoolParityVerified:false,
  semanticEquivalenceVerified:false,sourceToLocalPlacementParityVerified:false,
  alternateCalendarPolicyVerified:false,expertReviewed:false,
  researchMapped:31,referenceTotal:49,mayIncreaseMapping:false,
  mayDeclarePattern:false,mayChangeChartRules:false,
  conclusion:'Matched source controls strengthen detector falsifiability but changing birth hour changes the birth chart; changing major period changes context. Neither is a single-star causal intervention nor Tuần/Triệt school equivalence. No promotion to 32/49.'
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R62 requires genuine pinned R61 source JSON');
 const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const r33=JSON.parse(fs.readFileSync('.r33-source-1989-root-cause-observations.json','utf8'));
 const result=auditR62(o,r33);
 fs.writeFileSync('.r62-source-matched-positive-negative-controls.json',
  JSON.stringify(result,null,2)+'\n');
 console.log('R62: '+result.charts+' charts, '+
  result.decadeContexts+' period contexts, '+result.matchedNegativeControlCount+
  ' matched positive/negative comparisons; '+JSON.stringify(result.counts)+
  '; 31/49 unchanged');
}
module.exports=Object.freeze({SCHEMA,IDS,MODES,XUN,JIE,familiesAt,predicateModes,auditR62});
