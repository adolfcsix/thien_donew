'use client';
import Link from 'next/link';
import {useAdminSession} from '@/features/membership/admin-session';
import {TinhCanhMedal} from '@/components/tinh-canh-medal';
import {SpecialtyBadgeAdministration} from '@/features/tinh-canh/specialty-badge-administration';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import {useAdminTask} from '@/features/admin/use-admin-task';
import css from '../../tinh-canh/tinh-canh.module.css';
type Rank={level:number;name:string;stageName:string};
type Grant={id:string;userId:string;actorId:string|null;level:number;reason:string;createdAt:string;reversalReason:string|null;revokedAt:string|null};
type Event={id:number;userId:string;kind:string;direction:string;subject:string;points:number;createdAt:string;reversalReason:string|null};
const kinds=[['learning-reviewed','Học tập đã thẩm định'],['article-published','Bài Văn Khố đã xuất bản'],['research-reviewed','Nghiên cứu đã phản biện'],['exploration-reviewed','Khám phá có minh chứng'],['guide-verified','Giúp người mới'],['discussion-verified','Giải đáp đã xác thực']];
export default function TinhCanhAdmin(){
 const {capabilities}=useAdminSession();const canWrite=capabilities.includes('ranks.write'),canLookup=capabilities.includes('members.read');
 useEffect(()=>{const member=new URLSearchParams(window.location.search).get('member');if(member&&/^[0-9a-f-]{36}$/i.test(member)){setUserId(member);setRankTarget(member);}},[]);
 const [userId,setUserId]=useState(''),[sourceId,setSourceId]=useState(''),[kind,setKind]=useState(kinds[0][0]);
 const [events,setEvents]=useState<Event[]>([]),[grants,setGrants]=useState<Grant[]>([]),[ranks,setRanks]=useState<Rank[]>([]);
 const [rankTarget,setRankTarget]=useState(''),[rankLevel,setRankLevel]=useState(1),[rankReason,setRankReason]=useState('');
 const [lookup,setLookup]=useState(''),[matches,setMatches]=useState<{id:string;email:string;displayName:string|null}[]>([]);
 const [error,setError]=useState(''),[info,setInfo]=useState('');
 const {pending:busy,error:actionError,run}=useAdminTask();
 async function load(signal?:AbortSignal){const [points,rankDecisions]=await Promise.all([
  api<{events:Event[]}>('/api/tinh-canh/admin/audit',{signal,timeoutMs:15000}),
  api<{grants:Grant[]}>('/api/tinh-canh/admin/rank-grants',{signal,timeoutMs:15000})
 ]);if(!signal?.aborted){setEvents(points.events);setGrants(rankDecisions.grants)}}
 useEffect(()=>{const controller=new AbortController(),signal=controller.signal;load(signal).catch(e=>{if(!signal.aborted)setError((e as Error).message)});api<{ranks:Rank[]}>('/api/tinh-canh/rules',{signal,timeoutMs:15000}).then(x=>{if(!signal.aborted)setRanks(x.ranks)}).catch(e=>{if(!signal.aborted)setError((e as Error).message)});return()=>controller.abort()},[]);
 async function execute(work:(signal:AbortSignal)=>Promise<void>){await run(async signal=>{setError('');setInfo('');await work(signal)})}
 async function award(e:React.FormEvent){e.preventDefault();if(!canWrite)return;await execute(async signal=>{
  if(!window.confirm('Xác nhận trao Tinh Văn cho đóng góp đã thẩm định?'))return;
  const r=await api<{points:number}>('/api/tinh-canh/admin/awards',{method:'POST',body:{userId,sourceId,kind},signal,timeoutMs:20000});if(signal.aborted)return;
  setInfo(`Đã xác minh và ghi ${r.points} Tinh Văn`);setSourceId('');await load(signal);
 })}
 async function findUser(){if(!canLookup)return;await execute(async signal=>{
  const result=await api<{users:{id:string;email:string;displayName:string|null}[]}>('/api/admin/users?q='+encodeURIComponent(lookup),{signal});if(!signal.aborted)setMatches(result.users)
 })}
 async function grantRank(e:React.FormEvent){e.preventDefault();if(!canWrite)return;await execute(async signal=>{
  if(!window.confirm(`Cấp cảnh giới ${rankLevel} cho tài khoản đã chọn? Quyết định sẽ được ghi vào lịch sử quản trị.`))return;
  const decision=await api<{rank:Rank}>('/api/tinh-canh/admin/rank-grants',{method:'POST',body:{userId:rankTarget,level:rankLevel,reason:rankReason},signal,timeoutMs:20000});if(signal.aborted)return;
  setInfo(`Đã cấp cảnh giới ${decision.rank.name}; không cộng thêm điểm Tinh Văn.`);setRankReason('');await load(signal);
 })}
 async function revokeRank(id:string){if(!canWrite)return;await execute(async signal=>{
  const reason=window.prompt('Lý do thu hồi cảnh giới (ít nhất 12 ký tự):');if(reason===null)return;
  await api('/api/tinh-canh/admin/rank-grants/'+id+'/revoke',{method:'POST',body:{reason},signal,timeoutMs:20000});if(signal.aborted)return;
  setInfo('Đã thu hồi cảnh giới được cấp; cấp tự động theo Tinh Văn được khôi phục.');await load(signal);
 })}
 async function revoke(id:number){if(!canWrite)return;await execute(async signal=>{
  const reason=window.prompt('Lý do thu hồi (ít nhất 12 ký tự):');if(reason===null)return;
  await api(`/api/tinh-canh/admin/awards/${id}/revoke`,{method:'POST',body:{reason},signal,timeoutMs:20000});if(signal.aborted)return;
  setInfo('Đã thu hồi; lịch sử được giữ lại.');await load(signal);
 })}
 return <main className={css.page}><header className={css.hero}><small className={css.eyebrow}>ADMIN · TINH VĂN</small><h1>Quản trị Tinh Văn</h1><p>Tất cả thao tác yêu cầu quyền Admin và MFA mới xác minh. Điểm do hệ thống định mức, không nhập số điểm tùy ý.</p><Link href="/tinh-canh" className={css.link}>← Xem Tinh Đồ Danh Bảng</Link></header>
 {!canWrite&&<p role="status">Bạn có quyền xem lịch sử và huy hiệu. Cần quyền chỉnh sửa Tinh Văn để cấp hoặc thu hồi.</p>}{!canLookup&&<p>Tra cứu email cần quyền xem thành viên; bạn vẫn có thể dùng UUID thành viên đã xác minh.</p>}
 <section className={css.panel}><h2>Duyệt minh chứng</h2><form onSubmit={e=>void award(e)}><fieldset disabled={busy||!canWrite} style={{border:0,padding:0,minWidth:0}}><div className={css.filters}><label>ID người nhận<input required value={userId} onChange={e=>setUserId(e.target.value)} pattern="[0-9a-fA-F-]{36}"/></label><label>ID minh chứng<input required value={sourceId} onChange={e=>setSourceId(e.target.value)} pattern="[0-9a-fA-F-]{36}"/></label><label>Loại minh chứng<select value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div><button type="submit" disabled={busy||!canWrite} className={css.button}>Xác minh và cấp điểm</button></fieldset></form><p className={css.notice}>Chỉ chấp nhận minh chứng thực tế: bài xuất bản có phê duyệt độc lập, nghiên cứu, ghi chép học tập, hoặc bình luận công khai được đánh dấu hữu ích bởi ít nhất hai người khác.</p></section>
 <section className={css.panel} aria-label="Cấp cảnh giới thủ công"><h2>Admin cấp trực tiếp 18 cảnh giới</h2><p className={css.notice}>Quản trị viên được phân công quyền chỉnh sửa Tinh Văn có thể cấp hoặc thay đổi huy chương cho thành viên bất kỳ (trừ tự cấp cho chính mình). Hành động yêu cầu xác minh MFA và lý do. Không cộng điểm Tinh Văn, không xóa thành tựu học tập. Danh Bảng vẫn xếp theo điểm thực.</p>
 <div className={css.filters}><label>Tìm thành viên theo email<input value={lookup} onChange={e=>setLookup(e.target.value)} placeholder="Nhập một phần email của thành viên" maxLength={100}/></label><button type="button" className={css.button} disabled={busy||!canLookup||!lookup.trim()} onClick={()=>void findUser()}>Tìm thành viên</button></div>
 {matches.length>0&&<div className={css.filters} role="group" aria-label="Kết quả tìm thành viên"><label>Chọn thành viên<select value="" onChange={e=>{if(e.target.value)setRankTarget(e.target.value)}}><option value="">Chọn email trong kết quả…</option>{matches.map(m=><option key={m.id} value={m.id}>{m.displayName||'Thành viên'} · {m.email}</option>)}</select></label></div>}
 <div className={css.rankPreview} aria-label="Xem trước huy hiệu sẽ cấp"><TinhCanhMedal level={rankLevel} size={136}/><p>Xem trước · Cảnh {rankLevel} · {ranks[rankLevel-1]?.name||'Đang tải tên cảnh giới'}. Chỉ cấp sau khi gửi biểu mẫu và được máy chủ xác nhận.</p></div><form onSubmit={e=>void grantRank(e)}><fieldset disabled={busy||!canWrite} style={{border:0,padding:0,minWidth:0}}><div className={css.filters}>
 <label>UUID thành viên<input required value={rankTarget} onChange={e=>setRankTarget(e.target.value)} pattern="[0-9a-fA-F-]{36}"/></label>
 <label>Chọn cảnh giới<select aria-label="Chọn cảnh giới" value={rankLevel} onChange={e=>setRankLevel(Number(e.target.value))}>{(ranks.length?ranks:Array.from({length:18},(_,i)=>({level:i+1,name:'Cảnh '+(i+1),stageName:''}))).map(x=><option key={x.level} value={x.level}>{x.level}. {x.name}</option>)}</select></label>
 <label>Lý do cấp (12–600 ký tự)<textarea minLength={12} maxLength={600} required value={rankReason} onChange={e=>setRankReason(e.target.value)} rows={3}/></label></div>
 <button className={css.button} type="submit" disabled={busy||!canWrite}>Cấp / thay đổi cảnh giới</button></fieldset></form>
 <h3>100 quyết định cấp gần nhất</h3>{grants.map(g=><article key={g.id} className={css.leader}><div><strong>#{g.id} · Cảnh {g.level} · {ranks[g.level-1]?.name||'Cảnh giới'}</strong><p className={css.meta}>Thành viên: {g.userId} · Admin: {g.actorId||'Đã xóa tài khoản'} · {new Date(g.createdAt).toLocaleString('vi-VN')}</p><p className={css.notice}>{g.reason}</p>{g.revokedAt&&<p className={css.meta}>Đã thu hồi: {g.reversalReason}</p>}</div>{!g.revokedAt&&<button type="button" disabled={busy||!canWrite} className={css.button} onClick={()=>void revokeRank(g.id)}>Thu hồi</button>}</article>)}
 </section>
 <SpecialtyBadgeAdministration userId={rankTarget} setUserId={setRankTarget} canWrite={canWrite}/>
 {info&&<p role="status">{info}</p>}{(error||actionError)&&<p role="alert" className={css.error}>{error||actionError}</p>}
 <section className={css.panel}><h2>Nhật ký xét điểm</h2>{events.map(v=><article key={v.id} className={css.leader}><div><strong>#{v.id} · {v.kind}</strong><p className={css.meta}>{v.userId} · {v.points} điểm · {v.subject}</p>{v.reversalReason&&<p>Đã thu hồi: {v.reversalReason}</p>}</div>{!v.reversalReason&&<button disabled={busy||!canWrite} className={css.button} onClick={()=>void revoke(v.id)}>Thu hồi</button>}</article>)}</section></main>;
}
