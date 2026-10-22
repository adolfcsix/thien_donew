#!/usr/bin/env node
'use strict';
// Internal-only release evidence audit; no mystical correctness claims.
const fs=require('node:fs');
const path=require('node:path');
const {buildInventory}=require('../../packages/star-audit/src/index.cjs');
const {auditTemporalIntegrity}=require('../../packages/interpretation/src/temporal-integrity-audit.cjs');
const root=path.resolve(__dirname,'../..');
function buildEvidenceReport({inventory=buildInventory(),temporal=auditTemporalIntegrity()}={}){
 const records=inventory.records || [];
 const independent=records.filter(r=>r.expertValidated===true).length;
 const specialized=records.filter(r=>r.hasSpecializedTwelvePalaceInterpretations===true).length;
 const issue=[];
 if(records.length===0)issue.push('Empty star inventory');
 if(records.some(r=>r.hasPlacement!==true))issue.push('Unplaced star in implemented inventory');
 if(records.some(r=>r.expertValidated===true && r.reviewStatus==='cần đối chiếu chuyên môn'))issue.push('Contradictory expert-review flags');
 if(temporal.status!=='PASS'||(temporal.issues||[]).length)issue.push('Internal calendar integrity audit failed');
 const readiness={
  internalStarInventory:records.length>0&&!issue.includes('Empty star inventory')&&!issue.includes('Unplaced star in implemented inventory'),
  internalCalendarConsistency:temporal.status==='PASS'&&!(temporal.issues||[]).length,
  independentExpertReview:records.length>0&&independent===records.length,
  specializedInterpretations:records.length>0&&specialized===records.length,
  independentEphemerisComparison:false,
  fullstackBuildVerified:false,
  postgresE2EVerified:false
 };
 const blocking=['independentExpertReview','specializedInterpretations','independentEphemerisComparison','fullstackBuildVerified','postgresE2EVerified'].filter(k=>!readiness[k]);
 return {schemaVersion:1,release:'V11.24',scope:'internal-developer-only',status:issue.length?'FAIL':'PASS_WITH_UNVERIFIED_GATES',productionReady:false,
  inventory:{implementedStarNames:records.length,expertReviewedNames:independent,specializedTwelvePalaceNames:specialized,pendingNatal:inventory.gaps?.pendingNatal?.length??null,pendingAnnual:inventory.gaps?.pendingAnnual?.length??null},
  calendar:{status:temporal.status,yearsChecked:temporal.stats?.years??null,source:'internal lunar.js calculations; not an independent ephemeris'},
  readiness,blocking,issues:issue,
  caveat:'Passing internal tests does not verify astrological doctrines, astronomical accuracy, real fullstack build, or production readiness.'};
}
if(require.main===module){
 const report=buildEvidenceReport();
 const out=path.join(root,'docs/reports');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'V11_24_EVIDENCE_GATES.json'),JSON.stringify(report,null,2)+'\n');
 const md=['# THIÊN ĐỒ V11.24 — Kiểm chứng điều kiện phát hành (nội bộ)','',`- Trạng thái: **${report.status}**`,'- Production-ready: **KHÔNG**','', '## Số liệu engine',`- Tên sao đang triển khai: ${report.inventory.implementedStarNames}`,`- Sao có cờ xác minh chuyên gia: ${report.inventory.expertReviewedNames}`,`- Sao có luận giải riêng 12 cung đã gắn cờ: ${report.inventory.specializedTwelvePalaceNames}`,`- Kiểm tra lịch nội bộ: ${report.calendar.status}, ${report.calendar.yearsChecked} năm`,'','## Những cổng chưa vượt qua',...report.blocking.map(x=>`- ${x}`),'','> Đây là hồ sơ kỹ thuật nội bộ; không công bố là dữ liệu đúng theo một trường phái. Không đặt lên giao diện khách xem lá số.',''];
 fs.writeFileSync(path.join(out,'V11_24_EVIDENCE_GATES.md'),md.join('\n'));
 console.log(JSON.stringify({status:report.status,productionReady:report.productionReady,blocking:report.blocking,issues:report.issues},null,2));
 if(report.issues.length)process.exitCode=1;
}
module.exports={buildEvidenceReport};
