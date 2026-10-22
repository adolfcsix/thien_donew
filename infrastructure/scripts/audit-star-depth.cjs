#!/usr/bin/env node
'use strict';
/** V11.69: read-only editorial-depth coverage audit. No placement formulas altered. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),knowledge=path.join(root,'packages/knowledge/src');
const load=name=>JSON.parse(fs.readFileSync(path.join(knowledge,name),'utf8'));
function audit(){
 const registry=load('star-identity-registry.json'),dossiers=load('star-dossiers.json').profiles;
 const critical=load('star-critical-readings.json').records,primary=load('primary-star-palace-guidance.json').records;
 const rules=load('combination-rules.json').rules;
 const natalNames=[...new Set(registry.records.filter(r=>['natal','cycle'].includes(r.layer)).map(r=>r.name))];
 const classified={
  natal:registry.records.filter(r=>r.layer==='natal').length,
  cycles:registry.records.filter(r=>r.layer==='cycle').length,
  annual:registry.records.filter(r=>r.layer==='annual').length
 };
 const uncovered=natalNames.filter(name=>!Object.hasOwn(dossiers,name)&&!Object.hasOwn(primary,name));
 const criticalMissing=natalNames.filter(name=>!Object.hasOwn(critical,name));
 const unreviewed=registry.records.filter(r=>!r.expertReviewed).length;
 return {release:registry.release,scope:'editorial-code-coverage-not-academic-validation',classified,
  distinctNatalCycle:natalNames.length,dossiers:Object.keys(dossiers).length,
  primaryStars:Object.keys(primary).length,criticalNotes:Object.keys(critical).length,
  automaticConditions:rules.length,uncovered,missingCriticalNames:criticalMissing,
  identityRecords:registry.records.length,identitiesNotExpertReviewed:unreviewed,
  claimsNotVerified:['Các công thức an sao theo từng trường phái','So sánh đầu-cuối cùng thông tin sinh với web mẫu','Diễn giải và cách cục đã được học giả duyệt','Phủ toàn bộ hệ sao ngoài danh mục hiện có'],
  disputedRule:{system:'Vòng Tướng Tiền',group:'Thân – Tý – Thìn',options:['Tý','Tỵ'],placementEnabled:false}
 };
}
function render(r){return [
 `# Thiên Đồ V${r.release} — Kiểm toán độ sâu sao và nội dung`, '',
 'Báo cáo tự sinh từ source, không phải chứng nhận tính đúng huyền học.','',
 '| Chỉ số | Kết quả |','|---|---:|',
 `| Định danh bản mệnh | ${r.classified.natal} |`,
 `| Định danh 3 vòng | ${r.classified.cycles} |`,
 `| Định danh sao lưu năm | ${r.classified.annual} |`,
 `| Tên bản mệnh + vòng riêng biệt | ${r.distinctNatalCycle} |`,
 `| Có chuyên khảo/hướng dẫn chính tinh | ${r.distinctNatalCycle-r.uncovered.length}/${r.distinctNatalCycle} |`,
 `| Hồ sơ sao | ${r.dossiers} |`,
 `| Ghi chú phản biện | ${r.criticalNotes} |`,
 `| Quy tắc tự động | ${r.automaticConditions} |`,
 `| Định danh chưa chuyên gia duyệt | ${r.identitiesNotExpertReviewed}/${r.identityRecords} |`,'',
 '## Những gì V11.69 đã đưa lên trang lập lá số','',
 '- Bộ chọn sao có phần đọc phản biện từ kho 66 ghi chú đã có, không tạo nghĩa ngẫu nhiên.',
 '- Mỗi sao được đối chiếu theo bốn cung Tọa / hai cung Tam hợp / Đối; trả đúng chính tinh, mức sáng, sao trợ lực/sát tinh, Tứ Hóa năm sinh và Tuần/Triệt đã có.',
 '- Báo trường hợp Tứ Hóa trỏ vào sao không hiện diện (cần rà soát), không tự hợp thức hóa.',
 '- Khắc phục danh sách sao đồng cung trước đây bỏ sót các lớp mở rộng.','',
 '## Việc chưa hoàn tất hoặc không nên tự động hóa','',
 ...r.claimsNotVerified.map(x=>'- '+x),
 '',
 '### Dị bản vòng Tướng Tiền','',
 'Các nguồn công khai có hai mốc khởi **Tý** và **Tỵ** cho nhóm **Thân – Tý – Thìn**. Chưa đưa vòng này lên engine: quyết định cần chọn trường phái và kiểm tra 12 địa chi trước khi thêm.',
 'Nguồn rà soát nội bộ:',
 '- https://thienco.vn/vong-tuong-tinh-trong-tu-vi.html (ghi Tý)',
 '- https://tuvitamlinh.com/vong-tuong-tinh-trong-tu-vi-dau-so-y-nghia-va-cach-an-sao-A5182.html (ghi Tỵ)',
 '- https://tuvicaimenh.com/vong-tuong-tinh (ghi Tỵ)',
 '',
 '## Thiếu hồ sơ biên tập','',
 r.uncovered.length?r.uncovered.map(x=>'- '+x).join('\n'):'Không ghi nhận tên bản mệnh/vòng nào thiếu cả chuyên khảo lẫn hướng dẫn chính tinh. **Điều này không chứng minh các hồ sơ đủ sâu.**',
 '',
 '## Kiểm tra bảo toàn','',
 'Chạy `node --test tests/v1169-star-depth.test.cjs`, `npm run audit:star-depth` và `npm test`. Chưa xác minh giao diện browser/Next/Nest/PostgreSQL do thiếu phụ thuộc.',''
 ].join('\n');}
if(require.main===module){
 const r=audit();
 if(process.argv.includes('--write')){
  const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'V11_69_STAR_DEPTH_AUDIT.json'),JSON.stringify(r,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'V11_69_STAR_DEPTH_AUDIT.md'),render(r));
 }
 console.log(`Star depth: ${r.distinctNatalCycle-r.uncovered.length}/${r.distinctNatalCycle} editorial titles, ${r.criticalNotes} critical notes, ${r.automaticConditions} automatic conditions; expert-reviewed identity count: ${r.identityRecords-r.identitiesNotExpertReviewed}`);
}
module.exports={audit,render};
