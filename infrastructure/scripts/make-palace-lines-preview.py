"""Build a local-only interaction preview from the previous source-backed atlas fixture."""
from pathlib import Path
p=Path(__file__).resolve().parents[2]
source=(p/'previews/insight-dock-preview.html').read_text()
css=(p/'apps/web/src/app/palace-insight-dock.css').read_text(encoding='utf-8')
chart_css=(p/'apps/web/src/app/chart-atlas.css').read_text(encoding='utf-8')
visual_css=chart_css.split('/* V10.9 visual polish: hover preview is vivid, selection remains calm. */')[-1]
typography_css=(p/'apps/web/src/app/typography-refinement.css').read_text(encoding='utf-8')
controls='''<div class="chart-room-controls" aria-label="Tùy chọn không gian địa bàn">
<button type="button" class="chart-room-control" id="preview-toggle-dock" aria-expanded="false" aria-controls="sample-dock">▤ Hiện sổ tay nghiên cứu</button>
<button type="button" class="chart-room-control" id="preview-toggle-lines" aria-pressed="true">⌁ Tắt gợi liên hệ cung</button>
<div class="chart-line-scope" id="preview-line-scope" hidden><button type="button" data-preview-scope="tam-hop">Tam hợp</button><button type="button" data-preview-scope="tu-chinh">Tam phương Tứ chính</button><span class="chart-line-legend"><i class="chart-line-solid"></i> Tam hợp <i class="chart-line-dashed"></i> Đối cung</span></div>
</div>'''
source=source.replace('<div class="chart-room-layout">',controls+'<div class="chart-room-layout" data-dock-open="false">',1)
source=source.replace('class="preview-grid" id="sample-board"','class="preview-grid atlas-grid" id="sample-board"',1)
source=source.replace('<div id="sample-dock">','<div id="sample-dock" hidden>',1)
source=source.replace('</style></head>',f'''{css}
:root {{--font-ui:"Be Vietnam Pro","Inter","Segoe UI","Noto Sans",system-ui,Arial,sans-serif;
--font-display:"Cambria","Noto Serif","Times New Roman",Georgia,serif;
--font-han:"Microsoft YaHei UI","Noto Sans CJK SC","Noto Sans SC","PingFang SC",sans-serif;}}
body,button,input,select,textarea {{font-family:var(--font-ui);}}
.serif,.preview-head h1,.preview-center-title {{font-family:var(--font-display);}}
/* Palette is shared with the real chart: accents come from stable branch index. */
.atlas-house.house {{background:linear-gradient(160deg,var(--house-accent-soft,transparent),transparent 55%),var(--panel);}}
.atlas-house.house.visual-focus {{border-color:var(--house-accent)!important;box-shadow:inset 0 0 0 1px var(--house-accent);}}
.atlas-house.house.related-tam-hop {{border-color:#79c5a0;}}
.atlas-house.house.related-doi-cung {{border-color:#8baee3;}}
{typography_css}
.preview-grid{{position:relative}}
.preview-wrap .chart-room-controls{{margin-top:0}}
.chart-line-scope[hidden]{{display:none!important}}
</style></head>''',1)
script=r'''<script>
let previewDockOpen=false,previewLinesOn=true,previewBranch=null;
const previousRender=render;
const previewColors=[
 ['#7ac7b0','rgba(122,199,176,.20)'], ['#86b7ea','rgba(134,183,234,.18)'], ['#d1b06a','rgba(209,176,106,.18)'],
 ['#78c9d8','rgba(120,201,216,.18)'], ['#96c47f','rgba(150,196,127,.18)'], ['#c28de2','rgba(194,141,226,.16)'],
 ['#e39a7c','rgba(227,154,124,.16)'], ['#6fd4b8','rgba(111,212,184,.19)'], ['#9bb7ff','rgba(155,183,255,.17)'],
 ['#d7bc73','rgba(215,188,115,.17)'], ['#7ec9f2','rgba(126,201,242,.17)'], ['#a4ce8d','rgba(164,206,141,.17)']
];
function previewApplyHighlight(){
 const active=previewLinesOn?previewBranch:null;
 document.querySelectorAll('#sample-board [data-branch]').forEach(el=>{
  const branch=Number(el.dataset.branch);
  el.style.setProperty('--house-accent',previewColors[branch][0]);
  el.style.setProperty('--house-accent-soft',previewColors[branch][1]);
  el.classList.remove('related-tam-hop','related-doi-cung','visual-focus');
  if(active===null)return;
  if(branch===active)el.classList.add('visual-focus');
  else if((branch-active+12)%12===6 && scope==='tu-chinh')el.classList.add('related-doi-cung');
  else if([4,8].includes((branch-active+12)%12))el.classList.add('related-tam-hop');
 });
}
function previewEdge(tile,board) {
 const b=board.getBoundingClientRect(),r=tile.getBoundingClientRect();
 const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
 const h=Math.abs(x-(b.left+b.right)/2)>(r.width*.9);
 const v=Math.abs(y-(b.top+b.bottom)/2)>(r.height*.9);
 return {x:(h?(x<(b.left+b.right)/2?r.right-6:r.left+6):x)-b.left,
 y:(v?(y<(b.top+b.bottom)/2?r.bottom-6:r.top+6):y)-b.top};
}
function previewTrack(a,b,center,inset) {
 const L=center.left+inset,R=center.right-inset,T=center.top+inset,B=center.bottom-inset;
 const w=R-L,h=B-T,P=2*(w+h),c=(x,m,n)=>Math.max(m,Math.min(n,x));
 const projection=p=>{
  const cand=[{point:{x:c(p.x,L,R),y:T},s:c(p.x,L,R)-L},{point:{x:R,y:c(p.y,T,B)},s:w+c(p.y,T,B)-T},
    {point:{x:c(p.x,L,R),y:B},s:w+h+R-c(p.x,L,R)},{point:{x:L,y:c(p.y,T,B)},s:2*w+h+B-c(p.y,T,B)}];
  return cand.reduce((best,e)=>((e.point.x-p.x)**2+(e.point.y-p.y)**2)<((best.point.x-p.x)**2+(best.point.y-p.y)**2)?e:best);
 };
 const from=projection(a),to=projection(b),delta=(to.s-from.s+P)%P,cw=delta<=P/2,endS=cw?from.s+delta:from.s-(P-delta);
 const corners=[{s:0,point:{x:L,y:T}},{s:w,point:{x:R,y:T}},{s:w+h,point:{x:R,y:B}},{s:2*w+h,point:{x:L,y:B}}],steps=[];
 for(let cycle=-2;cycle<=2;cycle++)for(const corner of corners){const value=corner.s+cycle*P;if(cw?value>from.s+.01&&value<endS-.01:value<from.s-.01&&value>endS+.01)steps.push({s:value,point:corner.point});}
 steps.sort((x,y)=>cw?x.s-y.s:y.s-x.s);
 return [a,from.point,...steps.map(x=>x.point),to.point,b].map((pt,i)=>(i?'L ':'M ')+pt.x.toFixed(2)+' '+pt.y.toFixed(2)).join(' ');
}
function previewDrawLines() {
 const grid=document.getElementById('sample-board');
 grid.querySelector('.chart-relation-lines')?.remove();
 previewApplyHighlight();
 if(!previewLinesOn||scope==='single'||previewBranch===null)return;
 const rect=grid.getBoundingClientRect();
 const mid=grid.querySelector('.atlas-center').getBoundingClientRect();
 const center={left:mid.left-rect.left,top:mid.top-rect.top,right:mid.right-rect.left,bottom:mid.bottom-rect.top};
 const targets=scope==='tam-hop'?[4,8]:[4,8,6];
 const lines=targets.map((offset,index)=>{
  const from=grid.querySelector('[data-branch="'+previewBranch+'"]');
  const to=grid.querySelector('[data-branch="'+((previewBranch+offset)%12)+'"]');
  if(!from||!to)return '';
  const a=previewEdge(from,grid),b=previewEdge(to,grid),kind=offset===6?'doi-cung':'tam-hop';
  return '<g class="chart-relation-path chart-relation-'+kind+'"><path d="'+previewTrack(a,b,center,12+index*9)+'"/><circle cx="'+a.x+'" cy="'+a.y+'" r="4.5"/><circle cx="'+b.x+'" cy="'+b.y+'" r="4.5"/></g>';
 }).join('');
 grid.insertAdjacentHTML('beforeend','<svg class="chart-relation-lines" width="'+rect.width+'" height="'+rect.height+'" viewBox="0 0 '+rect.width+' '+rect.height+'" aria-hidden="true">'+lines+'</svg>');
}
render=function(){
 previousRender();
 // Offline DOM mirrors the actual V11 phase-2 main-star labels and statuses.
 const houses=data.result.houses;
 document.querySelectorAll('#sample-board [data-branch]').forEach(tile=>{
  const house=houses.find(h=>h.branchIndex===Number(tile.dataset.branch));
  if(!house)return;
  const main=tile.querySelector('.atlas-main');
  if(main){
    main.classList.add('atlas-main-group');
    const target=main.querySelector('.atlas-star-items');
    if(target){
      const starList=document.createElement('span');starList.className='atlas-main-star-list';
      (house.stars.length?house.stars:['Vô chính diệu']).forEach(name=>{
        const entry=document.createElement('span');entry.className='atlas-main-star-entry';
        const title=document.createElement('strong');title.textContent=name;entry.append(title);
        const strength=house.mainStarStrengths?.find(item=>item.name===name);
        if(strength){const badge=document.createElement('span');badge.className='atlas-strength-badge atlas-strength-'+strength.status.toLowerCase();badge.textContent=strength.status;badge.title=strength.label;entry.append(badge);}
        starList.append(entry);
      });
      target.replaceWith(starList);
    }
  }
 });
 const room=document.querySelector('.chart-room-layout');
 room.dataset.dockOpen=String(previewDockOpen);
 document.getElementById('sample-dock').hidden=!previewDockOpen;
 const d=document.getElementById('preview-toggle-dock');
 d.textContent=previewDockOpen?'◧ Ẩn sổ tay nghiên cứu':'▤ Hiện sổ tay nghiên cứu';
 d.setAttribute('aria-expanded',String(previewDockOpen));
 d.classList.toggle('active',previewDockOpen);
 const l=document.getElementById('preview-toggle-lines');
 l.textContent=previewLinesOn?'⌁ Tắt gợi liên hệ cung':'⌁ Bật gợi liên hệ cung';
 l.setAttribute('aria-pressed',String(previewLinesOn));
 l.classList.toggle('active',previewLinesOn);
 document.getElementById('preview-line-scope').hidden=!previewLinesOn;
 document.querySelectorAll('#sample-board [data-branch]').forEach(el=>{
  const realHover=()=>window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  el.onmouseenter=()=>{ if(!previewLinesOn||!realHover()) return; previewBranch=Number(el.dataset.branch); previewDrawLines(); };
  el.onfocus=()=>{ if(!previewLinesOn||!realHover()) return; previewBranch=Number(el.dataset.branch); previewDrawLines(); };
  el.onmouseleave=()=>{ if(!realHover())return; previewBranch=null; previewDrawLines(); };
  el.onblur=()=>{ if(!realHover())return; previewBranch=null; previewDrawLines(); };
  el.onclick=((original)=>function(event){ if(typeof original==='function') original.call(this,event); previewBranch=Number(el.dataset.branch); render(); })(el.onclick);
 });
 document.querySelectorAll('[data-preview-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewScope===scope)));
 requestAnimationFrame(previewDrawLines);
};
document.getElementById('preview-toggle-dock').addEventListener('click',()=>{previewDockOpen=!previewDockOpen;render();});
document.getElementById('preview-toggle-lines').addEventListener('click',()=>{previewLinesOn=!previewLinesOn; if(!previewLinesOn) previewBranch=null; render();});
document.querySelectorAll('[data-preview-scope]').forEach(b=>b.addEventListener('click',()=>{scope=b.dataset.previewScope;previewBranch=null;render();}));
document.addEventListener('pointerdown',e=>{ if(!e.target.closest('#sample-board [data-branch]')) {previewBranch=null;previewDrawLines();} });
window.addEventListener('resize',()=>requestAnimationFrame(previewDrawLines));
render();
</script>'''
source=source.replace('</body></html>',script+'</body></html>')
out=p/'previews/palace-lines-and-dock-preview.html'
out.write_text(source)
print(out)
