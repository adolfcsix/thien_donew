#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {buildInventory} = require('../../packages/star-audit/src/index.cjs');
const root = path.resolve(__dirname,'../..');
const dest = path.join(root,'docs/reports');
const inventory = buildInventory();
const quoted = value => '"'+String(value??'').replace(/"/g,'""')+'"';
const columns = ['name','group','groupLabel','layer','hasPlacement','hasEditorialProfile','hasSpecializedTwelvePalaceInterpretations','expertValidated','reviewStatus','placementModule'];
const csv = '\uFEFF'+[columns.map(quoted).join(','),...inventory.records.map(r=>columns.map(k=>quoted(r[k])).join(','))].join('\r\n')+'\r\n';
const sections = inventory.groups.map(g=>`| ${g.label} | ${g.count} |`).join('\n');
const lines = [
  '# THIÊN ĐỒ V11.19 — Kiểm kê toàn bộ sao đang triển khai',
  '',
  '> **NỘI BỘ ĐỘI PHÁT TRIỂN.** Báo cáo đọc trực tiếp kết quả Astrology Engine. Không phải bảng thẩm định độ đúng Tử Vi và không hiển thị lên trang đọc lá số.',
  '',
  '## Kết quả chính',
  '',
  `- **${inventory.totals.implementedNatalAndCycleNames}** tên sao gốc và vòng sao, không trùng giữa ${inventory.totals.starGroups} nhóm.`,
  `- **${inventory.totals.editorialProfilesMatched}/${inventory.totals.implementedNatalAndCycleNames}** có hồ sơ giải nghĩa; trong đó ${inventory.totals.mainStars} chính tinh và ${inventory.totals.independentEditorialProfilesOutsideMain} hồ sơ sao khác.`,
  `- **${inventory.totals.annualStarOverlays}** sao lưu theo năm, **${inventory.totals.pairedObstructionMarkers}** dấu án ngữ Tuần/Triệt, **${inventory.totals.natalTransformations}** Tứ Hóa gốc và **${inventory.totals.annualTransformations}** Lưu Tứ Hóa. Các lớp này **không cộng vào số sao gốc/vòng sao**.`,
  `- Đã đối chiếu tính ổn định danh mục sao với **${inventory.totals.auditedBaselineCases}** đầu vào mẫu; đây là baseline nội bộ, chưa phải kiểm chứng chuyên gia.`,
  `- Backlog đề xuất **${inventory.totals.pendingNatalCandidates}** sao gốc và **${inventory.totals.pendingAnnualCandidates}** sao lưu — *không phải* mẫu số của bộ sao truyền thống.`,
  `- **0** hồ sơ luận giải riêng 12 cung được *kiểm chứng độc lập* trong kiểm toán này; **không** có nghĩa ứng dụng không có nội dung luận giải tổng hợp.`,
  '',
  '## Thống kê từng nhóm đã chạy trong engine',
  '',
  '| Nhóm | Số tên |','|---|---:|',sections,'',
  '## Backlog đề xuất — sao gốc', '',
  '| Tên sao | Ưu tiên | Việc cần thẩm định |','|---|---|---|',
  ...inventory.gaps.pendingNatal.map(s=>`| ${s.name} | ${s.priority} | ${s.reason} |`),'',
  '## Backlog đề xuất — sao lưu theo năm','',
  '| Tên sao | Ưu tiên | Việc cần thẩm định |','|---|---|---|',
  ...inventory.gaps.pendingAnnual.map(s=>`| ${s.name} | ${s.priority} | ${s.reason} |`),'',
  '## Phạm vi còn thiếu ngoài sao','',
  '- Lưu nguyệt, lưu nhật, lưu thời chưa có hệ thống hoàn chỉnh.',
  '- Luận giải theo từng cung, từng vị trí sao, hội hợp, cách cục và hạn chưa được thẩm định toàn diện.',
  '- Các công thức có dị bản cần lựa chọn trường phái và lá số đối chứng độc lập.',
  '- Build Next.js/NestJS và PostgreSQL E2E là bài toán kiểm thử khác, không nằm trong báo cáo kiểm kê này.',
  '',
  '## Quy trình bảo trì','',
  '1. Thêm phép an sao vào `packages/astrology-engine` và mirror vào 12 cung nếu là sao gốc.',
  '2. Thêm hồ sơ giải nghĩa trong `packages/knowledge` hoặc kho chính tinh, kiểm chứng nội dung độc lập.',
  '3. Xóa mục đã làm trong `packages/star-audit/src/pending-candidates.json`, kèm quyết định dị bản trong docs nội bộ.',
  '4. Chạy `npm run audit:stars` và `npm test`; kiểm tra CSV/JSON, xác nhận không trùng và đủ hồ sơ.',
  '5. Cập nhật benchmark chuyên gia và test giao diện/xuất lá số khi cần.',
  '',
  '## Giới hạn phương pháp','',
  ...inventory.methodologicalLimits.map(s=>`- ${s}`),''
];
const md=lines.join('\n');
// Clearly labeled developer audit; never mounted at a user-facing Next.js route.
const safe = JSON.stringify(inventory).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THIÊN ĐỒ V11.19 — Kiểm toán sao (nội bộ)</title>
<style>:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#17382f;background:#f4f0e5}*{box-sizing:border-box}body{margin:0}header{padding:26px clamp(18px,5vw,64px);background:#143d35;color:#f4e9c9}header small{letter-spacing:.16em;text-transform:uppercase;color:#c6b58b}h1{font-family:Georgia,serif;font-size:clamp(25px,4vw,42px);margin:10px 0}header p{max-width:780px;color:#e2e5d9;line-height:1.6}main{max-width:1200px;margin:0 auto;padding:20px} .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric{background:#fffcf5;border:1px solid #dfd5bf;border-radius:12px;padding:20px}.metric strong{display:block;font-size:28px;font-variant-numeric:tabular-nums}.metric span{font-size:13px;color:#50675e}.panel{background:#fffcf5;border:1px solid #dfd5bf;border-radius:12px;padding:18px;margin:18px 0}h2{font-family:Georgia,serif;margin-top:0}label{font-size:13px}.controls{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}input,select{border:1px solid #afbaae;background:#fff;border-radius:9px;padding:11px;font:inherit;min-width:160px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #e3ddce;padding:10px;text-align:left}th{position:sticky;top:0;background:#fffcf5}td:nth-child(3){color:#54766e}.tablewrap{overflow:auto;max-height:600px}.pill{display:inline-block;border-radius:30px;background:#e7eee5;color:#2b5446;padding:4px 9px;font-size:12px}.warn{background:#f9f1de;border-left:3px solid #bd913f;padding:12px;line-height:1.6}#summary{margin:8px 0;color:#50675e}footer{font-size:13px;color:#63756b;padding:15px 0}</style></head>
<body><header><small>Thiên Đồ · Quản trị nội bộ · 11.19</small><h1>Kiểm kê kho sao &amp; khoảng trống dữ liệu</h1><p>Bảng này tự trích từ Astrology Engine. Không có thông tin nguồn kỹ thuật trên giao diện người dùng. Danh mục còn thiếu là backlog nghiên cứu, không phải toàn bộ sao của Tử Vi truyền thống.</p></header><main>
<div class="metrics"><div class="metric"><strong id="total"></strong><span>Tên sao gốc / vòng sao</span></div><div class="metric"><strong id="profile"></strong><span>Hồ sơ giải nghĩa khớp</span></div><div class="metric"><strong id="annual"></strong><span>Sao lưu năm xem</span></div><div class="metric"><strong id="pending"></strong><span>Đề xuất cần xem xét</span></div><div class="metric"><strong id="cases"></strong><span>Lá số baseline nội bộ</span></div></div>
<section class="panel"><h2>Danh mục sao hiện có</h2><div class="controls"><input id="search" type="search" placeholder="Tìm theo tên sao…" aria-label="Tìm tên sao"><select id="group" aria-label="Lọc nhóm"><option value="">Tất cả nhóm</option></select></div><p id="summary" aria-live="polite"></p><div class="tablewrap"><table><thead><tr><th>Tên sao</th><th>Nhóm</th><th>Hồ sơ</th><th>Tình trạng</th></tr></thead><tbody id="rows"></tbody></table></div></section>
<section class="panel"><h2>Công việc còn thiếu (cần thẩm định)</h2><div class="controls"><select id="pendingType"><option value="all">Tất cả</option><option value="natal">Sao gốc</option><option value="annual">Sao lưu năm</option></select><select id="priority"><option value="">Mọi mức ưu tiên</option><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div><div class="tablewrap"><table><thead><tr><th>Sao</th><th>Nhóm</th><th>Ưu tiên</th><th>Việc cần kiểm chứng</th></tr></thead><tbody id="pendingRows"></tbody></table></div></section>
<div class="warn"><b>Giới hạn:</b> Danh mục sao kiểm kê không có nghĩa Tử Vi đã đủ 104 tên theo mọi trường phái. Tuần/Triệt là dấu án ngữ, Tứ Hóa là nhãn; kết quả baseline chỉ chứng minh nội bộ nhất quán. Không suy luận tỷ lệ hoàn thiện toàn hệ thống.</div><footer>Được tạo từ công cụ audit của mã nguồn V11.19; không phải một trang của website công khai.</footer></main>
<script>const DATA=${safe};const $=id=>document.getElementById(id); const text=(v)=>document.createTextNode(String(v));const cell=(row,value)=>{const td=document.createElement('td');td.append(text(value));row.append(td);};
$('total').textContent=DATA.totals.implementedNatalAndCycleNames;$('profile').textContent=DATA.totals.editorialProfilesMatched;$('annual').textContent=DATA.totals.annualStarOverlays;$('pending').textContent=DATA.totals.pendingNatalCandidates+DATA.totals.pendingAnnualCandidates;$('cases').textContent=DATA.totals.auditedBaselineCases;
for(const g of DATA.groups){const opt=document.createElement('option');opt.value=g.id;opt.textContent=g.label+' ('+g.count+')';$('group').append(opt)};
function render(){const term=$('search').value.normalize('NFC').toLocaleLowerCase('vi');const group=$('group').value;const filtered=DATA.records.filter(r=>(!group||r.group===group)&&r.name.toLocaleLowerCase('vi').includes(term));$('summary').textContent='Hiển thị '+filtered.length+' / '+DATA.records.length+' tên';$('rows').replaceChildren();for(const r of filtered){const tr=document.createElement('tr');cell(tr,r.name);cell(tr,r.groupLabel);cell(tr,r.hasEditorialProfile?'Đã có':'Thiếu');cell(tr,r.reviewStatus);$('rows').append(tr)}};
function renderPending(){let rows=[...DATA.gaps.pendingNatal,...DATA.gaps.pendingAnnual];const p=$('priority').value;const t=$('pendingType').value;rows=rows.filter(r=>(t==='all'||r.group===t)&&(!p||r.priority===p));$('pendingRows').replaceChildren();for(const r of rows){const tr=document.createElement('tr');cell(tr,r.name);cell(tr,r.group==='natal'?'Sao gốc':'Sao lưu');cell(tr,r.priority);cell(tr,r.reason);$('pendingRows').append(tr)}};
$('search').addEventListener('input',render);$('group').addEventListener('change',render);$('priority').addEventListener('change',renderPending);$('pendingType').addEventListener('change',renderPending);render();renderPending();</script></body></html>`;
function writeAll(){
  fs.mkdirSync(dest,{recursive:true});
  // Reports are immutable by release. Do not overwrite V11.15 or V11.19 archives.
  const prefix='V11_19';
  for (const [suffix,body] of [
    ['STAR_INVENTORY.json',JSON.stringify(inventory,null,2)+'\n'],
    ['STAR_INVENTORY.csv',csv],['STAR_AUDIT.md',md],['STAR_AUDIT.html',html]
  ]) fs.writeFileSync(path.join(dest,`${prefix}_${suffix}`),body);
}
if (require.main===module){
  if(process.argv.includes('--write'))writeAll();
  console.log(`V11.19: ${inventory.totals.implementedNatalAndCycleNames} tên sao; ${inventory.totals.editorialProfilesMatched} hồ sơ; ${inventory.totals.annualStarOverlays} sao lưu; ${inventory.totals.pendingNatalCandidates+inventory.totals.pendingAnnualCandidates} ứng viên backlog.`);
}
module.exports={csv,md,html,writeAll};
