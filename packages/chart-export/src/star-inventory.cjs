'use strict';
// One inventory for UI counters and complete printed appendices. Markers and
// transformations are deliberately separate from natal/cycle star counts.
const FIELDS=Object.freeze([
 ['stars','Chính tinh'],['auxiliaryStars','Phụ tinh cơ bản'],['yearStars','Sao chi năm sinh'],
 ['additionalStars','Tháng / ngày'],['traditionalStars','Sao truyền thống'],
 ['natalExtensionStars','Sao mở rộng'],['beneficStars','Đức / Giải'],
 ['positionalStars','La–Võng / Thương–Sứ'],['missingStars','Trù / Hà / Không / Đẩu Quân'],
 ['derivedStars','Tài / Thọ / Đường Phù'],['advancedStars','Không–Kiếp / Hỏa–Linh'],
]);
function natalGroups(house){
 return [...FIELDS.map(([field,label])=>({label,names:[...(house[field]||[])]})),
 ...['thaiTue','bacSi','trangSinh'].map((key,i)=>({label:['Vòng Thái Tuế','Vòng Bác Sĩ','Vòng Tràng Sinh'][i],names:[...(house.cycleStars?.[key]||[])]}))];
}
function natalNames(house){return natalGroups(house).flatMap(group=>group.names);}
function supportingNames(house){return natalNames(house).filter(name=>!(house.stars||[]).includes(name));}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderStarAppendixHtml(chart,annual){
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12)throw TypeError('Cần 12 cung để xuất danh mục sao');
 return `<section class="star-appendix"><h1>Danh mục sao đầy đủ theo cung</h1><p>Sao bản mệnh và ba vòng sao được liệt kê toàn bộ. Tứ Hóa, Tuần/Triệt và lưu niên là các lớp riêng; không cộng thành sao gốc. Nội dung truyền thống không phải dự báo khoa học.</p>${chart.houses.map(h=>`<article><h2>${esc(h.palace)} · ${esc(h.stem)} ${esc(h.branch)}</h2><dl>${natalGroups(h).filter(g=>g.names.length).map(g=>`<dt>${esc(g.label)}</dt><dd>${g.names.map(esc).join(' · ')}</dd>`).join('')}<dt>Tứ Hóa năm sinh</dt><dd>${(h.tuHoa||[]).map(t=>esc(t.name+' · '+t.star)).join('; ')||'—'}</dd><dt>Án ngữ</dt><dd>${(h.obstructionMarkers||[]).map(esc).join(' · ')||'—'}</dd>${annual?`<dt>Lưu niên ${esc(annual.year)}</dt><dd>${(annual.luuStars?.items||[]).filter(s=>s.branch===h.branchIndex).map(s=>esc(s.name)).join(' · ')||'—'}</dd><dt>Lưu Tứ Hóa</dt><dd>${(annual.luuTuHoa?.items||[]).filter(s=>s.branch===h.branchIndex).map(s=>esc(s.name+' · '+s.star)).join('; ')||'—'}</dd>`:''}</dl></article>`).join('')}</section>`;
}
module.exports={natalGroups,natalNames,supportingNames,renderStarAppendixHtml};
