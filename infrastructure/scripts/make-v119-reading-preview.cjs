'use strict';
/** Standalone V11.9 preview generated from real engine + editorial registries.
 *  The preview is not a screenshot or build of the full Next.js application.
 */
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../../packages/astrology-engine/src/tuvi.js');
const {buildPalaceReading} = require('../../packages/interpretation/src/index.cjs');
const guide=require('../../packages/knowledge/src/star-study-guide.json');
const chart=engine.calculate({date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30});
const annual=engine.annualOverview(chart,2026);
const readings=chart.houses.map(h=>buildPalaceReading({chart,branchIndex:h.branchIndex,annual,includeAnnual:true,guide}));
const data=JSON.stringify(readings).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
const markup=`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>THIÊN ĐỒ V11.9 — Thư viện sao và tổ hợp</title><style>
:root{--jade:#143c32;--gold:#b28b4f;--ink:#26443b;--mute:#728077;--paper:#f8f4e8;--line:#ddd2bf;--white:#fffdf7}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eae7df;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px}
.mast{padding:27px clamp(16px,4vw,60px);background:var(--jade);color:#f2e9d1;display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap;border-bottom:4px solid #aa8650}
.brand{font:600 29px Georgia,serif;letter-spacing:.1em}.brand span{display:block;font:500 11px system-ui,sans-serif;letter-spacing:.15em;color:#d2bf98;margin-top:6px}.muted-light{font-size:12px;line-height:1.5;color:#c7d2c6}
.layout{max-width:1480px;margin:25px auto;display:grid;grid-template-columns:220px minmax(0,1fr);align-items:start;gap:18px;padding:0 22px}
.nav,.paper{background:var(--paper);border:1px solid var(--line);min-width:0;box-shadow:0 5px 14px #4a553c0d}
.nav{position:sticky;top:15px;padding:15px}.nav h2{font:normal 21px Georgia,serif;margin:4px 8px 15px}
#palaceNav{display:grid;gap:3px}.nav button{border:1px solid transparent;background:transparent;color:var(--ink);min-height:38px;text-align:left;cursor:pointer;padding:8px 10px;font-size:13px;border-radius:3px;display:flex;align-items:center;justify-content:space-between;gap:4px}.nav button:hover{border-color:var(--line)}.nav button[aria-current=true]{border-color:#bca276;background:#e4decc;font-weight:700}.nav button small{font-size:10px;color:var(--mute)}
.paper{padding:clamp(16px,2.5vw,33px)}.top{display:flex;align-items:start;justify-content:space-between;flex-wrap:wrap;gap:16px;border-bottom:1px solid var(--line);padding-bottom:18px}
.tag{display:block;font-size:11px;color:#866839;letter-spacing:.15em;font-weight:750}.top h1{font:normal clamp(26px,3vw,38px) Georgia,serif;margin:8px 0}.subtitle{color:var(--mute)}.mode{display:flex;gap:4px;border:1px solid var(--line);padding:4px}.mode button{border:none;background:transparent;padding:11px 18px;min-height:39px;cursor:pointer;color:var(--ink)}.mode button[aria-pressed=true]{background:var(--jade);color:var(--white);font-weight:650}
.lead{margin:19px 0;padding:20px;background:var(--white);border-left:3px solid var(--gold)}.lead strong{color:#8c6f38}.lead p{line-height:1.82;font-size:14px}.hint{color:var(--mute)}
.columns,.deep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.block{border:1px solid var(--line);background:var(--white);padding:18px;min-width:0}.block h2{font:normal 21px Georgia,serif;margin:0 0 15px}.block h3{font:600 15px Georgia,serif;color:#846831;margin:4px 0 9px}.block p,.block li{font-size:14px;line-height:1.78}.block small{display:block;font-size:12px;color:var(--mute);line-height:1.6}
.star{padding:10px 0;border-bottom:1px solid var(--line)}.star:first-child{padding-top:0}.star b{color:#886b36}.status{border:1px solid var(--line);padding:2px 7px;margin-left:8px;color:var(--mute);font-size:11px}
.deep-grid{margin-top:14px}.deep-grid[hidden]{display:none}.long{grid-column:span 2}.expand{border-bottom:1px solid var(--line);padding:4px 0}.expand summary{padding:10px 0;cursor:pointer;list-style-position:inside}.expand summary b{color:#866c42}.expand summary span{font-size:12px;color:var(--mute);margin-left:8px}.expand p{margin:4px 0}.expand small{padding-bottom:9px}.combo{padding:12px 0;border-bottom:1px solid var(--line)}.combo strong{color:#826638}
.pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.pills span{padding:3px 8px;border:1px solid var(--line);background:var(--paper);font-size:12px}
.fine{font-size:12px!important;color:var(--mute);line-height:1.65}.foot{padding:24px;text-align:center;color:#6f756c;font-size:12px}
button:focus-visible,summary:focus-visible{outline:2px solid #91713a;outline-offset:2px}
@media(max-width:850px){.layout{grid-template-columns:minmax(0,1fr)}.nav{position:static}.nav h2{margin:3px 0 8px}.nav #palaceNav{grid-template-columns:repeat(4,minmax(0,1fr))}.nav button{justify-content:center;text-align:center}.nav button small{display:none}}
@media(max-width:620px){.mast{padding:18px}.brand{font-size:24px}.layout{padding:0 9px;gap:9px;margin:10px auto}.paper{padding:15px}.nav #palaceNav{grid-template-columns:repeat(3,minmax(0,1fr))}.nav{padding:9px}.columns,.deep-grid{grid-template-columns:1fr}.long{grid-column:span 1}.block{padding:14px}.mode{width:100%}.mode button{flex:1}.lead{padding:15px}}
</style></head><body>
<header class="mast"><div class="brand">天圖 · THIÊN ĐỒ<span>V11.9 · SAO HỘI CHIẾU</span></div><div class="muted-light">Lá số minh họa từ Astrology Engine<br>Kiến thức tự biên soạn · Không dự báo cá nhân</div></header>
<main class="layout"><aside class="nav"><h2>Thập nhị cung</h2><nav id="palaceNav" aria-label="Danh sách 12 cung"></nav></aside><div class="paper"><div class="top"><div><span class="tag">KHÁM PHÁ CUNG & TINH DIỆU</span><h1 id="palaceTitle"></h1><div class="subtitle" id="palaceSub"></div></div><div class="mode" role="group" aria-label="Chế độ đọc"><button data-mode="basic" aria-pressed="false" type="button">Cơ bản</button><button data-mode="deep" aria-pressed="true" type="button">Chuyên sâu</button></div></div>
<section class="lead"><strong>Ý nghĩa của cung</strong><p id="intro"></p><p id="reflect" class="hint"></p></section>
<div class="columns"><section class="block"><h2>Chính tinh tại cung</h2><div id="stars"></div></section><section class="block"><h2>Các sao phụ nổi bật</h2><div id="quick"></div><p id="boundary" class="fine"></p></section></div>
<div class="deep-grid" id="deep" hidden><section class="block"><h2>Hồ sơ phụ tinh</h2><div id="profiles"></div></section><section class="block"><h2>Đối chiếu tổ hợp</h2><div id="combinations"></div></section><section class="block long" id="relationPanel"><h2>Đối chiếu sao hội chiếu</h2><p class="fine">Kiểm tra vị trí sao trong Tam hợp và Tứ chính, không khẳng định cách cục cổ điển.</p><div id="relationships"></div></section><section class="block"><h2>Ba vòng sao</h2><div id="cycles"></div></section><section class="block"><h2>Tuần/Triệt & Tứ Hóa</h2><div id="markers"></div><h3>Tứ Hóa năm sinh</h3><p id="hoa"></p></section><section class="block long"><h2>Tam phương Tứ chính và vận năm</h2><div id="linked" class="pills"></div><p id="annual"></p></section></div>
<p id="notice" class="fine"></p></div></main><footer class="foot">BẢN XEM TRƯỚC ĐỘC LẬP · Dữ liệu lấy trực tiếp từ engine · Chưa phải ứng dụng Next.js đầy đủ</footer>
<script>
'use strict';
const readings=${data};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let selected=readings.findIndex(item=>item.relationshipMatches.length>0);if(selected<0)selected=0;let mode='deep';
$('palaceNav').innerHTML=readings.map((r,i)=>'<button type="button" data-index="'+i+'">'+esc(r.palace)+'<small>'+esc(r.branch)+'</small></button>').join('');
function render(){const r=readings[selected];$('palaceTitle').textContent='Cung '+r.palace;$('palaceSub').textContent=r.title+' · '+r.stem+' '+r.branch;$('intro').textContent=r.introduction;$('reflect').textContent=r.reflection;$('boundary').textContent=r.boundary;$('notice').textContent=r.notice;
 document.querySelectorAll('#palaceNav button').forEach(button=>{button.setAttribute('aria-current',String(Number(button.dataset.index)===selected))});
 document.querySelectorAll('[data-mode]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.mode===mode))});$('deep').hidden=mode!=='deep';
 $('stars').innerHTML=r.stars.length?r.stars.map(s=>'<div class="star"><b>'+esc(s.name)+'</b>'+(s.strength?'<span class="status">'+esc(s.strength)+'</span>':'')+'<p>'+esc(s.motif ? s.motif+'. '+s.explanation : 'Chưa biên soạn hồ sơ.')+'</p></div>').join(''):'<p>Cung Vô chính diệu. Đọc cùng các cung liên hệ, không tự thêm sao.</p>';
 $('quick').innerHTML=r.supportingProfiles.length?r.supportingProfiles.slice(0,2).map(s=>'<div class="star"><b>'+esc(s.name)+'</b><p>'+esc(s.motif||'Đang cập nhật')+'</p></div>').join('')+'<small>'+esc(r.supportingProfiles.length>2?'Còn '+(r.supportingProfiles.length-2)+' sao, mở Chuyên sâu để xem hết.':'Mở Chuyên sâu để xem hồ sơ chi tiết.')+'</small>':'<p>Không có phụ tinh thuộc lớp dữ liệu này.</p>';
 $('profiles').innerHTML=r.supportingProfiles.length?r.supportingProfiles.map(s=>'<details class="expand"><summary><b>'+esc(s.name)+'</b><span>'+esc(s.motif)+'</span></summary><p>'+esc(s.context)+'</p><small>'+esc(s.caution)+'</small></details>').join(''):'<p>Không có sao bổ trợ thuộc lớp dữ liệu này.</p>';
 $('combinations').innerHTML=r.combinations.length?r.combinations.map(x=>'<div class="combo"><strong>'+esc(x.title)+'</strong><p>'+esc(x.interpretation)+'</p><small>Đối chiếu: '+esc(x.evidence.stars.join(' · '))+(x.evidence.transformation?' · '+esc(x.evidence.transformation):'')+'</small><small>'+esc(x.caution)+'</small></div>').join(''):'<p>Không có tổ hợp nào khớp với danh mục quy tắc đang hỗ trợ tại cung này.</p><small>Không đồng nghĩa với việc cung không có cách cục khác.</small>';
 $('relationships').innerHTML=r.relationshipMatches.length?r.relationshipMatches.map(x=>'<details class="expand" open><summary><b>'+esc(x.title)+'</b><span>'+esc(x.evidence.scope==='tam-hop'?'Tam hợp':'Tứ chính')+'</span></summary><p>'+esc(x.interpretation)+'</p><ul>'+x.evidence.placements.map(p=>'<li><b>'+esc(p.star)+'</b> — '+esc(p.palace)+' ('+esc(p.branch)+') · '+esc(p.relation)+'</li>').join('')+'</ul><small>'+esc(x.caution)+'</small></details>').join(''):'<p>Chưa có mẫu sao liên cung khớp với cung này. Không đồng nghĩa với việc cung không có cách cục khác.</p>';
 $('cycles').innerHTML=['Vòng Thái Tuế','Vòng Bác Sĩ','Vòng Tràng Sinh'].map(f=>'<div class="combo"><h3>'+esc(f)+'</h3>'+r.cycleProfiles.filter(s=>s.family===f).map(s=>'<details class="expand"><summary><b>'+esc(s.name)+'</b><span>'+esc(s.motif)+'</span></summary><p>'+esc(s.context)+'</p><small>'+esc(s.caution)+'</small></details>').join('')+'</div>').join('');
 $('markers').innerHTML=r.obstructionProfiles.length?r.obstructionProfiles.map(s=>'<div class="combo"><strong>'+esc(s.name)+'</strong><p>'+esc(s.context)+'</p><small>'+esc(s.caution)+'</small></div>').join(''):'<p>Không có Tuần/Triệt án ngữ cung này trong lá số minh họa.</p>';
 $('hoa').textContent=r.natalHoa.join(' · ')||'Không có Tứ Hóa tọa tại cung này.';
 $('linked').innerHTML=r.linked.map(s=>'<span>'+esc(s.kind+' · '+s.palace+' ('+s.branch+')')+'</span>').join('');
 $('annual').textContent=r.period?'Vận năm '+r.period.year+': '+[...r.period.markers,...r.period.annualStars,...r.period.annualHoa].join(' · '):'Chưa chọn năm xem.';
}
document.querySelectorAll('#palaceNav button').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.index);render()}));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render()}));render();
</script></body></html>`;
const out=path.join(__dirname,'../../previews/v119-interpalace-patterns.html');
fs.writeFileSync(out,markup);
console.log(`Created ${out} with ${readings.length} real houses and ${Buffer.byteLength(markup)} bytes`);
