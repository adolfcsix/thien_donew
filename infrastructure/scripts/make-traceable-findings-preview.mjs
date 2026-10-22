/** Offline UX proof generated from engine output; NOT a Next.js build. */
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const root=resolve(import.meta.dirname,'../..');
const engine=require('../../packages/astrology-engine/src/tuvi.js');
const chart=engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam'});
const years=[2026,2030];
const data={};
for(const year of years){
  const annual=engine.annualOverview(chart,year);
  data[year]={yearLabel:annual.canChi,branches:Array.from({length:12},(_,branch)=>{
    const research=engine.palaceResearch(chart,annual,branch);
    return {branch,branchName:research.perspectives[0].branch,palace:research.palace,
      withAnnual:engine.traceableFindings(research,{includeAnnual:true}),
      natalOnly:engine.traceableFindings(research,{includeAnnual:false})};
  })};
}
const raw=JSON.stringify(data).replaceAll('<','\\u003c');
const css=readFileSync(resolve(root,'apps/web/src/app/traceable-findings.css'),'utf8');
const html=String.raw`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THIÊN ĐỒ · Phiếu luận cứ</title>
<style>:root{--panel:#15271f;--panel-alt:#1b3026;--line:rgba(213,188,143,.19);--line-strong:rgba(213,188,143,.35);--gold:#d9b77b;--text:#eee5d5;--muted:#b2beaf;--faint:#83998c;color-scheme:dark}*{box-sizing:border-box}body{background:radial-gradient(ellipse at 70% 0,#1f4233,transparent 47%),#0b1713;color:var(--text);font-family:system-ui,'Segoe UI',sans-serif;margin:0}button,select{font:inherit}button:focus-visible,select:focus-visible{outline:2px solid var(--gold);outline-offset:3px}main{max-width:1280px;margin:0 auto;padding:22px clamp(12px,4vw,50px) 60px}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:17px}.logo{display:flex;align-items:center;gap:15px}.seal{border:1px solid var(--gold);color:var(--gold);width:49px;height:49px;display:grid;place-items:center;font:28px Georgia,serif}.logo b{font:27px Georgia,serif;letter-spacing:.15em}.logo small{display:block;color:var(--gold);font-size:10px;letter-spacing:.12em;margin-top:4px}.preview-flag{font-size:10px;color:var(--gold)}.hero{padding:45px 0 24px;max-width:700px}.eyebrow{font-size:10px;color:var(--gold);letter-spacing:.13em}.hero h1{font:normal clamp(33px,5vw,58px)/1.14 Georgia,serif;letter-spacing:.018em;margin:16px 0}.hero p{color:var(--muted);font-size:13px;line-height:1.8}.controllers{display:flex;gap:18px;flex-wrap:wrap;align-items:end;background:#10241c;padding:17px;border:1px solid var(--line-strong)}.controllers label{display:grid;gap:7px;font-size:11px;color:var(--gold)}.controllers select{min-width:170px;min-height:39px;padding:7px 12px;background:#193327;color:var(--text);border:1px solid var(--line-strong)}.controllers .toggle{display:flex;align-items:center;gap:9px;margin-bottom:12px;color:var(--text)}input{accent-color:var(--gold)}.helper{margin:15px 0;color:var(--muted);font-size:11px}a{color:var(--gold)}${css}
@media(max-width:480px){.bar{align-items:flex-start}.preview-flag{display:none}.hero{padding:28px 0 14px}.controllers label{flex:1 1 120px}.controllers select{min-width:0;width:100%}}
</style></head><body><main><header class="bar"><div class="logo"><span class="seal" aria-hidden="true">天</span><div><b>THIÊN ĐỒ</b><small>NGỌC BÍCH · LUẬN CỨ</small></div></div><span class="preview-flag">BẢN HTML KIỂM TRA GIAO DIỆN</span></header>
<section class="hero"><span class="eyebrow">NGHIÊN CỨU TỬ VI · QUYỂN III</span><h1>Từng luận cứ.<br>Từng chứng cứ.</h1><p>Không che giấu thuật toán trong một lời nhận xét. Mỗi dữ kiện về cung, chính tinh, Tứ Hóa và quan hệ Tam phương đều có đường dẫn nguồn để kiểm chứng lại từ lá số.</p></section>
<div class="controllers"><label>Cung nghiên cứu<select id="branch"></select></label><label>Năm xem<select id="year"></select></label><label class="toggle"><input type="checkbox" id="show-annual" checked>Hiển thị lớp năm xem</label></div>
<div id="live" aria-live="polite"></div><p class="helper">Dữ liệu từ Astrology Engine thực tế, người sinh ví dụ 15/08/2004 lúc 08:30. Chưa phải kết quả build ứng dụng Next.js.</p>
</main><script type="application/json" id="data">${raw}</script>
<script>
(()=>{'use strict';const data=JSON.parse(document.getElementById('data').textContent);const $=id=>document.getElementById(id);const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const labels={'dong-cung':'Đồng cung','tam-phuong':'Tam phương','tu-hoa':'Tứ Hóa năm sinh','luu-nien':'Lưu niên','doi-chieu':'Hai lớp Hóa','kiem-tra':'Cần kiểm tra'};
for(const year of Object.keys(data))$('year').add(new Option(year,year));$('year').value='2026';
for(const p of data['2026'].branches)$('branch').add(new Option(p.palace+' · '+p.branchName,p.branch));
$('branch').value=String(data['2026'].branches.find(x=>x.palace==='Mệnh').branch);
let filter='all';
function render(){const selected=data[$('year').value].branches[Number($('branch').value)];const result=$('show-annual').checked?selected.withAnnual:selected.natalOnly;
const visible=result.findings.filter(x=>filter==='all'||(filter==='annual'?x.annual:!x.annual));
$('live').innerHTML='<section class="trace-findings"><header class="trace-findings-head"><div><span class="eyebrow">QUYỂN III · KIỂM CHỨNG DỮ KIỆN</span><h3>Phiếu luận cứ · '+esc(result.anchorPalace)+'</h3><p>Mỗi phiếu mô tả <strong>điều đã có trong lá số</strong>, kèm mã quy tắc và đường dẫn nguồn. Không chấm điểm hay dự báo vận mệnh.</p></div><div class="trace-findings-summary"><strong>'+result.summary.all+'</strong><span>quan sát</span><small>'+esc(result.ruleSet)+'</small></div></header><div class="trace-findings-filter" role="group" aria-label="Lọc phiếu luận cứ">'+[['all','Tất cả',result.summary.all],['natal','Năm sinh / địa bàn',result.summary.natal],['annual','Năm xem',result.summary.annual]].map(x=>'<button type="button" data-filter="'+x[0]+'" class="'+(filter===x[0]?'active':'')+'" aria-pressed="'+(filter===x[0])+'">'+x[1]+' <span>'+x[2]+'</span></button>').join('')+'</div>'+
(!visible.length?'<p class="trace-findings-empty">Không có quan sát trong phạm vi này; không hàm ý kết quả tốt hay xấu.</p>':'<div class="trace-findings-list">'+visible.map((f,i)=>'<article class="trace-finding"><div class="trace-finding-top"><span class="trace-finding-kind">'+esc(labels[f.category])+'</span><code>'+esc(f.id)+'</code>'+(f.annual?'<span class="trace-year">Năm '+esc(result.annualYear)+'</span>':'')+'</div><h4>'+esc(f.title)+'</h4><p>'+esc(f.description)+'</p><details class="trace-finding-sources"><summary>Xem '+f.evidence.length+' nguồn dữ liệu</summary><ol>'+f.evidence.map(s=>'<li><span><strong>'+esc(s.palace)+'</strong> · '+esc(s.branch)+' ('+s.branchIndex+')</span><span>'+esc(s.star??'Không có chính tinh')+' '+esc(s.transformation??'')+'</span><code>'+esc(s.path)+'</code></li>').join('')+'</ol></details></article>').join('')+'</div>')+'<p class="trace-findings-foot"><strong>Phạm vi:</strong> '+esc(result.disclaimer)+' Nguồn: <code>'+esc(result.sourceRuleSet)+'</code></p></section>';
for(const el of document.querySelectorAll('[data-filter]'))el.addEventListener('click',()=>{filter=el.dataset.filter;render()});}
for(const id of ['year','branch','show-annual'])$(id).addEventListener('change',render);render();
})();
</script></body></html>`;
const folder=resolve(root,'previews');mkdirSync(folder,{recursive:true});
writeFileSync(resolve(folder,'traceable-findings-preview.html'),html);
console.log(`Traceable findings preview generated for ${years.length*12} combinations.`);
