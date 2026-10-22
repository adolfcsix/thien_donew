#!/usr/bin/env node
'use strict';
/** Read-only V11.40 evidence coverage audit against 22 pinned engine regression charts. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const engine=require('../../packages/astrology-engine/src/tuvi.js');
const {describeClassicalCandidateCriteria}=require('../../packages/interpretation/src/classical-condition-diagnostics.cjs');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json');
const samples=[];
let invalid=0;
for(const fixture of fixtures.cases){
 const chart=engine.calculate(fixture.input);
 const menh=chart.houses.find(h=>h.palace==='Mệnh');
 if(!menh){invalid++;continue;}
 const reviews=describeClassicalCandidateCriteria(chart,menh.branchIndex);
 const valid=reviews.length===4 && reviews.every(r=>r.evidenceReview?.expertConfirmed===false &&
  r.evidenceReview?.summary.requiredTotal===r.required.length &&
  r.evidenceReview?.branches.length===4 && !r.classicalFormationConfirmed && !r.expertReviewed);
 if(!valid) invalid++;
 samples.push({caseId:fixture.id,ruleSet:chart.ruleSet,branchIndex:menh.branchIndex,
  rules:reviews.map(r=>({id:r.id,structuralCandidate:r.structuralCandidate,
   requiredObserved:r.evidenceReview.summary.requiredObserved,requiredTotal:r.evidenceReview.summary.requiredTotal,
   supportsObserved:r.evidenceReview.summary.supportsObserved,reviewObserved:r.evidenceReview.summary.reviewObserved,
   strengthKnown:r.evidenceReview.summary.strengthsKnown,
   transformationVerified:r.evidenceReview.summary.transformationsVerified,
   discardedTransformationRecords:r.evidenceReview.rejectedTransformations.length}))});
}
const result={schemaVersion:1,release:'11.40.0',method:'static structure of V11.39 engine outputs',
 fixturesRead:fixtures.cases.length,chartsAudited:samples.length,ruleReviews:samples.reduce((n,x)=>n+x.rules.length,0),
 invalid,expertCertified:false,
 caveats:['Self-consistency only: fixture charts use the same engine as production.',
 'Does not establish correct traditional formation, Miếu/Vượng school, astronomical time or life predictions.',
 'No annual overlay, monthly/day/hour placements or new star placement rules are included.'],samples};
if(process.argv.includes('--write')){
 const target=path.join(root,'docs/reports/four-court-evidence.json');
 fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
 console.log('Written:',path.relative(root,target));
}
console.log(JSON.stringify({fixtures:result.chartsAudited,reviews:result.ruleReviews,invalid},null,2));
if(invalid || fixtures.cases.length!==samples.length)process.exitCode=1;
