#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {auditValidationProtocols}=require('../../packages/knowledge/src/school-validation-protocols.cjs');
function audit(){
 const result=auditValidationProtocols();
 const engineFolders=['packages/astrology-engine/src','tests/compat/packages/astrology-engine'];
 for(const folder of engineFolders){
  const walk=(dir)=>{
   if(!fs.existsSync(dir))return;
   for(const d of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,d.name);
    if(d.isDirectory())walk(p);
    else if(/\.[cm]?js$/.test(d.name)&&/school-validation-protocols/.test(fs.readFileSync(p,'utf8')))result.errors.push(`Forbidden engine import: ${path.relative(root,p)}`);
   }
  };walk(path.join(root,folder));
 }
 result.status=result.errors.length?'FAIL':'PASS';return result;
}
if(require.main===module){
 const result=audit();
 if(process.argv.includes('--write')){
  const folder=path.join(root,'docs/reports');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'V11_52_REVIEW_PROTOCOLS.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'V11_52_REVIEW_PROTOCOLS.md'),`# V11.52 — Kiểm toán đề cương thẩm định\n\n- Quy trình khảo cứu: ${result.count}; có liên kết: ${result.linked}.\n- Cho phép an sao tự động: ${result.approvedForEngine}.\n- Trạng thái cấu trúc: **${result.status}**.\n\nĐây là kịch bản kiểm thử và tiêu chuẩn thu thập nguồn, **không phải bằng chứng tư liệu đã được kiểm chứng**.\n\n${result.errors.length?result.errors.map(e=>'- '+e).join('\n'):'Không thấy liên kết bị đứt hay bật engine ngoài ý muốn.'}\n`);
 }
 console.log(`V11.52 research protocol audit ${result.status}: ${result.count} protocols, ${result.approvedForEngine} approved for engine`);
 for(const error of result.errors)console.error(error);
 if(result.errors.length)process.exitCode=1;
}
module.exports={audit};
