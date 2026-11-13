'use strict';
/**
 * R61: remove each SOURCE void-name family in a counterfactual copy of its
 * predicates, using genuine R29/R30 pinned-source observations, never a
 * substitute local chart. This identifies WHICH SOURCE void family is needed
 * for a source match. It does not compare meanings with Thiên Đồ Tuần/Triệt.
 *
 * R53's independent atom reconstruction is the provenance and logic gate.
 */
const fs=require('node:fs');
const {SOURCE_COMMIT,SOURCE_NAMES,NORMALIZED_NAMES,SOURCE_ALIASES,
 reconcileClassicalVoidVocabulary}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {buildR53}=require('./tuvi-r32-r53-source-void-atoms.cjs');
const SCHEMA='thiendo-r61-pinned-source-void-family-ablation-v1';
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const MODES=Object.freeze(['both','xun-only','jiekong-only','neither']);
const FAMILY=Object.freeze({
 xun:Object.freeze(['旬空','副旬']),
 jiekong:Object.freeze(['截空','副截'])
});
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const checked=(ok,msg)=>{if(!ok)throw Error('R61: '+msg);};
const sorted=s=>[...s].sort();
function familyAt(names){
 checked(Array.isArray(names)&&names.every(x=>SOURCE_NAMES.includes(x)),'unrecognized source void label');
 checked(new Set(names).size===names.length,'repeated same-named source void star in a palace');
 for(const pair of SOURCE_ALIASES){
  checked(!(names.includes(pair.legacy)&&names.includes(pair.normalized)),
   'legacy and modern void aliases must not double-count as independent stars');
 }
 const lexical=reconcileClassicalVoidVocabulary(names);
 checked(lexical.unresolved.length===0&&lexical.lexicalOnly===true&&
  lexical.sourcePlacementVerified===false&&lexical.sourceCriterionVerified===false,
  'not source-only lexical accounting');
 const canonical=sorted(new Set(lexical.normalizedNames));
 checked(canonical.every(name=>NORMALIZED_NAMES.includes(name)),
  'unexpected source canonical void name');
 return Object.freeze({
  sourceNames:Object.freeze(sorted(names)),
  canonicalNames:Object.freeze(canonical),
  xun:canonical.some(name=>FAMILY.xun.includes(name)),
  jiekong:canonical.some(name=>FAMILY.jiekong.includes(name))
 });
}
const active=(family,mode)=>mode==='both'?family.xun||family.jiekong:
 mode==='xun-only'?family.xun:
 mode==='jiekong-only'?family.jiekong:false;
