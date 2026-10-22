'use strict';
/** Read-only evidence workflow: no star placement and no school merge. */
const docket=require('./star-source-docket.json');
const review=require('./star-source-review.cjs');
const REQUIRED=Object.freeze(['sourceIdentity','scopeDefined','placementCompared','independentChartFixture','schoolReview']);
function auditWitnesses(data=docket){
 const errors=[...review.auditDocket(data).errors],summary=[];
 for(const r of data.records||[]){
  const ready=REQUIRED.every(k=>r.gates?.[k]===true);
  if(ready||r.automaticPlacement!==false||r.automaticAlias!==false)errors.push('Unapproved candidate was made automatic: '+r.name);
  const missing=REQUIRED.filter(k=>r.gates?.[k]!==true);
  const contradictory=r.state==='variant-conflict'||r.state==='representation-conflict';
  summary.push(Object.freeze({name:r.name,kind:r.category,school:r.system,sourceIds:Object.freeze([...r.sourceIds]),
   missingGates:Object.freeze(missing),status:contradictory?'CONFLICTING_METHODS':'RESEARCH_ONLY',
   canPlaceAutomatically:false,canMergeAlias:false,requiresIndependentFixture:missing.includes('independentChartFixture'),
   requiresExpertReview:missing.includes('schoolReview')}));
 }
 if(summary.length!==15||summary.filter(x=>x.kind==='missing').length!==11||summary.filter(x=>x.kind==='alias').length!==4)
  errors.push('Invalid unresolved candidate population');
 return Object.freeze({status:errors.length?'BLOCKED':'RESEARCH_LOCKED',errors,records:Object.freeze(summary),
   counts:Object.freeze({missing:11,aliases:4,automaticNewPlacements:0,independentApproved:summary.filter(x=>!x.requiresIndependentFixture).length})});
}
module.exports=Object.freeze({REQUIRED,auditWitnesses});
