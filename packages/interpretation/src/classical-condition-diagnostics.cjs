'use strict';
/** Explain eligibility for an editorial candidate family, without asserting a classical cách cục. */
const {classicalFamilies}=require('../../knowledge/src/index.cjs');
const {assertChart,related}=require('./chart-geometry.cjs');
const {inspectFourCourtEvidence}=require('./four-court-evidence.cjs');
const {buildFourCourtStudyGuide}=require('./four-court-study-guide.cjs');
const {buildClassicalReviewMatrix}=require('./classical-review-matrix.cjs');
const SUPPORT_KEYS=['stars','auxiliaryStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','advancedStars'];
function describeClassicalCandidateCriteria(chart,branchIndex) {
 assertChart(chart,branchIndex);
 const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const focus=byBranch.get(branchIndex);
 const rel=related(branchIndex);
 const allowed=[branchIndex,...rel.tamHop,rel.doiCung];
 const location=new Map();
 for(const h of chart.houses)for(const star of new Set(h.stars)) {
  if(typeof star!=='string'||!star.trim())continue;
  if(!location.has(star))location.set(star,[]);
  location.get(star).push(h.branchIndex);
 }
 const evidence=(name)=>{
  const found=location.get(name)??[];
  const valid=found.length===1&&allowed.includes(found[0]);
  return {star:name,branchIndex:valid?found[0]:null,locationCount:found.length,
   status:found.length>1?'ambiguous-duplicate':valid?'present-in-four-courts':'absent-from-four-courts'};
 };
 const supportNames=new Set();
 for(const at of allowed){const h=byBranch.get(at);
  for(const key of SUPPORT_KEYS){const names=h[key];if(!Array.isArray(names))continue;
   for(const item of names)if(typeof item==='string')supportNames.add(item);
  }
 }
 return classicalFamilies.map(rule=>{
  const condition=rule.conditions;
  const required=condition.requiredStars.map(evidence);
  const missing=required.filter(x=>x.status!=='present-in-four-courts');
  const focusStarPresent=condition.focusAny.some(star=>focus.stars.includes(star)&&evidence(star).status==='present-in-four-courts');
  const focusIsMenh=focus.palace===condition.focusPalace;
  const supportPresent=condition.supportAny.filter(star=>supportNames.has(star));
  const reviewPresent=condition.reviewAny.filter(star=>supportNames.has(star));
  const strengths=required.filter(x=>x.branchIndex!==null).map(x=>{
   const h=byBranch.get(x.branchIndex);
   const match=(h.mainStarStrengths??[]).find(s=>s.name===x.star);
   return {star:x.star,status:['M','V','D','B','H'].includes(match?.status)?match.status:null};
  });
  const structuralCandidate=focusIsMenh&&focusStarPresent&&missing.length===0;
  const evidenceReview=inspectFourCourtEvidence(chart,branchIndex,rule);
  const studyGuide=buildFourCourtStudyGuide(rule.id,evidenceReview,{focusIsMenh,focusStarPresent});
  const reviewMatrix=buildClassicalReviewMatrix(chart,focus,rule,evidenceReview);
  return {id:rule.id,title:rule.title,focusBranchIndex:branchIndex,focusPalace:focus.palace,
   required,missing,focusIsMenh,focusStarPresent,supportPresent,reviewPresent,strengths,
   structuralCandidate,evidenceReview,studyGuide,reviewMatrix,classification:structuralCandidate?'editorial-pattern-only':'conditions-not-met',
   classicalFormationConfirmed:false,expertReviewed:false,boundary:rule.boundary};
 });
}
module.exports={describeClassicalCandidateCriteria};
