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
module.exports=Object.freeze({PROFILE,NAMES,reconstructPinnedNames,auditPinnedDefaultBan02});
