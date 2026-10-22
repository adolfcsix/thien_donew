#!/usr/bin/env node
'use strict';
/** V11.41 read-only review: library uniqueness and study prompts on pinned charts. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const source=require('../../packages/knowledge/src/four-court-research.json');
const classical=require('../../packages/knowledge/src/classical-families.json').rules;
const engine=require('../../packages/astrology-engine/src/tuvi.js');
const fixtures=require('../../packages/star-audit/fixtures/chart-baselines.json');
const {describeClassicalCandidateCriteria}=require('../../packages/interpretation/src/classical-condition-diagnostics.cjs');
const errors=[];const samples=[];
if(source.families.length!==4 || new Set(source.families.map(f=>f.id)).size!==4 ||
 source.families.some(f=>!classical.some(r=>r.id===f.id))) errors.push('Danh mục khảo cứu không khớp 4 nhóm đang hỗ trợ.');
for (const f of source.families) {
 if(f.studySteps.length!==3 || Object.keys(f.cases).sort().join(',')!=='gap,review,support') errors.push(`Hồ sơ tình huống chưa đầy đủ: ${f.id}`);
}
for(const fixture of fixtures.cases) {
 const chart=engine.calculate(fixture.input);const before=JSON.stringify(chart);
 const menh=chart.houses.find(h=>h.palace==='Mệnh');
 if(!menh){errors.push(`Không có Mệnh trong fixture ${fixture.id}`);continue;}
 const rows=describeClassicalCandidateCriteria(chart,menh.branchIndex);
 if(rows.length!==4 || rows.some(r=>r.studyGuide?.studyOnly!==true || r.studyGuide?.expertReviewed!==false || r.studyGuide?.familyId!==r.id))
  errors.push(`Không đủ 4 hồ sơ hợp lệ: ${fixture.id}`);
 if(JSON.stringify(chart)!==before)errors.push(`Đã thay đổi dữ liệu lá số: ${fixture.id}`);
 samples.push({fixture:fixture.id,studies:rows.map(r=>({id:r.id,caseIds:r.studyGuide.cases.map(c=>c.id),unknownStrengths:r.studyGuide.evidenceSummary.unknownStrengths.length,invalidTransformations:r.studyGuide.evidenceSummary.rejectedTransformations}))});
}
const result={version:'11.41.0',type:'editorial-conditional-study',researchProfiles:source.families.length,authoredCases:source.families.reduce((n,f)=>n+Object.keys(f.cases).length,0),fixtures:samples.length,ruleReviews:samples.reduce((n,s)=>n+s.studies.length,0),errors,expertValidated:false,engineAltered:false,
 caveats:['Internal cross-checks use same chart engine, not an independent Tử Vi authority.', 'The prompts are editorial learning questions, not formal Cách cục validation or personal predictions.', 'UI and full-stack build need a real dependency lockfile and browser/E2E testing.'],samples};
if(process.argv.includes('--write')){
 const target=path.join(root,'docs/reports/conditional-study.json');
 fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
 console.log('Report',path.relative(root,target));
}
console.log(JSON.stringify({researchProfiles:result.researchProfiles,authoredCases:result.authoredCases,fixtures:result.fixtures,ruleReviews:result.ruleReviews,errors:result.errors},null,2));
if(errors.length>0)process.exitCode=1;