function fourModes(criterion,atoms,places){
 checked(IDS.includes(criterion),'unknown criterion '+criterion);
 checked(atoms&&places&&typeof atoms==='object'&&typeof places==='object',
  'missing source predicate atoms or source void locations');
 const natal=criterion==='dinh-ban-01'||criterion==='dinh-ban-02';
 checked(natal?places.ming&&typeof places.ming.xun==='boolean'&&
  typeof places.ming.jiekong==='boolean':
  places.loc&&places.horse&&typeof places.loc.xun==='boolean'&&
  typeof places.horse.xun==='boolean'&&
  typeof places.loc.jiekong==='boolean'&&typeof places.horse.jiekong==='boolean',
  'missing family inputs for criterion scope');
 const result={};
 for(const mode of MODES){
  if(criterion==='dinh-ban-01')
   result[mode]=atoms.liemTrinhAtMing&&active(places.ming,mode);
  else if(criterion==='dinh-ban-02')
   result[mode]=atoms.locOrHuaLocAtMing&&active(places.ming,mode)&&
    atoms.diaKhongAtMing&&atoms.diaKiepAtMing;
  else {
   checked(isBranch(atoms.periodBranch)&&typeof atoms.sat7InPeriodSanFang==='boolean',
    'missing actual source period geometry');
   result[mode]=atoms.sat7InPeriodSanFang&&
    active(places.loc,mode)&&active(places.horse,mode);
  }
 }
 checked(result.neither===false&&
  (!result['xun-only']||result.both)&&
  (!result['jiekong-only']||result.both),
  'source predicate family ablation is not monotone');
 return Object.freeze({
  ...result,
  onlyTogether:result.both&&!result['xun-only']&&!result['jiekong-only'],
  dependsOnXun:result.both&&!result['jiekong-only'],
  dependsOnJiekong:result.both&&!result['xun-only'],
  familyOnlyXun:result.both&&result['xun-only']&&!result['jiekong-only'],
  familyOnlyJiekong:result.both&&result['jiekong-only']&&!result['xun-only']
 });
}
function buildR61(source,rare,fixture){
 const baseline=buildR53(source,rare,fixture);
 checked(baseline.schema==='thiendo-r53-pinned-source-void-atom-breakdown-v1'&&
  baseline.sourceCommit===SOURCE_COMMIT&&baseline.iztroVersion==='2.6.1'&&
  baseline.sourceCases===67&&baseline.sourceMajorPeriods===804&&
  baseline.mappedResearch===31&&baseline.referenceTotal===49&&
  baseline.sourceSchoolParityVerified===false&&
  baseline.semanticEquivalenceVerified===false&&baseline.mayIncreaseMapping===false&&
  Array.isArray(baseline.cases)&&baseline.cases.length===67,
  'genuine R53 provenance gate failed');
 const sourceRecords=[...source.records,...rare.records];
 const original=JSON.stringify(sourceRecords);
 const byId=new Map(sourceRecords.map(row=>[row.id,row]));
 checked(byId.size===67,'duplicate or missing genuine source observation IDs');
 const counts=Object.fromEntries(IDS.map(id=>[id,{
  compared:0,sourcePositive:0,xunOnlyPositive:0,jiekongOnlyPositive:0,
  dependsOnXun:0,dependsOnJiekong:0,onlyTogether:0,
  familyOnlyXun:0,familyOnlyJiekong:0
 }]));
 const originCounts={r29:0,r30:0};
 const cases=baseline.cases.map(originalCase=>{
  const row=byId.get(originalCase.id);
  checked(row&&Array.isArray(row.palaces)&&row.palaces.length===12,
   'cannot link to original source chart');
  const rawNames=SOURCE_NAMES.map(name=>({
   name,locations:row.palaces.flatMap(p=>
    p.stars.filter(s=>s.name===name).map(()=>p.branch))
  }));
  checked(rawNames.every(x=>x.locations.length<=1&&x.locations.every(isBranch)),
   'ambiguous or malformed source void star location');
  for(const alias of SOURCE_ALIASES){
   const legacy=rawNames.find(x=>x.name===alias.legacy);
   const normal=rawNames.find(x=>x.name===alias.normalized);
   checked(legacy.locations.length+normal.locations.length===1,
    'each source Jiekong name slot must have one and only one active alias');
  }
  for(const name of FAMILY.xun){
   checked(rawNames.find(x=>x.name===name).locations.length===1,
    'missing unique pinned source Xunkong name');
  }
  checked(new Set(row.palaces.map(p=>p.branch)).size===12&&
   row.palaces.every(p=>isBranch(p.branch)&&Array.isArray(p.stars)),
   'source palace branch integrity failure');
  const atoms=originalCase.sourceAtoms;
  const p=Object.freeze({
   ming:familyAt(atoms.mingVoidNamedStars),
   loc:familyAt(atoms.locTonVoidNamedStars),
   horse:familyAt(atoms.thienMaVoidNamedStars)
  });
  const sourceMeans=Object.freeze({
   'dinh-ban-01':fourModes('dinh-ban-01',atoms,p),
   'dinh-ban-02':fourModes('dinh-ban-02',atoms,p)
  });
  checked(sourceMeans['dinh-ban-01'].both===atoms.sourceDinhBan01Hit&&
   sourceMeans['dinh-ban-02'].both===atoms.sourceDinhBan02Hit,
   'independent source natal predicates drift from R53');
  function tally(id,v){
   const c=counts[id];c.compared++;
   if(v.both)c.sourcePositive++;
   if(v['xun-only'])c.xunOnlyPositive++;
   if(v['jiekong-only'])c.jiekongOnlyPositive++;
   if(v.dependsOnXun)c.dependsOnXun++;
   if(v.dependsOnJiekong)c.dependsOnJiekong++;
   if(v.onlyTogether)c.onlyTogether++;
   if(v.familyOnlyXun)c.familyOnlyXun++;
   if(v.familyOnlyJiekong)c.familyOnlyJiekong++;
  }
  for(const id of IDS.slice(0,2))tally(id,sourceMeans[id]);
  const periods=atoms.majorPeriods.map(per=>{
   const modes=fourModes('dinh-tap-03',{...atoms,
    periodBranch:per.palaceBranch,sat7InPeriodSanFang:per.sat7InPeriodSanFang},p);
   checked(modes.both===per.sourceRuleHit,
    'source period case does not match baseline detector');
   tally('dinh-tap-03',modes);
   return Object.freeze({periodBranch:per.palaceBranch,startAge:per.startAge,
    endAge:per.endAge,modes});
  });
  checked(periods.length===12&&new Set(periods.map(x=>x.periodBranch)).size===12,
   'incomplete source major-period contexts');
  const origin=originalCase.origin;
  checked(origin==='r29'||origin==='r30','unexpected source observation origin');
  originCounts[origin]++;
  return Object.freeze({
   caseId:originalCase.id,origin,
   sourceMing:originalCase.sourceMingBranch,
   sourcesOnly:true,voidFamilies:p,natal:sourceMeans,
   periods:Object.freeze(periods),
   sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
   mayDeclarePattern:false
  });
 });
 checked(originCounts.r29===65&&originCounts.r30===2&&
  counts['dinh-ban-01'].compared===67&&
  counts['dinh-ban-02'].compared===67&&
  counts['dinh-tap-03'].compared===804&&
  counts['dinh-ban-02'].sourcePositive>=1,
  'missing source rare positive or 67×12 coverage');
 for(const id of IDS){
  const c=counts[id];
  checked(c.sourcePositive>=c.xunOnlyPositive&&
   c.sourcePositive>=c.jiekongOnlyPositive&&
   c.onlyTogether<=c.sourcePositive,
   'source family ablation bookkeeping invalid');
 }
 checked(JSON.stringify(sourceRecords)===original,'source observations were mutated');
 return Object.freeze({
  schema:SCHEMA,sourceCommit:SOURCE_COMMIT,
  sourceVersion:'iztro@2.6.1',genuineSourceDetectorsExecuted:true,
  syntheticOnly:true,sourceCaseCount:67,sourceMajorPeriodCount:804,
  sourceAliases:SOURCE_ALIASES,canonicalFamilies:FAMILY,
  sourceSixNames:SOURCE_NAMES,sourceFourCanonicalNames:NORMALIZED_NAMES,
  sourceOriginCounts:Object.freeze(originCounts),
  criteria:Object.freeze(IDS),
  criterionCounts:Object.freeze(Object.fromEntries(IDS.map(id=>
   [id,Object.freeze({...counts[id]})]))),
  cases:Object.freeze(cases),
  semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  sourceCalendarPolicyVerified:false,expertReviewed:false,
  sourceCriterionVerifiedForLocalChart:false,
  mappedResearch:31,referenceTotal:49,mayIncreaseMapping:false,
  mayDeclarePattern:false,
  note:'Removing a source void family from an already-observed source predicate reveals source sensitivity, not equivalence to Thiên Đồ Tuần/Triệt. Six source labels are two Xunkong stars plus one of two aliases for each Jiekong slot. 31/49 is unchanged.'
 });
}
if(require.main===module){
 if(process.argv.length!==4)throw Error('R61 genuine R29 and R30 source JSON required');
 const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const rare=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/tuvi-r27-iztro-cases.json','utf8'));
 const report=buildR61(source,rare,fixture);
 fs.writeFileSync('.r61-source-void-family-ablation.json',
  JSON.stringify(report,null,2)+'\n');
 console.log('R61: 67 genuine source cases x 12 period contexts; source family ablations '+
  JSON.stringify(report.criterionCounts)+
  '; 31/49 unchanged, no source-school semantic parity.');
}
module.exports=Object.freeze({SCHEMA,IDS,MODES,FAMILY,familyAt,fourModes,buildR61});
