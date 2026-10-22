'use strict';
/** Fail-closed editorial review gates: not called by astrology-engine. */
const registry=require('./school-review-registry.json');
function eligibility(entry) {
  if (!entry || typeof entry!=='object') return {eligible:false,missing:['record']};
  const review=entry.review || {};
  const missing=[];
  if (!Array.isArray(review.bibliography) || review.bibliography.length<2 || !review.bibliography.every(item=>item && typeof item.author==='string' && item.author.trim().length>1 && typeof item.title==='string' && item.title.trim().length>3 && typeof item.locator==='string' && item.locator.trim().length>2 && typeof item.edition==='string' && item.edition.trim())) missing.push('documented-independent-bibliography');
  if (Array.isArray(review.bibliography) && review.bibliography.length>=2 && new Set(review.bibliography.map(item=>`${String(item?.author||'').trim().toLowerCase()}|${String(item?.title||'').trim().toLowerCase()}`)).size<2) missing.push('duplicate-bibliography');
  if (!Array.isArray(review.independentComparisonCases) || review.independentComparisonCases.length<2 || review.independentComparisonCases.some(item=>!item || !item.input || !item.expected || !item.sourceLocator || !item.method)) missing.push('independent-comparison-fixtures');
  if (Array.isArray(review.independentComparisonCases) && review.independentComparisonCases.length>=2 && new Set(review.independentComparisonCases.map(item=>`${JSON.stringify(item?.input)}|${String(item?.sourceLocator||'').trim()}`)).size<2) missing.push('duplicate-comparison-fixtures');
  if (!review.variantDecision || !['accepted','not-applicable'].includes(review.variantDecision.status) || !review.variantDecision.rationale) missing.push('variant-reconciliation');
  if (!review.expertSignoff || !review.expertSignoff.reviewerId || !review.expertSignoff.revision || !/^\d{4}-\d{2}-\d{2}$/.test(review.expertSignoff.date || '') || review.expertSignoff.decision!=='approved') missing.push('expert-signoff');
  return {eligible:missing.length===0,missing};
}
function publicReviewCard(entry) {
  const gate=eligibility(entry);
  return {id:entry.id,title:entry.title,schoolId:entry.schoolId,question:entry.question,limitation:entry.limitation,reviewStage:entry.reviewStage,engineEnabled:false,readiness:gate.eligible?'eligible-for-manual-release-review':'research-only',missing:gate.missing};
}
function getReview(id,data=registry) {return data.records.find(entry=>entry.id===id) || null;}
module.exports={registry,eligibility,publicReviewCard,getReview};
