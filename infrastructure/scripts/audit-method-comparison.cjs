#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const dataset=require('../../packages/knowledge/src/method-comparison-profiles.json');
const dossiers=require('../../packages/knowledge/src/expanded-star-research.json');
const {auditProfiles,lookupStudyPlacement}=require('../../packages/knowledge/src/method-comparison.cjs');
function auditMethodComparison(data=dataset) {
 const report=auditProfiles(data);
 const errors=[...report.errors];
 const byId=new Map(dossiers.records.map(item=>[item.id,item]));
 for (const p of data.profiles??[]) {
  const record=byId.get(p.recordId);
  if(!record || record.name!==p.name || record.expertReviewed!==false || record.placementEnabled!==false)errors.push(`Dossier mismatch: ${p.id}`);
  const choices=p.inputAxis==='reference-year-branch'?data.branches:data.stems;
  for(const choice of choices??[]) {
   try {const entry=lookupStudyPlacement(p.id,choice,data);
     if(entry.branch!==p.lookup[choice] || entry.autoPlacement!==false || entry.expertReviewed!==false)errors.push(`Unsafe result ${p.id}/${choice}`);
   } catch(e) {errors.push(`Cannot read ${p.id}/${choice}: ${e.message}`);}
  }
 }
 const projectFiles=['packages/astrology-engine/src','tests/compat/packages/astrology-engine'];
 for (const folder of projectFiles){
  const full=path.join(root,folder);if(!fs.existsSync(full))continue;
  const stack=[full];while(stack.length){const next=stack.pop();for(const item of fs.readdirSync(next,{withFileTypes:true})){
   const target=path.join(next,item.name);if(item.isDirectory())stack.push(target);
   else if(/\.([cm]?js|ts)$/.test(item.name)&&/method-comparison|V11_39_METHOD/.test(fs.readFileSync(target,'utf8')))errors.push(`Research module leaked into engine: ${target}`);
  }}
 }
 return {version:'11.39.0',profiles:report.profiles,deferred:report.deferred,reviewed: false,autoPlacement:false,lookupEntries:report.entries,errors};
}
if(require.main===module){
 const result=auditMethodComparison();
 if(process.argv.includes('--write')){
  const out=path.join(root,'docs/reports');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'V11_39_METHOD_COMPARISON.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(out,'V11_39_METHOD_COMPARISON.md'),[
   '# V11.39 — Kiểm toán bảng phương pháp (nội bộ)','',
   `- Phương pháp có bảng tra tham khảo: ${result.profiles}`,
   `- Dữ liệu tra cứu: ${result.lookupEntries} dòng`,
   `- Dị bản phải hoãn vì thiếu bảng: ${result.deferred}`,
   '- Không bật an sao tự động, không xác nhận chuyên gia.','',
   '## Kết quả',...(result.errors.length?result.errors.map(e=>`- FAIL ${e}`):['- Không có lỗi cấu trúc/phụ thuộc thuộc phạm vi kiểm tra.']),'',
   '## Phạm vi giới hạn','- Dữ liệu biên tập, không phải thẩm định kinh điển độc lập.',
   '- Ba bảng đã tra cứu không được dùng như công thức an sao production.',
   '- Build Next.js/NestJS và PostgreSQL E2E cần môi trường riêng.','',
   '## Nguồn khảo cứu',...dataset.profiles.flatMap(p=>p.sources.map(url=>`- ${p.name} (${p.system}): ${url}`)),...dataset.deferredMethods.flatMap(p=>p.sources.map(url=>`- ${p.name} (chưa đủ bảng): ${url}`)),''].join('\n'));
 }
 console.log(`V11.39: ${result.profiles} candidate profiles, ${result.lookupEntries} rows; errors=${result.errors.length}`);
 for(const e of result.errors)console.error(e);if(result.errors.length)process.exitCode=1;
}
module.exports={auditMethodComparison};
