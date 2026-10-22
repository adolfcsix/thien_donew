'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {guides,policies,pathFor,normalized,type PortalKind} from './portal-content';
import styles from './portal.module.css';
export default function PortalCatalog({kind}:{kind:PortalKind}){
 const [query,setQuery]=useState('');const [group,setGroup]=useState('all');
 const source=kind==='guide'?guides:policies;
 const matches=useMemo(()=>source.filter((item,i)=>{
  const category=kind==='guide' ? i<5?'eastern':i<8?'extended':i<10?'western':'platform':'policy';
  return (group==='all'||category===group)&&normalized(item.title+' '+item.summary+' '+item.body).includes(normalized(query));
 }),[source,kind,group,query]);
 return <div className={styles.root}>
  <header className={styles.hero}><span className={styles.eyebrow}>THIÊN ĐỒ · {kind==='guide'?'TRUNG TÂM HƯỚNG DẪN':'THÔNG TIN VÀ CHÍNH SÁCH'}</span><h1>{kind==='guide'?'Học cách sử dụng Thiên Đồ theo từng bộ môn':'Chính sách, quyền và trách nhiệm'}</h1><p>{kind==='guide'?'15 chuyên mục thực hành gồm dữ liệu nhập, từng bước sử dụng, cơ bản/chuyên sâu, cách đọc kết quả và lỗi thường gặp.':'Các bản dự thảo chính sách gắn với những chức năng đang được triển khai; chưa có hiệu lực thương mại khi chưa được đơn vị vận hành phê duyệt.'}</p></header>
  <div className={styles.toolbar}><label>Tìm {kind==='guide'?'chuyên mục và nội dung':'chính sách'}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập tên bộ môn hoặc thuật ngữ"/></label>{kind==='guide'&&<label>Lọc lĩnh vực<select value={group} onChange={e=>setGroup(e.target.value)}><option value="all">Tất cả 15 chuyên mục</option><option value="eastern">Mệnh lý, Dịch học, Kỳ Môn</option><option value="extended">Thuật số Đông phương mở rộng</option><option value="western">Phương Tây</option><option value="platform">Các dịch vụ Thiên Đồ</option></select></label>}</div>
  <p role="status" className={styles.hint}>{matches.length} / {source.length} chuyên mục phù hợp</p>
  {matches.length?<div className={styles.catalog}>{matches.map((entry)=>{const n=source.indexOf(entry);return <article className={styles.catalogCard} key={entry.slug}><span className={styles.number}>{String(n+1).padStart(2,'0')} · {entry.kind==='guide'?'HƯỚNG DẪN':'CHÍNH SÁCH'}</span><h2><Link href={pathFor(entry)}>{entry.title}</Link></h2><p>{entry.summary}</p><p className={styles.meta}>{entry.sections.length} chương · Có mục lục, ví dụ và giới hạn</p><Link className={styles.inlineLink} href={pathFor(entry)}>Đọc toàn bộ <span aria-hidden="true">→</span></Link></article>})}</div>:<section className={styles.empty}>Không tìm thấy tài liệu phù hợp. Hãy thử tên bộ môn hoặc bỏ bộ lọc.</section>}
  {kind==='guide'&&<p className={styles.hint}>Học viện tại <Link href="/academy">/academy</Link> vẫn giữ riêng các bài tập theo trình độ; Văn Khố tại <Link href="/van-kho">/van-kho</Link> lưu nghiên cứu chuyên sâu.</p>}
 </div>;
}
