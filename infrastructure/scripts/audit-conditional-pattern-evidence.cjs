'use strict';
/** Reproducible audit of declared predicates, not a traditional scholarship review. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {calculate}=require('../../packages/astrology-engine/src/tuvi.js');
const {combinationRules,relationshipPatterns}=require('../../packages/knowledge/src/index.cjs');
const {evidenceForConditionalPatterns,matchCombinations,matchRelationshipPatterns}=require('../../packages/interpretation/src/index.cjs');
const totals={charts:0,palaces:0,assessed:0,matched:0,partial:0,unmet:0,needsReview:0,legacyDisagreements:0};
for(let year=1999;year<=2010;year++)for(const hour of [1,8,18]){
 const chart=calculate({date:`${year}-03-15`,hour,minute:30,calendar:'solar',leap:false,gender:'Nam'});
 totals.charts++;
 for(const house of chart.houses){
  totals.palaces++;
  const data=evidenceForConditionalPatterns(chart,house.branchIndex);
  totals.assessed+=data.assessed;
  for(const key of ['matched','partial','unmet','needsReview'])totals[key]+=key==='needsReview'?data.needsReview:key==='unmet'?data.records.filter(x=>x.status==='unmet').length:data[key];
  const previous=[...matchCombinations(house),...matchRelationshipPatterns(chart,house.branchIndex)].map(x=>x.id).sort().join('|');
  const updated=data.records.filter(x=>x.status==='matched').map(x=>x.id).sort().join('|');
  if(previous!==updated)totals.legacyDisagreements++;
 }
}
const txt=`# Thiên Đồ V11.70 — Kiểm toán điều kiện tổ hợp sao\n\n`+
`Được sinh tự động từ mã nguồn, không phải xác minh đúng/sai hệ thống Tử Vi hoặc bằng chứng đạt production.\n\n`+
`| Phạm vi | Số lượng |\n|---|---:|\n`+
`| Quy tắc đồng cung/Tứ Hóa đang dùng | ${combinationRules.length} |\n`+
`| Mẫu liên cung đang dùng | ${relationshipPatterns.length} |\n`+
`| Lá số mẫu (12 năm × 3 giờ, Nam) | ${totals.charts} |\n`+
`| Lượt đọc cung | ${totals.palaces} |\n`+
`| Số phép kiểm tra điều kiện | ${totals.assessed} |\n`+
`| Khớp đủ vị trí | ${totals.matched} |\n`+
`| Khớp một phần | ${totals.partial} |\n`+
`| Chưa khớp | ${totals.unmet} |\n`+
`| Cần kiểm tra dữ liệu | ${totals.needsReview} |\n`+
`| Chênh lệch kết quả khớp với engine cũ | ${totals.legacyDisagreements} |\n\n`+
`## Giới hạn\n\n- Không thêm quy tắc huyền học hoặc cách cục thiếu thẩm định; số quy tắc giữ nguyên 9+10.\n- Báo điều kiện chưa khớp, vị trí sao ngoài phạm vi, lặp tên, đích Tứ Hóa mâu thuẫn; không tự an sao.\n- Chỉ dùng các lớp sao gốc (không gộp hạn năm hay sao lưu).\n- Các bài kiểm tra chỉ xác minh bất biến phần mềm và tính nhất quán nội bộ, không chứng minh độ chính xác theo mọi trường phái.\n`;
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'docs/reports/conditional-pattern-audit.md'),txt);
console.log(`Conditional audit: ${JSON.stringify(totals)}`);
if(totals.legacyDisagreements!==0||totals.assessed!==(combinationRules.length+relationshipPatterns.length)*totals.palaces)process.exitCode=1;
