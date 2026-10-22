/** Browser-visible visual fixture built from the *real* app CSS in layout order.
 * Explicitly not a Next.js or API smoke test: only shell/responsive/style behavior.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'apps/web/src/app');
const layout = fs.readFileSync(path.join(app, 'layout.tsx'), 'utf8');
const cssFiles = [...layout.matchAll(/import ['"]\.\/([^'"]+\.css)['"];?/g)].map(m => m[1]);
const css = cssFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(app, f), 'utf8')}`).join('\n');
const routes = [
  ['/', '⌂', 'Tổng quan', 'Trang chủ'], ['/chart', '▦', 'Lập lá số', 'Tử vi'],
  ['/calendar', '◷', 'Lịch vạn niên', 'Lịch'], ['/good-days', '✧', 'Xem ngày tốt', 'Ngày tốt'],
  ['/bazi', '☷', 'Bát Tự – Tứ Trụ', 'Bát Tự'], ['/star-atlas', '✶', 'Bảng tra 14 sao', 'Miếu · Vượng'],
  ['/collection', '◫', 'Lá số của tôi', 'Lưu trữ'], ['/academy', '文', 'Học viện', 'Học viện'],
  ['/library', '◈', 'Thư viện', 'Tra cứu'],
];
const nav = routes.map(([url, symbol, title],i)=>`<a href="#route-${i}" class="nav-item${i===0?' active':''}" ${i===0?'aria-current="page"':''}><span aria-hidden="true">${symbol}</span>${title}</a>`).join('\n');
const bottom = [0,1,2,6].map(i=>`<a href="#route-${i}" class="${i===0?'active':''}" ${i===0?'aria-current="page"':''}><span aria-hidden="true">${routes[i][1]}</span><small>${routes[i][3]}</small></a>`).join('');
const cards = routes.slice(1,8).map(([url, symbol, title, subtitle],i) => `<article class="feature-card"><span class="feature-number">0${i+1} / KHÁM PHÁ</span><div class="feature-symbol">${symbol}</div><h3 class="serif">${title}</h3><p>${subtitle} · Công cụ nghiên cứu có quy tắc rõ ràng và dữ liệu tham khảo.</p><span class="more-arrow">Khám phá →</span></article>`).join('');
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thiên Đồ · Minh họa giao diện toàn site</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style>
<style>
.demo-ribbon{position:relative;text-align:center;padding:8px 12px;font-size:10px;letter-spacing:.14em;color:#eed6ac;background:#395042;border-bottom:1px solid #c5a16a;font-weight:700}
.demo-ribbon strong{color:white}.demo-note{margin:25px 0;padding:16px 20px;background:var(--panel);border:1px solid var(--line);color:var(--muted);border-left:3px solid var(--gold);line-height:1.8;font-size:12px}
.demo-quick-search{max-height:55vh}.demo-results{display:grid;gap:6px;padding:14px}.demo-results button{text-align:left;padding:13px;background:var(--panel-alt);border:1px solid var(--line);color:var(--text);border-radius:8px}.demo-results button:hover{border-color:var(--gold)}
</style></head><body>
<div class="site" data-mode="basic" id="demo-site">
<a class="skip-link" href="#main-content">Bỏ qua điều hướng, đến nội dung chính</a>
<aside class="sidebar" id="thiendo-sidebar" aria-label="Thanh điều hướng"><a class="brand" href="#home"><span class="brand-seal">天</span><span><strong>THIÊN ĐỒ</strong><small>ĐÔNG PHƯƠNG HUYỀN HỌC</small></span></a><div class="nav-heading">THƯ PHÒNG CỦA BẠN</div><nav>${nav}</nav><div class="sidebar-lower"><div class="mini-sun">☯</div><b>Minh triết xưa, công nghệ mới.</b><p>Từ những nguyên lý căn bản đến việc khám phá chiều sâu của lá số.</p><span class="chip">Quy tắc có phiên bản · Dữ liệu minh bạch</span></div></aside>
<button hidden type="button" class="nav-shade" aria-label="Đóng menu"></button><div class="app-area"><header class="topbar"><div class="topbar-name"><button id="menu-toggle" class="icon-button mobile-menu" aria-label="Mở menu" aria-expanded="false" aria-controls="thiendo-sidebar">☰</button><span class="crumb">THƯ PHÒNG <span>/</span><b>Tổng quan</b></span></div><div class="toolbar"><button id="search-toggle" class="quick-search-trigger" aria-label="Tìm nhanh trang và công cụ" title="Tìm nhanh, Ctrl+K"><span aria-hidden="true">⌕</span><span class="quick-search-label">Tìm công cụ</span><kbd>Ctrl K</kbd></button><div class="mode-switch" role="group" aria-label="Chế độ hiển thị"><button id="basic" type="button" class="chosen" aria-pressed="true">Cơ bản</button><button id="expert" type="button" aria-pressed="false">Chuyên sâu</button></div><button id="theme" class="icon-button theme-button" aria-label="Đổi giao diện sáng/tối">☀</button><button class="avatar-button" aria-label="Tài khoản" type="button">天</button></div></header>
<main id="main-content" class="main-content" tabindex="-1"><div class="demo-ribbon"><strong>BẢN MINH HỌA STYLE</strong> · KHÔNG PHẢI WEBSITE NEXT.JS ĐANG CHẠY</div>
<section class="hero"><div class="hero-copy"><div class="eyebrow">THƯ PHÒNG SỐ · NƠI TRI THỨC GẶP NGHỆ THUẬT</div><h1 class="serif">Khám phá vận đồ<br><em>trong dòng chảy</em><br>của thời gian.</h1><p>Đông phương huyền học, được sắp xếp lại cho người thời nay. Một lối vào giản dị cho người bắt đầu, và một không gian nghiên cứu chuyên sâu cho người am hiểu.</p><div class="hero-actions"><a class="btn gold" href="#chart">Lập lá số của bạn <span>↗</span></a><a class="btn secondary" href="#academy">Bắt đầu tìm hiểu</a></div><div class="hero-line">✧ &nbsp;Tính toán minh bạch · Hai chế độ trải nghiệm · Giữ quyền kiểm soát dữ liệu</div></div><div class="celestial-frame" aria-hidden="true"><div class="celestial-ring ring-one"><span>子</span><span>丑</span><span>寅</span><span>卯</span></div><div class="celestial-ring ring-two"></div><div class="celestial-core"><div>☯</div><small>THIÊN · ĐỊA · NHÂN</small></div><div class="orbit-label top">天道</div><div class="orbit-label bottom">紫 微 斗 數</div></div></section>
<section class="intro-bar"><div><b>12</b><span>Cung trên địa bàn</span></div><div><b>14</b><span>Chính tinh cơ bản</span></div><div><b>02</b><span>Chế độ học & phân tích</span></div></section>
<section class="entry-paths"><a class="entry-path" href="#academy"><span class="eyebrow">BẮT ĐẦU TỪ ĐÂY</span><strong class="serif">Tôi là người mới</strong><span>Tìm hiểu khái niệm và các bước đọc lá số cơ bản.</span><span class="path-arrow">Khám phá học viện ↗</span></a><a class="entry-path" href="#chart"><span class="eyebrow">KHÁM PHÁ CHUYÊN SÂU</span><strong class="serif">Tôi muốn lập lá số</strong><span>An sao, xem vận năm và truy xuất dữ liệu nghiên cứu.</span><span class="path-arrow">Vào phòng lá số ↗</span></a></section>
<section class="section-space"><div class="section-title"><div><div class="eyebrow">KHO TÀNG TRONG TẦM TAY</div><h2 class="serif">Một cánh cửa, nhiều tầng hiểu biết.</h2></div><p>Hành trình bắt đầu từ một câu hỏi — và mở ra bằng kiến thức, công cụ và các nguồn tham khảo rõ ràng.</p></div><div class="feature-grid">${cards}</div></section><p class="demo-note">Minh họa này sử dụng CSS thật được nhập trong thứ tự của <code>apps/web/src/app/layout.tsx</code>. Nội dung và nút chuyển chế độ mô phỏng để kiểm tra tương phản, khả năng co giãn và thao tác hiển thị. Không kiểm tra NestJS, PostgreSQL, Next hydration hoặc dữ liệu lá số.</p></main></div>
<nav class="bottom-nav" aria-label="Điều hướng điện thoại">${bottom}<button type="button"><span>◉</span><small>Tài khoản</small></button></nav>
<div class="command-backdrop" id="search-overlay" hidden><section class="command-panel demo-quick-search" role="dialog" aria-modal="true" aria-label="Tìm công cụ"><div class="command-head"><span>⌕</span><input id="search-input" type="search" placeholder="Tìm lá số, Bát Tự, lịch..." aria-label="Tên công cụ"><button class="command-close" id="search-close" type="button">ESC</button></div><div class="demo-results" id="search-results"></div><div class="command-footer">Tìm nhanh · Ctrl+K · Escape để đóng</div></section></div>
</div>
<script>
const site=document.getElementById('demo-site');const sidebar=document.getElementById('thiendo-sidebar');const shade=document.querySelector('.nav-shade');const menuButton=document.getElementById('menu-toggle');const overlay=document.getElementById('search-overlay');const searchInput=document.getElementById('search-input');
function menu(open){sidebar.classList.toggle('show',open);shade.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';if(open)sidebar.querySelector('.nav-item')?.focus();else menuButton.focus();}
menuButton.addEventListener('click',()=>menu(!sidebar.classList.contains('show')));shade.addEventListener('click',()=>menu(false));
window.matchMedia('(max-width:970px)').addEventListener('change',e=>{if(!e.matches&&sidebar.classList.contains('show'))menu(false)});
for(const id of ['basic','expert'])document.getElementById(id).addEventListener('click',()=>{site.dataset.mode=id;for(const name of ['basic','expert']){const pressed=name===id;const b=document.getElementById(name);b.classList.toggle('chosen',pressed);b.setAttribute('aria-pressed',String(pressed))}});
document.getElementById('theme').addEventListener('click',()=>{site.classList.toggle('light');document.getElementById('theme').textContent=site.classList.contains('light')?'☾':'☀'});
function render(q=''){const results=document.getElementById('search-results');const data=${JSON.stringify(routes)};results.replaceChildren();let matched=0;for(const r of data){if(!r[2].toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')))continue;matched++;const button=document.createElement('button');button.type='button';button.textContent=r[1]+'  '+r[2];button.onclick=closeSearch;results.append(button)}if(!matched)results.textContent='Không tìm thấy công cụ phù hợp.'}
function openSearch(){if(sidebar.classList.contains('show'))menu(false);overlay.hidden=false;overlay.style.display='flex';render();searchInput.value='';searchInput.focus()}
function closeSearch(){overlay.hidden=true;overlay.style.display='none';document.getElementById('search-toggle').focus()}
document.getElementById('search-toggle').addEventListener('click',openSearch);document.getElementById('search-close').addEventListener('click',closeSearch);searchInput.addEventListener('input',e=>render(e.target.value));overlay.addEventListener('mousedown',e=>{if(e.target===overlay)closeSearch()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!overlay.hidden)closeSearch();else if(sidebar.classList.contains('show'))menu(false)}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
overlay.style.display='none';
</script></body></html>`;
const out = path.join(root, 'previews/interface-quality-preview.html');
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, html, 'utf8');
console.log(`Generated ${path.relative(root,out)} using ${cssFiles.length} real style sheets.`);
