'use client';
import {EmailVerification} from '@/features/community-hub/email-verification';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import {prepareThreadImage,uploadThreadImage} from '@/features/forum/thread-image-upload';
import styles from '../forum.module.css';
type Category={id:string;name:string};type Chart={id:string;label:string};
export default function CreateThread(){
 const router=useRouter();
 const [categories,setCategories]=useState<Category[]>([]),[charts,setCharts]=useState<Chart[]>([]),[category,setCategory]=useState('hoi-dap');
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[visibility,setVisibility]=useState('public');
 const [shareChart,setShareChart]=useState(false),[chartId,setChartId]=useState(''),[alias,setAlias]=useState('');
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void api<{categories:Category[]}>('/api/forum/categories').then(r=>setCategories(r.categories)).catch(e=>setError((e as Error).message));void api<{charts:Chart[]}>('/api/charts').then(r=>setCharts(r.charts)).catch(()=>{})},[]);
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 async function save(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   if(shareChart&&!chartId)throw Error('Bạn chưa chọn lá số để chia sẻ bí danh');
   if(!body.trim()&&!file)throw Error('Hãy nhập nội dung hoặc chọn một ảnh');
   let imageId:string|null=null;
   if(file)imageId=await uploadThreadImage(await prepareThreadImage(file));
   const receipt=await api<{id:string}>('/api/forum/threads',{method:'POST',body:{category,title,body,visibility,imageId,shareChart,chartId:shareChart?chartId:null,chartAlias:shareChart?alias:null}});
   if(!receipt.id)throw Error('Máy chủ không xác nhận bài đã được đăng');
   router.push('/forum/'+receipt.id);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <main className={styles.page}>
 <Link className={styles.link} href="/forum">← Luận Đàn</Link>
 <header className={styles.hero}><p className={styles.eyebrow}>THIÊN ĐỒ · CỘNG ĐỒNG</p><h1>Viết thảo luận</h1><p>Đăng vài dòng, một bức ảnh hoặc kết hợp cả hai. Bạn không cần chia sẻ lá số hay điền thông tin sinh.</p></header>
 <EmailVerification/>
 <section className={`${styles.form} ${styles.composePanel}`} aria-label="Soạn bài viết">
  <label>Chuyên mục<select disabled={busy} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{categories.length===0&&<option value="hoi-dap">Hỏi đáp chung</option>}</select></label>
  <label>Tiêu đề (tùy chọn)<input disabled={busy} maxLength={180} minLength={3} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Bạn muốn chia sẻ điều gì?"/></label>
  <label>Nội dung (có thể bỏ trống nếu đăng ảnh)<textarea disabled={busy} rows={6} maxLength={12000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Chia sẻ trải nghiệm hoặc đặt câu hỏi..."/></label>
  <div className={styles.imagePicker}><label>Ảnh đính kèm (không bắt buộc, tối đa một ảnh)<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
  {preview&&<div className={styles.previewPicture}><img src={preview} alt="Xem trước ảnh sắp đăng"/><button className={styles.button} type="button" disabled={busy} onClick={()=>setFile(null)}>Bỏ ảnh</button></div>}
  <p className={styles.muted}>Ảnh được thu nhỏ trước khi tải lên (tối đa 1 MB), không đăng ảnh có thông tin cá nhân của người khác. Bài chỉ có chữ vẫn đăng bình thường.</p></div>
  <label>Ai có thể xem?<select disabled={busy} value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Mọi người</option><option value="members">Thành viên đăng nhập</option><option value="private">Chỉ mình tôi</option></select></label>
  <details className={styles.panel}><summary>Tham chiếu lá số (tùy chọn)</summary><label className={styles.optionLine}><input disabled={busy} type="checkbox" checked={shareChart} onChange={e=>setShareChart(e.target.checked)}/> Chia sẻ bí danh lá số (không gửi ngày giờ sinh)</label>
  {shareChart&&<div className={styles.form}><label>Chọn lá số<select disabled={busy} value={chartId} onChange={e=>setChartId(e.target.value)}><option value="">Chưa chọn</option>{charts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Bí danh<input disabled={busy} maxLength={80} value={alias} onChange={e=>setAlias(e.target.value)}/></label></div>}</details>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy||(!body.trim()&&!file)||(title.trim().length>0&&title.trim().length<3)} onClick={()=>void save()}>{busy?'Đang xử lý…':'Đăng bài'}</button><Link href="/forum" className={styles.button}>Hủy</Link></div>
 </section></main>;
}
