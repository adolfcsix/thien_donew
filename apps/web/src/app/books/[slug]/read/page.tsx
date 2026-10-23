'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useState} from 'react';
import {useAuth} from '@/components/auth-provider';
import {useBookReader} from '@/features/books/use-book-reader';
import styles from '../../books.module.css';

export default function BookReaderRoute(){
 const {slug}=useParams<{slug:string}>(),{user,loading}=useAuth();
 if(loading)return <main className={styles.root}><p role="status">Đang kiểm tra tài khoản đọc sách…</p></main>;
 return <BookReader key={slug+':'+(user?.id??'guest')} slug={slug} signedIn={!!user}/>;
}
function BookReader({slug,signedIn}:{slug:string;signedIn:boolean}){
 const r=useBookReader(slug,signedIn),{open}=useAuth();
 const [zoom,setZoom]=useState(100),[textSize,setTextSize]=useState(100),[query,setQuery]=useState(''),[jump,setJump]=useState(''),[jumpError,setJumpError]=useState('');
 if(r.busy)return <main className={styles.root}><p role="status">Đang kiểm tra quyền đọc sách…</p></main>;
 if(!r.book)return <main className={styles.root}><h1 className="serif">Chưa mở được sách</h1><p role="alert">{r.loadError}</p><button className={styles.button} onClick={r.retryLoad}>Thử mở lại sách</button> <Link className={styles.link} href={'/books/'+encodeURIComponent(slug)}>Quay lại chi tiết sách</Link></main>;
 const pdf=r.book.book.format==='pdf',position=r.progress.position,maximum=pdf?10000:r.chapters.length-1;
 const chapter=r.chapter?.index===position?r.chapter:null;
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
 const links=r.chapters.filter(c=>normalize(c.title).includes(normalize(query)));
 return <main className={styles.root}><header className={styles.hero}><span className={styles.eyebrow}>TÀNG THƯ CÁC · TRÌNH ĐỌC CÁ NHÂN</span><h1 className="serif">{r.book.book.title}</h1><Link className={styles.link} href={'/books/'+encodeURIComponent(slug)}>← Chi tiết sách</Link><p>{signedIn?'Vị trí, đánh dấu và yêu thích chỉ được cập nhật sau khi máy chủ xác nhận lưu.':'Vị trí và đánh dấu giữ tạm trong trang; tải lại trang sẽ mất. Đăng nhập để đồng bộ tiến độ trong tài khoản.'}</p>{!signedIn&&<button className={styles.button} onClick={()=>open('login')}>Đăng nhập để đồng bộ</button>}</header>
 <div className={styles.actions}><button className={styles.button} disabled={r.saving||position===0} onClick={()=>void r.go(position-1)}>← Trước</button><span className={styles.tag} aria-live="polite">{pdf?'Trang':'Chương'} {position+1}{!pdf?' / '+r.chapters.length:''}</span><button className={styles.button} disabled={r.saving||position>=maximum} onClick={()=>void r.go(position+1)}>Sau →</button><button className={styles.button} disabled={r.saving} aria-pressed={r.progress.bookmarks.includes(position)} onClick={()=>void r.toggleBookmark()}>{r.progress.bookmarks.includes(position)?'★ Bỏ đánh dấu':'☆ Đánh dấu'}</button><button className={styles.button} disabled={r.saving} aria-pressed={r.progress.favorite} onClick={()=>void r.toggleFavorite()}>{r.progress.favorite?'♥':'♡'} Yêu thích</button>
 {pdf?<><button className={styles.button} disabled={zoom<=50} onClick={()=>setZoom(v=>Math.max(50,v-25))}>Thu nhỏ −</button><button className={styles.button} disabled={zoom>=200} onClick={()=>setZoom(v=>Math.min(200,v+25))}>Phóng to +</button></>:<><button className={styles.button} disabled={textSize<=90} onClick={()=>setTextSize(v=>v-10)}>Chữ nhỏ −</button><button className={styles.button} disabled={textSize>=150} onClick={()=>setTextSize(v=>v+10)}>Chữ lớn +</button><span className={styles.tag}>Cỡ chữ {textSize}%</span></>}
 </div>
 <form className={styles.jump} onSubmit={e=>{e.preventDefault();const n=Number(jump);if(!Number.isSafeInteger(n)||n<1||n>maximum+1){setJumpError('Nhập vị trí từ 1 đến '+(maximum+1)+'.');return;}setJumpError('');void r.go(n-1);}}><label>Đến {pdf?'trang':'chương'}<input type="number" required min={1} max={maximum+1} step={1} value={jump} onChange={e=>setJump(e.target.value)} aria-describedby={pdf?'pdf-progress-help':undefined}/></label><button className={styles.button} disabled={r.saving}>Mở vị trí</button></form>
 {jumpError&&<p role="alert" className={styles.error}>{jumpError}</p>}{r.saving&&<p role="status">Đang lưu tiến độ…</p>}{r.notice&&<p role="status" className={styles.notice}>{r.notice}</p>}{r.saveError&&<div role="alert" className={styles.notice}><p>{r.saveError}</p>{r.retryIntent&&<button className={styles.button} disabled={r.saving} onClick={()=>void r.retrySave()}>Thử lưu lại</button>}</div>}
 {r.progress.bookmarks.length>0&&<nav aria-label="Trang đã đánh dấu" className={styles.chapters}>{r.progress.bookmarks.map(n=><button key={n} disabled={r.saving} onClick={()=>void r.go(n)}>★ {n+1}</button>)}</nav>}
 {pdf?<div className={styles.reader}><iframe key={position+'-'+zoom} className={styles.pdf} title={'Trình đọc PDF '+r.book.book.title} src={r.resource+'/file#page='+(position+1)+'&zoom='+zoom}/><p id="pdf-progress-help" className={styles.muted}>PDF dùng trình đọc của trình duyệt. Cuộn hoặc chuyển trang bên trong PDF không tự lưu tiến độ; dùng Trước/Sau hoặc Mở vị trí ở trên. Số trang toàn tài liệu chưa được xác định ở đây. Nếu không xem được PDF nhúng, <a className={styles.link} href={r.resource+'/file'} target="_blank" rel="noopener noreferrer">mở PDF ở tab riêng</a>.</p></div>:<div className={styles.reader}>
 <section aria-label="Tìm và chọn chương"><label className={styles.label}>Tìm chương<input type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên chương, có dấu hoặc không dấu"/></label><nav aria-label="Mục lục EPUB" className={styles.chapters}>{links.map(c=><button key={c.index} disabled={r.saving} aria-current={c.index===position?'page':undefined} onClick={()=>void r.go(c.index)}>{c.index+1}. {c.title||'Chương '+(c.index+1)}</button>)}</nav>{!links.length&&<p role="status">Không tìm thấy chương phù hợp. Thử một từ khóa khác.</p>}</section>
 {r.chapterError?<div role="alert" className={styles.notice}><p>{r.chapterError}</p><button className={styles.button} onClick={r.retryChapter}>Thử tải chương</button></div>:!chapter||r.chapterLoading?<p role="status">Đang mở chương…</p>:<><h2>{chapter.title}</h2>{chapter.truncated&&<p role="status" className={styles.notice}>Chương dài đã được giới hạn phần văn bản hiển thị. <a className={styles.link} href={r.resource+'/file'} download={slug+'.epub'}>Tải tệp EPUB gốc để đọc đầy đủ</a>.</p>}<article className={styles.text} style={{fontSize:(17*textSize/100)+'px'}}>{chapter.text}</article></>}
 <p className={styles.muted}>EPUB hiển thị tối đa 100 chương theo thứ tự đọc, mỗi chương tối đa 120.000 ký tự văn bản. Hình minh họa, bảng phức tạp và bố cục bản in có thể không được thể hiện đầy đủ; Để đọc hoặc đối chiếu đầy đủ, <a className={styles.link} href={r.resource+'/file'} download={slug+'.epub'}>tải tệp EPUB gốc</a>.</p></div>}
 </main>;
}
