#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'../..');
const knowledge=require('../../packages/knowledge/src/index.cjs');
const {referenceStarCrosswalk:source, starIdentityRegistry:ids, researchDisciplines, starFamilyResearch} = knowledge;
const actual=ids.listStarIdentities();
const byId=new Map(actual.map(x=>[x.id,x]));
const issues=[];
const seen=new Set();
const tally={};
for (const row of source.records){
  if(seen.has(row.name)) issues.push(`${row.name}: repeated reference name`);
  seen.add(row.name);
  tally[row.status]=(tally[row.status]||0)+1;
  for(const id of row.engineIds){
    const actualRow=byId.get(id);
    if(!actualRow || !row.engineNames.includes(actualRow.name)) issues.push(`${row.name}: broken link ${id}`);
  }
  const matches=actual.filter(x=>x.name===row.name);
  if(row.status==='engine-name' && (matches.length===0 || matches.length!==row.engineIds.length)) issues.push(`${row.name}: stale exact match`);
  if(row.status==='not-in-engine' && (matches.length!==0 || row.engineIds.length)) issues.push(`${row.name}: should be reclassified from missing`);
  if(row.status==='possible-alias' && (matches.length!==0 || row.placementReady)) issues.push(`${row.name}: alias must be review-only`);
}
if(source.records.length!==source.counts.referenceNames) issues.push('reference count mismatch');
for(const status of ['engine-name','possible-alias','not-in-engine']) if(tally[status]!==source.counts[status]) issues.push(`${status}: count mismatch`);
if(starFamilyResearch.records.length!==new Set(starFamilyResearch.records.map(x=>x.family)).size) issues.push('duplicate family');
const families=new Set(source.records.map(x=>x.family));
for(const row of starFamilyResearch.records) if(!families.has(row.family)) issues.push(`${row.family}: research family not in reference`);
for(const item of researchDisciplines.records){
  if(item.implementation==='knowledge-only-no-engine' && item.route!==null) issues.push(`${item.id}: false engine link`);
  if(item.route && !fs.existsSync(path.join(root,'apps/web/src/app',item.route.replace(/^\//,''),'page.tsx'))) issues.push(`${item.id}: dead route`);
}
const report={version:'11.36.0',check:'source-link-and-scope-only',referenceCount:source.records.length,byStatus:tally,
  mainStars:ids.listStarIdentities({layer:'natal',group:'main'}).length,
  natalAndCycleNames:new Set(actual.filter(r=>['natal','cycle'].includes(r.layer)).map(r=>r.name)).size,
  researchDisciplines:researchDisciplines.records.length,starFamilies:starFamilyResearch.records.length,
  missing:source.records.filter(x=>x.status==='not-in-engine').map(x=>x.name),
  aliases:source.records.filter(x=>x.status==='possible-alias').map(x=>({name:x.name,candidate:x.engineNames[0]})),
  errors:issues,notVerified:['Rule correctness','Independent astronomical calendar','Expert school-specific acceptance','Website production build']};
if(process.argv.includes('--write')){
 const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'V11_36_REFERENCE_STAR_COVERAGE.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'V11_36_REFERENCE_STAR_COVERAGE.md'),[
   '# Thiên Đồ V11.36 — Kiểm kê sao tham chiếu','',
   '> Chỉ là bảng đối chiếu tên sao; không chuẩn hóa tất cả trường phái và không xác nhận chính xác thuật số.',
   `- 14 chính tinh: **${report.mainStars}/14**.` ,
   `- Sao gốc + vòng sao theo engine: **${report.natalAndCycleNames}** tên.`,
   `- Bộ so sánh có **${report.referenceCount}** tên: ${tally['engine-name']} khớp trực tiếp, ${tally['possible-alias']} dị danh cần đối chiếu, ${tally['not-in-engine']} chưa có trong engine.`,
   `- Chuyên đề: ${report.researchDisciplines}; nhóm sao có hướng dẫn: ${report.starFamilies}.`,'',
   '## Các tên cần nghiên cứu bổ sung',...report.missing.map(x=>`- ${x}`),'',
   '## Dị danh chờ duyệt',...report.aliases.map(x=>`- ${x.name} ⇄ ${x.candidate}`),'',
   '## Giới hạn',...report.notVerified.map(x=>`- ${x}`),'',
   '## Vấn đề liên kết',...(issues.length?issues.map(x=>`- ${x}`):['- Không phát hiện.']),'',
 ].join('\n'));
}
console.log(`V11.36: ${report.referenceCount} compared; ${tally['engine-name']} direct, ${tally['possible-alias']} possible aliases, ${tally['not-in-engine']} missing; issues=${issues.length}`);
for(const err of issues) console.error('- '+err);
if(issues.length) process.exitCode=1;
module.exports={audit:report};
