#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {registry:protocolData,auditValidationProtocols}=require('../../packages/knowledge/src/school-validation-protocols.cjs');
const reviewData=require('../../packages/knowledge/src/school-review-registry.json');
function buildWorksheets(data=protocolData,reviews=reviewData){
 const check=auditValidationProtocols(data,reviews);
 if(check.errors.length)throw new Error(check.errors.join('\n'));
 const rules=new Map(reviews.records.map(r=>[r.id,r]));
 const lines=['# THIÊN ĐỒ V11.52 — PHIẾU THẨM ĐỊNH QUY TẮC',
 '', '> Mẫu kiểm tra thủ công chưa điền nguồn; không phải quy tắc được phê duyệt. Mọi ô mặc định bỏ trống.',
 '> Không dùng phiếu này làm căn cứ tự động bật an sao hoặc khẳng định dự báo.',''];
 for(const p of data.protocols){
  const r=rules.get(p.ruleId);
  lines.push(`## ${r.title}`,`- Mã hồ sơ: \`${p.ruleId}\`.`,`- Nhóm nghiên cứu: \`${r.schoolId}\`.`,`- Trục dữ liệu: \`${p.scopeAxis}\`.`,`- Dữ liệu đầu vào: ${p.inputDimensions.join('; ')}.`,
   '',`**Phép thử dương:** ${p.positiveControl.procedure}`,`**Phép thử âm:** ${p.negativeControl.procedure}`,
   `**Sai lầm cần loại trừ:** ${p.prohibitedShortcut}`,`**Câu hỏi đối chiếu nguồn:** ${p.sourceComparisonPrompt}`,
   `**Giới hạn diễn giải:** ${p.interpretationLimit}`,'',
   '- [ ] Nguồn thứ nhất: tác giả, tên sách, ấn bản, vị trí trích dẫn (chưa điền).',
   '- [ ] Nguồn thứ hai độc lập: tác giả, tên sách, ấn bản, vị trí trích dẫn (chưa điền).',
   '- [ ] Ca đối chứng số 1: đầu vào, kết quả, phương pháp, nguồn (chưa điền).',
   '- [ ] Ca đối chứng số 2 độc lập: đầu vào, kết quả, phương pháp, nguồn (chưa điền).',
   '- [ ] Ghi nhận dị bản và lý do lựa chọn (chưa điền).',
   '- [ ] Chuyên gia thẩm định riêng, quyết định, ngày, phiên bản (chưa điền).','',
   '**Trạng thái: CHƯA THẨM ĐỊNH — engineEnabled = false.**','');
 }
 return lines.join('\n')+'\n';
}
if(require.main===module){try{
 const content=buildWorksheets();
 if(process.argv.includes('--write')){
  const target=path.join(root,'tests/fixtures/validation/review-worksheets.md');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
  console.log('Wrote',target);
 }else process.stdout.write(content);
}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildWorksheets};
