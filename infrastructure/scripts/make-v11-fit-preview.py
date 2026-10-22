"""Source-backed visual fixture for responsive layout; not a Next.js build."""
from pathlib import Path
p=Path(__file__).resolve().parents[2]
s=(p/'previews/v11-heritage-chart-preview.html').read_text(encoding='utf8')
css=(p/'apps/web/src/app/chart-fit.css').read_text(encoding='utf8')
css+='''
/* Offline preview navigation fixture; the app uses the actual Shell component. */
.preview-nav{position:fixed;inset:0 auto 0 0;width:258px;z-index:5;background:linear-gradient(170deg,#142b23,#0e2019);padding:25px 18px;color:#e7dec9;border-right:1px solid #8b7746;display:grid;align-content:start;gap:15px}
.preview-nav b{letter-spacing:.2em;margin:0 0 22px}.preview-nav span{border-bottom:1px solid #53665b;padding:12px 5px;font-size:13px}
.preview-nav .preview-mark{font-size:11px;color:#c5a16a;letter-spacing:.12em}
.site[data-chart-sidebar="expanded"]{padding-left:258px}.site[data-chart-sidebar="collapsed"]{padding-left:0}
.preview-nav{transition:transform .22s,visibility .22s}.site[data-chart-sidebar="collapsed"] .preview-nav{transform:translateX(-102%);visibility:hidden}
.preview-wrap{max-width:1680px;width:100%;min-width:0}.preview-grid{width:100%;min-width:0;max-width:100%;grid-template-columns:repeat(4,minmax(0,1fr))}
.preview-head{align-items:center}.preview-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.chart-room-layout[data-board-skin] .preview-grid{min-width:0;max-width:100%}
.chart-room-layout[data-board-skin] .preview-board{overflow-x:clip;max-width:100%}
.chart-room-layout[data-board-skin] .preview-grid .atlas-house{min-width:0}
.preview-desc{font-size:12px}
@media(max-width:970px){.preview-nav{display:none}.site[data-chart-sidebar="expanded"]{padding-left:0}}
@media(max-width:760px){.chart-room-layout[data-board-skin] .preview-grid .atlas-house{min-height:150px}.preview-center-meta{grid-template-columns:1fr}.preview-center-meta p{padding:3px;font-size:9px}.preview-center-title{font-size:18px;margin:7px}.preview-grid .atlas-house .atlas-star-items{overflow-wrap:anywhere}}
'''
s=s.replace('</style></head>',css+'</style></head>',1)
s=s.replace('<div class="site" data-mode="expert"><main class="preview-wrap">', '''<div class="site" data-mode="expert" data-chart-sidebar="collapsed"><aside class="preview-nav" aria-label="Thanh điều hướng minh họa"><b>天 THIÊN ĐỒ</b><span>◈ Trang chủ</span><span>☯ Lập lá số</span><span>☷ Bát Tự</span><span>◌ Lịch vạn niên</span><span class="preview-mark">ĐÔNG PHƯƠNG HUYỀN HỌC</span></aside><main class="preview-wrap">''',1)
s=s.replace('<header class="preview-head"><div>', '''<header class="preview-head"><div class="preview-actions"><button type="button" id="preview-toggle-nav" class="chart-navigation-toggle" aria-controls="thiendo-sidebar" aria-expanded="false">☰ Hiện menu trái</button><div>''',1)
s=s.replace('</h1><p>Bản xem trước mệnh bàn giấy ngà.', '</h1><p>Bản xem trước mệnh bàn giấy ngà.',1)
s=s.replace('chuyển xuống bên dưới.</p>', 'chuyển xuống bên dưới. Trên ứng dụng thật, điện thoại mặc định xem Danh sách cung để đọc rõ chữ.</p>',1)
s=s.replace('</body></html>', '''<script>
const toggleNav=document.getElementById('preview-toggle-nav');
toggleNav.addEventListener('click',()=>{
 const root=document.querySelector('.site');
 const next=root.dataset.chartSidebar==='collapsed'?'expanded':'collapsed';
 root.dataset.chartSidebar=next;
 toggleNav.setAttribute('aria-expanded', String(next==='expanded'));
 toggleNav.textContent=next==='expanded'?'‹ Ẩn menu trái':'☰ Hiện menu trái';
 requestAnimationFrame(previewDrawLines);
});
</script></body></html>''',1)
# Header structure stays balanced by explicitly closing our inserted wrapper.
s=s.replace('</p></div><small>V11.0', '</p></div></div><small>V11.0',1)
out=p/'previews/v11-phase3-fit-preview.html'
out.write_text(s,encoding='utf8')
print(out)
