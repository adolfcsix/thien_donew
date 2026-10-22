#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {buildStarRegistry}=require('./build-star-registry.cjs');
const root=path.resolve(__dirname,'../..');
function buildReport(){
 const registry=buildStarRegistry();
 const countByGroup=Object.entries(registry.records.reduce((obj,row)=>{
  obj[row.group]=(obj[row.group]||0)+1;return obj;
 },{})).sort((a,b)=>a[0].localeCompare(b[0]));
 const important=[
  'Danh mục lấy từ output engine và kiểm tra liên kết, KHÔNG chứng minh thuật toán đúng với tất cả trường phái.',
  '127 định danh không tương đương 127 sao gốc: bao gồm sao lưu, Tuần/Triệt, nhãn Tứ Hóa và bộ định vị Lưu Thái Tuế.',
  'Không tự gom Quan Phù và Quan Phủ, hoặc tự phân loại sao chỉ vì tên bắt đầu bằng Lưu.',
  'Các hồ sơ luận giải và rule references là biên tập nội bộ, chưa được xác nhận bằng chuyên khảo độc lập.',
  'Bản này chưa thêm thuật toán an sao hay đổi cách lập lá số. Dữ liệu chưa hoàn thiện không được xuất hiện như đã thẩm định.'
 ];
 const counts=registry.counts;
 const duplicates=Object.entries(registry.records.reduce((m,r)=>{
  const key=r.name.normalize('NFC').toLocaleLowerCase('vi-VN');
  (m[key]??=[]).push(r.id);return m;
 },{})).filter(([,ids])=>ids.length>1);
 const findings={
  release:registry.release,generatedFrom:registry.generatedFrom,totalTypedIdentities:registry.records.length,
  counts,groupCounts:countByGroup,
  linkedEditorialRules:registry.ruleLinks.length,
  unresolvedRuleReferences:registry.unresolvedRuleReferences,
  ambiguousDisplayNamesAcrossLayers:duplicates.map(([name,ids])=>({name,ids})),
  starNameAliasesApproved:registry.declaredAliases.length,
  researchPending:['Expert review of each algorithm by school','Independent natal chart comparisons','Subannual temporal placements','Palace and combination content editorial depth'],
  limitations:important,
 };
 const md=[
  `# THIÊN ĐỒ V${registry.release} — Kiểm toán định danh sao (nội bộ)`,'',
  'Báo cáo được sinh từ output engine; không dùng để tuyên bố tính đúng của các phép an sao hoặc toàn bộ số sao của một trường phái.','',
  '## Phân lớp dữ liệu','',
  '| Lớp | Số bản ghi |','|---|---:|',...Object.entries(counts).map(([a,b])=>`| ${a} | ${b} |`),
  `| **Tổng định danh** | **${registry.records.length}** |`,'',
  '## Liên kết quy tắc và bộ dữ liệu','',
  `- Liên kết: **${registry.ruleLinks.length}** quy tắc biên tập tham chiếu tới ID canonical.`,
  `- Tham chiếu sai/không giải quyết được: **${registry.unresolvedRuleReferences.length}**.`,
  `- Tên hiển thị có nhiều định danh do khác lớp: **${duplicates.length}**.`,
  `- Bí danh khác chính tả đã được thẩm định: **${registry.declaredAliases.length}** (không tự động bỏ dấu).`,'',
  '## Những tên cần giữ phân biệt','',
  '- **Quan Phù** (Vòng Thái Tuế) khác **Quan Phủ** (Vòng Bác Sĩ).',
  '- **Lưu Hà** là sao gốc theo danh mục engine hiện tại; **Lưu Lộc Tồn** là lớp sao lưu niên.',
  '- **Hóa Khoa** có nhãn Tứ Hóa gốc và nhãn Tứ Hóa năm xem. Tra cứu không rõ lớp sẽ trả về trạng thái không xác định, tránh chọn nhầm.','',
  '## Phần chưa thể kết luận','',...important.map(x=>'- '+x),'',
  '## Quy trình thêm sao mới','',
  '1. Xác định trường phái và bằng chứng cho quy tắc an sao, thêm test fixture riêng.',
  '2. Sửa engine và trả về lớp dữ liệu rõ ràng trong output.',
  '3. Gắn mô tả, luận giải, điều kiện và trạng thái review trong kho knowledge.',
  '4. Chạy `npm run generate:star-registry`, `npm run audit:star-registry`, `npm test` và kiểm tra toàn bộ diff.',
  '5. Không tự tạo alias bằng cách bỏ dấu; nếu cần hãy bổ sung bảng alias duyệt thủ công và kiểm thử xung đột.',''
 ].join('\n');
 const csvLines=[['id','name','layer','type','group','placementModule','originId','editorialSources','expertReviewed'],
  ...registry.records.map(r=>[r.id,r.name,r.layer,r.type,r.group,r.placementModule,r.originId||'',r.editorialSources.join(';'),String(r.expertReviewed)])];
 const csv='\uFEFF'+csvLines.map(line=>line.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
 return {findings,md,csv};
}
function writeReport(){
 const r=buildReport();const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});
 const version='V'+r.findings.release.replaceAll('.','_');
 fs.writeFileSync(path.join(dir,`${version}_STAR_IDENTITY_AUDIT.json`),JSON.stringify(r.findings,null,2)+'\n');
 fs.writeFileSync(path.join(dir,`${version}_STAR_IDENTITY_AUDIT.md`),r.md);
 fs.writeFileSync(path.join(dir,`${version}_STAR_IDENTITY_AUDIT.csv`),r.csv);
 return r;
}
if(require.main===module){const r=process.argv.includes('--write')?writeReport():buildReport();console.log(`Star identity audit: ${r.findings.totalTypedIdentities} identities; ${r.findings.linkedEditorialRules} rule links; ${r.findings.unresolvedRuleReferences.length} unresolved`);}
module.exports={buildReport,writeReport};
