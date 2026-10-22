"""Create an offline *fixture* for the palace reader from the V11.3 preview data.
This is not a rendered Next.js application, and makes no E2E production claims.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=(root/'previews/v11-straight-relations-preview.html').read_text(encoding='utf-8')
css=(root/'apps/web/src/app/palace-reader.css').read_text(encoding='utf-8')
source=source.replace('V11.3 · Đối chiếu cung bằng nét thẳng','V11.4 · Phòng đọc cung rõ chữ',1)
source=source.replace('V11.3','V11.4')
source=source.replace('</style></head>',css+'''\n.preview-reader-list{margin:0;padding-left:17px;display:grid;gap:5px;font:500 14px/1.75 var(--font-ui)}
.preview-reader-group{padding:16px;background:var(--panel-alt);border:1px solid var(--line)}
.preview-reader-group h3{margin:0 0 10px;color:var(--gold);font:650 13px/1.5 var(--font-ui)}
.preview-reader-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px 24px 18px}
#sample-reader[data-reader-font="large"] .preview-reader-list{font-size:18px}
@media(max-width:650px){.preview-reader-groups{grid-template-columns:1fr;padding:10px}}
</style></head>''',1)
source=source.replace('<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">','<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn"><button type="button" class="chart-room-control chart-reader-trigger" id="preview-open-reader" aria-haspopup="dialog">⌕ Phóng to cung đang chọn</button>',1)
modal='''<dialog id="sample-reader" class="palace-reader-dialog" data-reader-skin="heritage" data-reader-font="normal" aria-modal="true" aria-labelledby="sample-reader-title" aria-describedby="sample-reader-description">
<div class="palace-reader-header"><div><span class="palace-reader-eyebrow">THIÊN ĐỒ · DEMO DỮ LIỆU LÁ SỐ MẪU</span><h2 id="sample-reader-title">Phòng đọc cung</h2><p id="sample-reader-description">Xem từng cung ở cỡ chữ dễ đọc · Không phải ảnh kéo dãn</p></div><button id="preview-close-reader" type="button" class="palace-reader-close" aria-label="Đóng phòng đọc cung">× <span>Đóng</span></button></div>
<div class="palace-reader-toolbar"><button type="button" id="preview-previous-palace">← Cung trước</button><span class="palace-reader-current" id="preview-reader-current" aria-live="polite"></span><button type="button" id="preview-next-palace">Cung sau →</button><button type="button" id="preview-reader-font" aria-pressed="false">A+ Chữ lớn</button></div>
<div class="palace-reader-overview" id="preview-reader-overview"></div>
<div class="preview-reader-groups" id="preview-reader-groups"></div>
<div class="palace-reader-footer">Demo HTML sử dụng lá số mẫu của ứng dụng. Để kiểm chứng tích hợp cần chạy Next.js thực tế.</div></dialog>'''
script=r'''<script>
// Offline demonstration only: uses fixture data already embedded in the V11.3 chart preview.
const sampleModal=document.getElementById('sample-reader');
let readerBranch=selected,largeReaderText=false;
const htmlEscape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function renderReader(){
 const h=data.result.houses.find(h=>h.branchIndex===readerBranch);
 if(!h)return;
 document.getElementById('sample-reader-title').textContent='Cung '+h.palace+' · '+h.stem+' '+h.branch;
 document.getElementById('preview-reader-current').textContent=h.palace+' · '+h.branch;
 document.getElementById('preview-reader-overview').innerHTML='<span><small>CHÍNH TINH</small><strong>'+htmlEscape(h.stars.join(' · ')||'Vô chính diệu')+'</strong></span><span><small>SAO KHÁC</small><strong>'+(h.auxiliaryStars.length+h.yearStars.length+(h.additionalStars?.length||0))+' sao</strong></span><span><small>ĐẠI HẠN</small><strong>'+htmlEscape((h.daiHan?.fromAge??'—')+'–'+(h.daiHan?.toAge??'—'))+' tuổi mụ</strong></span>';
 const groups=[['Chính tinh',h.stars.map(star=>{const strength=h.mainStarStrengths?.find(s=>s.name===star);return star+(strength?' ('+(strength.status==='D'?'Đ':strength.status)+')':'')})],['Phụ tinh',h.auxiliaryStars],['Sao năm sinh',h.yearStars],['Sao bổ sung',h.additionalStars||[]],['Tứ hóa năm sinh',(h.tuHoa||[]).map(t=>t.name+' · '+t.star)],['Vòng Tràng Sinh',h.cycleStars?.trangSinh||[]],['Vòng Thái Tuế',h.cycleStars?.thaiTue||[]],['Vòng Bác Sĩ',h.cycleStars?.bacSi||[]]];
 document.getElementById('preview-reader-groups').innerHTML=groups.map(([name,items])=>'<section class="preview-reader-group"><h3>'+htmlEscape(name)+'</h3><ul class="preview-reader-list">'+(items.length?items.map(x=>'<li>'+htmlEscape(x)+'</li>').join(''):'<li>—</li>')+'</ul></section>').join('');
 sampleModal.dataset.readerFont=largeReaderText?'large':'normal';
 document.getElementById('preview-reader-font').textContent=largeReaderText?'A− Chữ thường':'A+ Chữ lớn';
 document.getElementById('preview-reader-font').setAttribute('aria-pressed',String(largeReaderText));
}
function openReader(branch){readerBranch=branch;renderReader();if(!sampleModal.open)sampleModal.showModal();document.getElementById('preview-close-reader').focus();}
document.getElementById('preview-open-reader').addEventListener('click',()=>openReader(selected));
document.getElementById('preview-close-reader').addEventListener('click',()=>sampleModal.close());
document.getElementById('preview-next-palace').addEventListener('click',()=>{readerBranch=(readerBranch+1)%12;renderReader()});
document.getElementById('preview-previous-palace').addEventListener('click',()=>{readerBranch=(readerBranch+11)%12;renderReader()});
document.getElementById('preview-reader-font').addEventListener('click',()=>{largeReaderText=!largeReaderText;renderReader()});
document.addEventListener('dblclick',e=>{const tile=e.target.closest('#sample-board [data-branch]');if(tile)openReader(Number(tile.dataset.branch))});
</script>'''
source=source.replace('</body></html>',modal+script+'</body></html>')
out=root/'previews/v11-palace-reader-preview.html';out.write_text(source,encoding='utf-8');print(out)
