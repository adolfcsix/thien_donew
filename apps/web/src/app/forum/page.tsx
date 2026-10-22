'use client';
import {useAuth} from '@/components/auth-provider';
import {MemberIdentity} from '@/features/forum/member-identity';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import {usePagedCatalog} from '@/lib/use-paged-catalog';
import styles from './forum.module.css';
type Category={id:string;name:string;summary:string};
import {isPublicThread,type PublicThread} from '@/lib/public-catalog-validation';
type Item=PublicThread;
export default function ForumHome(){const {user}=useAuth();return <ForumCatalog key={user?.id||'guest'}/>;}
function ForumCatalog(){
 const [categories,setCategories]=useState<Category[]>([]);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('');
 const [categoryError,setCategoryError]=useState(''),[categoryRetry,setCategoryRetry]=useState(0);
 const {items,nextOffset:next,busy:loading,error,more,retry}=usePagedCatalog<Item>({
  endpoint:'/api/forum/threads',query:{q:query,category},listKey:'threads',debounceMs:280,validateItem:isPublicThread,
 });
 useEffect(()=>{
  const controller=new AbortController();setCategoryError('');
  void api<{categories:Category[]}>('/api/forum/categories',{signal:controller.signal,timeoutMs:15000})
   .then(result=>{if(!controller.signal.aborted)setCategories(result.categories)})
   .catch(reason=>{if(!controller.signal.aborted)setCategoryError((reason as Error).message)});
  return()=>controller.abort();
 },[categoryRetry]);
 return <div className={styles.page}><header className={styles.hero}><p className={styles.eyebrow}>THIÊN ĐỒ · LUẬN ĐÀN</p><h1>Thiên Đồ Luận Đàn</h1><p>Trao đổi và nghiên cứu huyền học dựa trên dữ liệu, phương pháp và đối chiếu. Mọi thành viên đã xác minh email đều có thể đăng bài. Tôn trọng quyền riêng tư và ý kiến khác biệt.</p><div className={styles.links}><Link href="/forum/new" className={styles.primary}>Viết thảo luận</Link><Link className={styles.button} href="/forum/me">Bài của tôi · Theo dõi · Thông báo</Link><Link className={styles.button} href="/messages">Hộp thư riêng</Link><Link className={styles.link} href="/van-kho">Văn Khố ↗</Link></div></header>
 <section className={styles.filters} aria-label="Bộ lọc diễn đàn"><label>Tìm kiếm<input type="search" maxLength={100} value={query} placeholder="Tiêu đề hoặc nội dung" onChange={e=>setQuery(e.target.value)}/></label><label>Chuyên mục<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả chuyên mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></section>
 {categoryError&&<div className={styles.error} role="alert"><p>{categoryError}</p><button type="button" className={styles.button} onClick={()=>setCategoryRetry(value=>value+1)}>Tải lại chuyên mục</button></div>}
 {error&&<div className={styles.error} role="alert"><p>{error}</p><button type="button" className={styles.button} onClick={retry}>Tải lại thảo luận</button></div>}{loading&&<p role="status">Đang tải Luận Đàn…</p>}<div className={styles.grid}>{items.map(x=><article key={x.id} className={styles.card}><div className={styles.chips}><span className={styles.chip}>{categories.find(c=>c.id===x.category)?.name||x.category}</span>{x.pinned&&<span className={styles.chip}>Đã ghim</span>}{x.locked&&<span className={styles.chip}>Đã khóa</span>}{x.visibility==='members'&&<span className={styles.chip}>Thành viên</span>}</div><h2><Link className={styles.link} href={'/forum/'+x.id}>{x.title}</Link></h2>{x.body&&<p>{x.body}</p>}{x.hasImage&&<img className={styles.threadImageThumb} src={'/api/forum/threads/'+x.id+'/image'} alt={'Ảnh trong bài: '+x.title} loading="lazy"/>}<div className={styles.meta}><MemberIdentity id={x.authorId} name={x.author}/> · {x.commentsCount} bình luận · {new Date(x.updatedAt).toLocaleDateString('vi-VN')}</div></article>)}</div>{!loading&&!items.length&&!error&&<p>Chưa có thảo luận phù hợp với bộ lọc.</p>}{next!==null&&<div className={styles.actions}><button type="button" disabled={loading} className={styles.button} onClick={()=>void more()}>Xem thêm</button></div>}</div>;
}
