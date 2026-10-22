'use client';
import {useState,type FormEvent} from 'react';
import {api} from '@/lib/api';
import {useAdminTask} from '@/features/admin/use-admin-task';
import {useAdminResource} from '@/features/admin/use-admin-resource';
import {SpecialtyBadge,specialtyBadges} from './specialty-badge';
import css from '../../app/tinh-canh/tinh-canh.module.css';
type Grant={id:string;userId:string;actorId:string|null;badgeId:string;reason:string;grantedAt:string;revokedAt:string|null;revocationReason:string|null};
const loadGrants=(signal:AbortSignal)=>api<{grants:Grant[]}>('/api/tinh-canh/admin/specialty-badges',{signal});
export function SpecialtyBadgeAdministration({userId,setUserId,canWrite}:{userId:string;setUserId:(value:string)=>void;canWrite:boolean}){
 const [badgeId,setBadgeId]=useState(specialtyBadges[0].id),[reason,setReason]=useState(''),[notice,setNotice]=useState('');
 const resource=useAdminResource(loadGrants),grants=resource.data?.grants??[];
 const {pending,error,run}=useAdminTask();
 const locked=pending||resource.loading||!!resource.error;
 async function grant(e:FormEvent){e.preventDefault();if(!canWrite||locked)return;await run(async signal=>{
  if(!window.confirm('Trao danh hiệu chuyên môn cho thành viên này? Quyết định được ghi vào nhật ký.'))return;
  setNotice('');await api('/api/tinh-canh/admin/specialty-badges',{method:'POST',signal,body:{userId,badgeId,reason}});
  if(signal.aborted)return;
  setReason('');setNotice('Đã cấp danh hiệu chuyên môn; quyền tài khoản và Tinh Văn không thay đổi.');
  await resource.reload();
 });}
 async function revoke(grantId:string){if(!canWrite||locked)return;const message=window.prompt('Lý do thu hồi (12–600 ký tự):');if(message===null)return;await run(async signal=>{
  setNotice('');await api('/api/tinh-canh/admin/specialty-badges/'+encodeURIComponent(grantId)+'/revoke',{method:'POST',signal,body:{reason:message}});
  if(signal.aborted)return;
  setNotice('Đã thu hồi danh hiệu; lịch sử được bảo toàn.');
  await resource.reload();
 });}
 return <section className={css.panel} aria-label="Danh hiệu chuyên môn đặc biệt">
  <h2>Danh hiệu chuyên môn đặc biệt</h2>
  <p className={css.notice}>Tách biệt hoàn toàn với 18 Tinh Cảnh, Pro, Chuyên gia và vai trò quản trị. Cấp hoặc thu hồi cần quyền chỉnh sửa Tinh Cảnh, mã Authenticator mới và lý do kiểm toán. Không thể tự cấp.</p>
  <div className={css.grid}>{specialtyBadges.map(entry=><div className={css.card} key={entry.id}><SpecialtyBadge badgeId={entry.id} size={66} showName/><p>{entry.description}</p><small>{entry.subject}</small></div>)}</div>
  <form onSubmit={e=>void grant(e)}><fieldset disabled={locked||!canWrite} style={{border:0,padding:0,minWidth:0}}>
   <div className={css.filters}><label>UUID thành viên<input required value={userId} onChange={e=>setUserId(e.target.value)} pattern="[0-9a-fA-F-]{36}"/></label>
   <label>Chọn danh hiệu<select value={badgeId} onChange={e=>setBadgeId(e.target.value)}>{specialtyBadges.map(entry=><option key={entry.id} value={entry.id}>{entry.name} · {entry.subject}</option>)}</select></label>
   <label>Lý do công nhận (12–600 ký tự)<textarea required minLength={12} maxLength={600} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label></div>
   <button className={css.button} disabled={locked||!canWrite||reason.trim().length<12}>Trao huy hiệu chuyên môn</button>
  </fieldset></form>
  {notice&&<p role="status">{notice}</p>}{(error||resource.error)&&<p role="alert" className={css.error}>{error||resource.error}</p>}
  <h3>100 quyết định gần nhất</h3>{resource.loading&&<p role="status">Đang tải danh hiệu…</p>}{resource.error&&<button type="button" disabled={resource.loading||pending} onClick={()=>void resource.reload()}>Tải lại danh hiệu</button>}{resource.data&&!resource.loading&&!resource.error&&grants.length===0&&<p>Chưa có quyết định.</p>}
  {grants.map(g=><article key={g.id} className={css.leader}><SpecialtyBadge badgeId={g.badgeId} size={48}/><div><strong>{specialtyBadges.find(x=>x.id===g.badgeId)?.name||'Danh hiệu không xác định'} · #{g.id}</strong><p className={css.meta}>Thành viên: {g.userId} · {new Date(g.grantedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</p><p className={css.notice}>{g.reason}</p>{g.revokedAt&&<p className={css.meta}>Đã thu hồi: {g.revocationReason}</p>}</div>{!g.revokedAt&&<button type="button" className={css.button} disabled={locked||!canWrite} onClick={()=>void revoke(g.id)}>Thu hồi</button>}</article>)}
 </section>;
}
