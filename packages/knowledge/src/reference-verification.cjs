'use strict';
/** Strict *editorial* crosswalk audit. Must not become a placement dependency. */
const defaultDocket=require('./reference-verification-docket.json');
const defaultCrosswalk=require('./reference-star-crosswalk.json');
const defaultExpanded=require('./expanded-star-research.json');
const defaultRegistry=require('./star-identity-registry.cjs');
const defaultReview=require('./school-review-registry.json');
const idSafe=value=>typeof value==='string'&&value.trim().length>0;
function auditReferenceVerification(docket=defaultDocket,crosswalk=defaultCrosswalk,expanded=defaultExpanded,registry=defaultRegistry,schoolReview=defaultReview){
 const errors=[];
 const expect=(condition,msg)=>{if(!condition)errors.push(msg);};
 const rows=Array.isArray(crosswalk?.records)?crosswalk.records:[];
 const pending=rows.filter(x=>['possible-alias','not-in-engine'].includes(x.status));
 const expected=new Map(pending.map(x=>[x.name,x]));
 const records=Array.isArray(docket?.records)?docket.records:[];
 const actual=new Map();
 const starNames=new Set(registry.listStarIdentities().map(x=>x.name));
 const researchNames=new Set(expanded.records.map(x=>x.name));
 const namedAliases=new Map(expanded.aliases.map(x=>[x.name,x.candidate]));
 const schoolIDs=new Set(schoolReview.records.map(x=>x.id));
 expect(docket?.researchOnly===true&&docket?.engineIntegrationsAllowed===false,'research-only gate must remain closed');
 expect(docket?.referenceCrosswalkEdition===crosswalk.edition,'crosswalk edition mismatch');
 expect(docket?.counts?.records===records.length,'record count mismatch');
 expect(docket?.counts?.missing===pending.filter(x=>x.status==='not-in-engine').length,'missing count mismatch');
 expect(docket?.counts?.possibleAlias===pending.filter(x=>x.status==='possible-alias').length,'alias count mismatch');
 for(const row of records){
  if(!row||!idSafe(row.name)){errors.push('invalid or unnamed row');continue;}
  if(actual.has(row.name))errors.push(`${row.name}: duplicate dossier`);
  actual.set(row.name,row);
  const reference=expected.get(row.name);
  expect(Boolean(reference),`${row.name}: no unresolved crosswalk record`);
  if(!reference)continue;
  expect(row.status===reference.status,`${row.name}: status drift`);
  expect(row.family===reference.family,`${row.name}: family drift`);
  expect(row.placementEnabled===false&&row.approvedAlias===false&&row.reviewState==='unverified',`${row.name}: unapproved rule cannot be enabled`);
  expect(row.sourcesValidated===0&&row.independentExamplesValidated===0,`${row.name}: cannot invent external validation counts`);
  expect(!starNames.has(row.name),`${row.name}: name now in engine; reassess classification`);
  if(row.status==='possible-alias'){
   expect(row.candidateName===reference.engineNames[0]&&namedAliases.get(row.name)===row.candidateName,`${row.name}: alias cross-link mismatch`);
   expect(starNames.has(row.candidateName),`${row.name}: unknown alias candidate`);
  }else{
   expect(row.candidateName===null,`${row.name}: missing item has fabricated alias candidate`);
   expect(researchNames.has(row.name),`${row.name}: research dossier missing`);
  }
  expect(idSafe(row.referenceScope)&&idSafe(row.researchQuestion),`${row.name}: missing scoped question`);
  expect(idSafe(row.positiveComparison)&&idSafe(row.negativeComparison)&&row.positiveComparison!==row.negativeComparison,`${row.name}: missing distinct contrast controls`);
  expect(Array.isArray(row.reviewChecklist)&&row.reviewChecklist.length>=4,`${row.name}: incomplete editorial checklist`);
  expect(!row.relatedReviewId||schoolIDs.has(row.relatedReviewId),`${row.name}: broken school review link`);
 }
 for(const name of expected.keys())expect(actual.has(name),`${name}: unresolved record has no verification dossier`);
 return {status:errors.length?'FAIL':'PASS',checked:records.length,missing:pending.filter(x=>x.status==='not-in-engine').length,aliases:pending.filter(x=>x.status==='possible-alias').length,engineReady:0,errors};
}
function getReferenceVerification(name,docket=defaultDocket){
 return typeof name==='string'?docket.records.find(x=>x.name===name)||null:null;
}
module.exports={auditReferenceVerification,getReferenceVerification};
