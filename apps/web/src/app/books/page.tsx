'use client';
import Link from 'next/link';
import {useState} from 'react';
import {usePagedCatalog} from '@/lib/use-paged-catalog';
import {subjectLabel} from '@/lib/content-labels';
import styles from './books.module.css';
import {isPublicBook,type PublicBook} from '@/lib/public-catalog-validation';
type Book=PublicBook;
const categories=['','tu-vi','bat-tu','kinh-dich','mai-hoa','luc-hao','ky-mon','lich-phap','phong-thuy','chiem-tinh','tarot','than-so-hoc','nghien-cuu','khac'];
const accessLabel={free:'Miễn phí',member:'Thành viên',pro:'Pro'};
/** A failed or deleted cover should fall back to the same reserved artwork frame. */
function BookCover({book}:{book:Book}){
 const [failed,setFailed]=useState(false);
 return book.hasCover&&!failed
  ? <img className={styles.cover} src={'/api/books/'+encodeURIComponent(book.slug)+'/cover'} alt={'Bìa '+book.title} loading="lazy" onError={()=>setFailed(true)}/>
  : <div className={styles.cover} role="img" aria-label="Chưa có bìa sách">THIÊN ĐỒ</div>;
}
export default function BookCatalog(){
 const [q,setQ]=useState(''),[subject,setSubject]=useState(''),[sort,setSort]=useState('recent');
 const {items,nextOffset:offset,error,busy,more,retry}=usePagedCatalog<Book>({endpoint:'/api/books',query:{q,subject,sort},listKey:'books',validateItem:isPublicBook});
 return <main className={styles.root}><header className={styles.hero}><div className={styles.eyebrow}>THIÊN ĐỒ · TÀNG THƯ CÁC</div><h1 className="serif">Tàng Thư Các</h1><p>Thư viện sách huyền học đã được duyệt quyền sử dụng. Đọc PDF hoặc EPUB, lưu tiến độ, yêu thích và đánh dấu trang theo quyền truy cập từng đầu sách.</p><Link className={styles.link} href="/books/contribute">Không gian tác giả Chuyên gia ↗</Link> · <Link className={styles.link} href="/library">Từ điển thuật ngữ ↗</Link></header>
 <section aria-label="Tìm và lọc sách" className={styles.toolbar}><label className={styles.label}>Tìm tên sách hoặc tác giả<input type="search" maxLength={100} value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm tác giả, sách..."/></label><label className={styles.label}>Bộ môn<select aria-label="Bộ môn" value={subject} onChange={e=>setSubject(e.target.value)}>{categories.map(s=><option key={s} value={s}>{s?subjectLabel(s):'Tất cả bộ môn'}</option>)}</select></label><label className={styles.label}>Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Sách mới cập nhật</option><option value="featured">Sách nổi bật</option><option value="title">Tên sách A–Z</option></select></label></section>
 {error&&<div role="alert" className={styles.error}><p>{error}</p><button type="button" className={styles.button} onClick={retry}>Thử tải lại</button></div>}{busy&&<p role="status">Đang tải danh mục sách…</p>}
 <div className={styles.grid}>{items.map(b=><article className={styles.card} key={b.id}><Link href={'/books/'+encodeURIComponent(b.slug)}><BookCover key={b.id+':'+b.slug} book={b}/></Link><span className={styles.tag}>{accessLabel[b.accessLevel]} · {subjectLabel(b.subject)}</span><h2 className="serif">{b.title}</h2><p>{b.author}</p><p>{b.synopsis.slice(0,125)}</p><Link className={styles.link} href={'/books/'+encodeURIComponent(b.slug)}>Xem sách ↗</Link></article>)}</div>
 {!busy&&!items.length&&!error&&<p role="status" className={styles.notice}>Chưa có sách phù hợp. Danh mục chỉ hiển thị đầu sách đã xuất bản và kiểm tra bản quyền.</p>}
 {offset!==null&&<div className={styles.actions}><button className={styles.button} disabled={busy} onClick={more}>Tải thêm sách</button></div>}
 </main>;
}
