'use strict';
/**
 * R83 research-only source profile adapter. It reconstructs exact canonical
 * names from the verified local lunar year under the PINNED default source
 * profile, not a translation of Vietnamese markers into equivalent stars.
 * The R82 source execution tested all 60 year types. This adapter is not
 * imported by app routes, cannot promote a catalog entry or change a chart.
 */
const {isDeepStrictEqual}=require('node:util');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {auditSourceDoubleJiekongCodeConcordance,SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalPatternCandidates}=require('../../packages/interpretation/src/classical-pattern-research.cjs');
const {auditNatalObstructionEvidence}=require('../../packages/interpretation/src/natal-obstruction-evidence.cjs');
const {andKnown}=require('../../packages/interpretation/src/classical-evidence-logic.cjs');
const PROFILE='pinned-default-double';
const NAMES=Object.freeze(['旬空','副旬','截空','副截','截路','空亡']);
const mod=(n,m)=>((n%m)+m)%m;
function reconstructPinnedNames(year){
 if(!Number.isInteger(year)||year<1899||year>2101)return null;
 const stem=mod(year-4,10),branch=mod(year-4,12);
 const first=mod(branch-stem-2,12),second=mod(first+1,12);
 const primary=first%2===stem%2?first:second,mate=primary===first?second:first;
 const j=auditSourceDoubleJiekongCodeConcordance(Engine.STEMS[stem]);
 if(!j?.sourceFormulaConcordant)return null;
 const [a,b]=j.formulaCodes.map(x=>x-1);
 return Object.freeze(Object.fromEntries(Object.entries({
  '旬空':[primary],'副旬':[mate],'截空':[a],'副截':[b],'截路':[],'空亡':[]
 }).map(([k,v])=>[k,Object.freeze(v)])));
}
const report=(reason,extra={})=>Object.freeze({
 schema:'thiendo-r83-pinned-default-ban02-research-v1',sourceCommit:SOURCE_COMMIT,
 profile:PROFILE,verifiedLocalInput:extra.verifiedLocalInput===true,
 sourceNamedCoordinates:extra.sourceNamedCoordinates??null,
 namesAtMenh:extra.namesAtMenh??null,
 geometryMatchesLocalMarkers:extra.geometryMatchesLocalMarkers??null,
 operands:extra.operands??Object.freeze({locOrHua:null,kongAndJie:null,namedVoid:null}),
 formulaMatch:extra.formulaMatch??null,reason,
 sourceCriterionVerified:false,semanticEquivalenceVerified:false,
 schoolParityVerified:false,expertReviewed:false,mayDeclarePattern:false,
 mayIncreaseMapping:false,researchMapped:31
});
function auditPinnedDefaultBan02(chart,profile){
 if(profile!==PROFILE)return report('Explicit pinned default profile required; alternate schools not verified.');
 if(!chart||!chart.lunar||typeof chart.lunar.leap!=='boolean')return report('Missing lunar coordinates.');
 const d=chart.lunar;
 if(!Number.isInteger(d.year)||!Number.isInteger(d.month)||!Number.isInteger(d.day))
  return report('Invalid lunar coordinates.');
 let canonical;
 try{
  canonical=Engine.calculate({date:[d.year,String(d.month).padStart(2,'0'),String(d.day).padStart(2,'0')].join('-'),
   calendar:'lunar',leap:d.leap,hour:chart.hour,minute:chart.minute,gender:chart.gender});
 }catch{return report('Birth input cannot be reproduced by local calendar/engine.');}
 // A source profile cannot bypass provenance checks in the current chart.
 // Compare the entire natal house layer, as well as the versioned root layers.
 const keys=['solar','lunar','hour','minute','hourBranch','gender','yearCanChi','menh','than','cuc',
  'ruleSet','auxiliaryRuleSet','tuHoaRuleSet','advancedStarRuleSet',
  'auxiliaries','transformations','advancedStars','obstructionMarkers','houses'];
 if(keys.some(k=>!isDeepStrictEqual(chart[k],canonical[k])))
  return report('Current chart differs from the reproduced natal snapshot.');
 const named=reconstructPinnedNames(d.year);
 if(!named||!auditNatalObstructionEvidence(canonical).verified)
  return report('Named coordinates or natal obstruction evidence unavailable.');
 const menh=canonical.houses.find(h=>h.palace==='Mệnh')?.branchIndex;
 if(!Number.isInteger(menh))return report('Verified natal Mệnh unavailable.');
 const sorted=a=>[...new Set(a)].sort((x,y)=>x-y);
 const pair=name=>sorted(canonical.obstructionMarkers.find(m=>m.name===name).branches);
 const geometryMatchesLocalMarkers=isDeepStrictEqual(sorted([...named['旬空'],...named['副旬']]),pair('Tuần'))&&
  isDeepStrictEqual(sorted([...named['截空'],...named['副截']]),pair('Triệt'));
 const namesAtMenh=Object.freeze(NAMES.filter(n=>named[n].includes(menh)));
 const evidence=auditClassicalPatternCandidates(canonical).pendingEvidence.find(x=>x.id==='dinh-ban-02');
 const known=c=>c?.state==='met'?true:c?.state==='not-met'?false:null;
 const operands=Object.freeze({locOrHua:known(evidence?.checks[0]),kongAndJie:known(evidence?.checks[1]),
  namedVoid:geometryMatchesLocalMarkers?namesAtMenh.length>0:null});
 return report('Source-profile condition only, using verified local lunar coordinates; no school equivalence or classical verdict.',{
  verifiedLocalInput:true,sourceNamedCoordinates:named,namesAtMenh,geometryMatchesLocalMarkers,
  operands,formulaMatch:geometryMatchesLocalMarkers?andKnown(...Object.values(operands)):null});
}
/** R84: shared validated source-profile coordinates; separate natal and decade
 * condition outputs. No current-chart source authority or catalog promotion. */
