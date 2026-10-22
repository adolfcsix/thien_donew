'use strict';
/** V11.31 source-only content audit: do not equate coverage with editorial originality. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {primaryStarPalaceGuidance,palaceNames}=require('../../packages/knowledge/src/index.cjs');
const {records}=primaryStarPalaceGuidance;
const normalized=require('../../packages/knowledge/src/primary-star-palace-guidance.json');
const FIELDS=['focus','potential','tradeoff','reflection','interpretation'];
function runAudit(){
  const pairs=Object.entries(records).flatMap(([star,palaces])=>Object.entries(palaces).map(([palace,entry])=>({star,palace,entry})));
  const uniqueStars=Object.keys(records);
  const fields=Object.fromEntries(FIELDS.map(field=>{
    const values=pairs.map(p=>p.entry[field]);
    return [field,{total:values.length,unique:new Set(values).size,exactRepeats:values.length-new Set(values).size}];
  }));
  const errors=[];
  if(normalized.schemaVersion!=='2.0') errors.push('Expected normalized guidance schema v2');
  if(Object.keys(normalized.starShared||{}).length!==14) errors.push('Expected 14 shared star descriptions');
  for(const [star,palaces] of Object.entries(normalized.records||{})) for(const [palace,entry] of Object.entries(palaces)) {
    for(const key of ['tradeoff','reflection','requiredContext','status','evidence']) {
      if(Object.hasOwn(entry,key)) errors.push(`Redundant canonical field ${star}/${palace}/${key}`);
    }
  }
  if(uniqueStars.length!==14) errors.push(`Expected 14 named primary stars; received ${uniqueStars.length}`);
  if(palaceNames.length!==12) errors.push(`Expected 12 palaces; received ${palaceNames.length}`);
  if(pairs.length!==168) errors.push(`Expected 168 editorial pairs; received ${pairs.length}`);
  for(const {star,palace,entry} of pairs){
    if(!palaceNames.includes(palace))errors.push(`${star}: unknown palace ${palace}`);
    if(entry.status!=='editorial-unreviewed') errors.push(`${star}/${palace}: incorrect review status`);
    for(const field of FIELDS)if(typeof entry[field]!=='string'||!entry[field].trim())errors.push(`${star}/${palace}: missing ${field}`);
  }
  return {schemaVersion:'11.31',scope:'editorial-coverage-and-exact-repetition',
    expertReviewed:false,generatedFrom:'packages/knowledge/src/primary-star-palace-guidance.json',
    starCount:uniqueStars.length,palaceCount:palaceNames.length,pairCount:pairs.length,
    normalizedSchemaVersion:normalized.schemaVersion,sharedStarEntries:Object.keys(normalized.starShared||{}).length,
    canonicalSourceBytes:fs.statSync(path.join(root,'packages/knowledge/src/primary-star-palace-guidance.json')).size,
    v1131OriginalSourceBytes:270883,
    countsAreNotIndependentScholarlyTreatises:true,
    fields,errors};
}
function markdown(r){return [
  '# THIÊN ĐỒ V11.31 — Kiểm toán nội dung chính tinh × cung',
  '',`- 14 chính tinh: **${r.starCount}**; 12 cung: **${r.palaceCount}**; tổ hợp: **${r.pairCount}**.`,
  '- Đây là **mục biên tập tham khảo**, chưa được chuyên gia thẩm định; không phải 168 bài khảo cứu độc lập.',
  `- Đã chuẩn hóa lưu trữ: ${r.v1131OriginalSourceBytes} → ${r.canonicalSourceBytes} byte; mô tả chung lưu một lần theo chính tinh.`,
  '- Con số trùng bên dưới tính trên **dữ liệu đã khôi phục cho UI**, không phải số đoạn bị lưu lặp trong file nguồn.',
  '- Kiểm tra trùng ở đây là **trùng nguyên văn trong từng trường**, không xác định trùng ý nghĩa diễn đạt lại.',
  '', '| Trường | Tổng | Nội dung khác nhau | Trùng nguyên văn |', '|---|---:|---:|---:|',
  ...Object.entries(r.fields).map(([key,x])=>`| ${key} | ${x.total} | ${x.unique} | ${x.exactRepeats} |`),
  '',`- Kiểm tra cấu trúc: **${r.errors.length?'FAIL':'PASS'}** (${r.errors.length} lỗi).`,
  '', '## Đề xuất nâng cấp nội dung',
  '', '1. Tách luận điểm riêng của 14 chính tinh và ngữ cảnh riêng của 12 cung để không nhân bản cùng một nhận xét.',
  '2. Biên soạn các ca nghiên cứu có điều kiện: sao đồng cung, Tứ Hóa năm sinh, độ sáng theo địa chi, hội chiếu và ngoại lệ.',
  '3. Chỉ gắn quy tắc thành cách cục khi có bằng chứng và kiểm chứng trường phái; không dùng chỉ số may/rủi.',
  '4. Khi đánh giá nội dung tương đương website mẫu, so bằng ca sử dụng thực tế, không đếm tổng đoạn văn.',
  '',...(r.errors.length?['## Lỗi',...r.errors.map(x=>`- ${x}`)]:[])
].join('\n')+'\n';}
if(require.main===module){
  const result=runAudit();
  if(process.argv.includes('--write')){
    const folder=path.join(root,'docs/reports');fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'V11_31_PRIMARY_CONTEXT.json'),JSON.stringify(result,null,2)+'\n');
    fs.writeFileSync(path.join(folder,'V11_31_PRIMARY_CONTEXT.md'),markdown(result));
  }
  console.log(JSON.stringify({pairs:result.pairCount,exactRepeats:result.fields.tradeoff.exactRepeats,errors:result.errors.length}));
  if(result.errors.length)process.exitCode=1;
}
module.exports={runAudit,markdown};
