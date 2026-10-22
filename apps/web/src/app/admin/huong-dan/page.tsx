'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAdminSession} from '@/features/membership/admin-session';
import {useAdminTask} from '@/features/admin/use-admin-task';
import {useAdminResource} from '@/features/admin/use-admin-resource';
import {api} from '@/lib/api';
import VanKhoMarkdown from '@/app/van-kho/van-kho-markdown';
import {entries,pathFor,type PortalKind} from '@/features/portal/portal-content';
import styles from '@/features/portal/portal.module.css';
type RecordItem={kind:PortalKind;slug:string;title:string;summary:string;body:string;toolHref:string;relatedHref:string;revision:number;workflow:string;publishedRevision:number|null};
const seeded=entries.map(e=>({kind:e.kind,slug:e.slug,title:e.title,summary:e.summary,body:e.body,toolHref:e.tool,relatedHref:e.related,revision:1,workflow:'published',publishedRevision:1})) as RecordItem[];
async function loadRecords(signal:AbortSignal){const data=await api<{documents:RecordItem[]}>('/api/portal/admin/documents',{signal,timeoutMs:15000});return data.documents;}
export default function AdminGuides(){
 const {capabilities}=useAdminSession();const canWrite=capabilities.includes('portal.write');
 const resource=useAdminResource(loadRecords),task=useAdminTask(),busy=task.pending;
 const records=resource.data||[],locked=busy||resource.loading||!!resource.error;
 const [selected,setSelected]=useState(0),[form,setForm]=useState<RecordItem>(seeded[0]),[history,setHistory]=useState<{version:number;title:string;createdAt:string}[]>([]),[preview,setPreview]=useState(false);
 useEffect(()=>{if(!resource.data)return;const seed=seeded[selected];setForm(resource.data.find(r=>r.kind===seed.kind&&r.slug===seed.slug)||seed);},[resource.data,selected]);
 function select(index:number){if(locked||task.isPending())return;setSelected(index);setPreview(false);setHistory([]);task.setNotice('');task.setError('');}
 async function save(){if(!canWrite||locked)return;await task.run(async signal=>{const raw=records.find(r=>r.kind===form.kind&&r.slug===form.slug);const saved=await api<{revision:number;workflow:string}>(`/api/portal/admin/${form.kind}/${form.slug}`,{method:'PUT',body:{title:form.title,summary:form.summary,body:form.body,toolHref:form.toolHref,relatedHref:form.relatedHref,expectedRevision:raw?.revision??null},signal,timeoutMs:20000});if(signal.aborted)return;const ok=await resource.reload();return 'Đã lưu bản nháp v'+saved.revision+'.'+(ok?' Bản công khai chỉ thay đổi sau khi được duyệt và xuất bản.':' Chưa tải lại được dữ liệu. Hãy tải lại trước khi thao tác tiếp.');});}
 async function action(name:'submit'|'approve'|'publish'){if(!canWrite||locked)return;await task.run(async signal=>{await api(`/api/portal/admin/${form.kind}/${form.slug}/${name}`,{method:'POST',body:{},signal,timeoutMs:20000});if(signal.aborted)return;const ok=await resource.reload();return 'Đã ghi nhận thao tác và nhật ký.'+(ok?'':' Chưa tải lại được dữ liệu. Hãy tải lại trước khi thao tác tiếp.');});}
 async function loadHistory(){if(locked)return;await task.run(async signal=>{const r=await api<{revisions:{version:number;title:string;createdAt:string}[]}>(`/api/portal/admin/${form.kind}/${form.slug}/history`,{signal,timeoutMs:15000});if(!signal.aborted)setHistory(r.revisions);});}
 return <div className={styles.root}><header className={styles.hero}><span className={styles.eyebrow}>ADMIN · HƯỚNG DẪN &amp; CHÍNH SÁCH</span><h1>Biên tập trung tâm hướng dẫn</h1><p>Quản lý 15 chuyên mục và 8 chính sách, với kiểm soát phiên bản và phê duyệt độc lập. API kiểm tra Admin MFA; người tạo/sửa bài không được tự phê duyệt. Chính sách vẫn cần rà soát pháp lý ngoài hệ thống.</p><Link href="/admin">← Bàn điều hành</Link></header>
  {resource.loading&&<p role="status">Đang tải nội dung quản lý…</p>}{(resource.error||task.error)&&<p role="alert" className={styles.status}>{resource.error||task.error}</p>}{task.notice&&<p role="status" className={styles.status}>{task.notice}</p>}{resource.error&&<button type="button" disabled={busy||resource.loading} onClick={()=>void resource.reload()}>Tải lại nội dung quản lý</button>}{!canWrite&&<p role="status">Bạn có quyền xem nội dung, bản xem trước và lịch sử. Quyền biên tập do chủ hệ thống phân công.</p>}
  <div className={styles.editIndex} role="group" aria-label="Chọn nội dung quản lý">{seeded.map((entry,index)=><button type="button" key={entry.kind+'-'+entry.slug} disabled={locked} aria-pressed={selected===index} onClick={()=>select(index)}>{index+1}. {entry.title}</button>)}</div>
  <section aria-label="Thông tin phiên bản" className={styles.status}><strong>{form.title}</strong> · {form.kind==='policy'?'Chính sách':'Hướng dẫn'} · Bản sửa v{form.revision} · {form.workflow} · Đã công bố v{form.publishedRevision||'chưa có'} <Link href={pathFor(form)} target="_blank" rel="noreferrer">Xem trang công khai ↗</Link></section>
  <fieldset disabled={locked||!canWrite} style={{border:0,padding:0,margin:0,minWidth:0}}>
  <div className={styles.editGrid}><label>Tiêu đề<input maxLength={180} value={form.title} onChange={e=>setForm(x=>({...x,title:e.target.value}))}/></label><label>Tóm tắt<input maxLength={900} value={form.summary} onChange={e=>setForm(x=>({...x,summary:e.target.value}))}/></label><label>Đường dẫn công cụ<input maxLength={180} value={form.toolHref} onChange={e=>setForm(x=>({...x,toolHref:e.target.value}))}/></label><label>Đường dẫn tham khảo<input maxLength={180} value={form.relatedHref} onChange={e=>setForm(x=>({...x,relatedHref:e.target.value}))}/></label></div>
  <div className={styles.editGrid}><label>Nội dung Markdown — tiêu đề ##, bảng, danh sách, ví dụ<textarea maxLength={140000} rows={22} value={form.body} onChange={e=>setForm(x=>({...x,body:e.target.value}))}/></label></div>
  </fieldset>
  <p className={styles.hint}>Chỉ dùng liên kết nội bộ. Không chèn script, iframe, URL ảnh bên ngoài hoặc mã thực thi vào Markdown. Ảnh hướng dẫn cần được kiểm chứng bằng chụp màn hình hệ thống ở vòng E2E riêng.</p>
  <div className={styles.editorButtons}><button type="button" disabled={locked||!canWrite||busy} onClick={()=>void save()}>Lưu bản nháp mới</button><button type="button" disabled={locked} onClick={()=>setPreview(x=>!x)}>{preview?'Đóng xem trước':'Xem trước Markdown'}</button><button type="button" disabled={locked||!canWrite||busy||form.workflow!=='draft'} onClick={()=>void action('submit')}>Gửi duyệt</button><button type="button" disabled={locked||!canWrite||busy||form.workflow!=='pending'} onClick={()=>void action('approve')}>Admin khác phê duyệt</button><button type="button" disabled={locked||!canWrite||busy||form.workflow!=='approved'} onClick={()=>void action('publish')}>Xuất bản</button><button type="button" disabled={locked} onClick={()=>void loadHistory()}>Xem lịch sử</button></div>
  {preview&&<div className={styles.status}><h2>Xem trước — chưa công bố</h2><VanKhoMarkdown body={form.body} slug={form.slug}/></div>}
  {history.length>0&&<section aria-label="Lịch sử phiên bản"><h2>Phiên bản đã lưu</h2><ol>{history.map(r=><li key={r.version}>v{r.version} · {r.title} · {new Date(r.createdAt).toLocaleString('vi-VN')}</li>)}</ol></section>}
 </div>;
}