const {auditClassicalPeriodGeometry}=require('../../packages/interpretation/src/classical-period-geometry.cjs');
function auditPinnedDefaultVoidConditions(chart,profile){
 const base=auditPinnedDefaultBan02(chart,profile);
 const empty=reason=>Object.freeze({
  schema:'thiendo-r84-pinned-default-void-conditions-v1',profile:PROFILE,sourceCommit:SOURCE_COMMIT,
  verifiedLocalInput:false,sourceNamedCoordinates:null,reason,
  natal:Object.freeze([
   Object.freeze({id:'dinh-ban-01',formulaMatch:null,operands:null}),
   Object.freeze({id:'dinh-ban-02',formulaMatch:null,operands:null})]),
  period:Object.freeze({id:'dinh-tap-03',verifiedGeometry:false,periods:Object.freeze([]),formulaMatch:null}),
  sourceCriterionVerified:false,semanticEquivalenceVerified:false,schoolParityVerified:false,
  expertReviewed:false,mayDeclarePattern:false,mayIncreaseMapping:false,researchMapped:31
 });
 if(!base.verifiedLocalInput||!base.geometryMatchesLocalMarkers)return empty(base.reason);
 // R83 verifies the complete houses but not every top-level period/star layer.
 // Reproduce and compare those layers before allowing any period result.
 const d=chart.lunar;
 let canonical;
 try{
  canonical=Engine.calculate({date:[d.year,String(d.month).padStart(2,'0'),String(d.day).padStart(2,'0')].join('-'),
   calendar:'lunar',leap:d.leap,hour:chart.hour,minute:chart.minute,gender:chart.gender});
 }catch{return empty('Cannot reproduce natal input.');}
 const named=base.sourceNamedCoordinates;
 const namesAt=b=>Object.freeze(NAMES.filter(n=>named[n].includes(b)));
 const branchOf=(layer,name)=>{
  const houses=canonical.houses.filter(h=>Array.isArray(h[layer])&&h[layer].includes(name));
  return houses.length===1?houses[0].branchIndex:null;
 };
 const menh=canonical.houses.find(h=>h.palace==='Mệnh')?.branchIndex;
 const liem=branchOf('stars','Liêm Trinh'),seven=branchOf('stars','Thất Sát');
 const loc=branchOf('auxiliaryStars','Lộc Tồn'),horse=branchOf('yearStars','Thiên Mã');
 const at=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)?a===b:null;
 const inVoid=b=>Number.isInteger(b)?namesAt(b).length>0:null;
 const ban01Operands=Object.freeze({liemAtMenh:at(liem,menh),namedVoidAtMenh:inVoid(menh)});
 const natal=Object.freeze([
  Object.freeze({id:'dinh-ban-01',formulaMatch:andKnown(...Object.values(ban01Operands)),operands:ban01Operands}),
  Object.freeze({id:'dinh-ban-02',formulaMatch:base.formulaMatch,operands:base.operands})
 ]);
 const periodKeys=['cycles','coverage','yearStars','yearStarRuleSet'];
 const validPeriod=periodKeys.every(k=>isDeepStrictEqual(chart[k],canonical[k]))&&
  auditClassicalPeriodGeometry(chart).verifiedGeometry;
 const locNames=Number.isInteger(loc)?namesAt(loc):null,horseNames=Number.isInteger(horse)?namesAt(horse):null;
 const periods=Object.freeze(validPeriod?canonical.cycles.daiHan.map(p=>{
  const four=Object.freeze([p.branch,(p.branch+4)%12,(p.branch+8)%12,(p.branch+6)%12]);
  const operands=Object.freeze({sevenInFourCourts:Number.isInteger(seven)?four.includes(seven):null,
   locNamedVoid:inVoid(loc),horseNamedVoid:inVoid(horse)});
  return Object.freeze({index:p.index,branch:p.branch,fromAge:p.fromAge,toAge:p.toAge,four,
   operands,formulaMatch:andKnown(...Object.values(operands))});
 }):[]);
 const period=Object.freeze({id:'dinh-tap-03',verifiedGeometry:validPeriod,locBranch:loc,horseBranch:horse,
  sevenBranch:seven,locNames,horseNames,periods,
  formulaMatch:validPeriod?(periods.some(p=>p.formulaMatch===true)?true:
   periods.every(p=>p.formulaMatch===false)?false:null):null});
 return Object.freeze({
  ...empty('Source-profile research on local lunar coordinates only; no semantic or school-equivalence claim.'),
  verifiedLocalInput:true,sourceNamedCoordinates:named,natal,period
 });
}
module.exports=Object.freeze({PROFILE,NAMES,reconstructPinnedNames,auditPinnedDefaultBan02,auditPinnedDefaultVoidConditions});
