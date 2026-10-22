"""Source-backed static preview of V11's smooth relationship overlays; not a production Next.js render."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=(root/'previews/v11-heritage-chart-preview.html').read_text(encoding='utf-8')
css=(root/'apps/web/src/app/palace-insight-dock.css').read_text(encoding='utf-8')
heritage=(root/'apps/web/src/app/chart-heritage.css').read_text(encoding='utf-8')
# The display rules are imported from source rather than drawing a separate visual concept.
extra_css=css[css.rfind('/* V11.1 — quiet, fluid relationship guides.'):]+ '\n' + heritage[heritage.rfind('/* Keep visual guides understated against aged ivory;'):]
source=source.replace('</style></head>',extra_css+'\n</style></head>',1)
source=source.replace('Thiên Đồ V11 · Mệnh bàn cổ điển','Thiên Đồ V11.1 · Đối chiếu cung mượt mà',1)
source=source.replace('V11.0 · HERITAGE CHART','V11.1 · FLUID RELATIONS',1)
source=source.replace('Trên điện thoại, địa bàn cuộn ngang và bảng đối chiếu chuyển xuống bên dưới.', 'Rê chuột để thấy đường nối chuyển vị trí mềm mại, rời chuột để đường mờ đi; chạm cung để xem trên điện thoại.',1)
script=r'''<script>
// The preview uses the same 230 ms ease-out motion and source colors as the React overlay.
let fluidOverlay=null,fluidCurrent=[],fluidFrame=null;
const fluidNS='http://www.w3.org/2000/svg';
const fluidEase=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);
const fluidPoint=(a,b,t)=>({x:a.x+(b.x-a.x)*fluidEase(t),y:a.y+(b.y-a.y)*fluidEase(t)});
function fluidSVG(grid){
 if(fluidOverlay?.isConnected)return fluidOverlay;
 fluidOverlay=document.createElementNS(fluidNS,'svg');
 fluidOverlay.classList.add('chart-relation-lines');
 fluidOverlay.dataset.visible='false';
 fluidOverlay.setAttribute('aria-hidden','true');
 fluidOverlay.setAttribute('focusable','false');
 grid.append(fluidOverlay);
 return fluidOverlay;
}
function fluidRender(edges,geometry){
 const svg=fluidSVG(document.getElementById('sample-board'));
 svg.setAttribute('width',geometry.width);
 svg.setAttribute('height',geometry.height);
 svg.setAttribute('viewBox',`0 0 ${geometry.width} ${geometry.height}`);
 svg.replaceChildren();
 edges.forEach((edge,index)=>{
  const group=document.createElementNS(fluidNS,'g');
  group.setAttribute('class','chart-relation-path chart-relation-'+edge.kind);
  const guide=v11CurvedGuide(edge.a,edge.b);
  for(const klass of ['chart-relation-halo','chart-relation-stroke']){
   const path=document.createElementNS(fluidNS,'path');path.setAttribute('class',klass);path.setAttribute('d',guide);group.append(path);
  }
  for(const anchor of [edge.a,edge.b]){
   const node=document.createElementNS(fluidNS,'circle');node.setAttribute('cx',anchor.x);node.setAttribute('cy',anchor.y);node.setAttribute('r','3.2');group.append(node);
  }
  svg.append(group);
 });
}
previewDrawLines=function(){
 const grid=document.getElementById('sample-board');
 const svg=fluidSVG(grid);
 previewApplyHighlight();
 if(!previewLinesOn||scope==='single'||previewBranch===null){
  svg.dataset.visible='false';
  if(fluidFrame!==null)cancelAnimationFrame(fluidFrame);
  fluidFrame=null;
  return;
 }
 const rect=grid.getBoundingClientRect();
 const targets=scope==='tam-hop'?[4,8]:[4,8,6];
 const target=targets.flatMap(offset=>{
  const from=grid.querySelector('[data-branch="'+previewBranch+'"]');
  const to=grid.querySelector('[data-branch="'+((previewBranch+offset)%12)+'"]');
  if(!from||!to)return [];
  return [{kind:offset===6?'doi-cung':'tam-hop',a:previewEdge(from,grid),b:previewEdge(to,grid)}];
 });
 const old=fluidCurrent;
 fluidCurrent=target;
 if(fluidFrame!==null)cancelAnimationFrame(fluidFrame);
 const geometry={width:rect.width,height:rect.height};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||old.length!==target.length||old.some((e,i)=>e.kind!==target[i].kind)){
  fluidRender(target,geometry);svg.dataset.visible='true';fluidFrame=null;return;
 }
 const start=performance.now();
 const tick=now=>{
  const t=Math.min(1,(now-start)/230);
  fluidRender(target.map((edge,i)=>({kind:edge.kind,a:fluidPoint(old[i].a,edge.a,t),b:fluidPoint(old[i].b,edge.b,t)})),geometry);
  if(t<1)fluidFrame=requestAnimationFrame(tick);else fluidFrame=null;
 };
 svg.dataset.visible='true';
 fluidFrame=requestAnimationFrame(tick);
};
// Existing click, hover, mobile interactions call previewDrawLines dynamically.
requestAnimationFrame(()=>requestAnimationFrame(previewDrawLines));
</script>'''
source=source.replace('</body></html>',script+'</body></html>',1)
out=root/'previews/v11-fluid-relations-preview.html'
out.write_text(source,encoding='utf-8')
print(out)
