'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import VanKhoMarkdown,{formattedBlocks} from '@/app/van-kho/van-kho-markdown';
import {entries,pathFor,type PortalKind} from './portal-content';
import styles from './portal.module.css';
type Result={document:{title:string;summary:string;body:string;toolHref:string;relatedHref:string;publishedAt?:string;legalDraft:boolean;revision:number}};
export default function PortalReader({kind,slug}:{kind:PortalKind;slug:string}){
 const collection=entries.filter(x=>x.kind===kind);const idx=collection.findIndex(x=>x.slug===slug);
 const base=collection[idx];
 const [remote,setRemote]=useState<Result['document']|null>(null);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let canceled=false;setRemote(null);setLoaded(false);fetch(`/api/portal/public/${kind}/${encodeURIComponent(slug)}`,{credentials:'same-origin',cache:'no-store'}).then(async response=>{
  if(!response.ok)throw new Error('Không thể tải bài đã xuất bản');
  return response.json() as Promise<Result>;
 }).then(body=>{if(!canceled&&body.document&&typeof body.document.body==='string')setRemote(body.document)}).catch(()=>{ /* Bundled content remains readable when the CMS API is offline. */ }).finally(()=>{if(!canceled)setLoaded(true)});
 return()=>{canceled=true};},[kind,slug]);
 const body=remote?.body||base?.body||'';
 const toc=useMemo(()=>formattedBlocks(body).headings.filter(h=>h.text&&h.id),[body]);
 if(!base)return <div className={styles.root}><h1>Không tìm thấy bài hướng dẫn</h1><Link href={kind==='guide'?'/huong-dan':'/phap-ly'}>Quay lại danh mục</Link></div>;
 const title=remote?.title||base.title,summary=remote?.summary||base.summary;
 const next=collection[idx+1],prev=collection[idx-1];
 const tool=remote?.toolHref||base.tool,related=remote?.relatedHref||base.related;
 return <article className={styles.root}><nav className={styles.crumb} aria-label="Đường dẫn"><Link href={kind==='guide'?'/huong-dan':'/phap-ly'}>← {kind==='guide'?'Trung tâm hướng dẫn':'Chính sách'}</Link> / {title}</nav>
  <header className={styles.hero}><span className={styles.eyebrow}>{kind==='guide'?'HƯỚNG DẪN CHUYÊN SÂU':'CHÍNH SÁCH THIÊN ĐỒ'}</span><h1>{title}</h1><p>{summary}</p>
   {kind==='policy'&&(remote?.legalDraft!==false)&&<p role="note" className={styles.warning}>Bản dự thảo kỹ thuật, chờ rà soát pháp lý và thông tin đơn vị vận hành. Nội dung chưa được sử dụng làm cam kết thương mại.</p>}
   {kind==='guide'&&<p className={styles.notice}>Hướng dẫn thể hiện chức năng ở cấp mã nguồn ứng viên; một số phần chưa đạt nghiệm thu E2E. Ví dụ minh họa không được coi là kết quả engine thực tính.</p>}
   {loaded&&!remote&&<p className={styles.hint}>Đang hiển thị bản hướng dẫn được đóng gói cùng ứng dụng. Nội dung CMS mới hơn hiện không truy cập được.</p>}
   {remote?.publishedAt&&<p className={styles.meta}>Bản công bố kỹ thuật v{remote.revision} · Cập nhật {new Date(remote.publishedAt).toLocaleDateString('vi-VN')}</p>}
  </header>
  <div className={styles.readingGrid}>
    <aside className={styles.toc}><details className={styles.tocMobile}><summary>Mục lục · {toc.length} phần</summary><nav aria-label="Mục lục trên điện thoại">{toc.map((h,i)=><a href={'#'+h.id} key={i}>{h.text}</a>)}</nav></details><nav className={styles.tocDesktop} aria-label="Mục lục của bài"><h2>Trong bài này</h2>{toc.map((h,i)=><a key={i} href={'#'+h.id}>{h.text}</a>)}</nav></aside>
    <div className={styles.reading}><VanKhoMarkdown body={body} slug={slug}/>
       {kind==='guide'&&<section className={styles.related}><h2>Thực hành và nghiên cứu</h2><p>Đi tới công cụ hoặc mở tư liệu liên quan. Chỉ thử nghiệm trên môi trường riêng tư khi tính năng chưa nghiệm thu.</p><Link href={tool}>Mở công cụ →</Link><Link href={related}>Đối chiếu tài liệu →</Link><Link href="/van-kho">Tra cứu Văn Khố →</Link><p className={styles.hint}>Ảnh chụp chính xác từ Thiên Đồ sẽ được thêm sau khi kiểm thử trình duyệt. Bản này không dùng ảnh mô phỏng thay cho ảnh hệ thống.</p></section>}
    </div>
  </div>
  <nav className={styles.pager} aria-label="Chuyển chuyên mục">{prev?<Link href={pathFor(prev)}>← {prev.title}</Link>:<span/>}{next?<Link href={pathFor(next)}>{next.title} →</Link>:<span/>}</nav>
 </article>;
}
