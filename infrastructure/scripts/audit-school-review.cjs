'use strict';
/** Scholarly evidence gate, independent of astrology-engine and UI. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {registry,eligibility,publicReviewCard}=require('../../packages/knowledge/src/school-review-gates.cjs');
const method=require('../../packages/knowledge/src/method-comparison-profiles.json');
const four=require('../../packages/knowledge/src/four-court-research.json');
const pairs=require('../../packages/knowledge/src/natal-pair-research.json');
const examples=require('../../packages/knowledge/src/worked-case-definitions.json');
const referenceLists={
 'method-profile': new Set(method.profiles.map(e=>e.id)),
 'four-court-family':new Set(four.families.map(e=>e.id)),
 'natal-pair':new Set(pairs.pairs.map(e=>e.id)),
 'worked-case':new Set(examples.cases.map(e=>e.id)),
};
function auditSchoolReview(data=registry){
 const errors=[];const ids=new Set(),schools=new Map();
 if(data.engineIntegrationsAllowed!==false||data.researchOnly!==true)errors.push('Research registry must remain read-only');
 for(const school of data.schools||[]){
  if(schools.has(school.id))errors.push('Duplicate school '+school.id);
  if(school.expertReviewed!==false||school.accredited!==false)errors.push('Unverified school misrepresented: '+school.id);
  schools.set(school.id,school);
 }
 for(const entry of data.records||[]){
  if(ids.has(entry.id))errors.push('Duplicate review record '+entry.id);ids.add(entry.id);
  if(!schools.has(entry.schoolId))errors.push('Unknown school '+entry.id);
  if(!referenceLists[entry.reference?.kind]?.has(entry.reference?.id))errors.push('Stale reference '+entry.id);
  if(entry.reference?.kind==='method-profile'){
    const p=method.profiles.find(x=>x.id===entry.reference.id);
    if(p && p.system!==entry.schoolId)errors.push('Mixed methodologies '+entry.id);
  }
  const gate=eligibility(entry);
  if(entry.reviewStage!=='research-draft' || entry.sourceReview!=='not-independently-verified')errors.push('Review stage falsely elevated '+entry.id);
  if(entry.engineEnabled!==false)errors.push('Attempt to enable an unreviewed rule '+entry.id);
  if(gate.eligible && entry.reviewStage==='research-draft')errors.push('Completed evidence requires explicit review workflow '+entry.id);
  const publicCard=publicReviewCard(entry);
  if(publicCard.engineEnabled!==false||publicCard.readiness!=='research-only')errors.push('Unsafe public card '+entry.id);
  if(!entry.question||entry.question.length<35||!entry.limitation||entry.limitation.length<35)errors.push('Incomplete editorial record '+entry.id);
 }
 if(schools.size<4||ids.size<12)errors.push('Expected review coverage was deleted');
 const forbidden=['packages/astrology-engine/src','tests/compat/packages/astrology-engine'];
 for(const folder of forbidden){let dir=path.join(root,folder);if(!fs.existsSync(dir))continue;
 const stack=[dir];while(stack.length){const d=stack.pop();for(const sub of fs.readdirSync(d,{withFileTypes:true})){
 const target=path.join(d,sub.name);if(sub.isDirectory())stack.push(target);
 else if(/\.[cm]?js$/.test(sub.name)&&/school-review-(registry|gates)|audit-school-review/.test(fs.readFileSync(target,'utf8'))) errors.push('Research gate imported by engine '+target);
 }} }
 return {version:'11.51.0',status:errors.length?'FAIL':'PASS',schools:schools.size,reviewRecords:ids.size,approvedForEngine:0,sourceOnly:true,errors};
}
if(require.main===module){const result=auditSchoolReview();if(process.argv.includes('--write')){
 const out=path.join(root,'docs/reports');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'V11_51_SCHOOL_REVIEW.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(out,'V11_51_SCHOOL_REVIEW.md'),`# V11.51 — Kiểm toán quản trị trường phái\n\n- Hồ sơ phạm vi phương pháp: ${result.schools}\n- Quy tắc đang chờ thẩm định: ${result.reviewRecords}\n- Quy tắc được phép vào engine: **0**\n- Trạng thái: **${result.status}**\n\nKhông có chứng nhận chuyên gia, không xác thực kinh điển. Các URL trong dữ liệu nghiên cứu là tài liệu cần kiểm chứng, không phải nguồn đã phê duyệt.\n\n## Kết quả\n${result.errors.length?result.errors.map(e=>'- '+e).join('\n'):'- Không phát hiện sai lệch cấu trúc.'}\n`);
 }console.log(`V11.51 review gate: ${result.status}; schools=${result.schools}; records=${result.reviewRecords}; approved=0`);for(const e of result.errors)console.error(e);if(result.errors.length)process.exitCode=1;}
module.exports={auditSchoolReview};
