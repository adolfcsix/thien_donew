'use strict';
/** Purely offline educational preview; static HTML, no accounts or HTTP calls. */
const fs=require('node:fs'),path=require('node:path');
const E=require('../../packages/astrology-engine/src/tuvi.js');
const {describeClassicalCandidateCriteria}=require('../../packages/interpretation/src/classical-condition-diagnostics.cjs');
const {classicalFamilies}=require('../../packages/knowledge/src/index.cjs');
const existing=require('../../packages/knowledge/src/classical-review-examples.json').cases;
const additional=require('../../packages/knowledge/src/classical-position-examples.json').cases;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabel={
 'geometry-observed':'ĐỦ VỊ TRÍ',
 'geometry-only-needs-strength':'ĐỦ VỊ TRÍ · THIẾU ĐỘ SÁNG',
 'geometry-not-met':'CHƯA KHỚP',
 'data-needs-review':'CHỨNG CỨ CẦN KIỂM TRA'
};
function renderCase(item){
 const chart=E.calculate(item.input),m=chart.houses.find(x=>x.palace==='Mệnh');
 const review=describeClassicalCandidateCriteria(chart,m.branchIndex).find(x=>x.id===item.familyId).reviewMatrix;
 const compare=review.schoolLenses;
 const rows=compare.tests.map(l=>`<div class="lens ${l.geometryMatches?'ok':'no'}"><strong>${esc(l.label)}</strong><span>${esc(statusLabel[l.status])}</span><small>${esc(l.reasons.join(' · '))}</small></div>`).join('');
 return `<article class="case"><div class="case-top"><strong>${esc(item.label)}</strong><span>${esc(item.input.date)} · ${String(item.input.hour).padStart(2,'0')}:15</span></div><p class="stars"><b>Sao quan sát:</b> ${esc(review.required.filter(r=>r.status==='observed').map(r=>`${r.star} (${r.palace}, ${r.relation})`).join(' · ')||'Không có')}</p><div class="lenses">${rows}</div></article>`;
}
const body=classicalFamilies.map((family,i)=>{
 const cases=[...existing,...additional].filter(x=>x.familyId===family.id);
 const first=E.calculate(cases[0].input),menh=first.houses.find(h=>h.palace==='Mệnh');
 const prompt=describeClassicalCandidateCriteria(first,menh.branchIndex).find(x=>x.id===family.id).reviewMatrix.schoolLenses;
 return `<section id="p${i}"><p class="overline">Bộ sao ${i+1} / 4</p><h2>${esc(family.title)}</h2><p class="lead">${esc(prompt.question)}</p><div class="cards">${cases.map(renderCase).join('')}</div><p class="counter"><b>Điểm dễ nhầm:</b> ${esc(prompt.counterexample)}</p></section>`;
}).join('');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thiên Đồ V11.64 · Các phép so sánh cách cục</title><style>
:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#eeeae1;color:#19392f}*{box-sizing:border-box}body{margin:0}.hero{background:#173e34;color:#fef8e9;border-bottom:7px solid #c2a56c;padding:60px max(22px,calc((100% - 1040px)/2))}.hero h1{font:600 clamp(32px,5vw,56px) Georgia,serif;line-height:1.15;margin:9px 0 19px}.hero p{max-width:780px;line-height:1.65}.overline{letter-spacing:.13em;text-transform:uppercase;font-size:11px;font-weight:700;color:#b29a68}header .overline{color:#dcc38d}.wrap{max-width:1100px;margin:auto;padding:26px}nav{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:30px}a{border:1px solid #bbcbbf;color:#245647;text-decoration:none;border-radius:40px;padding:9px 15px;font-weight:600}section{padding:clamp(18px,3vw,36px);background:#fffef8;border:1px solid #d9dfd3;border-radius:20px;margin:22px 0 30px;box-shadow:0 10px 24px #163b3410}h2{font:600 clamp(28px,4vw,40px) Georgia,serif;margin:0 0 10px}.lead{font-size:16px;line-height:1.6}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin-top:23px}.case{padding:18px;background:#f7f7ef;border:1px solid #e0e6d9;border-radius:14px;min-width:0}.case-top{display:grid;gap:9px}.case-top span{font-size:12px;color:#577167}.stars{font-size:13px;line-height:1.55;min-height:92px}.lenses{display:grid;gap:9px}.lens{border:1px solid #e1d7bf;border-radius:10px;padding:10px;display:grid;gap:5px;background:#faf3e7}.lens.ok{background:#ebf5e9;border-color:#cadcc5}.lens strong{font-size:12px}.lens span{font-size:11px;font-weight:750}.lens small{line-height:1.5;color:#5d685c}.counter{background:#f4ecd6;border-left:4px solid #c2a56c;padding:15px;font-size:14px;line-height:1.6}.foot{color:#566d63;font-size:13px;line-height:1.7;padding:10px 5px 40px}@media(max-width:850px){.cards{grid-template-columns:1fr}.stars{min-height:0}}@media(max-width:600px){.hero{padding:32px 20px}.wrap{padding:16px}}
</style></head><body><header class="hero"><div class="overline">THIÊN ĐỒ · HỒ SƠ NGHIÊN CỨU V11.64</div><h1>Một bộ sao.<br>Ba phép xét vị trí.</h1><p>12 lá số giả định, bốn nhóm chính tinh, ba phạm vi so sánh. Một trường hợp khớp Tứ chính không nhất thiết khớp phép xét điểm tựa tọa Mệnh. Đây là các giả định giáo dục để nhận diện chứng cứ, <strong>không phải phân loại trường phái đã thẩm định</strong>, cũng không xác nhận thành cách hay dự báo số phận.</p></header><main class="wrap"><nav>${classicalFamilies.map((f,i)=>`<a href="#p${i}">${esc(f.title)}</a>`).join('')}</nav>${body}<div class="foot">Dữ liệu ví dụ được tái tính từ engine Thiên Đồ. Phân biệt hình học vị trí sao, chất lượng dữ liệu và diễn giải học thuật. Kết quả có thể thay đổi nếu điều chỉnh phép an sao của trường phái; bản HTML chỉ minh họa nội dung nghiên cứu, không phải website live.</div></main></body></html>`;
const target=path.resolve(__dirname,'../../previews/v1164-classical-position-casebook.html');
fs.writeFileSync(target,html);console.log(target);
