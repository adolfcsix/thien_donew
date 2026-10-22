'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import {useAuth} from '@/components/auth-provider';
import styles from '../books.module.css';
type Book={id:string;slug:string;title:string;author:string;publisher:string;publishedYear:number|null;synopsis:string;subject:string;tags:string[];accessLevel:'free'|'member'|'pro';format:string|null;hasCover:boolean};
type Detail={book:Book;related:Book[];canRead:boolean;progress:{position:number;bookmarks:number[];favorite:boolean}|null};
export default function BookDetails(){const {slug}=useParams<{slug:string}>(),{user,open}=useAuth();const [data,setData]=useState<Detail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[favorite,setFavorite]=useState(false);
 useEffect(()=>{const controller=new AbortController();setData(null);void api<Detail>('/api/books/'+encodeURIComponent(slug),{signal:controller.signal}).then(x=>{setData(x);setFavorite(x.progress?.favorite||false);}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);});return()=>controller.abort();},[slug,user?.id]);
 async function toggleFavorite(){if(!data||!user)return open();setBusy(true);try{const next=!favorite;await api('/api/books/'+encodeURIComponent(slug)+'/progress',{method:'PATCH',body:{position:data.progress?.position||0,bookmarks:data.progress?.bookmarks||[],favorite:next}});setFavorite(next);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!data)return <main className={styles.root}><Link href="/books">← Tàng Thư Các</Link><p role="status">{error||'Đang tải thông tin sách…'}</p></main>;
 const b=data.book;return <main className={styles.root}><p><Link className={styles.link} href="/books">← Tàng Thư Các</Link></p><div className={styles.detail}><div>{b.hasCover?<img className={styles.cover} alt={'Bìa '+b.title} src={'/api/books/'+encodeURIComponent(slug)+'/cover'}/>:<div className={styles.cover}>THIÊN ĐỒ</div>}</div><section><span className={styles.eyebrow}>{b.subject} · {b.accessLevel.toUpperCase()}</span><h1 className="serif">{b.title}</h1><p>Tác giả: {b.author}</p><p>Nhà xuất bản: {b.publisher||'Chưa cập nhật'} · Năm: {b.publishedYear||'Chưa rõ'}</p><p style={{whiteSpace:'pre-wrap',lineHeight:1.85}}>{b.synopsis}</p><p className={styles.muted}>Định dạng: {b.format||'Chưa có tệp'} · {b.tags.join(' · ')}</p><div className={styles.actions}>{data.canRead&&b.format?<Link className={styles.button} href={'/books/'+encodeURIComponent(slug)+'/read'}>{data.progress?'Tiếp tục đọc':'Đọc sách'} ↗</Link>:b.accessLevel==='member'&&!user?<button className={styles.button} onClick={() => open()}>Đăng nhập để đọc</button>:b.accessLevel==='pro'?<Link className={styles.button} href="/membership">Cần quyền Pro</Link>:<span role="status">Tệp sách chưa sẵn sàng.</span>}
 <button className={styles.button} disabled={busy} onClick={()=>void toggleFavorite()}>{favorite?'♥ Đã yêu thích':'♡ Lưu yêu thích'}</button></div></section></div>
 {!!data.related.length&&<section><h2 className="serif">Sách liên quan</h2><div className={styles.grid}>{data.related.map(r=><Link className={styles.card} key={r.id} href={'/books/'+r.slug}><h3>{r.title}</h3><p>{r.author}</p></Link>)}</div></section>}{error&&<p role="alert" className={styles.error}>{error}</p>}
 </main>;
}
