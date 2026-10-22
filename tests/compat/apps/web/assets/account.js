'use strict';
// V7 account integration. Saving birth data is always an explicit user action.
let activeUser=null, authFlow='login';
async function apiCall(path, method='GET', payload) {
  let res;
  try { res=await fetch(path,{method,credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined}); }
  catch { throw new Error('Không kết nối được máy chủ. Hãy mở website bằng lệnh npm run dev.'); }
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Yêu cầu thất bại');
  return data;
}
function noticeAccount(message,isError=false){const n=document.getElementById('accountNotice');if(n){n.textContent=message;n.style.color=isError?'#f3a69b':'var(--gold)';}}
function openAccount(){const m=document.getElementById('accountOverlay');m.hidden=false;document.body.classList.add('modal-open');renderAccount();noticeAccount('');(document.getElementById('authEmail')||document.querySelector('.account-close'))?.focus();}
function closeAccount(){document.getElementById('accountOverlay').hidden=true;document.body.classList.remove('modal-open');}
function setAuthFlow(f){authFlow=f;renderAccount();}
function renderAccount(){
  const root=document.getElementById('accountContent');if(!root)return;
  if(activeUser){root.innerHTML=`<div class="account-current"><div class="account-avatar">天</div><p>Đã đăng nhập dưới tên</p><strong>${esc(activeUser.email)}</strong><p style="font-size:12px;line-height:1.7;margin-top:10px">Lá số chỉ được lưu khi bạn bấm <b>Lưu vào tài khoản</b>. Dữ liệu ngày giờ sinh lưu trên máy chủ của bạn, không gửi đến AI.</p><button class="btn block" onclick="closeAccount();navigate('collection')">Xem bộ sưu tập lá số →</button><button class="btn secondary block" onclick="logoutAccount()">Đăng xuất</button><button class="text-danger" onclick="deleteAccount()">Xóa tài khoản và mọi lá số</button></div>`;return;}
  const register=authFlow==='register';
  root.innerHTML=`<div class="eyebrow">THƯ PHÒNG CÁ NHÂN · V7</div><h2 class="serif" style="font-size:27px;margin:8px 0">${register?'Tạo tài khoản':'Đăng nhập'}</h2><p class="tiny-note">Lưu và truy cập lại lá số trên máy chủ riêng. Không lưu dữ liệu nếu bạn chưa đồng ý.</p><form id="authForm" onsubmit="submitAccount(event)"><div class="form-group"><label for="authEmail">Email</label><input id="authEmail" type="email" maxlength="150" autocomplete="email" required placeholder="ban@example.com" /></div><div class="form-group"><label for="authPassword">Mật khẩu (tối thiểu 10 ký tự)</label><input id="authPassword" type="password" minlength="10" maxlength="256" autocomplete="${register?'new-password':'current-password'}" required placeholder="Nhập mật khẩu" /></div><button class="btn block" type="submit">${register?'Tạo tài khoản':'Đăng nhập'} →</button></form><button class="auth-switch" onclick="setAuthFlow('${register?'login':'register'}')">${register?'Đã có tài khoản? Đăng nhập':'Chưa có tài khoản? Đăng ký'}</button>`;
}
function updateAccountButton(){const btn=document.getElementById('accountToggle');if(btn){btn.textContent=activeUser?'✓':'T';btn.title=activeUser?'Tài khoản '+activeUser.email:'Đăng nhập / Đăng ký';} }
async function initAccount(){try{const data=await apiCall('/api/auth/me');activeUser=data.user;updateAccountButton();}catch(e){console.info('Chưa có API hoặc chưa đăng nhập',e.message);} }
async function submitAccount(event){event.preventDefault();const email=document.getElementById('authEmail').value;const password=document.getElementById('authPassword').value;try{const data=await apiCall('/api/auth/'+(authFlow==='register'?'register':'login'),'POST',{email,password});activeUser=data.user;updateAccountButton();renderAccount();noticeAccount('Đăng nhập thành công.');}catch(e){noticeAccount(e.message,true);}}
function clearPersonalChart(){chartResult=null;chartGenerated=false;chartInput={name:'Người khám phá',solarDate:'2004-01-01',birthTime:'08:30',calendar:'solar',lunarYear:2003,lunarMonth:12,lunarDay:10,lunarLeap:false,gender:'Nam'};if(page==='chart'||page==='collection')render();}
async function logoutAccount(){try{await apiCall('/api/auth/logout','POST');activeUser=null;clearPersonalChart();updateAccountButton();renderAccount();noticeAccount('Đã đăng xuất.');}catch(e){noticeAccount(e.message,true);}}
async function deleteAccount(){if(!confirm('Xóa vĩnh viễn tài khoản và tất cả lá số đã lưu? Thao tác không thể hoàn tác.'))return;
  try{await apiCall('/api/auth/account','DELETE');activeUser=null;clearPersonalChart();updateAccountButton();renderAccount();noticeAccount('Tài khoản đã được xóa.');}catch(e){noticeAccount(e.message,true);}}
