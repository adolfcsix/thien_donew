'use client';
import Link from 'next/link';
import {useState} from 'react';
import {api} from '@/lib/api';
import {useAdminSession} from '@/features/membership/admin-session';
import {useAdminTask} from '@/features/admin/use-admin-task';
import {MemberActions} from '@/features/community-hub/member-actions';
import {useConsoleData,Feedback,date} from './shared';
import css from './console.module.css';

type Grant={id:string;startsAt:string;expiresAt:string|null;revokedAt:string|null;orderId:string|null;active:boolean};
type Dossier={
 member:{id:string;email:string;username:string|null;displayName:string|null;role:string|null;blocked:boolean;emailVerified:boolean;activeSessions:number;createdAt:string};
 expert:{specialty:string;grantedAt:string;revokedAt:string|null}|null;
 pro:{hasLifetime?:boolean;activeGrants:number;expiresAt:string|null;grants:Grant[]}|null;
 rankDecisions:{id:string;level:number;reason:string;createdAt:string;revokedAt:string|null}[]|null;
 audit:{id:string;action:string;createdAt:string}[]|null;
 restricted:string[];
};
export function MemberDossier({id}:{id:string}){
 const {access,capabilities}=useAdminSession(),detail=useConsoleData<Dossier>('/api/admin/console/members/'+id),task=useAdminTask(),[reason,setReason]=useState('');
 const data=detail.data;
 return <section className={css.dossier} aria-label="Hồ sơ vận hành thành viên">
  <div className={css.actions}><h3>Hồ sơ vận hành</h3><button type="button" disabled={detail.loading||task.pending} onClick={detail.reload}>Tải lại hồ sơ vận hành</button><Link className={css.button} href={'/forum/members/'+id}>Hồ sơ công khai ↗</Link></div>
  <Feedback error={detail.error||task.error} notice={task.notice}/>
  {detail.loading&&<p role="status">Đang đọc hồ sơ và quyền sử dụng…</p>}
  {data&&<>
   <dl className={css.dossierFacts}><div><dt>Tài khoản</dt><dd>{data.member.displayName||data.member.username||'Chưa đặt tên'}</dd></div><div><dt>Trạng thái</dt><dd>{data.member.blocked?'Đang khóa':'Hoạt động'} · {data.member.activeSessions} phiên</dd></div><div><dt>Email</dt><dd>{data.member.emailVerified?'Đã xác minh':'Chưa xác minh'}</dd></div><div><dt>Ngày tham gia</dt><dd>{date(data.member.createdAt)}</dd></div></dl>
   <p>Chuyên gia: {data.expert&&!data.expert.revokedAt?data.expert.specialty+' · cấp ngày '+date(data.expert.grantedAt):'Chưa có danh hiệu đang hiệu lực'}.</p>
   {data.pro?<section aria-label="Quyền Pro của thành viên"><h3>Quyền Pro hiện tại</h3><p>{data.pro.activeGrants>0?`${data.pro.activeGrants} quyền đang hiệu lực · ${data.pro.hasLifetime?'Vĩnh viễn · đến khi thu hồi':'hạn cuối '+date(data.pro.expiresAt!)}`:'Không có quyền Pro đang hiệu lực.'}</p><p>20 quyền gần nhất; quyền đã thu hồi hoặc hết hạn vẫn giữ trong lịch sử.</p>
    {capabilities.includes('finance.write')&&<label>Lý do thu hồi quyền Pro<textarea minLength={8} maxLength={500} rows={2} value={reason} disabled={task.pending} onChange={e=>setReason(e.target.value)}/></label>}
    {data.pro.grants.map(g=><article className={css.dossierEntry} key={g.id}><strong>{g.orderId?'Quyền từ thanh toán':'Quyền hỗ trợ / tặng'}</strong><p>{date(g.startsAt)} → {g.expiresAt?date(g.expiresAt):'Vĩnh viễn · đến khi thu hồi'}</p><span className={css.pill}>{g.revokedAt?'Đã thu hồi':g.active?'Đang hiệu lực':new Date(g.startsAt).getTime()>Date.now()?'Chưa tới hạn bắt đầu':'Đã hết hạn'}</span>{capabilities.includes('finance.write')&&!g.revokedAt&&(!g.expiresAt||new Date(g.expiresAt).getTime()>Date.now())&&<button type="button" disabled={task.pending||reason.trim().length<8} onClick={()=>void task.run(async signal=>{await api('/api/admin/entitlements/'+g.id+'/revoke',{method:'PATCH',signal,body:{reason}});setReason('');detail.reload();return 'Đã thu hồi quyền Pro này và ghi nhật ký.';})}>Thu hồi quyền Pro này</button>}</article>)}
   </section>:<p>Chưa được cấp quyền xem tài chính/Pro của thành viên.</p>}
   {data.rankDecisions&&<section aria-label="Lịch sử cấp cảnh giới thành viên"><h3>10 quyết định cấp cảnh giới gần nhất</h3>{!data.rankDecisions.length&&<p>Chưa có quyết định cấp thủ công. Cấp nghiên cứu được tính theo Tinh Văn hiện có.</p>}{data.rankDecisions.map(g=><article key={g.id} className={css.dossierEntry}><strong>Cảnh {g.level} · {g.revokedAt?'Đã thu hồi':'Đang hiệu lực'}</strong><p>{date(g.createdAt)} · {g.reason}</p></article>)}<Link className={css.button} href={'/admin/tinh-canh?member='+id}>{capabilities.includes('ranks.write')?'Cấp / thu hồi cảnh giới':'Xem lịch sử Tinh Văn'} ↗</Link></section>}
   {data.audit&&<section aria-label="Nhật ký tác động đến thành viên"><h3>10 thao tác quản trị gần nhất với tài khoản</h3>{!data.audit.length&&<p>Chưa có thao tác quản trị trong phạm vi này.</p>}{data.audit.map(a=><p key={a.id}>{date(a.createdAt)} · {a.action}</p>)}<Link href="/admin/audit">Tra cứu nhật ký đầy đủ ↗</Link></section>}
  </>}
  <MemberActions id={id} onChanged={detail.reload}/>
 </section>;
}
