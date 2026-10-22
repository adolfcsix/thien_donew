'use strict';
const fs=require('node:fs');const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const Lunar=require('../../packages/astrology-engine/src/lunar.js');
const Almanac=require('../../packages/astrology-engine/src/almanac.js');
const {getTemporalExplorer,listLunarMonths,getHourBranch,getSubannualResearch}=require('../../packages/interpretation/src/temporal-explorer.cjs');
const {comparePeriods}=require('../../packages/interpretation/src/period-timeline.cjs');
const root=path.resolve(__dirname,'../..');
const years=[2025,2026,2027,2028];
const births=[
  {name:'Lá số A · Nam sinh 2004',value:{date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0}},
  {name:'Lá số B · Nữ sinh 1998',value:{date:'1998-12-03',calendar:'solar',gender:'Nữ',hour:9,minute:15}},
];
const sampleData=births.map(x=>{const chart=Engine.calculate(x.value);return {name:x.name,palaces:Object.fromEntries(chart.houses.map(h=>[h.branchIndex,h.palace])),years:Object.fromEntries(years.map(y=>{const r=comparePeriods(chart,y,4);return [y,r.selected]})),research:Object.fromEntries(years.map(y=>[y,Object.fromEntries(listLunarMonths(y).map(m=>[m.key,getSubannualResearch(chart,y,m.month,m.leap,1,0).luuNguyet]))]))};});
const calendar=Object.fromEntries(years.map(y=>[y,listLunarMonths(y).map(m=>({key:m.key,month:m.month,leap:m.leap,displayName:m.displayName,partial:m.partial,days:m.days.map(d=>{const [yy,mo,dd]=d.solarDate.split('-').map(Number);return {...d,dayCanChi:Almanac.dayInfo(yy,mo,dd).dayCanChi}})}))]));
const hours=Array.from({length:24},(_,h)=>getHourBranch(h));
const css=fs.readFileSync(path.join(root,'apps/web/src/app/temporal-detail.css'),'utf8')+ '\n' + fs.readFileSync(path.join(root,'apps/web/src/app/period-timeline.css'),'utf8');
const json=obj=>JSON.stringify(obj).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>THIÊN ĐỒ V11.22 · Đối chiếu cung hạn thời gian</title><style>
:root{--font-display:Cambria,'Noto Serif',serif;--font-ui:'Segoe UI',Arial,sans-serif}*{box-sizing:border-box}body{margin:0;line-height:1.55;background:#142d25;color:#e8e6d8;font-family:var(--font-ui)}button,select{font:inherit}.shell{width:min(1140px,100%);margin:0 auto;padding:32px 20px 60px}.mast{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:20px}.mast small{color:#c8b381;letter-spacing:.15em}.mast h1{font:normal clamp(27px,4vw,43px) var(--font-display);margin:5px 0 7px}.mast p{color:#b8c8b8;margin:0}.mast select{border:1px solid #bca779;background:#f8f1df;color:#26483a;border-radius:10px;padding:11px;min-width:min(280px,100%);margin-top:6px}.mast label{color:#eae0c3;font-size:13px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}.toolbar button{padding:10px 16px;border:1px solid #ac9b70;border-radius:9px;background:#f3eddb;color:#2d4839;cursor:pointer}.toolbar button.active{background:#bfa675;font-weight:700}.period-timeline{max-width:100%;}.temporal-detail{margin:0}.period-timeline .eyebrow{font-size:10px;color:#8a6d41}.timeline-body{padding:20px}.period-current-header{margin-top:0}.summary-title{font-family:var(--font-display);font-size:20px;color:#2b4c3d;margin:0 0 8px}.summary-text{color:#596f62;font-size:13px;margin:6px 0 16px}.preview-note{color:#b5c8bb;font-size:13px;margin-top:19px}select:focus-visible,button:focus-visible{outline:3px solid #b89d5b;outline-offset:2px}.temporal-controls{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:620px){.shell{padding:20px 12px 40px}.timeline-body{padding:12px}.temporal-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.temporal-controls label:last-child{grid-column:1/-1}}@media(max-width:345px){.temporal-controls{grid-template-columns:1fr}.temporal-controls label:last-child{grid-column:auto}}
${css}
</style></head><body><main class="shell"><header class="mast"><div><small>THIÊN ĐỒ / V11.22</small><h1>Đối chiếu theo dòng thời gian</h1><p>Vận năm · Hạn tháng · Hạn ngày · Hạn giờ</p></div><label>Chọn lá số mẫu<br/><select id="sample"><option value="0">Lá số A · Nam sinh 2004</option><option value="1">Lá số B · Nữ sinh 1998</option></select></label></header><div class="toolbar" aria-label="Năm xem"><span>Năm âm lịch:</span><button data-year="2025">2025</button><button data-year="2026">2026</button><button data-year="2027">2027</button><button data-year="2028">2028</button></div><section class="period-timeline"><div class="period-timeline-heading"><div><span class="eyebrow">QUYỂN II · DÒNG VẬN</span><h3>Tra cứu vận năm và lịch tháng–ngày–giờ</h3><p>Chọn mốc thời gian, giữ riêng vận năm đã được tính.</p></div><span style="font-size:12px;color:#526358">Bản minh họa từ engine</span></div><div class="timeline-body"><h4 class="summary-title" id="summary"> </h4><p class="summary-text" id="annual-summary"> </p><section class="temporal-detail" aria-label="Tra cứu tháng ngày giờ âm lịch"><div class="temporal-header"><div><span class="eyebrow">LỊCH ÂM · ĐỌC THEO THỜI ĐIỂM</span><h4>Đi sâu từ năm đến tháng, ngày, giờ</h4></div><span class="temporal-status">Lớp lịch pháp</span></div><p>Chọn thời điểm để xem lịch âm–dương và đối chiếu vận năm. Vị trí cung hạn tháng/ngày/giờ theo quy ước nghiên cứu có thể bật bên dưới; chưa phải phép an sao lưu hoàn chỉnh.</p><div class="temporal-controls"><label>Tháng âm<select id="month"></select></label><label>Ngày âm<select id="day"></select></label><label>Giờ xem<select id="hour"></select></label></div><div class="temporal-results" aria-live="polite"><div><small>ÂM LỊCH</small><strong id="lunar"> </strong><span id="dayCanChi"> </span></div><div><small>DƯƠNG LỊCH (UTC+7)</small><strong id="solar"> </strong><span id="yearInfo"> </span></div><div><small>GIỜ ĐỊA CHI</small><strong id="branch"> </strong><span id="period"> </span></div></div><p class="temporal-boundary" id="boundary" hidden></p>
<label class="temporal-research-toggle"><input type="checkbox" id="researchToggle"/><span>Xem thêm vị trí hạn tháng, ngày, giờ (nghiên cứu)</span></label>
<div class="temporal-research" id="research" hidden><p class="temporal-research-intro">Đối chiếu theo Đẩu Quân. Đây là vị trí cung nghiên cứu, không phải bộ sao lưu đã kiểm chứng.</p>
<div class="temporal-research-grid"><div><small>HẠN THÁNG</small><strong id="lmonth"></strong><span id="lbmonth"></span></div>
<div><small>HẠN NGÀY</small><strong id="lday"></strong><span id="lbday"></span></div>
<div><small>HẠN GIỜ</small><strong id="lhour"></strong><span id="lbhour"></span></div></div>
<p class="temporal-leap-note" id="leapPolicy" hidden>Trong mô hình này, tháng nhuận giữ nguyên vị trí của tháng thường tương ứng.</p>
<p class="temporal-research-caution">Chưa tính sao lưu riêng theo tháng/ngày/giờ, không suy luận cát hung. Các phương pháp khác có thể cho vị trí khác.</p></div>
<p class="temporal-note">Lịch tháng/ngày/giờ chỉ là ngữ cảnh tra cứu, không phải phép an sao lưu theo tháng, ngày, giờ. Không suy ra biến cố tốt/xấu từ thời điểm chọn.</p></section></div></section><p class="preview-note">Đây là bản xem trước HTML độc lập được dựng từ dữ liệu Astrology Engine và lịch pháp. Chưa phải bản build Next.js/NestJS đã triển khai.</p></main><script>
const samples=${json(sampleData)};const calendars=${json(calendar)};const hours=${json(hours)};let year=2025;let sample=0;const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fillMonths(){const m=calendars[year];$('month').innerHTML=m.map(x=>'<option value="'+x.key+'">'+esc(x.displayName)+(x.partial?' (giới hạn lịch)':'')+'</option>').join('');fillDays();}
function fillDays(){const m=calendars[year].find(x=>x.key===$('month').value)??calendars[year][0];$('day').innerHTML=m.days.map(x=>'<option value="'+x.lunarDay+'">'+x.lunarDay+'</option>').join('');render();}
function render(){const annual=samples[sample].years[year];const m=calendars[year].find(x=>x.key===$('month').value)??calendars[year][0];const d=m.days.find(x=>String(x.lunarDay)===$('day').value)??m.days[0];const h=hours[Number($('hour').value)||0];
 $('summary').textContent=year+' · '+annual.canChi+' · Tuổi mụ '+annual.ageMu;
 $('annual-summary').textContent='Đại hạn: '+(annual.daiHan?annual.daiHan.palace+' (tuổi '+annual.daiHan.fromAge+'–'+annual.daiHan.toAge+')':'chưa đến chu kỳ trong bảng')+' · Tiểu hạn: '+annual.tieuHan.palace+' · Lưu Thái Tuế: '+annual.luuThaiTue.branch;
 $('lunar').textContent=d.lunarDay+'/'+m.month+(m.leap?' nhuận':'')+'/'+year;$('dayCanChi').textContent=d.dayCanChi+' · ngày Can Chi';$('solar').textContent=d.solarDate.split('-').reverse().join('/');$('yearInfo').textContent='Đối chiếu năm '+year;$('branch').textContent='Giờ '+h.branch;$('period').textContent=h.period;
 $('boundary').hidden=!h.boundaryNotice;$('boundary').textContent=h.boundaryNotice??'';
 $('research').hidden=!$('researchToggle').checked;
 if($('researchToggle').checked){
  const base=samples[sample].research[year][m.key].branchIndex;
  const bi=(v)=>(v%12+12)%12;
  const indices=[base,bi(base+d.lunarDay-1),bi(base+d.lunarDay-1+h.branchIndex)];
  [['lmonth','lbmonth'],['lday','lbday'],['lhour','lbhour']].forEach((pair,index)=>{
   const i=indices[index];$(pair[0]).textContent=samples[sample].palaces[i];$(pair[1]).textContent='Địa chi '+['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'][i];
  });
  $('leapPolicy').hidden=!m.leap;
 }
 document.querySelectorAll('[data-year]').forEach(b=>b.classList.toggle('active',Number(b.dataset.year)===year));
}
$('hour').innerHTML=hours.map(h=>'<option value="'+h.hour+'">'+String(h.hour).padStart(2,'0')+':00</option>').join('');$('hour').value='12';$('sample').addEventListener('change',e=>{sample=Number(e.target.value);render();});$('month').addEventListener('change',fillDays);$('day').addEventListener('change',render);$('hour').addEventListener('change',render);$('researchToggle').addEventListener('change',render);document.querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>{year=Number(b.dataset.year);fillMonths();}));fillMonths();
</script></body></html>`;
const dest=path.join(root,'previews/v1122-subannual-reference.html');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);console.log(dest, Buffer.byteLength(html),'bytes');
