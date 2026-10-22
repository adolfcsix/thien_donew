'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useAuth} from '@/components/auth-provider';
import {usePendingOperation} from '@/lib/use-pending-operation';
import {birthProfileApi,chartApi} from '@/lib/api';
import type {BirthProfile,BirthProfileDraft} from '@/features/birth-profiles/types';
import type {SavedChart} from '@thiendo/shared-types';
import styles from '@/features/study-room/study-room.module.css';

const empty:BirthProfileDraft={name:'',date:'2000-01-01',hour:null,minute:null,calendar:'solar',leap:false,gender:null,timeZone:'Asia/Ho_Chi_Minh',birthPlace:'',latitude:null,longitude:null,timeAccuracy:'unknown',notes:''};
export default function BirthProfilesPage(){const {user,loading,open}=useAuth();
 if(loading)return <div className={styles.panel}>Đang xác minh tài khoản…</div>;
 if(!user)return <div className={styles.panel}><h1>Hồ sơ sinh dùng chung</h1><p>Đăng nhập để lưu dữ liệu sinh riêng tư vào tài khoản.</p><button className={styles.primary} onClick={() => open()}>Đăng nhập</button></div>;
 return <Profiles key={user.id} userId={user.id}/>;
}
function Profiles({userId}:{userId:string}){
 const [profiles,setProfiles]=useState<BirthProfile[]>([]),[charts,setCharts]=useState<SavedChart[]>([]);
 const [draft,setDraft]=useState<BirthProfileDraft>(empty),[editing,setEditing]=useState<string|null>(null);
 const [busy,setBusy]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState(''),[loadError,setLoadError]=useState('');
 const operation=usePendingOperation(),saving=operation.pending;
 const request=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setLoadError('');
  try{const [p,c]=await Promise.all([birthProfileApi.list(controller.signal),chartApi.list(controller.signal)]);if(!controller.signal.aborted){setProfiles(p.profiles);setCharts(c.charts);return true;}return false;}
  catch(e){if(!controller.signal.aborted)setLoadError((e as Error).message);return false;}finally{if(!controller.signal.aborted)setBusy(false);}},[userId]);
 useEffect(()=>{void refresh();return()=>request.current?.abort();},[refresh]);
 function editField<K extends keyof BirthProfileDraft>(key:K,val:BirthProfileDraft[K]){setDraft(s=>({...s,[key]:val}));}
 function startEdit(p:BirthProfile){const {name,date,hour,minute,calendar,leap,gender,timeZone,birthPlace,latitude,longitude,timeAccuracy,notes}=p;setDraft({name,date,hour,minute,calendar,leap,gender,timeZone,birthPlace,latitude,longitude,timeAccuracy,notes});setEditing(p.id);setMessage('');window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 async function submit(event:FormEvent){
  event.preventDefault();if(busy)return;const controller=operation.begin();if(!controller)return;
  setMessage('');setError('');let committed=false;
  try{
    if(editing)await birthProfileApi.update(editing,draft,controller.signal);
    else {const receipt=await birthProfileApi.create(draft,controller.signal);if(!controller.signal.aborted)setEditing(receipt.id);}
    committed=true;if(controller.signal.aborted)return;
    const refreshed=await refresh();if(controller.signal.aborted)return;
    if(refreshed){setEditing(null);setDraft(empty);}
    setMessage('Đã lưu hồ sơ sinh vào tài khoản. '+(refreshed?'Không tự thay đổi các kết quả nghiên cứu đã lưu.':'Chưa tải lại được danh sách. Biểu mẫu vẫn giữ ID hồ sơ; hãy tải lại để kiểm tra trước khi tạo hồ sơ mới.'));
  }catch(reason){if(!controller.signal.aborted)setError((committed?'Hồ sơ đã lưu; chưa đồng bộ được dữ liệu. ':'')+(reason as Error).message+' Hãy tải lại danh sách để kiểm tra trước khi gửi lại.');}
  finally{operation.finish(controller);}
 }
 async function fromChart(chart:SavedChart){
  const controller=operation.begin();if(!controller)return;
  if(!window.confirm(`Tạo hồ sơ sinh mới từ lá số “${chart.label}”? Dữ liệu lá số cũ được giữ nguyên.`)){operation.finish(controller);return;}
  const data={...empty,name:chart.label,date:chart.date,hour:chart.hour,minute:chart.minute,calendar:chart.calendar,leap:chart.leap,gender:chart.gender,timeAccuracy:'estimated' as const};
  setMessage('');setError('');
  try{const receipt=await birthProfileApi.create(data,controller.signal);if(controller.signal.aborted)return;
    setEditing(receipt.id);setDraft(data);const refreshed=await refresh();if(controller.signal.aborted)return;
    setMessage('Đã tạo hồ sơ sinh mới từ đầu vào lá số. Vui lòng kiểm tra lại giờ, múi giờ và nơi sinh.'+(refreshed?'':' Danh sách chưa đồng bộ; biểu mẫu đã giữ ID hồ sơ vừa tạo.'));
  }catch(reason){if(!controller.signal.aborted)setError((reason as Error).message);}finally{operation.finish(controller);}
 }
 async function remove(p:BirthProfile){
  const controller=operation.begin();if(!controller)return;
  if(!window.confirm(`Xóa hồ sơ “${p.name}”? Liên kết Thư phòng được tháo, bản nghiên cứu vẫn giữ nguyên.`)){operation.finish(controller);return;}
  setMessage('');setError('');
  try{await birthProfileApi.remove(p.id,controller.signal);if(controller.signal.aborted)return;
    if(editing===p.id){setEditing(null);setDraft(empty);}const refreshed=await refresh();
    if(!controller.signal.aborted)setMessage('Đã xóa hồ sơ sinh. Bản nghiên cứu và lá số cũ vẫn được giữ lại.'+(refreshed?'':' Danh sách chưa đồng bộ; hãy tải lại để kiểm tra.'));
  }catch(reason){if(!controller.signal.aborted)setError((reason as Error).message);}finally{operation.finish(controller);}
 }
 const pair=(value:string):number|null=>value.trim()===''?null:Number(value);
 return <div className={styles.panel}>
  <header className={styles.hero}><span className={styles.eyebrow}>THIÊN ĐỒ / HỒ SƠ SINH</span><h1>Hồ sơ sinh</h1><p>Tạo một bộ dữ liệu sinh gốc và liên kết vào nhiều lần nghiên cứu. Thời điểm, loại lịch và múi giờ được giữ nguyên; mỗi môn vẫn áp dụng quy tắc lịch pháp riêng.</p><p><Link href="/study" className={styles.link}>← Thư phòng</Link> · <Link href="/study/compare" className={styles.link}>Đối chiếu kết quả ↗</Link></p></header>
  <section className={styles.panel}><h2>{editing?'Chỉnh sửa hồ sơ':'Thêm hồ sơ sinh'}</h2><form className={styles.newForm} onSubmit={event=>void submit(event)}>
   <div className={styles.formGrid}>
    <label className={styles.field}><span>Tên hồ sơ</span><input required maxLength={70} value={draft.name} disabled={saving} onChange={e=>editField('name',e.target.value)} placeholder="Ví dụ: Hồ sơ cá nhân"/></label>
    <label className={styles.field}><span>Ngày sinh theo loại lịch đã chọn</span><input required type="date" min="1900-01-01" max="2100-12-31" value={draft.date} disabled={saving} onChange={e=>editField('date',e.target.value)}/></label>
    <label className={styles.field}><span>Loại lịch</span><select value={draft.calendar} disabled={saving} onChange={e=>{editField('calendar',e.target.value as BirthProfileDraft['calendar']);if(e.target.value==='solar')editField('leap',false);}}><option value="solar">Dương lịch</option><option value="lunar">Âm lịch (chưa tự đổi)</option></select></label>
    <label className={styles.field}><span>Giới tính theo quy ước lá số (không bắt buộc)</span><select value={draft.gender??''} disabled={saving} onChange={e=>editField('gender',e.target.value?e.target.value as 'Nam'|'Nữ':null)}><option value="">Không cung cấp</option><option>Nam</option><option>Nữ</option></select></label>
    <label className={styles.field}><span>Độ chắc chắn giờ sinh</span><select value={draft.timeAccuracy} disabled={saving} onChange={e=>{const v=e.target.value as BirthProfileDraft['timeAccuracy'];setDraft(s=>({...s,timeAccuracy:v,hour:v==='unknown'?null:s.hour??0,minute:v==='unknown'?null:s.minute??0}));}}><option value="unknown">Chưa rõ giờ sinh</option><option value="estimated">Giờ ước lượng</option><option value="exact">Giờ có xác nhận</option></select></label>
    <label className={styles.field}><span>Múi giờ IANA (không tự suy từ nơi sinh)</span><input value={draft.timeZone} maxLength={64} disabled={saving} onChange={e=>editField('timeZone',e.target.value)} placeholder="Asia/Ho_Chi_Minh"/></label>
    {draft.timeAccuracy!=='unknown'&&<><label className={styles.field}><span>Giờ (0–23)</span><input type="number" required min={0} max={23} disabled={saving} value={draft.hour??''} onChange={e=>editField('hour',pair(e.target.value))}/></label><label className={styles.field}><span>Phút (0–59)</span><input type="number" required min={0} max={59} disabled={saving} value={draft.minute??''} onChange={e=>editField('minute',pair(e.target.value))}/></label></>}
    {draft.calendar==='lunar'&&<label className={styles.field}><span>Tháng nhuận</span><select value={draft.leap?'yes':'no'} disabled={saving} onChange={e=>editField('leap',e.target.value==='yes')}><option value="no">Không</option><option value="yes">Có</option></select></label>}
    <label className={styles.field}><span>Nơi sinh (tùy chọn)</span><input maxLength={120} disabled={saving} value={draft.birthPlace} onChange={e=>editField('birthPlace',e.target.value)}/></label>
    <label className={styles.field}><span>Vĩ độ (tùy chọn; nhập cùng kinh độ)</span><input type="number" step="any" min={-90} max={90} disabled={saving} value={draft.latitude??''} onChange={e=>editField('latitude',pair(e.target.value))}/></label>
    <label className={styles.field}><span>Kinh độ</span><input type="number" step="any" min={-180} max={180} disabled={saving} value={draft.longitude??''} onChange={e=>editField('longitude',pair(e.target.value))}/></label>
   </div>
   <label className={styles.field}><span>Ghi chú riêng tư (tối đa 1.000 ký tự)</span><textarea rows={3} maxLength={1000} disabled={saving} value={draft.notes} onChange={e=>editField('notes',e.target.value)}/></label>
   <div className={styles.actions}><button className={styles.primary} type="submit" disabled={saving||busy}>{saving?'Đang lưu…':editing?'Cập nhật hồ sơ':'Tạo hồ sơ'}</button>{editing&&<button className={styles.secondary} type="button" disabled={saving} onClick={()=>{setEditing(null);setDraft(empty);}}>Hủy sửa</button>}</div>
  </form></section>
  {error&&<p role="alert" className={styles.status}>{error}</p>}{message&&<p role="status" className={styles.status}>{message}</p>}
  <section aria-label="Danh sách hồ sơ sinh"><h2>Hồ sơ đã lưu ({profiles.length}/100)</h2><button type="button" disabled={busy||saving} onClick={()=>{setMessage('');setError('');void refresh();}}>Tải lại hồ sơ sinh</button>{busy?<p role="status">Đang tải…</p>:loadError?<p role="alert">{loadError}</p>:!profiles.length?<p>Chưa có hồ sơ sinh. Tạo mới hoặc chuyển từ một lá số Tử Vi đã lưu.</p>:<div className={styles.cards}>{profiles.map(p=><article className={styles.card} key={p.id} id={`profile-${p.id}`}><span className={styles.eyebrow}>{p.timeAccuracy==='unknown'?'Giờ chưa rõ':p.timeAccuracy==='estimated'?'Giờ ước lượng':'Giờ xác nhận'}</span><h2>{p.name}</h2><p>{p.date} · {p.calendar==='solar'?'Dương':'Âm'}{p.leap?' (nhuận)':''} · {p.hour===null?'Không có giờ':`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`} · {p.timeZone}</p>{p.birthPlace&&<p className={styles.muted}>{p.birthPlace}</p>}<div className={styles.actions}>{p.hour!==null&&p.gender&&<Link href={`/chart?profile=${encodeURIComponent(p.id)}`}>Dùng lập Tử Vi ↗</Link>}{p.calendar==='solar'&&<Link href={`/numerology?profile=${encodeURIComponent(p.id)}`}>Dùng Thần số học ↗</Link>}<Link href={`/study?profile=${encodeURIComponent(p.id)}`}>Nghiên cứu liên quan ↗</Link><button disabled={saving} onClick={()=>startEdit(p)}>Chỉnh sửa</button><button disabled={saving} onClick={()=>void remove(p)}>Xóa</button></div></article>)}</div>}</section>
  {!!charts.length&&<section className={styles.panel}><h2>Đưa lá số cũ vào hồ sơ chung</h2><p>Thao tác chủ động; không tự chuyển dữ liệu hay tạo liên kết. Những lá số đã lưu vẫn giữ nguyên.</p><div className={styles.cards}>{charts.map(c=><article key={c.id} className={styles.card}><strong>{c.label}</strong><small>{c.date} · {c.hour}:{String(c.minute).padStart(2,'0')}</small><button className={styles.secondary} disabled={saving} onClick={()=>void fromChart(c)}>Tạo hồ sơ từ lá số này</button></article>)}</div></section>}
  <p className={styles.muted}>Hồ sơ là dữ liệu cá nhân, chỉ truy xuất trong tài khoản đang đăng nhập. Không tự chuyển âm–dương lịch, điều chỉnh chân thái dương hoặc sửa lại những kết quả đã lưu. Một phép tính yêu cầu giờ sinh chính xác sẽ không được mở từ hồ sơ thiếu giờ.</p>
 </div>;
}
