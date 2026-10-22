from pathlib import Path
p=Path(__file__).resolve().parents[2]
s=(p/'previews/palace-lines-and-dock-preview.html').read_text(encoding='utf-8')
css=(p/'apps/web/src/app/chart-heritage.css').read_text(encoding='utf-8')
s=s.replace('</style></head>', css+'''
/* The offline fixture has simpler center markup than the React component. */
.chart-room-layout[data-board-skin="heritage"] .preview-center-title {color:#315849;font-family:var(--font-display);font-weight:600;letter-spacing:.14em}
.chart-room-layout[data-board-skin="heritage"] .preview-center-meta p {background:rgba(249,245,233,.88);border-color:#d3c9ac;color:#667264}
.chart-room-layout[data-board-skin="heritage"] .preview-center-meta strong {color:#293d31}
.chart-room-layout[data-board-skin="heritage"] .atlas-center>p {color:#53685a}
.chart-room-layout[data-board-skin="heritage"] .preview-grid {gap:0;grid-template-rows:repeat(4,minmax(210px,auto));}
.chart-room-layout[data-board-skin="heritage"] .preview-grid .atlas-house {min-height:210px}
.chart-room-layout[data-board-skin="heritage"] .preview-board {background:linear-gradient(135deg,#2a4337,#172d23);border-color:#988a6b}
.chart-room-layout[data-board-skin="heritage"] .preview-grid .atlas-house .atlas-star-group {margin-bottom:4px}
.chart-room-layout[data-board-skin="heritage"] .atlas-house.house .atlas-house-bottom {margin-top:auto}
</style></head>''',1)
s=s.replace('class="chart-room-layout" data-dock-open="false"','class="chart-room-layout" data-board-skin="heritage" data-dock-open="false"',1)
s=s.replace('<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">','''<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">
<div class="chart-skin-switch" role="group" aria-label="Phong cách mệnh bàn"><span>PHONG CÁCH LÁ SỐ</span><button type="button" data-preview-skin="heritage" aria-pressed="true">Giấy ngà cổ điển</button><button type="button" data-preview-skin="jade" aria-pressed="false">Ngọc bích</button></div>''',1)
s=s.replace('class="preview-grid atlas-grid"','class="preview-grid atlas-grid chart-print-board"',1)
s=s.replace('Thập nhị cung · Sổ tay nghiên cứu</h1>','Thiên Đồ V11 · Mệnh bàn cổ điển</h1>')
s=s.replace('V10.8 · RESEARCH DOCK','V11.0 · HERITAGE CHART')
s=s.replace('Trình bày lá số mẫu do Astrology Engine tính. Không phải ứng dụng Next.js đang chạy.','Bản xem trước mệnh bàn giấy ngà. Dữ liệu mẫu do Astrology Engine tính; chưa phải ứng dụng Next.js đang chạy.')
s=s.replace('</body></html>','''<script>
function v11CurvedGuide(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),offset=Math.min(19,d*.045);
 const x=(a.x+b.x)/2-(dy/d||0)*offset,y=(a.y+b.y)/2+(dx/d||0)*offset;
 return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${x.toFixed(1)} ${y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}
previewTrack=v11CurvedGuide;
const skinButtons=document.querySelectorAll('[data-preview-skin]');
skinButtons.forEach(button=>button.addEventListener('click',()=>{
 const name=button.getAttribute('data-preview-skin');
 document.querySelector('.chart-room-layout').dataset.boardSkin=name;
 skinButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 requestAnimationFrame(previewDrawLines);
}));
</script></body></html>''',1)
output=p/'previews/v11-heritage-chart-preview.html'
output.write_text(s,encoding='utf-8')
print(output)
