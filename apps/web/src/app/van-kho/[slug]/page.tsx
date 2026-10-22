'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import VanKhoMarkdown,{formattedBlocks} from '../van-kho-markdown';
import styles from '../van-kho.module.css';
type Doc={id:string;slug:string;title:string;body:string;excerpt:string;subject:string;author:string|null;authorId:string|null;tags:string[];publishedAt:string|null;updatedAt:string};
export default function VanKhoDetail(){
 const {slug}=useParams<{slug:string}>();
 const [data,setData]=useState<{document:Doc;related:Doc[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();setData(null);setError('');api<{document:Doc;related:Doc[]}>('/api/van-kho/'+encodeURIComponent(slug),{signal:c.signal,timeoutMs:15000}).then(setData).catch(e=>{if(!c.signal.aborted)setError((e as Error).message)});return()=>c.abort()},[slug]);
 const item=data?.document,headings=item?formattedBlocks(item.body).headings:[];
 return <main className={styles.page}>
  <Link className={styles.link} href="/van-kho">← Văn Khố</Link>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {!data&&!error&&<p role="status">Đang tải bài viết…</p>}
  {item&&<article className={styles.article}>
   <p className={styles.tag}>{item.subject}</p><h1>{item.title}</h1>
   <p className={styles.muted}>{item.authorId?<Link className={styles.link} href={'/van-kho/authors/'+encodeURIComponent(item.authorId)}>{item.author||'Tác giả'}</Link>:item.author||'Ban biên tập'} · Cập nhật {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</p>
   {item.excerpt&&<p>{item.excerpt}</p>}
   {headings.length>0&&<nav aria-label="Mục lục" className={styles.panel}><strong>Nội dung bài viết</strong><div className={styles.toc}>{headings.map(h=><a className={styles.link} key={h.id} href={'#'+h.id}>{h.text}</a>)}</div></nav>}
   <VanKhoMarkdown body={item.body} slug={item.slug}/>
   <p className={styles.muted}>Nội dung nghiên cứu mang tính tham khảo; không phải dự đoán chắc chắn.</p>
  </article>}
  {!!data?.related.length&&<section className={styles.panel}><h2>Bài nghiên cứu liên quan</h2>{data.related.map(d=><p key={d.id}><Link className={styles.link} href={'/van-kho/'+encodeURIComponent(d.slug)}>{d.title}</Link></p>)}</section>}
 </main>;
}
