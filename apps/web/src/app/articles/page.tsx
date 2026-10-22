'use client';
import Link from 'next/link';
import {useAuth} from '@/components/auth-provider';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import styles from '@/features/membership/membership.module.css';

type Post={slug:string;title:string;body:string};
export default function Articles(){
 const {user}=useAuth();const [canEdit,setCanEdit]=useState(false);
 useEffect(()=>{const c=new AbortController();setCanEdit(false);if(user)void api<{isAdmin:boolean}>('/api/billing/access',{signal:c.signal,timeoutMs:12000}).then(r=>{if(!c.signal.aborted)setCanEdit(r.isAdmin)}).catch(()=>{});return()=>c.abort()},[user?.id]);
 const [posts,setPosts]=useState<Post[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const request=new AbortController();setLoading(true);setError('');
  void api<{posts:Post[]}>('/api/articles',{signal:request.signal,timeoutMs:15000})
   .then(result=>{if(!Array.isArray(result.posts)||result.posts.some(post=>!post||typeof post.slug!=='string'||typeof post.title!=='string'||typeof post.body!=='string'))throw new Error('Dữ liệu ghi chép không hợp lệ. Vui lòng tải lại.');if(!request.signal.aborted)setPosts(result.posts)})
   .catch(reason=>{if(!request.signal.aborted)setError((reason as Error).message)})
   .finally(()=>{if(!request.signal.aborted)setLoading(false)});
  return()=>request.abort();
 },[retry]);
 return <div className={styles.page}>
  <header className={styles.hero}><h1 className="serif">Thiên Đồ Tạp Chí</h1><p>Bài viết do ban quản trị xuất bản.</p>{canEdit&&<Link className={styles.primary} href="/admin/articles">✎ Soạn và quản lý bài Tạp Chí</Link>}</header>
  {loading&&<p role="status">Đang tải ghi chép…</p>}
  {error&&<div role="alert"><p>{error}</p><button type="button" className="btn secondary" onClick={()=>setRetry(value=>value+1)}>Tải lại ghi chép</button></div>}
  {!loading&&!error&&posts.map(post=><article key={post.slug} id={post.slug} className={styles.card} style={{marginBottom:18}}><h2>{post.title}</h2><div className={styles.body}>{post.body}</div></article>)}
  {!loading&&!posts.length&&!error&&<section className={styles.card}><h2>Chưa có bài viết được xuất bản.</h2><p>Ghi chép sẽ xuất hiện tại đây khi ban quản trị xuất bản. Bạn có thể tiếp tục đọc tài liệu hoặc trao đổi trong Luận Đàn.</p><p><Link href="/van-kho">Đọc Văn Khố ↗</Link> · <Link href="/forum">Vào Luận Đàn ↗</Link></p></section>}
 </div>;
}
