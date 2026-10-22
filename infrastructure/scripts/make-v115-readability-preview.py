"""Build a typography-only offline fixture from the existing V11.4 chart preview.
This checks styling and controls, not a live Next.js build.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
html=(root/'previews/v11-palace-reader-preview.html').read_text(encoding='utf-8')
css=(root/'apps/web/src/app/chart-readability.css').read_text(encoding='utf-8')
html=html.replace('</style></head>', '\n/* Actual V11.5 application style layer */\n'+css+'\n</style></head>',1)
html=html.replace('V11.4 · Phòng đọc cung rõ chữ','V11.5 · Địa bàn chữ rõ',1)
html=html.replace('<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">', '''<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">
<div class="chart-text-size-switch" role="group" aria-label="Kích thước chữ trên địa bàn"><span>CHỮ TRÊN LÁ SỐ</span><button type="button" data-sample-text="comfortable" aria-pressed="true">Dễ đọc</button><button type="button" data-sample-text="large" aria-pressed="false">A+ Chữ lớn</button></div>''',1)
html=html.replace('<div class="chart-room-layout" data-board-skin="heritage" data-dock-open="false">','<div class="chart-room-layout" data-board-skin="heritage" data-chart-text-size="comfortable" data-dock-open="false">',1)
html=html.replace('</body></html>', '''<script>
// Offline fixture correction: match PalaceTile's separate real engine-backed
// auxiliary, year, supplementary and transformation groups (no invented stars).
function addRealStarGroupsToSampleBoard(){
 document.querySelectorAll('#sample-board [data-branch]').forEach(tile=>{
  const h=data.result.houses.find(row=>row.branchIndex===Number(tile.dataset.branch));
  if(!h)return;
  const content=tile.querySelector('.atlas-house-content');
  if(!content)return;
  content.querySelectorAll('.atlas-house-assist,.preview-extra-tu-hoa').forEach(x=>x.remove());
  content.querySelectorAll('.atlas-star-group:not(.atlas-main)').forEach(x=>x.remove());
  const aux=document.createElement('div');aux.className='atlas-house-assist';
  const groups=[['PHỤ TINH',h.auxiliaryStars],['SAO CHI NĂM',h.yearStars],['SAO BỔ SUNG',h.additionalStars||[]]];
  for(const [name,items] of groups){
   if(!items.length)continue;
   const group=document.createElement('span');group.className='atlas-star-group';
   const label=document.createElement('span');label.className='atlas-group-label';label.textContent=name;
   const stars=document.createElement('span');stars.className='atlas-star-items';
   items.forEach(name=>{const star=document.createElement('span');star.className='atlas-star';star.textContent=name;stars.append(star)});
   group.append(label,stars);aux.append(group);
  }
  content.append(aux);
  if(h.tuHoa?.length){
   const group=document.createElement('span');group.className='atlas-star-group atlas-gold preview-extra-tu-hoa';
   const label=document.createElement('span');label.className='atlas-group-label';label.textContent='TỨ HÓA SINH';
   const stars=document.createElement('span');stars.className='atlas-star-items';
   h.tuHoa.forEach(t=>{const star=document.createElement('span');star.className='atlas-star';star.textContent=t.name+' · '+t.star;stars.append(star)});
   group.append(label,stars);content.append(group);
  }
 });
}
const previousV115Render=render;
render=function(){previousV115Render();addRealStarGroupsToSampleBoard()};
render();
// Demo control mirrors the React state/data attribute in chart-board.tsx.
document.querySelectorAll('[data-sample-text]').forEach(button=>button.addEventListener('click',()=>{
 const value=button.dataset.sampleText;
 document.querySelector('.chart-room-layout').dataset.chartTextSize=value;
 document.querySelectorAll('[data-sample-text]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sampleText===value)));
}));
</script></body></html>''',1)
out=root/'previews/v11-5-readability-preview.html'
out.write_text(html,encoding='utf-8')
print(out)
