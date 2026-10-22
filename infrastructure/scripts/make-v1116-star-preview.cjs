/* Standalone V11.16 visual inspection. Real engine output; not Next.js production. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const engine=require('../../packages/astrology-engine/src/tuvi.js');
const {starSymbols}=require('../../packages/knowledge/src/index.cjs');
const cases=[
 {name:'Lá số A · Nam',input:{date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'}},
 {name:'Lá số B · Nữ',input:{date:'1998-11-04',hour:21,minute:15,gender:'Nữ',calendar:'solar'}},
 {name:'Lá số C · Nam',input:{date:'2026-10-10',hour:12,minute:30,gender:'Nam',calendar:'solar'}},
].map(x=>{const c=engine.calculate(x.input);return {name:x.name,date:x.input.date,yearCanChi:c.yearCanChi,menh:c.menh,than:c.than,cuc:c.cuc.name,lunar:c.lunar,houses:c.houses,beneficStars:c.beneficStars,annualByYear:Object.fromEntries([2026,2027,2028].map(y=>[y,engine.annualOverview(c,y).luuStars.items]))};});
const subset=Object.fromEntries(cases.flatMap(x=>x.beneficStars).map(s=>[s.name,starSymbols[s.name]]));
const data=JSON.stringify({cases,guide:subset,edition:'V11.16'}).replace(/</g,'\\u003c');
const previewChartCss = require('./lib/chart-preview-css.cjs');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>THIÊN ĐỒ V11.16 · Lá số và thư viện sao mở rộng</title>
<style>
${previewChartCss}
</style></head>
<body><header><h1>THIÊN ĐỒ · Thư viện Tinh Diệu</h1><p>V11.16 · 4 sao Đức · Giải và 4 sao lưu năm mới · 14 chính tinh và hệ vận hạn giữ nguyên</p></header>
<main><div class="toolbar"><label for="case">LÁ SỐ THỬ</label><select id="case"></select><label for="year">NĂM XEM</label><select id="year"><option>2026</option><option>2027</option><option>2028</option></select><label for="search">TÌM SAO / CUNG</label><input id="search" placeholder="Ví dụ: Thiên Giải" aria-label="Tìm cung hoặc sao"/><button id="toggle" class="detail-toggle" aria-pressed="true">Hiện tất cả sao</button><span class="search-results" id="count"></span></div>
<div class="layout"><section class="board-wrap" aria-label="Lá số Tử Vi 12 cung"><div class="board" id="board"><svg class="links" id="links" aria-hidden="true"></svg></div></section>
<aside class="panel"><div class="panel-head"><small>Phòng đọc · V11.16</small><h2 id="panel-title"></h2><p id="panel-subtitle"></p></div><div class="content"><h3>Chính tinh</h3><div class="chips" id="main-stars"></div><h3>Thiên Đức · Nguyệt Đức · Thiên Giải · Địa Giải</h3><div class="chips" id="trad-stars"></div><div id="info" class="star-info"></div><div id="more" class="deep"><h3>Phụ tinh & sao chi năm</h3><div class="chips" id="extra-stars"></div><h3>Sao lưu theo năm xem <span id="year-note"></span></h3><div class="chips" id="annual-stars"></div><h3>Vòng sao và hạn</h3><p class="muted" id="period"></p></div></div></aside></div>
<p class="footer-note">Bản xem trước này dùng dữ liệu an sao gốc và sao lưu tính trực tiếp từ engine. Các quy tắc huyền học được áp dụng theo bảng an đã chọn, còn chờ thẩm định chuyên môn; đây không phải hình thức dự báo có căn cứ khoa học.</p>
</main><script id="seed" type="application/json">${data}</script><script>
(()=>{'use strict';const data=JSON.parse(document.getElementById('seed').textContent),$=id=>document.getElementById(id);
let ci=0,selected=0,activeStar=null,all=true,year=2026;const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const sample=()=>data.cases[ci],house=()=>sample().houses.find(h=>h.branchIndex===selected),annualStars=()=>sample().annualByYear[year];
$('case').innerHTML=data.cases.map((x,i)=>'<option value="'+i+'">'+escape(x.name)+' · '+escape(x.yearCanChi)+'</option>').join('');
const chip=(str,isActive=false)=>'<button class="chip'+(isActive?' active':'')+'" data-star="'+escape(str)+'">'+escape(str)+'</button>';
function choose(caseIndex){ci=Number(caseIndex);const c=sample();selected=(c.houses.find(h=>(h.beneficStars??[]).includes('Thiên Đức'))??c.houses.find(h=>h.palace==='Mệnh')).branchIndex;activeStar=null;draw();}
function draw(){const c=sample(),h=house(),q=$('search').value.toLocaleLowerCase('vi');$('count').textContent=q? 'Đang lọc trong 12 cung':'';
const board=$('board');board.querySelectorAll('.house,.heart').forEach(el=>el.remove());
for(const p of c.houses){const b=document.createElement('button');b.type='button';b.className='house'+(p.branchIndex===selected?' selected':'')+(q&&[p.palace,p.branch,...p.stars,...p.auxiliaryStars,...p.yearStars,...(p.beneficStars??[]),...annualStars().filter(x=>x.branch===p.branchIndex).map(x=>x.name)].join(' ').toLocaleLowerCase('vi').includes(q)?' related':'');b.style.gridColumn=String(p.cell%4+1);b.style.gridRow=String(Math.floor(p.cell/4)+1);b.dataset.branch=String(p.branchIndex);b.setAttribute('aria-pressed',String(p.branchIndex===selected));
b.innerHTML='<header><span>'+escape(p.stem+' '+p.branch)+'</span><strong>'+escape(p.palace)+'</strong></header><div class="main-star">'+escape(p.stars.join(' · ')||'Vô chính diệu')+'</div>'+(all?'<div class="aux">'+escape([...p.auxiliaryStars,...p.yearStars,...(p.additionalStars??[]),...(p.traditionalStars??[]),...(p.advancedStars??[]),...(p.natalExtensionStars??[])].join(' · '))+'</div>':'')+'<div class="traditional">'+escape((p.beneficStars??[]).join(' · '))+'</div><footer>ĐH '+escape(p.daiHan?.fromAge??'—')+'–'+escape(p.daiHan?.toAge??'—')+' · '+(p.beneficStars??[]).length+' sao Đức/Giải</footer>';b.addEventListener('click',()=>{selected=p.branchIndex;activeStar=null;draw();});b.addEventListener('mouseenter',()=>drawLines(p.branchIndex));b.addEventListener('mouseleave',()=>drawLines(selected));board.append(b);}
const mid=document.createElement('div');mid.className='heart';mid.innerHTML='<div class="glyph">☯</div><div class="subtitle">紫 微 斗 數</div><h2>THIÊN ĐỒ</h2><p>'+escape(c.yearCanChi)+'<br>Mệnh '+escape(c.menh)+' · Thân '+escape(c.than)+'<br>'+escape(c.cuc)+'<br>Âm lịch '+escape(c.lunar.day+'/'+c.lunar.month+'/'+c.lunar.year)+'</p>';board.append(mid);
$('panel-title').textContent='Cung '+h.palace;$('panel-subtitle').textContent=h.stem+' '+h.branch+' · '+((h.beneficStars??[]).length)+' sao Đức/Giải · Đại hạn '+h.daiHan?.fromAge+'–'+h.daiHan?.toAge;
$('main-stars').innerHTML=(h.stars.length?h.stars:['Vô chính diệu']).map(x=>chip(x)).join('');
$('trad-stars').innerHTML=(h.beneficStars?.length?h.beneficStars:['Không có sao Đức/Giải tại cung này']).map(x=>data.guide[x]?chip(x,x===activeStar):'<span class="muted">'+escape(x)+'</span>').join('');
$('extra-stars').innerHTML=[...h.auxiliaryStars,...h.yearStars,...(h.additionalStars??[]),...(h.traditionalStars??[]),...(h.advancedStars??[]),...(h.natalExtensionStars??[])].map(x=>'<span class="chip">'+escape(x)+'</span>').join('');
$('year-note').textContent='('+year+')';$('annual-stars').innerHTML=annualStars().filter(x=>x.branch===h.branchIndex).map(x=>'<span class="chip">'+escape(x.name)+'</span>').join('')||'<span class="muted">Không có sao lưu tại cung này theo năm '+year+'.</span>';
$('period').textContent='Vòng Thái Tuế: '+h.cycleStars.thaiTue.join(', ')+' · Bác Sĩ: '+h.cycleStars.bacSi.join(', ')+' · Tràng Sinh: '+h.cycleStars.trangSinh.join(', ');
$('more').classList.toggle('hidden',!all);$('toggle').setAttribute('aria-pressed',String(all));$('toggle').textContent=all?'Ẩn sao phụ để gọn':'Hiện tất cả sao';
if(!activeStar||!(h.beneficStars??[]).includes(activeStar))activeStar=(h.beneficStars??[])[0]??null;
for(const btn of document.querySelectorAll('[data-star]'))btn.addEventListener('click',()=>{activeStar=btn.dataset.star;draw();});
const guide=data.guide[activeStar];$('info').innerHTML=guide?'<h4>'+escape(activeStar)+' · '+escape(guide.motif)+'</h4><p>'+escape(guide.context)+'</p><p class="muted">'+escape(guide.caution)+'</p>':'<h4>Đọc theo từng cung</h4><p>Chọn một cung chứa sao Đức/Giải, sau đó chọn tên sao để xem giải nghĩa. Nội dung không tự suy đoán từ dữ liệu chưa có.</p>';
requestAnimationFrame(()=>drawLines(selected));}
function drawLines(branch){const root=$('board'),svg=$('links'),from=root.querySelector('[data-branch="'+branch+'"]');if(!from){svg.innerHTML='';return;}const r=root.getBoundingClientRect(),f=from.getBoundingClientRect();const xy=e=>{const q=e.getBoundingClientRect();return [q.left+q.width/2-r.left,q.top+q.height/2-r.top]};const [x1,y1]=xy(from);svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);svg.innerHTML=[{b:(branch+4)%12,type:'tam'},{b:(branch+8)%12,type:'tam'},{b:(branch+6)%12,type:'opposite'}].map(({b,type})=>{const e=root.querySelector('[data-branch="'+b+'"]');if(!e)return '';const [x2,y2]=xy(e);return '<line class="'+type+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>';}).join('');}
$('case').addEventListener('change',e=>choose(e.target.value));$('year').addEventListener('change',e=>{year=Number(e.target.value);draw();});$('search').addEventListener('input',draw);$('toggle').addEventListener('click',()=>{all=!all;draw();});window.addEventListener('resize',()=>drawLines(selected));choose(0);
})();
</script></body></html>`;
const out=path.resolve(root,'previews/v1116-duc-giai-annual.html');
// Direct imports expose HTML read-only. CLI preserves the original writes and logs.
if (require.main === module) {
  fs.writeFileSync(out,html);
  fs.writeFileSync('/mnt/data/THIEN_DO_V11_16_INTERACTIVE_PREVIEW.html',html);
  console.log(out,Buffer.byteLength(html));
}
module.exports = { html, out };