async function saveCurrentChart(){if(!chartResult)return alert('Hãy lập lá số trước.');if(!activeUser)return openAccount();
  if(!confirm('Lưu tên hiển thị, ngày giờ sinh và giới tính vào cơ sở dữ liệu trên máy chủ này? Dữ liệu này là thông tin cá nhân.'))return;
  const v=chartInput;const [hour,minute]=v.birthTime.split(':').map(Number);const date=v.calendar==='solar'?v.solarDate:`${String(v.lunarYear).padStart(4,'0')}-${String(v.lunarMonth).padStart(2,'0')}-${String(v.lunarDay).padStart(2,'0')}`;
  try{await apiCall('/api/charts','POST',{label:v.name,date,hour,minute,calendar:v.calendar,leap:v.lunarLeap||false,gender:v.gender});navigate('collection');}catch(e){alert('Không lưu được lá số: '+e.message);}
}
function collection(){return `${header('THƯ PHÒNG · DỮ LIỆU CÁ NHÂN','Bộ sưu tập lá số','Tất cả lá số trong tài khoản chỉ hiện với chính bạn. Bấm Mở để tính lại bằng bộ quy tắc hiện tại.')}<div class="card"><div class="section-head"><h2>Lá số đã lưu</h2><button onclick="refreshSaved()">↻ Làm mới</button></div><p class="tiny-note">Các trường ngày, giờ sinh và giới tính lưu trên máy chủ khi bạn đồng ý. Bạn có thể xóa từng lá số hoặc xóa cả tài khoản.</p><div id="savedList" role="status" aria-live="polite"></div></div>`;}
async function refreshSaved(){const root=document.getElementById('savedList');if(!root)return;
  if(!activeUser){root.innerHTML='<div class="subnotice">Bạn chưa đăng nhập. <button class="btn sm" onclick="openAccount()">Đăng nhập / Đăng ký</button></div>';return;}
  root.textContent='Đang tải danh sách…';
  try{const data=await apiCall('/api/charts');if(!data.charts.length){root.innerHTML='<div class="subnotice">Chưa có lá số nào được lưu. Vào phòng lá số để tạo và lưu.</div>';return;}
    root.innerHTML=data.charts.map(c=>`<div class="saved-entry"><div><strong>${esc(c.label)}</strong><small>${esc(c.date)} · ${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')} · ${esc(c.calendar==='solar'?'Dương lịch':'Âm lịch')} · ${esc(c.rule_set)}</small></div><div class="saved-actions"><button onclick="loadSaved('${c.id}')">Mở</button><button onclick="removeSaved('${c.id}')" aria-label="Xóa lá số">Xóa</button></div></div>`).join('');
  }catch(e){root.textContent=e.message;}}
async function loadSaved(id){try{const data=await apiCall('/api/charts/'+encodeURIComponent(id));const {chart,result}=data;
  chartResult=result;chartGenerated=true;selectedPalace=0;selectedDetailTab='meaning';chartInput={name:chart.label,calendar:chart.calendar,birthTime:String(chart.hour).padStart(2,'0')+':'+String(chart.minute).padStart(2,'0'),solarDate:`${result.solar.year}-${String(result.solar.month).padStart(2,'0')}-${String(result.solar.day).padStart(2,'0')}`,lunarDay:result.lunar.day,lunarMonth:result.lunar.month,lunarYear:result.lunar.year,lunarLeap:result.lunar.leap,gender:chart.gender};
  navigate('chart');if(data.outdated)alert('Lưu ý: Lá số này được lưu với bộ quy tắc cũ, đã được tính lại bằng phiên bản hiện hành.');
}catch(e){alert(e.message);}}
async function removeSaved(id){if(!confirm('Xóa lá số này khỏi tài khoản?'))return;try{await apiCall('/api/charts/'+encodeURIComponent(id),'DELETE');refreshSaved();}catch(e){alert(e.message);}}

document.addEventListener('keydown', e=>{if(e.key==='Escape' && !document.getElementById('accountOverlay').hidden)closeAccount();});
