'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const jie=require('../../packages/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs');
const stars=require('../../packages/knowledge/src/tuvi-witness-gates-v111496.cjs');
function audit(){
 const bytes=fs.readFileSync(path.join(root,'packages/astrology-engine/src/reference/hko-jie-primary-minute-2013-2016.json'));
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const starState=stars.auditWitnesses();
 const errors=[...jie.AUDIT.errors,...starState.errors];
 if(starState.counts.automaticNewPlacements!==0||starState.counts.independentApproved!==0)errors.push('Disputed Tử Vi star was improperly promoted');
 if(digest!==jie.DATA_SHA256)errors.push('Transcription changed without ledger re-verification');
 if(jie.EVENTS.length!==48)errors.push('Missing HKO source events');
 if(jie.EVENTS.some(e=>!/^https:\/\/www\.hko\.gov\.hk\//.test(e.sourceUrl)))errors.push('Untrusted source');
 if(jie.resolvePrimaryHkoJie({instantIso:'2014-02-04T06:03:00+08:00'}).status!=='BOUNDARY_REVIEW')errors.push('Boundary guard failed');
 const out={version:'11.149.7',status:errors.length?'BLOCKED':'SOURCE_EVIDENCE_PASS',source:'HKO annual almanac HTML primary time tables',
   years:jie.YEARS,records:jie.EVENTS.length,precision:'minute',timezone:'Asia/Hong_Kong',sha256:digest,
   generatedYearMonthPillars:0,generatedDaYun:0,unresolvedStarGates:starState.records.length,starReviewStatus:starState.status,
   note:'Minute-level primary transcription separately auditable. Not a sub-minute ephemeris or approved chart engine.',errors};
 return out;
}
if(require.main===module){const a=audit();console.log(JSON.stringify(a,null,2));if(process.argv.includes('--write')){fs.mkdirSync(path.join(root,'docs/reports'),{recursive:true});fs.writeFileSync(path.join(root,'docs/reports/V11_149_7_HKO_PRIMARY_JIE_AUDIT.json'),JSON.stringify(a,null,2)+'\n');}if(a.errors.length)process.exitCode=1;}
module.exports={audit};
