'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildEvidenceReport}=require('../infrastructure/scripts/audit-evidence-gates.cjs');
const fake={records:[{name:'A',hasPlacement:true,expertValidated:false,hasSpecializedTwelvePalaceInterpretations:false,reviewStatus:'cần đối chiếu chuyên môn'}],gaps:{pendingNatal:[],pendingAnnual:[]}};
const time={status:'PASS',issues:[],stats:{years:201}};
test('release never claims production ready from internal checks',()=>{
 const r=buildEvidenceReport({inventory:fake,temporal:time});
 assert.equal(r.productionReady,false);
 assert.equal(r.readiness.independentExpertReview,false);
 assert.equal(r.readiness.internalCalendarConsistency,true);
 assert.ok(r.blocking.includes('postgresE2EVerified'));
});
test('invalid calendar makes internal audit fail',()=>{
 const r=buildEvidenceReport({inventory:fake,temporal:{...time,status:'FAIL',issues:['bad']}});
 assert.equal(r.status,'FAIL');
});
test('contradictory expert review is rejected',()=>{
 const r=buildEvidenceReport({inventory:{...fake,records:[{...fake.records[0],expertValidated:true}]},temporal:time});
 assert.match(r.issues.join(' '),/Contradictory/);
});
test('empty inventory does not pass',()=>{
 const r=buildEvidenceReport({inventory:{...fake,records:[]},temporal:time});
 assert.equal(r.status,'FAIL');
});
